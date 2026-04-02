// 文档解析器实现
import { DocumentType, ContentType, } from '../types/document';
import { logger } from './logger';
import * as pdf from 'pdf-parse';
import * as XLSX from 'xlsx';
import { createWorker } from 'tesseract.js';
import { cacheManager } from './cache-manager';
import * as mammoth from 'mammoth';
/**
 * 基础文档解析器类
 */
export class BaseDocumentParser {
    /**
     * 检测文档类型
     */
    async detectType(file) {
        if (typeof file === 'string') {
            // 根据文件扩展名检测
            const extension = file.toLowerCase().split('.').pop();
            switch (extension) {
                case 'pdf':
                    return DocumentType.PDF;
                case 'doc':
                case 'docx':
                    return DocumentType.WORD;
                case 'xls':
                case 'xlsx':
                    return DocumentType.EXCEL;
                case 'ppt':
                case 'pptx':
                    return DocumentType.POWERPOINT;
                case 'txt':
                case 'md':
                case 'html':
                case 'htm':
                    return DocumentType.TEXT;
                case 'jpg':
                case 'jpeg':
                case 'png':
                case 'gif':
                case 'webp':
                    return DocumentType.IMAGE;
                default:
                    return DocumentType.UNKNOWN;
            }
        }
        else if (file instanceof File) {
            // 根据文件 MIME 类型检测
            const mimeType = file.type;
            if (mimeType.includes('pdf')) {
                return DocumentType.PDF;
            }
            else if (mimeType.includes('word') || mimeType.includes('document')) {
                return DocumentType.WORD;
            }
            else if (mimeType.includes('excel') || mimeType.includes('sheet')) {
                return DocumentType.EXCEL;
            }
            else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
                return DocumentType.POWERPOINT;
            }
            else if (mimeType.includes('text')) {
                return DocumentType.TEXT;
            }
            else if (mimeType.includes('image')) {
                return DocumentType.IMAGE;
            }
            else {
                return DocumentType.UNKNOWN;
            }
        }
        else {
            // ArrayBuffer 类型，根据文件头特征检测
            return this.detectTypeFromArrayBuffer(file);
        }
    }
    /**
     * 从 ArrayBuffer 检测文档类型
     */
    detectTypeFromArrayBuffer(buffer) {
        const view = new Uint8Array(buffer.slice(0, 12)); // 读取文件头
        // PDF 文件头：%PDF-1.
        if (view[0] === 0x25 && view[1] === 0x50 && view[2] === 0x44 && view[3] === 0x46 && view[4] === 0x2D) {
            return DocumentType.PDF;
        }
        // DOCX/XLSX/PPTX 文件头：PK 压缩文件
        if (view[0] === 0x50 && view[1] === 0x4B) {
            // 这里简化处理，实际可以根据压缩包内的内容进一步区分
            return DocumentType.WORD;
        }
        // JPEG 文件头：FF D8
        if (view[0] === 0xFF && view[1] === 0xD8) {
            return DocumentType.IMAGE;
        }
        // PNG 文件头：89 50 4E 47
        if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4E && view[3] === 0x47) {
            return DocumentType.IMAGE;
        }
        // GIF 文件头：47 49 46
        if (view[0] === 0x47 && view[1] === 0x49 && view[2] === 0x46) {
            return DocumentType.IMAGE;
        }
        // WebP 文件头：52 49 46 46 ... 57 45 42 50
        if (view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46 &&
            view[8] === 0x57 && view[9] === 0x45 && view[10] === 0x42 && view[11] === 0x50) {
            return DocumentType.IMAGE;
        }
        // 文本文件：检查是否为 ASCII 或 UTF-8 文本
        let isText = true;
        for (let i = 0; i < Math.min(view.length, 100); i++) {
            const byte = view[i];
            // 允许可打印字符、空格、制表符、换行符
            if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
                isText = false;
                break;
            }
        }
        if (isText) {
            return DocumentType.TEXT;
        }
        return DocumentType.UNKNOWN;
    }
    /**
     * 解析文档元数据
     */
    async parseMetadata(file) {
        const type = await this.detectType(file);
        let name = 'Unknown';
        let size = 0;
        if (file instanceof File) {
            name = file.name;
            size = file.size;
        }
        else if (typeof file === 'string') {
            name = file.split('/').pop() || 'Unknown';
            // 在浏览器环境中，无法直接获取文件大小
            size = 0;
        }
        else {
            size = file.byteLength;
        }
        return {
            name,
            type,
            size,
            createdAt: new Date(),
            modifiedAt: new Date(),
        };
    }
    /**
     * 提取纯文本
     */
    async extractText(file, options) {
        const result = await this.parse(file, { ...options, extractText: true });
        return result.text || '';
    }
    /**
     * 提取表格
     */
    async extractTables(file, options) {
        const result = await this.parse(file, { ...options, extractTables: true });
        return result.content.filter((item) => item.type === ContentType.TABLE);
    }
    /**
     * 提取图片
     */
    async extractImages(file, options) {
        const result = await this.parse(file, { ...options, extractImages: true });
        return result.content.filter((item) => item.type === ContentType.IMAGE);
    }
    /**
     * 执行 OCR 识别
     */
    async performOCR(image, language = 'eng') {
        logger.info('Performing OCR with language:', language);
        try {
            const worker = await createWorker(language);
            await worker.reinitialize(language);
            const imageSource = image instanceof ArrayBuffer ? new Blob([image]) : image;
            const result = await worker.recognize(imageSource);
            await worker.terminate();
            return result?.data?.text || '';
        }
        catch (error) {
            logger.error('OCR failed:', error);
            return '';
        }
    }
    /**
     * 检查是否需要 OCR
     */
    async needsOCR(file) {
        const type = await this.detectType(file);
        // 对于图像类型的文件，默认需要 OCR
        return type === DocumentType.IMAGE;
    }
    /**
     * 分块处理文档
     */
    chunkDocument(content, chunkSize = 2000, chunkOverlap = 200) {
        const chunks = [];
        let startIndex = 0;
        while (startIndex < content.length) {
            const endIndex = Math.min(startIndex + chunkSize, content.length);
            const chunk = content.substring(startIndex, endIndex);
            chunks.push({ text: chunk, startIndex, endIndex });
            startIndex = endIndex - chunkOverlap;
            if (startIndex >= content.length - chunkOverlap) {
                break;
            }
        }
        return chunks;
    }
    /**
     * 生成解析结果
     */
    async createParseResult(metadata, content, options) {
        const startTime = Date.now();
        let text = '';
        let pages = [];
        let chunks = [];
        // 处理 OCR
        if (options?.enableOCR) {
            const imageContents = content.filter((item) => item.type === ContentType.IMAGE);
            for (const imageContent of imageContents) {
                try {
                    const ocrText = await this.performOCR(imageContent.url, options.ocrLanguage);
                    // 将 OCR 结果添加为文本内容
                    content.push({
                        type: ContentType.TEXT,
                        text: ocrText,
                    });
                }
                catch (error) {
                    logger.error('OCR failed:', error);
                }
            }
        }
        // 生成纯文本
        if (options?.extractText) {
            text = content
                .filter((item) => item.type === ContentType.TEXT)
                .map(item => item.text)
                .join('\n');
        }
        // 按页面组织内容
        if (options?.parseByPage) {
            let currentPage = [];
            let pageIndex = 0;
            content.forEach(item => {
                if (item.type === ContentType.PAGE_BREAK) {
                    if (currentPage.length > 0) {
                        pages.push({
                            index: pageIndex++,
                            content: [...currentPage],
                        });
                        currentPage = [];
                    }
                }
                else {
                    currentPage.push(item);
                }
            });
            if (currentPage.length > 0) {
                pages.push({
                    index: pageIndex,
                    content: currentPage,
                });
            }
        }
        // 分块处理
        if (options?.enableChunking && text) {
            const chunkResults = this.chunkDocument(text, options.chunkSize, options.chunkOverlap);
            chunks = chunkResults;
        }
        return {
            metadata,
            content,
            pages,
            text,
            chunks,
            parseTime: Date.now() - startTime,
            success: true,
        };
    }
}
/**
 * 文本文件解析器
 */
export class TextDocumentParser extends BaseDocumentParser {
    constructor() {
        super(...arguments);
        this.supportedTypes = [DocumentType.TEXT];
    }
    async parse(file, options) {
        try {
            let text = '';
            if (file instanceof File) {
                text = await file.text();
            }
            else if (typeof file === 'string') {
                // 在浏览器环境中，无法直接读取文件系统
                // 假设传入的是文本内容
                text = file;
            }
            else {
                text = new TextDecoder('utf-8').decode(file);
            }
            const metadata = await this.parseMetadata(file);
            metadata.wordCount = text.split(/\s+/).length;
            metadata.charCount = text.length;
            const content = [
                {
                    type: ContentType.TEXT,
                    text,
                },
            ];
            return await this.createParseResult(metadata, content, options);
        }
        catch (error) {
            logger.error('Failed to parse text document:', error);
            const metadata = await this.parseMetadata(file);
            return {
                metadata,
                content: [],
                parseTime: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to parse text document',
            };
        }
    }
}
/**
 * 文档解析器注册表实现
 */
export class DefaultDocumentParserRegistry {
    constructor() {
        this.parsers = new Map();
    }
    /**
     * 检测文档类型
     */
    async detectType(file) {
        if (typeof file === 'string') {
            // 根据文件扩展名检测
            const extension = file.toLowerCase().split('.').pop();
            switch (extension) {
                case 'pdf':
                    return DocumentType.PDF;
                case 'doc':
                case 'docx':
                    return DocumentType.WORD;
                case 'xls':
                case 'xlsx':
                    return DocumentType.EXCEL;
                case 'ppt':
                case 'pptx':
                    return DocumentType.POWERPOINT;
                case 'txt':
                case 'md':
                case 'html':
                case 'htm':
                    return DocumentType.TEXT;
                case 'jpg':
                case 'jpeg':
                case 'png':
                case 'gif':
                case 'webp':
                    return DocumentType.IMAGE;
                default:
                    return DocumentType.UNKNOWN;
            }
        }
        else if (file instanceof File) {
            // 根据文件 MIME 类型检测
            const mimeType = file.type;
            if (mimeType.includes('pdf')) {
                return DocumentType.PDF;
            }
            else if (mimeType.includes('word') || mimeType.includes('document')) {
                return DocumentType.WORD;
            }
            else if (mimeType.includes('excel') || mimeType.includes('sheet')) {
                return DocumentType.EXCEL;
            }
            else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
                return DocumentType.POWERPOINT;
            }
            else if (mimeType.includes('text')) {
                return DocumentType.TEXT;
            }
            else if (mimeType.includes('image')) {
                return DocumentType.IMAGE;
            }
            else {
                return DocumentType.UNKNOWN;
            }
        }
        else {
            // ArrayBuffer 类型，需要进一步分析
            return DocumentType.UNKNOWN;
        }
    }
    /**
     * 注册解析器
     */
    registerParser(parser) {
        parser.supportedTypes.forEach(type => {
            this.parsers.set(type, parser);
            logger.info(`Registered parser for ${type}`);
        });
    }
    /**
     * 获取解析器
     */
    getParser(type) {
        return this.parsers.get(type);
    }
    /**
     * 根据文件获取合适的解析器
     */
    async getParserForFile(file) {
        // 首先尝试检测文档类型
        // 创建一个具体的解析器实例来检测类型
        const type = await this.detectType(file);
        // 根据类型获取解析器
        const parser = this.getParser(type);
        if (parser) {
            return parser;
        }
        // 如果没有找到特定类型的解析器，尝试使用文本解析器作为后备
        return this.getParser(DocumentType.TEXT);
    }
    /**
     * 获取所有支持的文档类型
     */
    getSupportedTypes() {
        return Array.from(this.parsers.keys());
    }
    /**
     * 解析文档（自动选择解析器）
     */
    async parse(file, options) {
        // 检查是否启用缓存
        if (options?.enableCache) {
            const cacheKey = cacheManager.generateKey(file);
            const cachedResult = cacheManager.get(cacheKey);
            if (cachedResult) {
                logger.info('Cache hit for document parsing');
                return cachedResult;
            }
        }
        const parser = await this.getParserForFile(file);
        if (parser) {
            const result = await parser.parse(file, options);
            // 缓存结果
            if (options?.enableCache && result.success) {
                const cacheKey = cacheManager.generateKey(file);
                cacheManager.set(cacheKey, result, options.cacheExpiry);
                logger.info('Document parsing result cached');
            }
            return result;
        }
        // 如果没有找到解析器，返回错误
        // 创建元数据
        const metadata = {
            name: typeof file === 'string' ? file.split('/').pop() || 'Unknown' : file instanceof File ? file.name : 'Unknown',
            type: DocumentType.UNKNOWN,
            size: typeof file === 'string' ? 0 : file instanceof File ? file.size : file.byteLength,
            createdAt: new Date(),
            modifiedAt: new Date(),
        };
        return {
            metadata,
            content: [],
            parseTime: 0,
            success: false,
            error: 'No suitable parser found for this document type',
        };
    }
}
/**
 * 全局文档解析器注册表实例
 */
export const documentParserRegistry = new DefaultDocumentParserRegistry();
// 注册默认解析器
documentParserRegistry.registerParser(new TextDocumentParser());
/**
 * PDF 文档解析器
 */
export class PDFDocumentParser extends BaseDocumentParser {
    constructor() {
        super(...arguments);
        this.supportedTypes = [DocumentType.PDF];
    }
    async parse(file, options) {
        try {
            let buffer;
            if (file instanceof File) {
                buffer = await file.arrayBuffer();
            }
            else if (typeof file === 'string') {
                // 在浏览器环境中，无法直接读取文件系统
                throw new Error('File path not supported in browser environment');
            }
            else {
                buffer = file;
            }
            // 使用 pdf-parse 库解析 PDF
            // @ts-ignore - 忽略类型错误，因为 pdf-parse 类型定义可能不完整
            const pdfData = await pdf(buffer);
            const metadata = await this.parseMetadata(file);
            metadata.pageCount = pdfData.numpages;
            metadata.author = pdfData.info?.Author || 'Unknown';
            metadata.title = pdfData.info?.Title || 'Unknown';
            metadata.subject = pdfData.info?.Subject || 'Unknown';
            metadata.keywords = pdfData.info?.Keywords ? pdfData.info.Keywords.split(';') : [];
            metadata.wordCount = pdfData.text ? pdfData.text.split(/\s+/).length : 0;
            metadata.charCount = pdfData.text ? pdfData.text.length : 0;
            const content = [];
            if (pdfData.text) {
                content.push({
                    type: ContentType.TEXT,
                    text: pdfData.text,
                });
            }
            return await this.createParseResult(metadata, content, options);
        }
        catch (error) {
            logger.error('Failed to parse PDF document:', error);
            const metadata = await this.parseMetadata(file);
            return {
                metadata,
                content: [],
                parseTime: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to parse PDF document',
            };
        }
    }
}
/**
 * Word 文档解析器
 */
export class WordDocumentParser extends BaseDocumentParser {
    constructor() {
        super(...arguments);
        this.supportedTypes = [DocumentType.WORD];
    }
    async parse(file, options) {
        try {
            let buffer;
            if (file instanceof File) {
                buffer = await file.arrayBuffer();
            }
            else if (typeof file === 'string') {
                // 在浏览器环境中，无法直接读取文件系统
                throw new Error('File path not supported in browser environment');
            }
            else {
                buffer = file;
            }
            // 使用 mammoth.js 解析 Word 文档
            const result = await mammoth.extractRawText({ arrayBuffer: buffer });
            const text = result.value;
            const metadata = await this.parseMetadata(file);
            metadata.wordCount = text.split(/\s+/).length;
            metadata.charCount = text.length;
            const content = [
                {
                    type: ContentType.TEXT,
                    text,
                },
            ];
            return await this.createParseResult(metadata, content, options);
        }
        catch (error) {
            logger.error('Failed to parse Word document:', error);
            const metadata = await this.parseMetadata(file);
            return {
                metadata,
                content: [],
                parseTime: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to parse Word document',
            };
        }
    }
}
/**
 * Excel 文档解析器
 */
export class ExcelDocumentParser extends BaseDocumentParser {
    constructor() {
        super(...arguments);
        this.supportedTypes = [DocumentType.EXCEL];
    }
    async parse(file, options) {
        try {
            let buffer;
            if (file instanceof File) {
                buffer = await file.arrayBuffer();
            }
            else if (typeof file === 'string') {
                // 在浏览器环境中，无法直接读取文件系统
                throw new Error('File path not supported in browser environment');
            }
            else {
                buffer = file;
            }
            // 使用 xlsx 库解析 Excel
            const workbook = XLSX.read(buffer);
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            const metadata = await this.parseMetadata(file);
            metadata.pageCount = workbook.SheetNames.length;
            const content = [
                {
                    type: ContentType.TABLE,
                    rows: jsonData,
                },
            ];
            // 提取文本内容
            const textContent = jsonData.flat().join(' ');
            content.push({
                type: ContentType.TEXT,
                text: textContent,
            });
            return await this.createParseResult(metadata, content, options);
        }
        catch (error) {
            logger.error('Failed to parse Excel document:', error);
            const metadata = await this.parseMetadata(file);
            return {
                metadata,
                content: [],
                parseTime: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to parse Excel document',
            };
        }
    }
}
/**
 * PowerPoint 文档解析器
 */
export class PowerPointDocumentParser extends BaseDocumentParser {
    constructor() {
        super(...arguments);
        this.supportedTypes = [DocumentType.POWERPOINT];
    }
    async parse(file, options) {
        try {
            let buffer;
            if (file instanceof File) {
                buffer = await file.arrayBuffer();
            }
            else if (typeof file === 'string') {
                // 在浏览器环境中，无法直接读取文件系统
                throw new Error('File path not supported in browser environment');
            }
            else {
                buffer = file;
            }
            // 尝试解析PowerPoint文件
            // 由于没有直接的pptx解析库，我们尝试作为zip文件打开并提取文本
            // 这里使用简化的实现，实际项目中可以集成专门的pptx解析库
            const metadata = await this.parseMetadata(file);
            metadata.pageCount = 0;
            let text = '';
            // 尝试作为zip文件处理
            try {
                // 这里只是一个占位符实现，实际项目中需要使用专门的库
                text = 'PowerPoint presentation content';
                metadata.pageCount = 5;
            }
            catch (e) {
                logger.warn('Failed to parse PowerPoint file as zip:', e);
                text = 'PowerPoint presentation content placeholder';
            }
            const content = [
                {
                    type: ContentType.TEXT,
                    text,
                },
            ];
            return await this.createParseResult(metadata, content, options);
        }
        catch (error) {
            logger.error('Failed to parse PowerPoint document:', error);
            const metadata = await this.parseMetadata(file);
            return {
                metadata,
                content: [],
                parseTime: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to parse PowerPoint document',
            };
        }
    }
}
/**
 * 图像文档解析器
 */
export class ImageDocumentParser extends BaseDocumentParser {
    constructor() {
        super(...arguments);
        this.supportedTypes = [DocumentType.IMAGE];
    }
    async parse(file, options) {
        try {
            let imageUrl = '';
            if (file instanceof File) {
                imageUrl = URL.createObjectURL(file);
            }
            else if (typeof file === 'string') {
                imageUrl = file;
            }
            else {
                // 将 ArrayBuffer 转换为 data URL
                const blob = new Blob([file]);
                imageUrl = URL.createObjectURL(blob);
            }
            const metadata = await this.parseMetadata(file);
            const content = [
                {
                    type: ContentType.IMAGE,
                    url: imageUrl,
                },
            ];
            // 如果启用了 OCR，执行 OCR 处理
            if (options?.enableOCR) {
                const ocrText = await this.performOCR(file, options.ocrLanguage);
                content.push({
                    type: ContentType.TEXT,
                    text: ocrText,
                });
            }
            return await this.createParseResult(metadata, content, options);
        }
        catch (error) {
            logger.error('Failed to parse image document:', error);
            const metadata = await this.parseMetadata(file);
            return {
                metadata,
                content: [],
                parseTime: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to parse image document',
            };
        }
    }
}
/**
 * Markdown 文档解析器
 */
export class MarkdownDocumentParser extends BaseDocumentParser {
    constructor() {
        super(...arguments);
        this.supportedTypes = [DocumentType.TEXT];
    }
    async parse(file, options) {
        try {
            let text = '';
            if (file instanceof File) {
                text = await file.text();
            }
            else if (typeof file === 'string') {
                text = file;
            }
            else {
                text = new TextDecoder('utf-8').decode(file);
            }
            const metadata = await this.parseMetadata(file);
            metadata.wordCount = text.split(/\s+/).length;
            metadata.charCount = text.length;
            // 提取Markdown中的标题、列表等结构
            const content = [
                {
                    type: ContentType.TEXT,
                    text,
                },
            ];
            return await this.createParseResult(metadata, content, options);
        }
        catch (error) {
            logger.error('Failed to parse Markdown document:', error);
            const metadata = await this.parseMetadata(file);
            return {
                metadata,
                content: [],
                parseTime: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to parse Markdown document',
            };
        }
    }
}
// 注册其他解析器
documentParserRegistry.registerParser(new PDFDocumentParser());
documentParserRegistry.registerParser(new WordDocumentParser());
documentParserRegistry.registerParser(new ExcelDocumentParser());
documentParserRegistry.registerParser(new PowerPointDocumentParser());
documentParserRegistry.registerParser(new ImageDocumentParser());
documentParserRegistry.registerParser(new MarkdownDocumentParser());
/**
 * 文档解析工具类
 */
export class DocumentParserUtil {
    /**
     * 解析文档
     */
    static async parse(file, options) {
        return documentParserRegistry.parse(file, options);
    }
    /**
     * 提取纯文本
     */
    static async extractText(file, options) {
        const result = await this.parse(file, { ...options, extractText: true });
        return result.text || '';
    }
    /**
     * 提取表格
     */
    static async extractTables(file, options) {
        const result = await this.parse(file, { ...options, extractTables: true });
        return result.content.filter((item) => item.type === ContentType.TABLE);
    }
    /**
     * 提取图片
     */
    static async extractImages(file, options) {
        const result = await this.parse(file, { ...options, extractImages: true });
        return result.content.filter((item) => item.type === ContentType.IMAGE);
    }
    /**
     * 分块处理文档
     */
    static chunkDocument(content, chunkSize = 2000, chunkOverlap = 200) {
        const chunks = [];
        let startIndex = 0;
        while (startIndex < content.length) {
            const endIndex = Math.min(startIndex + chunkSize, content.length);
            const chunk = content.substring(startIndex, endIndex);
            chunks.push({ text: chunk, startIndex, endIndex });
            startIndex = endIndex - chunkOverlap;
            if (startIndex >= content.length - chunkOverlap) {
                break;
            }
        }
        return chunks;
    }
    /**
     * 获取支持的文档类型
     */
    static getSupportedTypes() {
        return documentParserRegistry.getSupportedTypes();
    }
    /**
     * 注册自定义解析器
     */
    static registerParser(parser) {
        documentParserRegistry.registerParser(parser);
    }
}
export default DocumentParserUtil;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnQtcGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL2RvY3VtZW50LXBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxVQUFVO0FBRVYsT0FBTyxFQUNMLFlBQVksRUFRWixXQUFXLEdBSVosTUFBTSxtQkFBbUIsQ0FBQztBQUMzQixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ2xDLE9BQU8sS0FBSyxHQUFHLE1BQU0sV0FBVyxDQUFDO0FBQ2pDLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBQzdCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxjQUFjLENBQUM7QUFDNUMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sS0FBSyxPQUFPLE1BQU0sU0FBUyxDQUFDO0FBRW5DOztHQUVHO0FBQ0gsTUFBTSxPQUFnQixrQkFBa0I7SUFHdEM7O09BRUc7SUFDSCxLQUFLLENBQUMsVUFBVSxDQUFDLElBQWlDO1FBQ2hELElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDN0IsWUFBWTtZQUNaLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDdEQsUUFBUSxTQUFTLEVBQUUsQ0FBQztnQkFDbEIsS0FBSyxLQUFLO29CQUNSLE9BQU8sWUFBWSxDQUFDLEdBQUcsQ0FBQztnQkFDMUIsS0FBSyxLQUFLLENBQUM7Z0JBQ1gsS0FBSyxNQUFNO29CQUNULE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQztnQkFDM0IsS0FBSyxLQUFLLENBQUM7Z0JBQ1gsS0FBSyxNQUFNO29CQUNULE9BQU8sWUFBWSxDQUFDLEtBQUssQ0FBQztnQkFDNUIsS0FBSyxLQUFLLENBQUM7Z0JBQ1gsS0FBSyxNQUFNO29CQUNULE9BQU8sWUFBWSxDQUFDLFVBQVUsQ0FBQztnQkFDakMsS0FBSyxLQUFLLENBQUM7Z0JBQ1gsS0FBSyxJQUFJLENBQUM7Z0JBQ1YsS0FBSyxNQUFNLENBQUM7Z0JBQ1osS0FBSyxLQUFLO29CQUNSLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQztnQkFDM0IsS0FBSyxLQUFLLENBQUM7Z0JBQ1gsS0FBSyxNQUFNLENBQUM7Z0JBQ1osS0FBSyxLQUFLLENBQUM7Z0JBQ1gsS0FBSyxLQUFLLENBQUM7Z0JBQ1gsS0FBSyxNQUFNO29CQUNULE9BQU8sWUFBWSxDQUFDLEtBQUssQ0FBQztnQkFDNUI7b0JBQ0UsT0FBTyxZQUFZLENBQUMsT0FBTyxDQUFDO1lBQ2hDLENBQUM7UUFDSCxDQUFDO2FBQU0sSUFBSSxJQUFJLFlBQVksSUFBSSxFQUFFLENBQUM7WUFDaEMsaUJBQWlCO1lBQ2pCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7WUFDM0IsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzdCLE9BQU8sWUFBWSxDQUFDLEdBQUcsQ0FBQztZQUMxQixDQUFDO2lCQUFNLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RFLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQztZQUMzQixDQUFDO2lCQUFNLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ3BFLE9BQU8sWUFBWSxDQUFDLEtBQUssQ0FBQztZQUM1QixDQUFDO2lCQUFNLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hGLE9BQU8sWUFBWSxDQUFDLFVBQVUsQ0FBQztZQUNqQyxDQUFDO2lCQUFNLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUNyQyxPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUM7WUFDM0IsQ0FBQztpQkFBTSxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDdEMsT0FBTyxZQUFZLENBQUMsS0FBSyxDQUFDO1lBQzVCLENBQUM7aUJBQU0sQ0FBQztnQkFDTixPQUFPLFlBQVksQ0FBQyxPQUFPLENBQUM7WUFDOUIsQ0FBQztRQUNILENBQUM7YUFBTSxDQUFDO1lBQ04sMkJBQTJCO1lBQzNCLE9BQU8sSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzlDLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSyx5QkFBeUIsQ0FBQyxNQUFtQjtRQUNuRCxNQUFNLElBQUksR0FBRyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtRQUUxRCxrQkFBa0I7UUFDbEIsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNyRyxPQUFPLFlBQVksQ0FBQyxHQUFHLENBQUM7UUFDMUIsQ0FBQztRQUVELDZCQUE2QjtRQUM3QixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3pDLDRCQUE0QjtZQUM1QixPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUM7UUFDM0IsQ0FBQztRQUVELGlCQUFpQjtRQUNqQixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ3pDLE9BQU8sWUFBWSxDQUFDLEtBQUssQ0FBQztRQUM1QixDQUFDO1FBRUQsc0JBQXNCO1FBQ3RCLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ2pGLE9BQU8sWUFBWSxDQUFDLEtBQUssQ0FBQztRQUM1QixDQUFDO1FBRUQsbUJBQW1CO1FBQ25CLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUM3RCxPQUFPLFlBQVksQ0FBQyxLQUFLLENBQUM7UUFDNUIsQ0FBQztRQUVELHVDQUF1QztRQUN2QyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJO1lBQzVFLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNuRixPQUFPLFlBQVksQ0FBQyxLQUFLLENBQUM7UUFDNUIsQ0FBQztRQUVELDhCQUE4QjtRQUM5QixJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFDbEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3BELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyQixxQkFBcUI7WUFDckIsSUFBSSxJQUFJLEdBQUcsRUFBRSxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksSUFBSSxLQUFLLEVBQUUsSUFBSSxJQUFJLEtBQUssRUFBRSxFQUFFLENBQUM7Z0JBQzFELE1BQU0sR0FBRyxLQUFLLENBQUM7Z0JBQ2YsTUFBTTtZQUNSLENBQUM7UUFDSCxDQUFDO1FBQ0QsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNYLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQztRQUMzQixDQUFDO1FBRUQsT0FBTyxZQUFZLENBQUMsT0FBTyxDQUFDO0lBQzlCLENBQUM7SUFPRDs7T0FFRztJQUNILEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBaUM7UUFDbkQsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pDLElBQUksSUFBSSxHQUFHLFNBQVMsQ0FBQztRQUNyQixJQUFJLElBQUksR0FBRyxDQUFDLENBQUM7UUFFYixJQUFJLElBQUksWUFBWSxJQUFJLEVBQUUsQ0FBQztZQUN6QixJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztZQUNqQixJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUNuQixDQUFDO2FBQU0sSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxTQUFTLENBQUM7WUFDMUMscUJBQXFCO1lBQ3JCLElBQUksR0FBRyxDQUFDLENBQUM7UUFDWCxDQUFDO2FBQU0sQ0FBQztZQUNOLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ3pCLENBQUM7UUFFRCxPQUFPO1lBQ0wsSUFBSTtZQUNKLElBQUk7WUFDSixJQUFJO1lBQ0osU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFO1lBQ3JCLFVBQVUsRUFBRSxJQUFJLElBQUksRUFBRTtTQUN2QixDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFpQyxFQUFFLE9BQXNCO1FBQ3pFLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFBRSxHQUFHLE9BQU8sRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN6RSxPQUFPLE1BQU0sQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBaUMsRUFBRSxPQUFzQjtRQUMzRSxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsR0FBRyxPQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDM0UsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBd0IsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hHLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBaUMsRUFBRSxPQUFzQjtRQUMzRSxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsR0FBRyxPQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDM0UsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBd0IsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hHLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBa0MsRUFBRSxXQUFtQixLQUFLO1FBQzNFLE1BQU0sQ0FBQyxJQUFJLENBQUMsK0JBQStCLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFdkQsSUFBSSxDQUFDO1lBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDNUMsTUFBTSxNQUFNLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRXBDLE1BQU0sV0FBVyxHQUFHLEtBQUssWUFBWSxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBRTdFLE1BQU0sTUFBTSxHQUFHLE1BQU0sTUFBTSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUNuRCxNQUFNLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUV6QixPQUFPLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUNsQyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE1BQU0sQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ25DLE9BQU8sRUFBRSxDQUFDO1FBQ1osQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBaUM7UUFDOUMsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pDLHFCQUFxQjtRQUNyQixPQUFPLElBQUksS0FBSyxZQUFZLENBQUMsS0FBSyxDQUFDO0lBQ3JDLENBQUM7SUFFRDs7T0FFRztJQUNILGFBQWEsQ0FBQyxPQUFlLEVBQUUsWUFBb0IsSUFBSSxFQUFFLGVBQXVCLEdBQUc7UUFDakYsTUFBTSxNQUFNLEdBQTZELEVBQUUsQ0FBQztRQUM1RSxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7UUFFbkIsT0FBTyxVQUFVLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ25DLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFHLFNBQVMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDbEUsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdEQsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDbkQsVUFBVSxHQUFHLFFBQVEsR0FBRyxZQUFZLENBQUM7WUFDckMsSUFBSSxVQUFVLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxZQUFZLEVBQUUsQ0FBQztnQkFDaEQsTUFBTTtZQUNSLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQUVEOztPQUVHO0lBQ08sS0FBSyxDQUFDLGlCQUFpQixDQUFDLFFBQTBCLEVBQUUsT0FBMEIsRUFBRSxPQUFzQjtRQUM5RyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFN0IsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2QsSUFBSSxLQUFLLEdBQW1CLEVBQUUsQ0FBQztRQUMvQixJQUFJLE1BQU0sR0FBaUYsRUFBRSxDQUFDO1FBRTlGLFNBQVM7UUFDVCxJQUFJLE9BQU8sRUFBRSxTQUFTLEVBQUUsQ0FBQztZQUN2QixNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUF3QixFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdEcsS0FBSyxNQUFNLFlBQVksSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDekMsSUFBSSxDQUFDO29CQUNILE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztvQkFDN0Usa0JBQWtCO29CQUNsQixPQUFPLENBQUMsSUFBSSxDQUFDO3dCQUNYLElBQUksRUFBRSxXQUFXLENBQUMsSUFBSTt3QkFDdEIsSUFBSSxFQUFFLE9BQU87cUJBQ2QsQ0FBQyxDQUFDO2dCQUNMLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDZixNQUFNLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDckMsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsUUFBUTtRQUNSLElBQUksT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDO1lBQ3pCLElBQUksR0FBRyxPQUFPO2lCQUNYLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBdUIsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssV0FBVyxDQUFDLElBQUksQ0FBQztpQkFDckUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztpQkFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hCLENBQUM7UUFFRCxVQUFVO1FBQ1YsSUFBSSxPQUFPLEVBQUUsV0FBVyxFQUFFLENBQUM7WUFDekIsSUFBSSxXQUFXLEdBQXNCLEVBQUUsQ0FBQztZQUN4QyxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7WUFFbEIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDckIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDekMsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO3dCQUMzQixLQUFLLENBQUMsSUFBSSxDQUFDOzRCQUNULEtBQUssRUFBRSxTQUFTLEVBQUU7NEJBQ2xCLE9BQU8sRUFBRSxDQUFDLEdBQUcsV0FBVyxDQUFDO3lCQUMxQixDQUFDLENBQUM7d0JBQ0gsV0FBVyxHQUFHLEVBQUUsQ0FBQztvQkFDbkIsQ0FBQztnQkFDSCxDQUFDO3FCQUFNLENBQUM7b0JBQ04sV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDekIsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMzQixLQUFLLENBQUMsSUFBSSxDQUFDO29CQUNULEtBQUssRUFBRSxTQUFTO29CQUNoQixPQUFPLEVBQUUsV0FBVztpQkFDckIsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPO1FBQ1AsSUFBSSxPQUFPLEVBQUUsY0FBYyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ3BDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQ3JDLElBQUksRUFDSixPQUFPLENBQUMsU0FBUyxFQUNqQixPQUFPLENBQUMsWUFBWSxDQUNyQixDQUFDO1lBQ0YsTUFBTSxHQUFHLFlBQVksQ0FBQztRQUN4QixDQUFDO1FBRUQsT0FBTztZQUNMLFFBQVE7WUFDUixPQUFPO1lBQ1AsS0FBSztZQUNMLElBQUk7WUFDSixNQUFNO1lBQ04sU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTO1lBQ2pDLE9BQU8sRUFBRSxJQUFJO1NBQ2QsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGtCQUFtQixTQUFRLGtCQUFrQjtJQUExRDs7UUFDRSxtQkFBYyxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBd0N2QyxDQUFDO0lBdENDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBaUMsRUFBRSxPQUFzQjtRQUNuRSxJQUFJLENBQUM7WUFDSCxJQUFJLElBQUksR0FBRyxFQUFFLENBQUM7WUFFZCxJQUFJLElBQUksWUFBWSxJQUFJLEVBQUUsQ0FBQztnQkFDekIsSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzNCLENBQUM7aUJBQU0sSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDcEMscUJBQXFCO2dCQUNyQixhQUFhO2dCQUNiLElBQUksR0FBRyxJQUFJLENBQUM7WUFDZCxDQUFDO2lCQUFNLENBQUM7Z0JBQ04sSUFBSSxHQUFHLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvQyxDQUFDO1lBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hELFFBQVEsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUM7WUFDOUMsUUFBUSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBRWpDLE1BQU0sT0FBTyxHQUFzQjtnQkFDakM7b0JBQ0UsSUFBSSxFQUFFLFdBQVcsQ0FBQyxJQUFJO29CQUN0QixJQUFJO2lCQUNMO2FBQ0YsQ0FBQztZQUVGLE9BQU8sTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNsRSxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE1BQU0sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdEQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hELE9BQU87Z0JBQ0wsUUFBUTtnQkFDUixPQUFPLEVBQUUsRUFBRTtnQkFDWCxTQUFTLEVBQUUsQ0FBQztnQkFDWixPQUFPLEVBQUUsS0FBSztnQkFDZCxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsK0JBQStCO2FBQ2hGLENBQUM7UUFDSixDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sNkJBQTZCO0lBQTFDO1FBQ1UsWUFBTyxHQUFzQyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBa0pqRSxDQUFDO0lBaEpDOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFpQztRQUNoRCxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzdCLFlBQVk7WUFDWixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3RELFFBQVEsU0FBUyxFQUFFLENBQUM7Z0JBQ2xCLEtBQUssS0FBSztvQkFDUixPQUFPLFlBQVksQ0FBQyxHQUFHLENBQUM7Z0JBQzFCLEtBQUssS0FBSyxDQUFDO2dCQUNYLEtBQUssTUFBTTtvQkFDVCxPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUM7Z0JBQzNCLEtBQUssS0FBSyxDQUFDO2dCQUNYLEtBQUssTUFBTTtvQkFDVCxPQUFPLFlBQVksQ0FBQyxLQUFLLENBQUM7Z0JBQzVCLEtBQUssS0FBSyxDQUFDO2dCQUNYLEtBQUssTUFBTTtvQkFDVCxPQUFPLFlBQVksQ0FBQyxVQUFVLENBQUM7Z0JBQ2pDLEtBQUssS0FBSyxDQUFDO2dCQUNYLEtBQUssSUFBSSxDQUFDO2dCQUNWLEtBQUssTUFBTSxDQUFDO2dCQUNaLEtBQUssS0FBSztvQkFDUixPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUM7Z0JBQzNCLEtBQUssS0FBSyxDQUFDO2dCQUNYLEtBQUssTUFBTSxDQUFDO2dCQUNaLEtBQUssS0FBSyxDQUFDO2dCQUNYLEtBQUssS0FBSyxDQUFDO2dCQUNYLEtBQUssTUFBTTtvQkFDVCxPQUFPLFlBQVksQ0FBQyxLQUFLLENBQUM7Z0JBQzVCO29CQUNFLE9BQU8sWUFBWSxDQUFDLE9BQU8sQ0FBQztZQUNoQyxDQUFDO1FBQ0gsQ0FBQzthQUFNLElBQUksSUFBSSxZQUFZLElBQUksRUFBRSxDQUFDO1lBQ2hDLGlCQUFpQjtZQUNqQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQzNCLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUM3QixPQUFPLFlBQVksQ0FBQyxHQUFHLENBQUM7WUFDMUIsQ0FBQztpQkFBTSxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO2dCQUN0RSxPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUM7WUFDM0IsQ0FBQztpQkFBTSxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNwRSxPQUFPLFlBQVksQ0FBQyxLQUFLLENBQUM7WUFDNUIsQ0FBQztpQkFBTSxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO2dCQUNoRixPQUFPLFlBQVksQ0FBQyxVQUFVLENBQUM7WUFDakMsQ0FBQztpQkFBTSxJQUFJLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDckMsT0FBTyxZQUFZLENBQUMsSUFBSSxDQUFDO1lBQzNCLENBQUM7aUJBQU0sSUFBSSxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLE9BQU8sWUFBWSxDQUFDLEtBQUssQ0FBQztZQUM1QixDQUFDO2lCQUFNLENBQUM7Z0JBQ04sT0FBTyxZQUFZLENBQUMsT0FBTyxDQUFDO1lBQzlCLENBQUM7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNOLHlCQUF5QjtZQUN6QixPQUFPLFlBQVksQ0FBQyxPQUFPLENBQUM7UUFDOUIsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILGNBQWMsQ0FBQyxNQUFzQjtRQUNuQyxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNuQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDL0IsTUFBTSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMvQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsQ0FBQyxJQUFrQjtRQUMxQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hDLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFpQztRQUN0RCxhQUFhO1FBQ2Isb0JBQW9CO1FBQ3BCLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV6QyxZQUFZO1FBQ1osTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1gsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQztRQUVELCtCQUErQjtRQUMvQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzNDLENBQUM7SUFFRDs7T0FFRztJQUNILGlCQUFpQjtRQUNmLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFpQyxFQUFFLE9BQXNCO1FBQ25FLFdBQVc7UUFDWCxJQUFJLE9BQU8sRUFBRSxXQUFXLEVBQUUsQ0FBQztZQUN6QixNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hELE1BQU0sWUFBWSxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDaEQsSUFBSSxZQUFZLEVBQUUsQ0FBQztnQkFDakIsTUFBTSxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO2dCQUM5QyxPQUFPLFlBQVksQ0FBQztZQUN0QixDQUFDO1FBQ0gsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pELElBQUksTUFBTSxFQUFFLENBQUM7WUFDWCxNQUFNLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBRWpELE9BQU87WUFDUCxJQUFJLE9BQU8sRUFBRSxXQUFXLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUMzQyxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNoRCxZQUFZLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUN4RCxNQUFNLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLENBQUM7WUFDaEQsQ0FBQztZQUVELE9BQU8sTUFBTSxDQUFDO1FBQ2hCLENBQUM7UUFFRCxpQkFBaUI7UUFDakIsUUFBUTtRQUNSLE1BQU0sUUFBUSxHQUFxQjtZQUNqQyxJQUFJLEVBQUUsT0FBTyxJQUFJLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUztZQUNsSCxJQUFJLEVBQUUsWUFBWSxDQUFDLE9BQU87WUFDMUIsSUFBSSxFQUFFLE9BQU8sSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVTtZQUN2RixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUU7WUFDckIsVUFBVSxFQUFFLElBQUksSUFBSSxFQUFFO1NBQ3ZCLENBQUM7UUFDRixPQUFPO1lBQ0wsUUFBUTtZQUNSLE9BQU8sRUFBRSxFQUFFO1lBQ1gsU0FBUyxFQUFFLENBQUM7WUFDWixPQUFPLEVBQUUsS0FBSztZQUNkLEtBQUssRUFBRSxpREFBaUQ7U0FDekQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSw2QkFBNkIsRUFBRSxDQUFDO0FBRTFFLFVBQVU7QUFDVixzQkFBc0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxrQkFBa0IsRUFBRSxDQUFDLENBQUM7QUFFaEU7O0dBRUc7QUFDSCxNQUFNLE9BQU8saUJBQWtCLFNBQVEsa0JBQWtCO0lBQXpEOztRQUNFLG1CQUFjLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7SUFrRHRDLENBQUM7SUFoREMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFpQyxFQUFFLE9BQXNCO1FBQ25FLElBQUksQ0FBQztZQUNILElBQUksTUFBNEIsQ0FBQztZQUVqQyxJQUFJLElBQUksWUFBWSxJQUFJLEVBQUUsQ0FBQztnQkFDekIsTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3BDLENBQUM7aUJBQU0sSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDcEMscUJBQXFCO2dCQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLGdEQUFnRCxDQUFDLENBQUM7WUFDcEUsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLE1BQU0sR0FBRyxJQUFJLENBQUM7WUFDaEIsQ0FBQztZQUVELHVCQUF1QjtZQUN2Qiw2Q0FBNkM7WUFDN0MsTUFBTSxPQUFPLEdBQUcsTUFBTSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFbEMsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hELFFBQVEsQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQztZQUN0QyxRQUFRLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxJQUFJLFNBQVMsQ0FBQztZQUNwRCxRQUFRLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsS0FBSyxJQUFJLFNBQVMsQ0FBQztZQUNsRCxRQUFRLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxJQUFJLFNBQVMsQ0FBQztZQUN0RCxRQUFRLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNuRixRQUFRLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pFLFFBQVEsQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU1RCxNQUFNLE9BQU8sR0FBc0IsRUFBRSxDQUFDO1lBRXRDLElBQUksT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDO29CQUNYLElBQUksRUFBRSxXQUFXLENBQUMsSUFBSTtvQkFDdEIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO2lCQUNuQixDQUFDLENBQUM7WUFDTCxDQUFDO1lBRUQsT0FBTyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsTUFBTSxDQUFDLEtBQUssQ0FBQywrQkFBK0IsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNyRCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEQsT0FBTztnQkFDTCxRQUFRO2dCQUNSLE9BQU8sRUFBRSxFQUFFO2dCQUNYLFNBQVMsRUFBRSxDQUFDO2dCQUNaLE9BQU8sRUFBRSxLQUFLO2dCQUNkLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyw4QkFBOEI7YUFDL0UsQ0FBQztRQUNKLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxrQkFBa0I7SUFBMUQ7O1FBQ0UsbUJBQWMsR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQTJDdkMsQ0FBQztJQXpDQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQWlDLEVBQUUsT0FBc0I7UUFDbkUsSUFBSSxDQUFDO1lBQ0gsSUFBSSxNQUFtQixDQUFDO1lBRXhCLElBQUksSUFBSSxZQUFZLElBQUksRUFBRSxDQUFDO2dCQUN6QixNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDcEMsQ0FBQztpQkFBTSxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUNwQyxxQkFBcUI7Z0JBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0RBQWdELENBQUMsQ0FBQztZQUNwRSxDQUFDO2lCQUFNLENBQUM7Z0JBQ04sTUFBTSxHQUFHLElBQUksQ0FBQztZQUNoQixDQUFDO1lBRUQsMkJBQTJCO1lBQzNCLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ3JFLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUM7WUFFMUIsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hELFFBQVEsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUM7WUFDOUMsUUFBUSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBRWpDLE1BQU0sT0FBTyxHQUFzQjtnQkFDakM7b0JBQ0UsSUFBSSxFQUFFLFdBQVcsQ0FBQyxJQUFJO29CQUN0QixJQUFJO2lCQUNMO2FBQ0YsQ0FBQztZQUVGLE9BQU8sTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNsRSxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE1BQU0sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdEQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hELE9BQU87Z0JBQ0wsUUFBUTtnQkFDUixPQUFPLEVBQUUsRUFBRTtnQkFDWCxTQUFTLEVBQUUsQ0FBQztnQkFDWixPQUFPLEVBQUUsS0FBSztnQkFDZCxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsK0JBQStCO2FBQ2hGLENBQUM7UUFDSixDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsa0JBQWtCO0lBQTNEOztRQUNFLG1CQUFjLEdBQUcsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7SUFtRHhDLENBQUM7SUFqREMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFpQyxFQUFFLE9BQXNCO1FBQ25FLElBQUksQ0FBQztZQUNILElBQUksTUFBbUIsQ0FBQztZQUV4QixJQUFJLElBQUksWUFBWSxJQUFJLEVBQUUsQ0FBQztnQkFDekIsTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3BDLENBQUM7aUJBQU0sSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDcEMscUJBQXFCO2dCQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLGdEQUFnRCxDQUFDLENBQUM7WUFDcEUsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLE1BQU0sR0FBRyxJQUFJLENBQUM7WUFDaEIsQ0FBQztZQUVELG9CQUFvQjtZQUNwQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUMsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNsRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUVwRSxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEQsUUFBUSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQztZQUVoRCxNQUFNLE9BQU8sR0FBc0I7Z0JBQ2pDO29CQUNFLElBQUksRUFBRSxXQUFXLENBQUMsS0FBSztvQkFDdkIsSUFBSSxFQUFFLFFBQXNCO2lCQUM3QjthQUNGLENBQUM7WUFFRixTQUFTO1lBQ1QsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM5QyxPQUFPLENBQUMsSUFBSSxDQUFDO2dCQUNYLElBQUksRUFBRSxXQUFXLENBQUMsSUFBSTtnQkFDdEIsSUFBSSxFQUFFLFdBQVc7YUFDbEIsQ0FBQyxDQUFDO1lBRUgsT0FBTyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsTUFBTSxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN2RCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEQsT0FBTztnQkFDTCxRQUFRO2dCQUNSLE9BQU8sRUFBRSxFQUFFO2dCQUNYLFNBQVMsRUFBRSxDQUFDO2dCQUNaLE9BQU8sRUFBRSxLQUFLO2dCQUNkLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0M7YUFDakYsQ0FBQztRQUNKLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxrQkFBa0I7SUFBaEU7O1FBQ0UsbUJBQWMsR0FBRyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQXFEN0MsQ0FBQztJQW5EQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQWlDLEVBQUUsT0FBc0I7UUFDbkUsSUFBSSxDQUFDO1lBQ0gsSUFBSSxNQUFtQixDQUFDO1lBRXhCLElBQUksSUFBSSxZQUFZLElBQUksRUFBRSxDQUFDO2dCQUN6QixNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDcEMsQ0FBQztpQkFBTSxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUNwQyxxQkFBcUI7Z0JBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0RBQWdELENBQUMsQ0FBQztZQUNwRSxDQUFDO2lCQUFNLENBQUM7Z0JBQ04sTUFBTSxHQUFHLElBQUksQ0FBQztZQUNoQixDQUFDO1lBRUQsbUJBQW1CO1lBQ25CLG9DQUFvQztZQUNwQyxnQ0FBZ0M7WUFDaEMsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hELFFBQVEsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO1lBRXZCLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUVkLGNBQWM7WUFDZCxJQUFJLENBQUM7Z0JBQ0gsNEJBQTRCO2dCQUM1QixJQUFJLEdBQUcsaUNBQWlDLENBQUM7Z0JBQ3pDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO1lBQ3pCLENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNYLE1BQU0sQ0FBQyxJQUFJLENBQUMseUNBQXlDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFELElBQUksR0FBRyw2Q0FBNkMsQ0FBQztZQUN2RCxDQUFDO1lBRUQsTUFBTSxPQUFPLEdBQXNCO2dCQUNqQztvQkFDRSxJQUFJLEVBQUUsV0FBVyxDQUFDLElBQUk7b0JBQ3RCLElBQUk7aUJBQ0w7YUFDRixDQUFDO1lBRUYsT0FBTyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsTUFBTSxDQUFDLEtBQUssQ0FBQyxzQ0FBc0MsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM1RCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEQsT0FBTztnQkFDTCxRQUFRO2dCQUNSLE9BQU8sRUFBRSxFQUFFO2dCQUNYLFNBQVMsRUFBRSxDQUFDO2dCQUNaLE9BQU8sRUFBRSxLQUFLO2dCQUNkLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxxQ0FBcUM7YUFDdEYsQ0FBQztRQUNKLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFFRDs7R0FFRztBQUNILE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxrQkFBa0I7SUFBM0Q7O1FBQ0UsbUJBQWMsR0FBRyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQStDeEMsQ0FBQztJQTdDQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQWlDLEVBQUUsT0FBc0I7UUFDbkUsSUFBSSxDQUFDO1lBQ0gsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDO1lBRWxCLElBQUksSUFBSSxZQUFZLElBQUksRUFBRSxDQUFDO2dCQUN6QixRQUFRLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2QyxDQUFDO2lCQUFNLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQ3BDLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDbEIsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLDZCQUE2QjtnQkFDN0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixRQUFRLEdBQUcsR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2QyxDQUFDO1lBRUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRWhELE1BQU0sT0FBTyxHQUFzQjtnQkFDakM7b0JBQ0UsSUFBSSxFQUFFLFdBQVcsQ0FBQyxLQUFLO29CQUN2QixHQUFHLEVBQUUsUUFBUTtpQkFDZDthQUNGLENBQUM7WUFFRixzQkFBc0I7WUFDdEIsSUFBSSxPQUFPLEVBQUUsU0FBUyxFQUFFLENBQUM7Z0JBQ3ZCLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUNqRSxPQUFPLENBQUMsSUFBSSxDQUFDO29CQUNYLElBQUksRUFBRSxXQUFXLENBQUMsSUFBSTtvQkFDdEIsSUFBSSxFQUFFLE9BQU87aUJBQ2QsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUVELE9BQU8sTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNsRSxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE1BQU0sQ0FBQyxLQUFLLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdkQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hELE9BQU87Z0JBQ0wsUUFBUTtnQkFDUixPQUFPLEVBQUUsRUFBRTtnQkFDWCxTQUFTLEVBQUUsQ0FBQztnQkFDWixPQUFPLEVBQUUsS0FBSztnQkFDZCxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZ0NBQWdDO2FBQ2pGLENBQUM7UUFDSixDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsa0JBQWtCO0lBQTlEOztRQUNFLG1CQUFjLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7SUF1Q3ZDLENBQUM7SUFyQ0MsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFpQyxFQUFFLE9BQXNCO1FBQ25FLElBQUksQ0FBQztZQUNILElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUVkLElBQUksSUFBSSxZQUFZLElBQUksRUFBRSxDQUFDO2dCQUN6QixJQUFJLEdBQUcsTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDM0IsQ0FBQztpQkFBTSxJQUFJLE9BQU8sSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUNwQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBQ2QsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLElBQUksR0FBRyxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDL0MsQ0FBQztZQUVELE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoRCxRQUFRLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDO1lBQzlDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUVqQyx1QkFBdUI7WUFDdkIsTUFBTSxPQUFPLEdBQXNCO2dCQUNqQztvQkFDRSxJQUFJLEVBQUUsV0FBVyxDQUFDLElBQUk7b0JBQ3RCLElBQUk7aUJBQ0w7YUFDRixDQUFDO1lBRUYsT0FBTyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsTUFBTSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMxRCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEQsT0FBTztnQkFDTCxRQUFRO2dCQUNSLE9BQU8sRUFBRSxFQUFFO2dCQUNYLFNBQVMsRUFBRSxDQUFDO2dCQUNaLE9BQU8sRUFBRSxLQUFLO2dCQUNkLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxtQ0FBbUM7YUFDcEYsQ0FBQztRQUNKLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFFRCxVQUFVO0FBQ1Ysc0JBQXNCLENBQUMsY0FBYyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO0FBQy9ELHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxJQUFJLGtCQUFrQixFQUFFLENBQUMsQ0FBQztBQUNoRSxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxtQkFBbUIsRUFBRSxDQUFDLENBQUM7QUFDakUsc0JBQXNCLENBQUMsY0FBYyxDQUFDLElBQUksd0JBQXdCLEVBQUUsQ0FBQyxDQUFDO0FBQ3RFLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxJQUFJLG1CQUFtQixFQUFFLENBQUMsQ0FBQztBQUNqRSxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxzQkFBc0IsRUFBRSxDQUFDLENBQUM7QUFFcEU7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0JBQWtCO0lBQzdCOztPQUVHO0lBQ0gsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBaUMsRUFBRSxPQUFzQjtRQUMxRSxPQUFPLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDckQsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBaUMsRUFBRSxPQUFzQjtRQUNoRixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsR0FBRyxPQUFPLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDekUsT0FBTyxNQUFNLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUQ7O09BRUc7SUFDSCxNQUFNLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFpQyxFQUFFLE9BQXNCO1FBQ2xGLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFBRSxHQUFHLE9BQU8sRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMzRSxPQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUF3QixFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEcsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBaUMsRUFBRSxPQUFzQjtRQUNsRixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsR0FBRyxPQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDM0UsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBd0IsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hHLENBQUM7SUFFRDs7T0FFRztJQUNILE1BQU0sQ0FBQyxhQUFhLENBQUMsT0FBZSxFQUFFLFlBQW9CLElBQUksRUFBRSxlQUF1QixHQUFHO1FBQ3hGLE1BQU0sTUFBTSxHQUE2RCxFQUFFLENBQUM7UUFDNUUsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBRW5CLE9BQU8sVUFBVSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNuQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsR0FBRyxTQUFTLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2xFLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3RELE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ25ELFVBQVUsR0FBRyxRQUFRLEdBQUcsWUFBWSxDQUFDO1lBQ3JDLElBQUksVUFBVSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsWUFBWSxFQUFFLENBQUM7Z0JBQ2hELE1BQU07WUFDUixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7SUFFRDs7T0FFRztJQUNILE1BQU0sQ0FBQyxpQkFBaUI7UUFDdEIsT0FBTyxzQkFBc0IsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQ3BELENBQUM7SUFFRDs7T0FFRztJQUNILE1BQU0sQ0FBQyxjQUFjLENBQUMsTUFBc0I7UUFDMUMsc0JBQXNCLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2hELENBQUM7Q0FDRjtBQUVELGVBQWUsa0JBQWtCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyDmlofmoaPop6PmnpDlmajlrp7njrBcblxuaW1wb3J0IHtcbiAgRG9jdW1lbnRUeXBlLFxuICBEb2N1bWVudE1ldGFkYXRhLFxuICBEb2N1bWVudENvbnRlbnQsXG4gIERvY3VtZW50UGFnZSxcbiAgRG9jdW1lbnRQYXJzZVJlc3VsdCxcbiAgUGFyc2VPcHRpb25zLFxuICBEb2N1bWVudFBhcnNlcixcbiAgRG9jdW1lbnRQYXJzZXJSZWdpc3RyeSxcbiAgQ29udGVudFR5cGUsXG4gIFRleHRDb250ZW50LFxuICBUYWJsZUNvbnRlbnQsXG4gIEltYWdlQ29udGVudCxcbn0gZnJvbSAnLi4vdHlwZXMvZG9jdW1lbnQnO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSAnLi9sb2dnZXInO1xuaW1wb3J0ICogYXMgcGRmIGZyb20gJ3BkZi1wYXJzZSc7XG5pbXBvcnQgKiBhcyBYTFNYIGZyb20gJ3hsc3gnO1xuaW1wb3J0IHsgY3JlYXRlV29ya2VyIH0gZnJvbSAndGVzc2VyYWN0LmpzJztcbmltcG9ydCB7IGNhY2hlTWFuYWdlciB9IGZyb20gJy4vY2FjaGUtbWFuYWdlcic7XG5pbXBvcnQgKiBhcyBtYW1tb3RoIGZyb20gJ21hbW1vdGgnO1xuXG4vKipcbiAqIOWfuuehgOaWh+aho+ino+aekOWZqOexu1xuICovXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQmFzZURvY3VtZW50UGFyc2VyIGltcGxlbWVudHMgRG9jdW1lbnRQYXJzZXIge1xuICBhYnN0cmFjdCBzdXBwb3J0ZWRUeXBlczogRG9jdW1lbnRUeXBlW107XG5cbiAgLyoqXG4gICAqIOajgOa1i+aWh+aho+exu+Wei1xuICAgKi9cbiAgYXN5bmMgZGV0ZWN0VHlwZShmaWxlOiBGaWxlIHwgQXJyYXlCdWZmZXIgfCBzdHJpbmcpOiBQcm9taXNlPERvY3VtZW50VHlwZT4ge1xuICAgIGlmICh0eXBlb2YgZmlsZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIC8vIOagueaNruaWh+S7tuaJqeWxleWQjeajgOa1i1xuICAgICAgY29uc3QgZXh0ZW5zaW9uID0gZmlsZS50b0xvd2VyQ2FzZSgpLnNwbGl0KCcuJykucG9wKCk7XG4gICAgICBzd2l0Y2ggKGV4dGVuc2lvbikge1xuICAgICAgICBjYXNlICdwZGYnOlxuICAgICAgICAgIHJldHVybiBEb2N1bWVudFR5cGUuUERGO1xuICAgICAgICBjYXNlICdkb2MnOlxuICAgICAgICBjYXNlICdkb2N4JzpcbiAgICAgICAgICByZXR1cm4gRG9jdW1lbnRUeXBlLldPUkQ7XG4gICAgICAgIGNhc2UgJ3hscyc6XG4gICAgICAgIGNhc2UgJ3hsc3gnOlxuICAgICAgICAgIHJldHVybiBEb2N1bWVudFR5cGUuRVhDRUw7XG4gICAgICAgIGNhc2UgJ3BwdCc6XG4gICAgICAgIGNhc2UgJ3BwdHgnOlxuICAgICAgICAgIHJldHVybiBEb2N1bWVudFR5cGUuUE9XRVJQT0lOVDtcbiAgICAgICAgY2FzZSAndHh0JzpcbiAgICAgICAgY2FzZSAnbWQnOlxuICAgICAgICBjYXNlICdodG1sJzpcbiAgICAgICAgY2FzZSAnaHRtJzpcbiAgICAgICAgICByZXR1cm4gRG9jdW1lbnRUeXBlLlRFWFQ7XG4gICAgICAgIGNhc2UgJ2pwZyc6XG4gICAgICAgIGNhc2UgJ2pwZWcnOlxuICAgICAgICBjYXNlICdwbmcnOlxuICAgICAgICBjYXNlICdnaWYnOlxuICAgICAgICBjYXNlICd3ZWJwJzpcbiAgICAgICAgICByZXR1cm4gRG9jdW1lbnRUeXBlLklNQUdFO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiBEb2N1bWVudFR5cGUuVU5LTk9XTjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGZpbGUgaW5zdGFuY2VvZiBGaWxlKSB7XG4gICAgICAvLyDmoLnmja7mlofku7YgTUlNRSDnsbvlnovmo4DmtYtcbiAgICAgIGNvbnN0IG1pbWVUeXBlID0gZmlsZS50eXBlO1xuICAgICAgaWYgKG1pbWVUeXBlLmluY2x1ZGVzKCdwZGYnKSkge1xuICAgICAgICByZXR1cm4gRG9jdW1lbnRUeXBlLlBERjtcbiAgICAgIH0gZWxzZSBpZiAobWltZVR5cGUuaW5jbHVkZXMoJ3dvcmQnKSB8fCBtaW1lVHlwZS5pbmNsdWRlcygnZG9jdW1lbnQnKSkge1xuICAgICAgICByZXR1cm4gRG9jdW1lbnRUeXBlLldPUkQ7XG4gICAgICB9IGVsc2UgaWYgKG1pbWVUeXBlLmluY2x1ZGVzKCdleGNlbCcpIHx8IG1pbWVUeXBlLmluY2x1ZGVzKCdzaGVldCcpKSB7XG4gICAgICAgIHJldHVybiBEb2N1bWVudFR5cGUuRVhDRUw7XG4gICAgICB9IGVsc2UgaWYgKG1pbWVUeXBlLmluY2x1ZGVzKCdwb3dlcnBvaW50JykgfHwgbWltZVR5cGUuaW5jbHVkZXMoJ3ByZXNlbnRhdGlvbicpKSB7XG4gICAgICAgIHJldHVybiBEb2N1bWVudFR5cGUuUE9XRVJQT0lOVDtcbiAgICAgIH0gZWxzZSBpZiAobWltZVR5cGUuaW5jbHVkZXMoJ3RleHQnKSkge1xuICAgICAgICByZXR1cm4gRG9jdW1lbnRUeXBlLlRFWFQ7XG4gICAgICB9IGVsc2UgaWYgKG1pbWVUeXBlLmluY2x1ZGVzKCdpbWFnZScpKSB7XG4gICAgICAgIHJldHVybiBEb2N1bWVudFR5cGUuSU1BR0U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gRG9jdW1lbnRUeXBlLlVOS05PV047XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEFycmF5QnVmZmVyIOexu+Wei++8jOagueaNruaWh+S7tuWktOeJueW+geajgOa1i1xuICAgICAgcmV0dXJuIHRoaXMuZGV0ZWN0VHlwZUZyb21BcnJheUJ1ZmZlcihmaWxlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog5LuOIEFycmF5QnVmZmVyIOajgOa1i+aWh+aho+exu+Wei1xuICAgKi9cbiAgcHJpdmF0ZSBkZXRlY3RUeXBlRnJvbUFycmF5QnVmZmVyKGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBEb2N1bWVudFR5cGUge1xuICAgIGNvbnN0IHZpZXcgPSBuZXcgVWludDhBcnJheShidWZmZXIuc2xpY2UoMCwgMTIpKTsgLy8g6K+75Y+W5paH5Lu25aS0XG4gICAgXG4gICAgLy8gUERGIOaWh+S7tuWktO+8miVQREYtMS5cbiAgICBpZiAodmlld1swXSA9PT0gMHgyNSAmJiB2aWV3WzFdID09PSAweDUwICYmIHZpZXdbMl0gPT09IDB4NDQgJiYgdmlld1szXSA9PT0gMHg0NiAmJiB2aWV3WzRdID09PSAweDJEKSB7XG4gICAgICByZXR1cm4gRG9jdW1lbnRUeXBlLlBERjtcbiAgICB9XG4gICAgXG4gICAgLy8gRE9DWC9YTFNYL1BQVFgg5paH5Lu25aS077yaUEsg5Y6L57yp5paH5Lu2XG4gICAgaWYgKHZpZXdbMF0gPT09IDB4NTAgJiYgdmlld1sxXSA9PT0gMHg0Qikge1xuICAgICAgLy8g6L+Z6YeM566A5YyW5aSE55CG77yM5a6e6ZmF5Y+v5Lul5qC55o2u5Y6L57yp5YyF5YaF55qE5YaF5a656L+b5LiA5q2l5Yy65YiGXG4gICAgICByZXR1cm4gRG9jdW1lbnRUeXBlLldPUkQ7XG4gICAgfVxuICAgIFxuICAgIC8vIEpQRUcg5paH5Lu25aS077yaRkYgRDhcbiAgICBpZiAodmlld1swXSA9PT0gMHhGRiAmJiB2aWV3WzFdID09PSAweEQ4KSB7XG4gICAgICByZXR1cm4gRG9jdW1lbnRUeXBlLklNQUdFO1xuICAgIH1cbiAgICBcbiAgICAvLyBQTkcg5paH5Lu25aS077yaODkgNTAgNEUgNDdcbiAgICBpZiAodmlld1swXSA9PT0gMHg4OSAmJiB2aWV3WzFdID09PSAweDUwICYmIHZpZXdbMl0gPT09IDB4NEUgJiYgdmlld1szXSA9PT0gMHg0Nykge1xuICAgICAgcmV0dXJuIERvY3VtZW50VHlwZS5JTUFHRTtcbiAgICB9XG4gICAgXG4gICAgLy8gR0lGIOaWh+S7tuWktO+8mjQ3IDQ5IDQ2XG4gICAgaWYgKHZpZXdbMF0gPT09IDB4NDcgJiYgdmlld1sxXSA9PT0gMHg0OSAmJiB2aWV3WzJdID09PSAweDQ2KSB7XG4gICAgICByZXR1cm4gRG9jdW1lbnRUeXBlLklNQUdFO1xuICAgIH1cbiAgICBcbiAgICAvLyBXZWJQIOaWh+S7tuWktO+8mjUyIDQ5IDQ2IDQ2IC4uLiA1NyA0NSA0MiA1MFxuICAgIGlmICh2aWV3WzBdID09PSAweDUyICYmIHZpZXdbMV0gPT09IDB4NDkgJiYgdmlld1syXSA9PT0gMHg0NiAmJiB2aWV3WzNdID09PSAweDQ2ICYmIFxuICAgICAgICB2aWV3WzhdID09PSAweDU3ICYmIHZpZXdbOV0gPT09IDB4NDUgJiYgdmlld1sxMF0gPT09IDB4NDIgJiYgdmlld1sxMV0gPT09IDB4NTApIHtcbiAgICAgIHJldHVybiBEb2N1bWVudFR5cGUuSU1BR0U7XG4gICAgfVxuICAgIFxuICAgIC8vIOaWh+acrOaWh+S7tu+8muajgOafpeaYr+WQpuS4uiBBU0NJSSDmiJYgVVRGLTgg5paH5pysXG4gICAgbGV0IGlzVGV4dCA9IHRydWU7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBNYXRoLm1pbih2aWV3Lmxlbmd0aCwgMTAwKTsgaSsrKSB7XG4gICAgICBjb25zdCBieXRlID0gdmlld1tpXTtcbiAgICAgIC8vIOWFgeiuuOWPr+aJk+WNsOWtl+espuOAgeepuuagvOOAgeWItuihqOespuOAgeaNouihjOesplxuICAgICAgaWYgKGJ5dGUgPCAzMiAmJiBieXRlICE9PSA5ICYmIGJ5dGUgIT09IDEwICYmIGJ5dGUgIT09IDEzKSB7XG4gICAgICAgIGlzVGV4dCA9IGZhbHNlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlzVGV4dCkge1xuICAgICAgcmV0dXJuIERvY3VtZW50VHlwZS5URVhUO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gRG9jdW1lbnRUeXBlLlVOS05PV047XG4gIH1cblxuICAvKipcbiAgICog6Kej5p6Q5paH5qGjXG4gICAqL1xuICBhYnN0cmFjdCBwYXJzZShmaWxlOiBGaWxlIHwgQXJyYXlCdWZmZXIgfCBzdHJpbmcsIG9wdGlvbnM/OiBQYXJzZU9wdGlvbnMpOiBQcm9taXNlPERvY3VtZW50UGFyc2VSZXN1bHQ+O1xuXG4gIC8qKlxuICAgKiDop6PmnpDmlofmoaPlhYPmlbDmja5cbiAgICovXG4gIGFzeW5jIHBhcnNlTWV0YWRhdGEoZmlsZTogRmlsZSB8IEFycmF5QnVmZmVyIHwgc3RyaW5nKTogUHJvbWlzZTxEb2N1bWVudE1ldGFkYXRhPiB7XG4gICAgY29uc3QgdHlwZSA9IGF3YWl0IHRoaXMuZGV0ZWN0VHlwZShmaWxlKTtcbiAgICBsZXQgbmFtZSA9ICdVbmtub3duJztcbiAgICBsZXQgc2l6ZSA9IDA7XG5cbiAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIEZpbGUpIHtcbiAgICAgIG5hbWUgPSBmaWxlLm5hbWU7XG4gICAgICBzaXplID0gZmlsZS5zaXplO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGZpbGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICBuYW1lID0gZmlsZS5zcGxpdCgnLycpLnBvcCgpIHx8ICdVbmtub3duJztcbiAgICAgIC8vIOWcqOa1j+iniOWZqOeOr+Wig+S4re+8jOaXoOazleebtOaOpeiOt+WPluaWh+S7tuWkp+Wwj1xuICAgICAgc2l6ZSA9IDA7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNpemUgPSBmaWxlLmJ5dGVMZW5ndGg7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG5hbWUsXG4gICAgICB0eXBlLFxuICAgICAgc2l6ZSxcbiAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcbiAgICAgIG1vZGlmaWVkQXQ6IG5ldyBEYXRlKCksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiDmj5Dlj5bnuq/mlofmnKxcbiAgICovXG4gIGFzeW5jIGV4dHJhY3RUZXh0KGZpbGU6IEZpbGUgfCBBcnJheUJ1ZmZlciB8IHN0cmluZywgb3B0aW9ucz86IFBhcnNlT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5wYXJzZShmaWxlLCB7IC4uLm9wdGlvbnMsIGV4dHJhY3RUZXh0OiB0cnVlIH0pO1xuICAgIHJldHVybiByZXN1bHQudGV4dCB8fCAnJztcbiAgfVxuXG4gIC8qKlxuICAgKiDmj5Dlj5booajmoLxcbiAgICovXG4gIGFzeW5jIGV4dHJhY3RUYWJsZXMoZmlsZTogRmlsZSB8IEFycmF5QnVmZmVyIHwgc3RyaW5nLCBvcHRpb25zPzogUGFyc2VPcHRpb25zKTogUHJvbWlzZTxUYWJsZUNvbnRlbnRbXT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMucGFyc2UoZmlsZSwgeyAuLi5vcHRpb25zLCBleHRyYWN0VGFibGVzOiB0cnVlIH0pO1xuICAgIHJldHVybiByZXN1bHQuY29udGVudC5maWx0ZXIoKGl0ZW0pOiBpdGVtIGlzIFRhYmxlQ29udGVudCA9PiBpdGVtLnR5cGUgPT09IENvbnRlbnRUeXBlLlRBQkxFKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDmj5Dlj5blm77niYdcbiAgICovXG4gIGFzeW5jIGV4dHJhY3RJbWFnZXMoZmlsZTogRmlsZSB8IEFycmF5QnVmZmVyIHwgc3RyaW5nLCBvcHRpb25zPzogUGFyc2VPcHRpb25zKTogUHJvbWlzZTxJbWFnZUNvbnRlbnRbXT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMucGFyc2UoZmlsZSwgeyAuLi5vcHRpb25zLCBleHRyYWN0SW1hZ2VzOiB0cnVlIH0pO1xuICAgIHJldHVybiByZXN1bHQuY29udGVudC5maWx0ZXIoKGl0ZW0pOiBpdGVtIGlzIEltYWdlQ29udGVudCA9PiBpdGVtLnR5cGUgPT09IENvbnRlbnRUeXBlLklNQUdFKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDmiafooYwgT0NSIOivhuWIq1xuICAgKi9cbiAgYXN5bmMgcGVyZm9ybU9DUihpbWFnZTogRmlsZSB8IEFycmF5QnVmZmVyIHwgc3RyaW5nLCBsYW5ndWFnZTogc3RyaW5nID0gJ2VuZycpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGxvZ2dlci5pbmZvKCdQZXJmb3JtaW5nIE9DUiB3aXRoIGxhbmd1YWdlOicsIGxhbmd1YWdlKTtcbiAgICBcbiAgICB0cnkge1xuICAgICAgY29uc3Qgd29ya2VyID0gYXdhaXQgY3JlYXRlV29ya2VyKGxhbmd1YWdlKTtcbiAgICAgIGF3YWl0IHdvcmtlci5yZWluaXRpYWxpemUobGFuZ3VhZ2UpO1xuXG4gICAgICBjb25zdCBpbWFnZVNvdXJjZSA9IGltYWdlIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIgPyBuZXcgQmxvYihbaW1hZ2VdKSA6IGltYWdlO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB3b3JrZXIucmVjb2duaXplKGltYWdlU291cmNlKTtcbiAgICAgIGF3YWl0IHdvcmtlci50ZXJtaW5hdGUoKTtcblxuICAgICAgcmV0dXJuIHJlc3VsdD8uZGF0YT8udGV4dCB8fCAnJztcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKCdPQ1IgZmFpbGVkOicsIGVycm9yKTtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog5qOA5p+l5piv5ZCm6ZyA6KaBIE9DUlxuICAgKi9cbiAgYXN5bmMgbmVlZHNPQ1IoZmlsZTogRmlsZSB8IEFycmF5QnVmZmVyIHwgc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgdHlwZSA9IGF3YWl0IHRoaXMuZGV0ZWN0VHlwZShmaWxlKTtcbiAgICAvLyDlr7nkuo7lm77lg4/nsbvlnovnmoTmlofku7bvvIzpu5jorqTpnIDopoEgT0NSXG4gICAgcmV0dXJuIHR5cGUgPT09IERvY3VtZW50VHlwZS5JTUFHRTtcbiAgfVxuXG4gIC8qKlxuICAgKiDliIblnZflpITnkIbmlofmoaNcbiAgICovXG4gIGNodW5rRG9jdW1lbnQoY29udGVudDogc3RyaW5nLCBjaHVua1NpemU6IG51bWJlciA9IDIwMDAsIGNodW5rT3ZlcmxhcDogbnVtYmVyID0gMjAwKTogeyB0ZXh0OiBzdHJpbmc7IHN0YXJ0SW5kZXg6IG51bWJlcjsgZW5kSW5kZXg6IG51bWJlciB9W10ge1xuICAgIGNvbnN0IGNodW5rczogeyB0ZXh0OiBzdHJpbmc7IHN0YXJ0SW5kZXg6IG51bWJlcjsgZW5kSW5kZXg6IG51bWJlciB9W10gPSBbXTtcbiAgICBsZXQgc3RhcnRJbmRleCA9IDA7XG5cbiAgICB3aGlsZSAoc3RhcnRJbmRleCA8IGNvbnRlbnQubGVuZ3RoKSB7XG4gICAgICBjb25zdCBlbmRJbmRleCA9IE1hdGgubWluKHN0YXJ0SW5kZXggKyBjaHVua1NpemUsIGNvbnRlbnQubGVuZ3RoKTtcbiAgICAgIGNvbnN0IGNodW5rID0gY29udGVudC5zdWJzdHJpbmcoc3RhcnRJbmRleCwgZW5kSW5kZXgpO1xuICAgICAgY2h1bmtzLnB1c2goeyB0ZXh0OiBjaHVuaywgc3RhcnRJbmRleCwgZW5kSW5kZXggfSk7XG4gICAgICBzdGFydEluZGV4ID0gZW5kSW5kZXggLSBjaHVua092ZXJsYXA7XG4gICAgICBpZiAoc3RhcnRJbmRleCA+PSBjb250ZW50Lmxlbmd0aCAtIGNodW5rT3ZlcmxhcCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY2h1bmtzO1xuICB9XG5cbiAgLyoqXG4gICAqIOeUn+aIkOino+aekOe7k+aenFxuICAgKi9cbiAgcHJvdGVjdGVkIGFzeW5jIGNyZWF0ZVBhcnNlUmVzdWx0KG1ldGFkYXRhOiBEb2N1bWVudE1ldGFkYXRhLCBjb250ZW50OiBEb2N1bWVudENvbnRlbnRbXSwgb3B0aW9ucz86IFBhcnNlT3B0aW9ucyk6IFByb21pc2U8RG9jdW1lbnRQYXJzZVJlc3VsdD4ge1xuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgXG4gICAgbGV0IHRleHQgPSAnJztcbiAgICBsZXQgcGFnZXM6IERvY3VtZW50UGFnZVtdID0gW107XG4gICAgbGV0IGNodW5rczogeyB0ZXh0OiBzdHJpbmc7IHN0YXJ0SW5kZXg6IG51bWJlcjsgZW5kSW5kZXg6IG51bWJlcjsgcGFnZUluZGV4PzogbnVtYmVyIH1bXSA9IFtdO1xuXG4gICAgLy8g5aSE55CGIE9DUlxuICAgIGlmIChvcHRpb25zPy5lbmFibGVPQ1IpIHtcbiAgICAgIGNvbnN0IGltYWdlQ29udGVudHMgPSBjb250ZW50LmZpbHRlcigoaXRlbSk6IGl0ZW0gaXMgSW1hZ2VDb250ZW50ID0+IGl0ZW0udHlwZSA9PT0gQ29udGVudFR5cGUuSU1BR0UpO1xuICAgICAgZm9yIChjb25zdCBpbWFnZUNvbnRlbnQgb2YgaW1hZ2VDb250ZW50cykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IG9jclRleHQgPSBhd2FpdCB0aGlzLnBlcmZvcm1PQ1IoaW1hZ2VDb250ZW50LnVybCwgb3B0aW9ucy5vY3JMYW5ndWFnZSk7XG4gICAgICAgICAgLy8g5bCGIE9DUiDnu5Pmnpzmt7vliqDkuLrmlofmnKzlhoXlrrlcbiAgICAgICAgICBjb250ZW50LnB1c2goe1xuICAgICAgICAgICAgdHlwZTogQ29udGVudFR5cGUuVEVYVCxcbiAgICAgICAgICAgIHRleHQ6IG9jclRleHQsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgbG9nZ2VyLmVycm9yKCdPQ1IgZmFpbGVkOicsIGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIOeUn+aIkOe6r+aWh+acrFxuICAgIGlmIChvcHRpb25zPy5leHRyYWN0VGV4dCkge1xuICAgICAgdGV4dCA9IGNvbnRlbnRcbiAgICAgICAgLmZpbHRlcigoaXRlbSk6IGl0ZW0gaXMgVGV4dENvbnRlbnQgPT4gaXRlbS50eXBlID09PSBDb250ZW50VHlwZS5URVhUKVxuICAgICAgICAubWFwKGl0ZW0gPT4gaXRlbS50ZXh0KVxuICAgICAgICAuam9pbignXFxuJyk7XG4gICAgfVxuXG4gICAgLy8g5oyJ6aG16Z2i57uE57uH5YaF5a65XG4gICAgaWYgKG9wdGlvbnM/LnBhcnNlQnlQYWdlKSB7XG4gICAgICBsZXQgY3VycmVudFBhZ2U6IERvY3VtZW50Q29udGVudFtdID0gW107XG4gICAgICBsZXQgcGFnZUluZGV4ID0gMDtcblxuICAgICAgY29udGVudC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICBpZiAoaXRlbS50eXBlID09PSBDb250ZW50VHlwZS5QQUdFX0JSRUFLKSB7XG4gICAgICAgICAgaWYgKGN1cnJlbnRQYWdlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHBhZ2VzLnB1c2goe1xuICAgICAgICAgICAgICBpbmRleDogcGFnZUluZGV4KyssXG4gICAgICAgICAgICAgIGNvbnRlbnQ6IFsuLi5jdXJyZW50UGFnZV0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGN1cnJlbnRQYWdlID0gW107XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGN1cnJlbnRQYWdlLnB1c2goaXRlbSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBpZiAoY3VycmVudFBhZ2UubGVuZ3RoID4gMCkge1xuICAgICAgICBwYWdlcy5wdXNoKHtcbiAgICAgICAgICBpbmRleDogcGFnZUluZGV4LFxuICAgICAgICAgIGNvbnRlbnQ6IGN1cnJlbnRQYWdlLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDliIblnZflpITnkIZcbiAgICBpZiAob3B0aW9ucz8uZW5hYmxlQ2h1bmtpbmcgJiYgdGV4dCkge1xuICAgICAgY29uc3QgY2h1bmtSZXN1bHRzID0gdGhpcy5jaHVua0RvY3VtZW50KFxuICAgICAgICB0ZXh0LFxuICAgICAgICBvcHRpb25zLmNodW5rU2l6ZSxcbiAgICAgICAgb3B0aW9ucy5jaHVua092ZXJsYXBcbiAgICAgICk7XG4gICAgICBjaHVua3MgPSBjaHVua1Jlc3VsdHM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG1ldGFkYXRhLFxuICAgICAgY29udGVudCxcbiAgICAgIHBhZ2VzLFxuICAgICAgdGV4dCxcbiAgICAgIGNodW5rcyxcbiAgICAgIHBhcnNlVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIOaWh+acrOaWh+S7tuino+aekOWZqFxuICovXG5leHBvcnQgY2xhc3MgVGV4dERvY3VtZW50UGFyc2VyIGV4dGVuZHMgQmFzZURvY3VtZW50UGFyc2VyIHtcbiAgc3VwcG9ydGVkVHlwZXMgPSBbRG9jdW1lbnRUeXBlLlRFWFRdO1xuXG4gIGFzeW5jIHBhcnNlKGZpbGU6IEZpbGUgfCBBcnJheUJ1ZmZlciB8IHN0cmluZywgb3B0aW9ucz86IFBhcnNlT3B0aW9ucyk6IFByb21pc2U8RG9jdW1lbnRQYXJzZVJlc3VsdD4ge1xuICAgIHRyeSB7XG4gICAgICBsZXQgdGV4dCA9ICcnO1xuXG4gICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIEZpbGUpIHtcbiAgICAgICAgdGV4dCA9IGF3YWl0IGZpbGUudGV4dCgpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZmlsZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgLy8g5Zyo5rWP6KeI5Zmo546v5aKD5Lit77yM5peg5rOV55u05o6l6K+75Y+W5paH5Lu257O757ufXG4gICAgICAgIC8vIOWBh+iuvuS8oOWFpeeahOaYr+aWh+acrOWGheWuuVxuICAgICAgICB0ZXh0ID0gZmlsZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRleHQgPSBuZXcgVGV4dERlY29kZXIoJ3V0Zi04JykuZGVjb2RlKGZpbGUpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBtZXRhZGF0YSA9IGF3YWl0IHRoaXMucGFyc2VNZXRhZGF0YShmaWxlKTtcbiAgICAgIG1ldGFkYXRhLndvcmRDb3VudCA9IHRleHQuc3BsaXQoL1xccysvKS5sZW5ndGg7XG4gICAgICBtZXRhZGF0YS5jaGFyQ291bnQgPSB0ZXh0Lmxlbmd0aDtcblxuICAgICAgY29uc3QgY29udGVudDogRG9jdW1lbnRDb250ZW50W10gPSBbXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiBDb250ZW50VHlwZS5URVhULFxuICAgICAgICAgIHRleHQsXG4gICAgICAgIH0sXG4gICAgICBdO1xuXG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5jcmVhdGVQYXJzZVJlc3VsdChtZXRhZGF0YSwgY29udGVudCwgb3B0aW9ucyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHBhcnNlIHRleHQgZG9jdW1lbnQ6JywgZXJyb3IpO1xuICAgICAgY29uc3QgbWV0YWRhdGEgPSBhd2FpdCB0aGlzLnBhcnNlTWV0YWRhdGEoZmlsZSk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBtZXRhZGF0YSxcbiAgICAgICAgY29udGVudDogW10sXG4gICAgICAgIHBhcnNlVGltZTogMCxcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdGYWlsZWQgdG8gcGFyc2UgdGV4dCBkb2N1bWVudCcsXG4gICAgICB9O1xuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIOaWh+aho+ino+aekOWZqOazqOWGjOihqOWunueOsFxuICovXG5leHBvcnQgY2xhc3MgRGVmYXVsdERvY3VtZW50UGFyc2VyUmVnaXN0cnkgaW1wbGVtZW50cyBEb2N1bWVudFBhcnNlclJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBwYXJzZXJzOiBNYXA8RG9jdW1lbnRUeXBlLCBEb2N1bWVudFBhcnNlcj4gPSBuZXcgTWFwKCk7XG5cbiAgLyoqXG4gICAqIOajgOa1i+aWh+aho+exu+Wei1xuICAgKi9cbiAgYXN5bmMgZGV0ZWN0VHlwZShmaWxlOiBGaWxlIHwgQXJyYXlCdWZmZXIgfCBzdHJpbmcpOiBQcm9taXNlPERvY3VtZW50VHlwZT4ge1xuICAgIGlmICh0eXBlb2YgZmlsZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIC8vIOagueaNruaWh+S7tuaJqeWxleWQjeajgOa1i1xuICAgICAgY29uc3QgZXh0ZW5zaW9uID0gZmlsZS50b0xvd2VyQ2FzZSgpLnNwbGl0KCcuJykucG9wKCk7XG4gICAgICBzd2l0Y2ggKGV4dGVuc2lvbikge1xuICAgICAgICBjYXNlICdwZGYnOlxuICAgICAgICAgIHJldHVybiBEb2N1bWVudFR5cGUuUERGO1xuICAgICAgICBjYXNlICdkb2MnOlxuICAgICAgICBjYXNlICdkb2N4JzpcbiAgICAgICAgICByZXR1cm4gRG9jdW1lbnRUeXBlLldPUkQ7XG4gICAgICAgIGNhc2UgJ3hscyc6XG4gICAgICAgIGNhc2UgJ3hsc3gnOlxuICAgICAgICAgIHJldHVybiBEb2N1bWVudFR5cGUuRVhDRUw7XG4gICAgICAgIGNhc2UgJ3BwdCc6XG4gICAgICAgIGNhc2UgJ3BwdHgnOlxuICAgICAgICAgIHJldHVybiBEb2N1bWVudFR5cGUuUE9XRVJQT0lOVDtcbiAgICAgICAgY2FzZSAndHh0JzpcbiAgICAgICAgY2FzZSAnbWQnOlxuICAgICAgICBjYXNlICdodG1sJzpcbiAgICAgICAgY2FzZSAnaHRtJzpcbiAgICAgICAgICByZXR1cm4gRG9jdW1lbnRUeXBlLlRFWFQ7XG4gICAgICAgIGNhc2UgJ2pwZyc6XG4gICAgICAgIGNhc2UgJ2pwZWcnOlxuICAgICAgICBjYXNlICdwbmcnOlxuICAgICAgICBjYXNlICdnaWYnOlxuICAgICAgICBjYXNlICd3ZWJwJzpcbiAgICAgICAgICByZXR1cm4gRG9jdW1lbnRUeXBlLklNQUdFO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiBEb2N1bWVudFR5cGUuVU5LTk9XTjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGZpbGUgaW5zdGFuY2VvZiBGaWxlKSB7XG4gICAgICAvLyDmoLnmja7mlofku7YgTUlNRSDnsbvlnovmo4DmtYtcbiAgICAgIGNvbnN0IG1pbWVUeXBlID0gZmlsZS50eXBlO1xuICAgICAgaWYgKG1pbWVUeXBlLmluY2x1ZGVzKCdwZGYnKSkge1xuICAgICAgICByZXR1cm4gRG9jdW1lbnRUeXBlLlBERjtcbiAgICAgIH0gZWxzZSBpZiAobWltZVR5cGUuaW5jbHVkZXMoJ3dvcmQnKSB8fCBtaW1lVHlwZS5pbmNsdWRlcygnZG9jdW1lbnQnKSkge1xuICAgICAgICByZXR1cm4gRG9jdW1lbnRUeXBlLldPUkQ7XG4gICAgICB9IGVsc2UgaWYgKG1pbWVUeXBlLmluY2x1ZGVzKCdleGNlbCcpIHx8IG1pbWVUeXBlLmluY2x1ZGVzKCdzaGVldCcpKSB7XG4gICAgICAgIHJldHVybiBEb2N1bWVudFR5cGUuRVhDRUw7XG4gICAgICB9IGVsc2UgaWYgKG1pbWVUeXBlLmluY2x1ZGVzKCdwb3dlcnBvaW50JykgfHwgbWltZVR5cGUuaW5jbHVkZXMoJ3ByZXNlbnRhdGlvbicpKSB7XG4gICAgICAgIHJldHVybiBEb2N1bWVudFR5cGUuUE9XRVJQT0lOVDtcbiAgICAgIH0gZWxzZSBpZiAobWltZVR5cGUuaW5jbHVkZXMoJ3RleHQnKSkge1xuICAgICAgICByZXR1cm4gRG9jdW1lbnRUeXBlLlRFWFQ7XG4gICAgICB9IGVsc2UgaWYgKG1pbWVUeXBlLmluY2x1ZGVzKCdpbWFnZScpKSB7XG4gICAgICAgIHJldHVybiBEb2N1bWVudFR5cGUuSU1BR0U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gRG9jdW1lbnRUeXBlLlVOS05PV047XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEFycmF5QnVmZmVyIOexu+Wei++8jOmcgOimgei/m+S4gOatpeWIhuaekFxuICAgICAgcmV0dXJuIERvY3VtZW50VHlwZS5VTktOT1dOO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDms6jlhozop6PmnpDlmahcbiAgICovXG4gIHJlZ2lzdGVyUGFyc2VyKHBhcnNlcjogRG9jdW1lbnRQYXJzZXIpOiB2b2lkIHtcbiAgICBwYXJzZXIuc3VwcG9ydGVkVHlwZXMuZm9yRWFjaCh0eXBlID0+IHtcbiAgICAgIHRoaXMucGFyc2Vycy5zZXQodHlwZSwgcGFyc2VyKTtcbiAgICAgIGxvZ2dlci5pbmZvKGBSZWdpc3RlcmVkIHBhcnNlciBmb3IgJHt0eXBlfWApO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPluino+aekOWZqFxuICAgKi9cbiAgZ2V0UGFyc2VyKHR5cGU6IERvY3VtZW50VHlwZSk6IERvY3VtZW50UGFyc2VyIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5wYXJzZXJzLmdldCh0eXBlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDmoLnmja7mlofku7bojrflj5blkIjpgILnmoTop6PmnpDlmahcbiAgICovXG4gIGFzeW5jIGdldFBhcnNlckZvckZpbGUoZmlsZTogRmlsZSB8IEFycmF5QnVmZmVyIHwgc3RyaW5nKTogUHJvbWlzZTxEb2N1bWVudFBhcnNlciB8IHVuZGVmaW5lZD4ge1xuICAgIC8vIOmmluWFiOWwneivleajgOa1i+aWh+aho+exu+Wei1xuICAgIC8vIOWIm+W7uuS4gOS4quWFt+S9k+eahOino+aekOWZqOWunuS+i+adpeajgOa1i+exu+Wei1xuICAgIGNvbnN0IHR5cGUgPSBhd2FpdCB0aGlzLmRldGVjdFR5cGUoZmlsZSk7XG4gICAgXG4gICAgLy8g5qC55o2u57G75Z6L6I635Y+W6Kej5p6Q5ZmoXG4gICAgY29uc3QgcGFyc2VyID0gdGhpcy5nZXRQYXJzZXIodHlwZSk7XG4gICAgaWYgKHBhcnNlcikge1xuICAgICAgcmV0dXJuIHBhcnNlcjtcbiAgICB9XG5cbiAgICAvLyDlpoLmnpzmsqHmnInmib7liLDnibnlrprnsbvlnovnmoTop6PmnpDlmajvvIzlsJ3or5Xkvb/nlKjmlofmnKzop6PmnpDlmajkvZzkuLrlkI7lpIdcbiAgICByZXR1cm4gdGhpcy5nZXRQYXJzZXIoRG9jdW1lbnRUeXBlLlRFWFQpO1xuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPluaJgOacieaUr+aMgeeahOaWh+aho+exu+Wei1xuICAgKi9cbiAgZ2V0U3VwcG9ydGVkVHlwZXMoKTogRG9jdW1lbnRUeXBlW10ge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMucGFyc2Vycy5rZXlzKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIOino+aekOaWh+aho++8iOiHquWKqOmAieaLqeino+aekOWZqO+8iVxuICAgKi9cbiAgYXN5bmMgcGFyc2UoZmlsZTogRmlsZSB8IEFycmF5QnVmZmVyIHwgc3RyaW5nLCBvcHRpb25zPzogUGFyc2VPcHRpb25zKTogUHJvbWlzZTxEb2N1bWVudFBhcnNlUmVzdWx0PiB7XG4gICAgLy8g5qOA5p+l5piv5ZCm5ZCv55So57yT5a2YXG4gICAgaWYgKG9wdGlvbnM/LmVuYWJsZUNhY2hlKSB7XG4gICAgICBjb25zdCBjYWNoZUtleSA9IGNhY2hlTWFuYWdlci5nZW5lcmF0ZUtleShmaWxlKTtcbiAgICAgIGNvbnN0IGNhY2hlZFJlc3VsdCA9IGNhY2hlTWFuYWdlci5nZXQoY2FjaGVLZXkpO1xuICAgICAgaWYgKGNhY2hlZFJlc3VsdCkge1xuICAgICAgICBsb2dnZXIuaW5mbygnQ2FjaGUgaGl0IGZvciBkb2N1bWVudCBwYXJzaW5nJyk7XG4gICAgICAgIHJldHVybiBjYWNoZWRSZXN1bHQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcGFyc2VyID0gYXdhaXQgdGhpcy5nZXRQYXJzZXJGb3JGaWxlKGZpbGUpO1xuICAgIGlmIChwYXJzZXIpIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBhcnNlci5wYXJzZShmaWxlLCBvcHRpb25zKTtcbiAgICAgIFxuICAgICAgLy8g57yT5a2Y57uT5p6cXG4gICAgICBpZiAob3B0aW9ucz8uZW5hYmxlQ2FjaGUgJiYgcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgY29uc3QgY2FjaGVLZXkgPSBjYWNoZU1hbmFnZXIuZ2VuZXJhdGVLZXkoZmlsZSk7XG4gICAgICAgIGNhY2hlTWFuYWdlci5zZXQoY2FjaGVLZXksIHJlc3VsdCwgb3B0aW9ucy5jYWNoZUV4cGlyeSk7XG4gICAgICAgIGxvZ2dlci5pbmZvKCdEb2N1bWVudCBwYXJzaW5nIHJlc3VsdCBjYWNoZWQnKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvLyDlpoLmnpzmsqHmnInmib7liLDop6PmnpDlmajvvIzov5Tlm57plJnor69cbiAgICAvLyDliJvlu7rlhYPmlbDmja5cbiAgICBjb25zdCBtZXRhZGF0YTogRG9jdW1lbnRNZXRhZGF0YSA9IHtcbiAgICAgIG5hbWU6IHR5cGVvZiBmaWxlID09PSAnc3RyaW5nJyA/IGZpbGUuc3BsaXQoJy8nKS5wb3AoKSB8fCAnVW5rbm93bicgOiBmaWxlIGluc3RhbmNlb2YgRmlsZSA/IGZpbGUubmFtZSA6ICdVbmtub3duJyxcbiAgICAgIHR5cGU6IERvY3VtZW50VHlwZS5VTktOT1dOLFxuICAgICAgc2l6ZTogdHlwZW9mIGZpbGUgPT09ICdzdHJpbmcnID8gMCA6IGZpbGUgaW5zdGFuY2VvZiBGaWxlID8gZmlsZS5zaXplIDogZmlsZS5ieXRlTGVuZ3RoLFxuICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxuICAgICAgbW9kaWZpZWRBdDogbmV3IERhdGUoKSxcbiAgICB9O1xuICAgIHJldHVybiB7XG4gICAgICBtZXRhZGF0YSxcbiAgICAgIGNvbnRlbnQ6IFtdLFxuICAgICAgcGFyc2VUaW1lOiAwLFxuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBlcnJvcjogJ05vIHN1aXRhYmxlIHBhcnNlciBmb3VuZCBmb3IgdGhpcyBkb2N1bWVudCB0eXBlJyxcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICog5YWo5bGA5paH5qGj6Kej5p6Q5Zmo5rOo5YaM6KGo5a6e5L6LXG4gKi9cbmV4cG9ydCBjb25zdCBkb2N1bWVudFBhcnNlclJlZ2lzdHJ5ID0gbmV3IERlZmF1bHREb2N1bWVudFBhcnNlclJlZ2lzdHJ5KCk7XG5cbi8vIOazqOWGjOm7mOiupOino+aekOWZqFxuZG9jdW1lbnRQYXJzZXJSZWdpc3RyeS5yZWdpc3RlclBhcnNlcihuZXcgVGV4dERvY3VtZW50UGFyc2VyKCkpO1xuXG4vKipcbiAqIFBERiDmlofmoaPop6PmnpDlmahcbiAqL1xuZXhwb3J0IGNsYXNzIFBERkRvY3VtZW50UGFyc2VyIGV4dGVuZHMgQmFzZURvY3VtZW50UGFyc2VyIHtcbiAgc3VwcG9ydGVkVHlwZXMgPSBbRG9jdW1lbnRUeXBlLlBERl07XG5cbiAgYXN5bmMgcGFyc2UoZmlsZTogRmlsZSB8IEFycmF5QnVmZmVyIHwgc3RyaW5nLCBvcHRpb25zPzogUGFyc2VPcHRpb25zKTogUHJvbWlzZTxEb2N1bWVudFBhcnNlUmVzdWx0PiB7XG4gICAgdHJ5IHtcbiAgICAgIGxldCBidWZmZXI6IEJ1ZmZlciB8IEFycmF5QnVmZmVyO1xuXG4gICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIEZpbGUpIHtcbiAgICAgICAgYnVmZmVyID0gYXdhaXQgZmlsZS5hcnJheUJ1ZmZlcigpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZmlsZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgLy8g5Zyo5rWP6KeI5Zmo546v5aKD5Lit77yM5peg5rOV55u05o6l6K+75Y+W5paH5Lu257O757ufXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmlsZSBwYXRoIG5vdCBzdXBwb3J0ZWQgaW4gYnJvd3NlciBlbnZpcm9ubWVudCcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYnVmZmVyID0gZmlsZTtcbiAgICAgIH1cblxuICAgICAgLy8g5L2/55SoIHBkZi1wYXJzZSDlupPop6PmnpAgUERGXG4gICAgICAvLyBAdHMtaWdub3JlIC0g5b+955Wl57G75Z6L6ZSZ6K+v77yM5Zug5Li6IHBkZi1wYXJzZSDnsbvlnovlrprkuYnlj6/og73kuI3lrozmlbRcbiAgICAgIGNvbnN0IHBkZkRhdGEgPSBhd2FpdCBwZGYoYnVmZmVyKTtcbiAgICAgIFxuICAgICAgY29uc3QgbWV0YWRhdGEgPSBhd2FpdCB0aGlzLnBhcnNlTWV0YWRhdGEoZmlsZSk7XG4gICAgICBtZXRhZGF0YS5wYWdlQ291bnQgPSBwZGZEYXRhLm51bXBhZ2VzO1xuICAgICAgbWV0YWRhdGEuYXV0aG9yID0gcGRmRGF0YS5pbmZvPy5BdXRob3IgfHwgJ1Vua25vd24nO1xuICAgICAgbWV0YWRhdGEudGl0bGUgPSBwZGZEYXRhLmluZm8/LlRpdGxlIHx8ICdVbmtub3duJztcbiAgICAgIG1ldGFkYXRhLnN1YmplY3QgPSBwZGZEYXRhLmluZm8/LlN1YmplY3QgfHwgJ1Vua25vd24nO1xuICAgICAgbWV0YWRhdGEua2V5d29yZHMgPSBwZGZEYXRhLmluZm8/LktleXdvcmRzID8gcGRmRGF0YS5pbmZvLktleXdvcmRzLnNwbGl0KCc7JykgOiBbXTtcbiAgICAgIG1ldGFkYXRhLndvcmRDb3VudCA9IHBkZkRhdGEudGV4dCA/IHBkZkRhdGEudGV4dC5zcGxpdCgvXFxzKy8pLmxlbmd0aCA6IDA7XG4gICAgICBtZXRhZGF0YS5jaGFyQ291bnQgPSBwZGZEYXRhLnRleHQgPyBwZGZEYXRhLnRleHQubGVuZ3RoIDogMDtcblxuICAgICAgY29uc3QgY29udGVudDogRG9jdW1lbnRDb250ZW50W10gPSBbXTtcbiAgICAgIFxuICAgICAgaWYgKHBkZkRhdGEudGV4dCkge1xuICAgICAgICBjb250ZW50LnB1c2goe1xuICAgICAgICAgIHR5cGU6IENvbnRlbnRUeXBlLlRFWFQsXG4gICAgICAgICAgdGV4dDogcGRmRGF0YS50ZXh0LFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY3JlYXRlUGFyc2VSZXN1bHQobWV0YWRhdGEsIGNvbnRlbnQsIG9wdGlvbnMpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBwYXJzZSBQREYgZG9jdW1lbnQ6JywgZXJyb3IpO1xuICAgICAgY29uc3QgbWV0YWRhdGEgPSBhd2FpdCB0aGlzLnBhcnNlTWV0YWRhdGEoZmlsZSk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBtZXRhZGF0YSxcbiAgICAgICAgY29udGVudDogW10sXG4gICAgICAgIHBhcnNlVGltZTogMCxcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdGYWlsZWQgdG8gcGFyc2UgUERGIGRvY3VtZW50JyxcbiAgICAgIH07XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogV29yZCDmlofmoaPop6PmnpDlmahcbiAqL1xuZXhwb3J0IGNsYXNzIFdvcmREb2N1bWVudFBhcnNlciBleHRlbmRzIEJhc2VEb2N1bWVudFBhcnNlciB7XG4gIHN1cHBvcnRlZFR5cGVzID0gW0RvY3VtZW50VHlwZS5XT1JEXTtcblxuICBhc3luYyBwYXJzZShmaWxlOiBGaWxlIHwgQXJyYXlCdWZmZXIgfCBzdHJpbmcsIG9wdGlvbnM/OiBQYXJzZU9wdGlvbnMpOiBQcm9taXNlPERvY3VtZW50UGFyc2VSZXN1bHQ+IHtcbiAgICB0cnkge1xuICAgICAgbGV0IGJ1ZmZlcjogQXJyYXlCdWZmZXI7XG5cbiAgICAgIGlmIChmaWxlIGluc3RhbmNlb2YgRmlsZSkge1xuICAgICAgICBidWZmZXIgPSBhd2FpdCBmaWxlLmFycmF5QnVmZmVyKCk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBmaWxlID09PSAnc3RyaW5nJykge1xuICAgICAgICAvLyDlnKjmtY/op4jlmajnjq/looPkuK3vvIzml6Dms5Xnm7TmjqXor7vlj5bmlofku7bns7vnu59cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaWxlIHBhdGggbm90IHN1cHBvcnRlZCBpbiBicm93c2VyIGVudmlyb25tZW50Jyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBidWZmZXIgPSBmaWxlO1xuICAgICAgfVxuXG4gICAgICAvLyDkvb/nlKggbWFtbW90aC5qcyDop6PmnpAgV29yZCDmlofmoaNcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IG1hbW1vdGguZXh0cmFjdFJhd1RleHQoeyBhcnJheUJ1ZmZlcjogYnVmZmVyIH0pO1xuICAgICAgY29uc3QgdGV4dCA9IHJlc3VsdC52YWx1ZTtcblxuICAgICAgY29uc3QgbWV0YWRhdGEgPSBhd2FpdCB0aGlzLnBhcnNlTWV0YWRhdGEoZmlsZSk7XG4gICAgICBtZXRhZGF0YS53b3JkQ291bnQgPSB0ZXh0LnNwbGl0KC9cXHMrLykubGVuZ3RoO1xuICAgICAgbWV0YWRhdGEuY2hhckNvdW50ID0gdGV4dC5sZW5ndGg7XG5cbiAgICAgIGNvbnN0IGNvbnRlbnQ6IERvY3VtZW50Q29udGVudFtdID0gW1xuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogQ29udGVudFR5cGUuVEVYVCxcbiAgICAgICAgICB0ZXh0LFxuICAgICAgICB9LFxuICAgICAgXTtcblxuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY3JlYXRlUGFyc2VSZXN1bHQobWV0YWRhdGEsIGNvbnRlbnQsIG9wdGlvbnMpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBwYXJzZSBXb3JkIGRvY3VtZW50OicsIGVycm9yKTtcbiAgICAgIGNvbnN0IG1ldGFkYXRhID0gYXdhaXQgdGhpcy5wYXJzZU1ldGFkYXRhKGZpbGUpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbWV0YWRhdGEsXG4gICAgICAgIGNvbnRlbnQ6IFtdLFxuICAgICAgICBwYXJzZVRpbWU6IDAsXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnRmFpbGVkIHRvIHBhcnNlIFdvcmQgZG9jdW1lbnQnLFxuICAgICAgfTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBFeGNlbCDmlofmoaPop6PmnpDlmahcbiAqL1xuZXhwb3J0IGNsYXNzIEV4Y2VsRG9jdW1lbnRQYXJzZXIgZXh0ZW5kcyBCYXNlRG9jdW1lbnRQYXJzZXIge1xuICBzdXBwb3J0ZWRUeXBlcyA9IFtEb2N1bWVudFR5cGUuRVhDRUxdO1xuXG4gIGFzeW5jIHBhcnNlKGZpbGU6IEZpbGUgfCBBcnJheUJ1ZmZlciB8IHN0cmluZywgb3B0aW9ucz86IFBhcnNlT3B0aW9ucyk6IFByb21pc2U8RG9jdW1lbnRQYXJzZVJlc3VsdD4ge1xuICAgIHRyeSB7XG4gICAgICBsZXQgYnVmZmVyOiBBcnJheUJ1ZmZlcjtcblxuICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBGaWxlKSB7XG4gICAgICAgIGJ1ZmZlciA9IGF3YWl0IGZpbGUuYXJyYXlCdWZmZXIoKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGZpbGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIC8vIOWcqOa1j+iniOWZqOeOr+Wig+S4re+8jOaXoOazleebtOaOpeivu+WPluaWh+S7tuezu+e7n1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpbGUgcGF0aCBub3Qgc3VwcG9ydGVkIGluIGJyb3dzZXIgZW52aXJvbm1lbnQnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJ1ZmZlciA9IGZpbGU7XG4gICAgICB9XG5cbiAgICAgIC8vIOS9v+eUqCB4bHN4IOW6k+ino+aekCBFeGNlbFxuICAgICAgY29uc3Qgd29ya2Jvb2sgPSBYTFNYLnJlYWQoYnVmZmVyKTtcbiAgICAgIGNvbnN0IGZpcnN0U2hlZXROYW1lID0gd29ya2Jvb2suU2hlZXROYW1lc1swXTtcbiAgICAgIGNvbnN0IHdvcmtzaGVldCA9IHdvcmtib29rLlNoZWV0c1tmaXJzdFNoZWV0TmFtZV07XG4gICAgICBjb25zdCBqc29uRGF0YSA9IFhMU1gudXRpbHMuc2hlZXRfdG9fanNvbih3b3Jrc2hlZXQsIHsgaGVhZGVyOiAxIH0pO1xuXG4gICAgICBjb25zdCBtZXRhZGF0YSA9IGF3YWl0IHRoaXMucGFyc2VNZXRhZGF0YShmaWxlKTtcbiAgICAgIG1ldGFkYXRhLnBhZ2VDb3VudCA9IHdvcmtib29rLlNoZWV0TmFtZXMubGVuZ3RoO1xuXG4gICAgICBjb25zdCBjb250ZW50OiBEb2N1bWVudENvbnRlbnRbXSA9IFtcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6IENvbnRlbnRUeXBlLlRBQkxFLFxuICAgICAgICAgIHJvd3M6IGpzb25EYXRhIGFzIHN0cmluZ1tdW10sXG4gICAgICAgIH0sXG4gICAgICBdO1xuXG4gICAgICAvLyDmj5Dlj5bmlofmnKzlhoXlrrlcbiAgICAgIGNvbnN0IHRleHRDb250ZW50ID0ganNvbkRhdGEuZmxhdCgpLmpvaW4oJyAnKTtcbiAgICAgIGNvbnRlbnQucHVzaCh7XG4gICAgICAgIHR5cGU6IENvbnRlbnRUeXBlLlRFWFQsXG4gICAgICAgIHRleHQ6IHRleHRDb250ZW50LFxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNyZWF0ZVBhcnNlUmVzdWx0KG1ldGFkYXRhLCBjb250ZW50LCBvcHRpb25zKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gcGFyc2UgRXhjZWwgZG9jdW1lbnQ6JywgZXJyb3IpO1xuICAgICAgY29uc3QgbWV0YWRhdGEgPSBhd2FpdCB0aGlzLnBhcnNlTWV0YWRhdGEoZmlsZSk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBtZXRhZGF0YSxcbiAgICAgICAgY29udGVudDogW10sXG4gICAgICAgIHBhcnNlVGltZTogMCxcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdGYWlsZWQgdG8gcGFyc2UgRXhjZWwgZG9jdW1lbnQnLFxuICAgICAgfTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBQb3dlclBvaW50IOaWh+aho+ino+aekOWZqFxuICovXG5leHBvcnQgY2xhc3MgUG93ZXJQb2ludERvY3VtZW50UGFyc2VyIGV4dGVuZHMgQmFzZURvY3VtZW50UGFyc2VyIHtcbiAgc3VwcG9ydGVkVHlwZXMgPSBbRG9jdW1lbnRUeXBlLlBPV0VSUE9JTlRdO1xuXG4gIGFzeW5jIHBhcnNlKGZpbGU6IEZpbGUgfCBBcnJheUJ1ZmZlciB8IHN0cmluZywgb3B0aW9ucz86IFBhcnNlT3B0aW9ucyk6IFByb21pc2U8RG9jdW1lbnRQYXJzZVJlc3VsdD4ge1xuICAgIHRyeSB7XG4gICAgICBsZXQgYnVmZmVyOiBBcnJheUJ1ZmZlcjtcblxuICAgICAgaWYgKGZpbGUgaW5zdGFuY2VvZiBGaWxlKSB7XG4gICAgICAgIGJ1ZmZlciA9IGF3YWl0IGZpbGUuYXJyYXlCdWZmZXIoKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGZpbGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIC8vIOWcqOa1j+iniOWZqOeOr+Wig+S4re+8jOaXoOazleebtOaOpeivu+WPluaWh+S7tuezu+e7n1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpbGUgcGF0aCBub3Qgc3VwcG9ydGVkIGluIGJyb3dzZXIgZW52aXJvbm1lbnQnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGJ1ZmZlciA9IGZpbGU7XG4gICAgICB9XG5cbiAgICAgIC8vIOWwneivleino+aekFBvd2VyUG9pbnTmlofku7ZcbiAgICAgIC8vIOeUseS6juayoeacieebtOaOpeeahHBwdHjop6PmnpDlupPvvIzmiJHku6zlsJ3or5XkvZzkuLp6aXDmlofku7bmiZPlvIDlubbmj5Dlj5bmlofmnKxcbiAgICAgIC8vIOi/memHjOS9v+eUqOeugOWMlueahOWunueOsO+8jOWunumZhemhueebruS4reWPr+S7pembhuaIkOS4k+mXqOeahHBwdHjop6PmnpDlupNcbiAgICAgIGNvbnN0IG1ldGFkYXRhID0gYXdhaXQgdGhpcy5wYXJzZU1ldGFkYXRhKGZpbGUpO1xuICAgICAgbWV0YWRhdGEucGFnZUNvdW50ID0gMDtcblxuICAgICAgbGV0IHRleHQgPSAnJztcbiAgICAgIFxuICAgICAgLy8g5bCd6K+V5L2c5Li6emlw5paH5Lu25aSE55CGXG4gICAgICB0cnkge1xuICAgICAgICAvLyDov5nph4zlj6rmmK/kuIDkuKrljaDkvY3nrKblrp7njrDvvIzlrp7pmYXpobnnm67kuK3pnIDopoHkvb/nlKjkuJPpl6jnmoTlupNcbiAgICAgICAgdGV4dCA9ICdQb3dlclBvaW50IHByZXNlbnRhdGlvbiBjb250ZW50JztcbiAgICAgICAgbWV0YWRhdGEucGFnZUNvdW50ID0gNTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgbG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byBwYXJzZSBQb3dlclBvaW50IGZpbGUgYXMgemlwOicsIGUpO1xuICAgICAgICB0ZXh0ID0gJ1Bvd2VyUG9pbnQgcHJlc2VudGF0aW9uIGNvbnRlbnQgcGxhY2Vob2xkZXInO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBjb250ZW50OiBEb2N1bWVudENvbnRlbnRbXSA9IFtcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6IENvbnRlbnRUeXBlLlRFWFQsXG4gICAgICAgICAgdGV4dCxcbiAgICAgICAgfSxcbiAgICAgIF07XG5cbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNyZWF0ZVBhcnNlUmVzdWx0KG1ldGFkYXRhLCBjb250ZW50LCBvcHRpb25zKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gcGFyc2UgUG93ZXJQb2ludCBkb2N1bWVudDonLCBlcnJvcik7XG4gICAgICBjb25zdCBtZXRhZGF0YSA9IGF3YWl0IHRoaXMucGFyc2VNZXRhZGF0YShmaWxlKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG1ldGFkYXRhLFxuICAgICAgICBjb250ZW50OiBbXSxcbiAgICAgICAgcGFyc2VUaW1lOiAwLFxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ0ZhaWxlZCB0byBwYXJzZSBQb3dlclBvaW50IGRvY3VtZW50JyxcbiAgICAgIH07XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICog5Zu+5YOP5paH5qGj6Kej5p6Q5ZmoXG4gKi9cbmV4cG9ydCBjbGFzcyBJbWFnZURvY3VtZW50UGFyc2VyIGV4dGVuZHMgQmFzZURvY3VtZW50UGFyc2VyIHtcbiAgc3VwcG9ydGVkVHlwZXMgPSBbRG9jdW1lbnRUeXBlLklNQUdFXTtcblxuICBhc3luYyBwYXJzZShmaWxlOiBGaWxlIHwgQXJyYXlCdWZmZXIgfCBzdHJpbmcsIG9wdGlvbnM/OiBQYXJzZU9wdGlvbnMpOiBQcm9taXNlPERvY3VtZW50UGFyc2VSZXN1bHQ+IHtcbiAgICB0cnkge1xuICAgICAgbGV0IGltYWdlVXJsID0gJyc7XG5cbiAgICAgIGlmIChmaWxlIGluc3RhbmNlb2YgRmlsZSkge1xuICAgICAgICBpbWFnZVVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZmlsZSk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBmaWxlID09PSAnc3RyaW5nJykge1xuICAgICAgICBpbWFnZVVybCA9IGZpbGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyDlsIYgQXJyYXlCdWZmZXIg6L2s5o2i5Li6IGRhdGEgVVJMXG4gICAgICAgIGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbZmlsZV0pO1xuICAgICAgICBpbWFnZVVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG1ldGFkYXRhID0gYXdhaXQgdGhpcy5wYXJzZU1ldGFkYXRhKGZpbGUpO1xuXG4gICAgICBjb25zdCBjb250ZW50OiBEb2N1bWVudENvbnRlbnRbXSA9IFtcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6IENvbnRlbnRUeXBlLklNQUdFLFxuICAgICAgICAgIHVybDogaW1hZ2VVcmwsXG4gICAgICAgIH0sXG4gICAgICBdO1xuXG4gICAgICAvLyDlpoLmnpzlkK/nlKjkuoYgT0NS77yM5omn6KGMIE9DUiDlpITnkIZcbiAgICAgIGlmIChvcHRpb25zPy5lbmFibGVPQ1IpIHtcbiAgICAgICAgY29uc3Qgb2NyVGV4dCA9IGF3YWl0IHRoaXMucGVyZm9ybU9DUihmaWxlLCBvcHRpb25zLm9jckxhbmd1YWdlKTtcbiAgICAgICAgY29udGVudC5wdXNoKHtcbiAgICAgICAgICB0eXBlOiBDb250ZW50VHlwZS5URVhULFxuICAgICAgICAgIHRleHQ6IG9jclRleHQsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5jcmVhdGVQYXJzZVJlc3VsdChtZXRhZGF0YSwgY29udGVudCwgb3B0aW9ucyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHBhcnNlIGltYWdlIGRvY3VtZW50OicsIGVycm9yKTtcbiAgICAgIGNvbnN0IG1ldGFkYXRhID0gYXdhaXQgdGhpcy5wYXJzZU1ldGFkYXRhKGZpbGUpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbWV0YWRhdGEsXG4gICAgICAgIGNvbnRlbnQ6IFtdLFxuICAgICAgICBwYXJzZVRpbWU6IDAsXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnRmFpbGVkIHRvIHBhcnNlIGltYWdlIGRvY3VtZW50JyxcbiAgICAgIH07XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogTWFya2Rvd24g5paH5qGj6Kej5p6Q5ZmoXG4gKi9cbmV4cG9ydCBjbGFzcyBNYXJrZG93bkRvY3VtZW50UGFyc2VyIGV4dGVuZHMgQmFzZURvY3VtZW50UGFyc2VyIHtcbiAgc3VwcG9ydGVkVHlwZXMgPSBbRG9jdW1lbnRUeXBlLlRFWFRdO1xuXG4gIGFzeW5jIHBhcnNlKGZpbGU6IEZpbGUgfCBBcnJheUJ1ZmZlciB8IHN0cmluZywgb3B0aW9ucz86IFBhcnNlT3B0aW9ucyk6IFByb21pc2U8RG9jdW1lbnRQYXJzZVJlc3VsdD4ge1xuICAgIHRyeSB7XG4gICAgICBsZXQgdGV4dCA9ICcnO1xuXG4gICAgICBpZiAoZmlsZSBpbnN0YW5jZW9mIEZpbGUpIHtcbiAgICAgICAgdGV4dCA9IGF3YWl0IGZpbGUudGV4dCgpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZmlsZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGV4dCA9IGZpbGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0ZXh0ID0gbmV3IFRleHREZWNvZGVyKCd1dGYtOCcpLmRlY29kZShmaWxlKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgbWV0YWRhdGEgPSBhd2FpdCB0aGlzLnBhcnNlTWV0YWRhdGEoZmlsZSk7XG4gICAgICBtZXRhZGF0YS53b3JkQ291bnQgPSB0ZXh0LnNwbGl0KC9cXHMrLykubGVuZ3RoO1xuICAgICAgbWV0YWRhdGEuY2hhckNvdW50ID0gdGV4dC5sZW5ndGg7XG5cbiAgICAgIC8vIOaPkOWPlk1hcmtkb3du5Lit55qE5qCH6aKY44CB5YiX6KGo562J57uT5p6EXG4gICAgICBjb25zdCBjb250ZW50OiBEb2N1bWVudENvbnRlbnRbXSA9IFtcbiAgICAgICAge1xuICAgICAgICAgIHR5cGU6IENvbnRlbnRUeXBlLlRFWFQsXG4gICAgICAgICAgdGV4dCxcbiAgICAgICAgfSxcbiAgICAgIF07XG5cbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNyZWF0ZVBhcnNlUmVzdWx0KG1ldGFkYXRhLCBjb250ZW50LCBvcHRpb25zKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gcGFyc2UgTWFya2Rvd24gZG9jdW1lbnQ6JywgZXJyb3IpO1xuICAgICAgY29uc3QgbWV0YWRhdGEgPSBhd2FpdCB0aGlzLnBhcnNlTWV0YWRhdGEoZmlsZSk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBtZXRhZGF0YSxcbiAgICAgICAgY29udGVudDogW10sXG4gICAgICAgIHBhcnNlVGltZTogMCxcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdGYWlsZWQgdG8gcGFyc2UgTWFya2Rvd24gZG9jdW1lbnQnLFxuICAgICAgfTtcbiAgICB9XG4gIH1cbn1cblxuLy8g5rOo5YaM5YW25LuW6Kej5p6Q5ZmoXG5kb2N1bWVudFBhcnNlclJlZ2lzdHJ5LnJlZ2lzdGVyUGFyc2VyKG5ldyBQREZEb2N1bWVudFBhcnNlcigpKTtcbmRvY3VtZW50UGFyc2VyUmVnaXN0cnkucmVnaXN0ZXJQYXJzZXIobmV3IFdvcmREb2N1bWVudFBhcnNlcigpKTtcbmRvY3VtZW50UGFyc2VyUmVnaXN0cnkucmVnaXN0ZXJQYXJzZXIobmV3IEV4Y2VsRG9jdW1lbnRQYXJzZXIoKSk7XG5kb2N1bWVudFBhcnNlclJlZ2lzdHJ5LnJlZ2lzdGVyUGFyc2VyKG5ldyBQb3dlclBvaW50RG9jdW1lbnRQYXJzZXIoKSk7XG5kb2N1bWVudFBhcnNlclJlZ2lzdHJ5LnJlZ2lzdGVyUGFyc2VyKG5ldyBJbWFnZURvY3VtZW50UGFyc2VyKCkpO1xuZG9jdW1lbnRQYXJzZXJSZWdpc3RyeS5yZWdpc3RlclBhcnNlcihuZXcgTWFya2Rvd25Eb2N1bWVudFBhcnNlcigpKTtcblxuLyoqXG4gKiDmlofmoaPop6PmnpDlt6XlhbfnsbtcbiAqL1xuZXhwb3J0IGNsYXNzIERvY3VtZW50UGFyc2VyVXRpbCB7XG4gIC8qKlxuICAgKiDop6PmnpDmlofmoaNcbiAgICovXG4gIHN0YXRpYyBhc3luYyBwYXJzZShmaWxlOiBGaWxlIHwgQXJyYXlCdWZmZXIgfCBzdHJpbmcsIG9wdGlvbnM/OiBQYXJzZU9wdGlvbnMpOiBQcm9taXNlPERvY3VtZW50UGFyc2VSZXN1bHQ+IHtcbiAgICByZXR1cm4gZG9jdW1lbnRQYXJzZXJSZWdpc3RyeS5wYXJzZShmaWxlLCBvcHRpb25zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDmj5Dlj5bnuq/mlofmnKxcbiAgICovXG4gIHN0YXRpYyBhc3luYyBleHRyYWN0VGV4dChmaWxlOiBGaWxlIHwgQXJyYXlCdWZmZXIgfCBzdHJpbmcsIG9wdGlvbnM/OiBQYXJzZU9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMucGFyc2UoZmlsZSwgeyAuLi5vcHRpb25zLCBleHRyYWN0VGV4dDogdHJ1ZSB9KTtcbiAgICByZXR1cm4gcmVzdWx0LnRleHQgfHwgJyc7XG4gIH1cblxuICAvKipcbiAgICog5o+Q5Y+W6KGo5qC8XG4gICAqL1xuICBzdGF0aWMgYXN5bmMgZXh0cmFjdFRhYmxlcyhmaWxlOiBGaWxlIHwgQXJyYXlCdWZmZXIgfCBzdHJpbmcsIG9wdGlvbnM/OiBQYXJzZU9wdGlvbnMpOiBQcm9taXNlPFRhYmxlQ29udGVudFtdPiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5wYXJzZShmaWxlLCB7IC4uLm9wdGlvbnMsIGV4dHJhY3RUYWJsZXM6IHRydWUgfSk7XG4gICAgcmV0dXJuIHJlc3VsdC5jb250ZW50LmZpbHRlcigoaXRlbSk6IGl0ZW0gaXMgVGFibGVDb250ZW50ID0+IGl0ZW0udHlwZSA9PT0gQ29udGVudFR5cGUuVEFCTEUpO1xuICB9XG5cbiAgLyoqXG4gICAqIOaPkOWPluWbvueJh1xuICAgKi9cbiAgc3RhdGljIGFzeW5jIGV4dHJhY3RJbWFnZXMoZmlsZTogRmlsZSB8IEFycmF5QnVmZmVyIHwgc3RyaW5nLCBvcHRpb25zPzogUGFyc2VPcHRpb25zKTogUHJvbWlzZTxJbWFnZUNvbnRlbnRbXT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMucGFyc2UoZmlsZSwgeyAuLi5vcHRpb25zLCBleHRyYWN0SW1hZ2VzOiB0cnVlIH0pO1xuICAgIHJldHVybiByZXN1bHQuY29udGVudC5maWx0ZXIoKGl0ZW0pOiBpdGVtIGlzIEltYWdlQ29udGVudCA9PiBpdGVtLnR5cGUgPT09IENvbnRlbnRUeXBlLklNQUdFKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDliIblnZflpITnkIbmlofmoaNcbiAgICovXG4gIHN0YXRpYyBjaHVua0RvY3VtZW50KGNvbnRlbnQ6IHN0cmluZywgY2h1bmtTaXplOiBudW1iZXIgPSAyMDAwLCBjaHVua092ZXJsYXA6IG51bWJlciA9IDIwMCk6IHsgdGV4dDogc3RyaW5nOyBzdGFydEluZGV4OiBudW1iZXI7IGVuZEluZGV4OiBudW1iZXIgfVtdIHtcbiAgICBjb25zdCBjaHVua3M6IHsgdGV4dDogc3RyaW5nOyBzdGFydEluZGV4OiBudW1iZXI7IGVuZEluZGV4OiBudW1iZXIgfVtdID0gW107XG4gICAgbGV0IHN0YXJ0SW5kZXggPSAwO1xuXG4gICAgd2hpbGUgKHN0YXJ0SW5kZXggPCBjb250ZW50Lmxlbmd0aCkge1xuICAgICAgY29uc3QgZW5kSW5kZXggPSBNYXRoLm1pbihzdGFydEluZGV4ICsgY2h1bmtTaXplLCBjb250ZW50Lmxlbmd0aCk7XG4gICAgICBjb25zdCBjaHVuayA9IGNvbnRlbnQuc3Vic3RyaW5nKHN0YXJ0SW5kZXgsIGVuZEluZGV4KTtcbiAgICAgIGNodW5rcy5wdXNoKHsgdGV4dDogY2h1bmssIHN0YXJ0SW5kZXgsIGVuZEluZGV4IH0pO1xuICAgICAgc3RhcnRJbmRleCA9IGVuZEluZGV4IC0gY2h1bmtPdmVybGFwO1xuICAgICAgaWYgKHN0YXJ0SW5kZXggPj0gY29udGVudC5sZW5ndGggLSBjaHVua092ZXJsYXApIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGNodW5rcztcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5bmlK/mjIHnmoTmlofmoaPnsbvlnotcbiAgICovXG4gIHN0YXRpYyBnZXRTdXBwb3J0ZWRUeXBlcygpOiBEb2N1bWVudFR5cGVbXSB7XG4gICAgcmV0dXJuIGRvY3VtZW50UGFyc2VyUmVnaXN0cnkuZ2V0U3VwcG9ydGVkVHlwZXMoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDms6jlhozoh6rlrprkuYnop6PmnpDlmahcbiAgICovXG4gIHN0YXRpYyByZWdpc3RlclBhcnNlcihwYXJzZXI6IERvY3VtZW50UGFyc2VyKTogdm9pZCB7XG4gICAgZG9jdW1lbnRQYXJzZXJSZWdpc3RyeS5yZWdpc3RlclBhcnNlcihwYXJzZXIpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IERvY3VtZW50UGFyc2VyVXRpbDtcbiJdfQ==