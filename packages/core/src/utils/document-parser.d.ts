import { DocumentType, DocumentMetadata, DocumentContent, DocumentParseResult, ParseOptions, DocumentParser, DocumentParserRegistry, TableContent, ImageContent } from '../types/document';
/**
 * 基础文档解析器类
 */
export declare abstract class BaseDocumentParser implements DocumentParser {
    abstract supportedTypes: DocumentType[];
    /**
     * 检测文档类型
     */
    detectType(file: File | ArrayBuffer | string): Promise<DocumentType>;
    /**
     * 从 ArrayBuffer 检测文档类型
     */
    private detectTypeFromArrayBuffer;
    /**
     * 解析文档
     */
    abstract parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult>;
    /**
     * 解析文档元数据
     */
    parseMetadata(file: File | ArrayBuffer | string): Promise<DocumentMetadata>;
    /**
     * 提取纯文本
     */
    extractText(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<string>;
    /**
     * 提取表格
     */
    extractTables(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<TableContent[]>;
    /**
     * 提取图片
     */
    extractImages(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<ImageContent[]>;
    /**
     * 执行 OCR 识别
     */
    performOCR(image: File | ArrayBuffer | string, language?: string): Promise<string>;
    /**
     * 检查是否需要 OCR
     */
    needsOCR(file: File | ArrayBuffer | string): Promise<boolean>;
    /**
     * 分块处理文档
     */
    chunkDocument(content: string, chunkSize?: number, chunkOverlap?: number): {
        text: string;
        startIndex: number;
        endIndex: number;
    }[];
    /**
     * 生成解析结果
     */
    protected createParseResult(metadata: DocumentMetadata, content: DocumentContent[], options?: ParseOptions): Promise<DocumentParseResult>;
}
/**
 * 文本文件解析器
 */
export declare class TextDocumentParser extends BaseDocumentParser {
    supportedTypes: DocumentType[];
    parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult>;
}
/**
 * 文档解析器注册表实现
 */
export declare class DefaultDocumentParserRegistry implements DocumentParserRegistry {
    private parsers;
    /**
     * 检测文档类型
     */
    detectType(file: File | ArrayBuffer | string): Promise<DocumentType>;
    /**
     * 注册解析器
     */
    registerParser(parser: DocumentParser): void;
    /**
     * 获取解析器
     */
    getParser(type: DocumentType): DocumentParser | undefined;
    /**
     * 根据文件获取合适的解析器
     */
    getParserForFile(file: File | ArrayBuffer | string): Promise<DocumentParser | undefined>;
    /**
     * 获取所有支持的文档类型
     */
    getSupportedTypes(): DocumentType[];
    /**
     * 解析文档（自动选择解析器）
     */
    parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult>;
}
/**
 * 全局文档解析器注册表实例
 */
export declare const documentParserRegistry: DefaultDocumentParserRegistry;
/**
 * PDF 文档解析器
 */
export declare class PDFDocumentParser extends BaseDocumentParser {
    supportedTypes: DocumentType[];
    parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult>;
}
/**
 * Word 文档解析器
 */
export declare class WordDocumentParser extends BaseDocumentParser {
    supportedTypes: DocumentType[];
    parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult>;
}
/**
 * Excel 文档解析器
 */
export declare class ExcelDocumentParser extends BaseDocumentParser {
    supportedTypes: DocumentType[];
    parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult>;
}
/**
 * PowerPoint 文档解析器
 */
export declare class PowerPointDocumentParser extends BaseDocumentParser {
    supportedTypes: DocumentType[];
    parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult>;
}
/**
 * 图像文档解析器
 */
export declare class ImageDocumentParser extends BaseDocumentParser {
    supportedTypes: DocumentType[];
    parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult>;
}
/**
 * 文档解析工具类
 */
export declare class DocumentParserUtil {
    /**
     * 解析文档
     */
    static parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult>;
    /**
     * 提取纯文本
     */
    static extractText(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<string>;
    /**
     * 提取表格
     */
    static extractTables(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<TableContent[]>;
    /**
     * 提取图片
     */
    static extractImages(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<ImageContent[]>;
    /**
     * 分块处理文档
     */
    static chunkDocument(content: string, chunkSize?: number, chunkOverlap?: number): {
        text: string;
        startIndex: number;
        endIndex: number;
    }[];
    /**
     * 获取支持的文档类型
     */
    static getSupportedTypes(): DocumentType[];
    /**
     * 注册自定义解析器
     */
    static registerParser(parser: DocumentParser): void;
}
export default DocumentParserUtil;
