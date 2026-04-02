/**
 * 文档类型
 */
export declare enum DocumentType {
    PDF = "pdf",
    WORD = "word",
    EXCEL = "excel",
    POWERPOINT = "powerpoint",
    TEXT = "text",
    IMAGE = "image",
    UNKNOWN = "unknown"
}
/**
 * 文档元数据
 */
export interface DocumentMetadata {
    /** 文档名称 */
    name: string;
    /** 文档类型 */
    type: DocumentType;
    /** 文档大小（字节） */
    size: number;
    /** 创建时间 */
    createdAt?: Date;
    /** 修改时间 */
    modifiedAt?: Date;
    /** 页面数（适用于 PDF、PowerPoint） */
    pageCount?: number;
    /** 总字数 */
    wordCount?: number;
    /** 总字符数 */
    charCount?: number;
    /** 作者 */
    author?: string;
    /** 标题 */
    title?: string;
    /** 主题 */
    subject?: string;
    /** 关键词 */
    keywords?: string[];
}
/**
 * 文档内容元素类型
 */
export declare enum ContentType {
    TEXT = "text",
    TABLE = "table",
    IMAGE = "image",
    HEADER = "header",
    FOOTER = "footer",
    PAGE_BREAK = "pageBreak",
    SECTION_BREAK = "sectionBreak"
}
/**
 * 文本内容
 */
export interface TextContent {
    type: ContentType.TEXT;
    text: string;
    /** 字体大小 */
    fontSize?: number;
    /** 字体名称 */
    fontFamily?: string;
    /** 是否加粗 */
    bold?: boolean;
    /** 是否斜体 */
    italic?: boolean;
    /** 是否下划线 */
    underline?: boolean;
    /** 文本颜色 */
    color?: string;
    /** 段落对齐方式 */
    alignment?: 'left' | 'center' | 'right' | 'justify';
    /** 段落缩进 */
    indent?: number;
    /** 行间距 */
    lineSpacing?: number;
}
/**
 * 表格内容
 */
export interface TableContent {
    type: ContentType.TABLE;
    rows: string[][];
    /** 表头行索引 */
    headerRowIndex?: number;
    /** 表格标题 */
    title?: string;
    /** 表格宽度 */
    width?: number;
    /** 表格高度 */
    height?: number;
    /** 单元格合并信息 */
    mergedCells?: {
        row: number;
        col: number;
        rowSpan: number;
        colSpan: number;
    }[];
}
/**
 * 图片内容
 */
export interface ImageContent {
    type: ContentType.IMAGE;
    /** 图片数据 URL 或路径 */
    url: string;
    /** 图片宽度 */
    width?: number;
    /** 图片高度 */
    height?: number;
    /** 图片 alt 文本 */
    alt?: string;
    /** 图片标题 */
    title?: string;
    /** 图片格式 */
    format?: string;
    /** 图片大小（字节） */
    size?: number;
}
/**
 * 页眉内容
 */
export interface HeaderContent {
    type: ContentType.HEADER;
    content: DocumentContent[];
    /** 页眉类型：默认、首页、偶数页 */
    headerType?: 'default' | 'first' | 'even';
}
/**
 * 页脚内容
 */
export interface FooterContent {
    type: ContentType.FOOTER;
    content: DocumentContent[];
    /** 页脚类型：默认、首页、偶数页 */
    footerType?: 'default' | 'first' | 'even';
}
/**
 * 页面 break
 */
export interface PageBreakContent {
    type: ContentType.PAGE_BREAK;
}
/**
 * 章节 break
 */
export interface SectionBreakContent {
    type: ContentType.SECTION_BREAK;
    /** 分节类型 */
    sectionType?: 'nextPage' | 'continuous' | 'evenPage' | 'oddPage';
}
/**
 * 文档内容元素
 */
export type DocumentContent = TextContent | TableContent | ImageContent | HeaderContent | FooterContent | PageBreakContent | SectionBreakContent;
/**
 * 文档页面
 */
export interface DocumentPage {
    /** 页面索引（从 0 开始） */
    index: number;
    /** 页面内容 */
    content: DocumentContent[];
    /** 页面宽度（像素） */
    width?: number;
    /** 页面高度（像素） */
    height?: number;
    /** 页面大小（如 A4、Letter 等） */
    pageSize?: string;
    /** 页面方向（横向/纵向） */
    orientation?: 'portrait' | 'landscape';
}
/**
 * 解析选项
 */
export interface ParseOptions {
    /** 是否提取文本 */
    extractText?: boolean;
    /** 是否提取表格 */
    extractTables?: boolean;
    /** 是否提取图片 */
    extractImages?: boolean;
    /** 是否提取页眉页脚 */
    extractHeadersFooters?: boolean;
    /** 是否按页面解析 */
    parseByPage?: boolean;
    /** 最大页面数（0 表示无限制） */
    maxPages?: number;
    /** 起始页码（从 0 开始） */
    startPage?: number;
    /** 结束页码（从 0 开始，-1 表示到最后一页） */
    endPage?: number;
    /** 是否启用 OCR（针对扫描文档） */
    enableOCR?: boolean;
    /** OCR 语言 */
    ocrLanguage?: string;
    /** 是否分块处理大文档 */
    enableChunking?: boolean;
    /** 块大小（字符数） */
    chunkSize?: number;
    /** 块重叠大小（字符数） */
    chunkOverlap?: number;
    /** 是否缓存解析结果 */
    enableCache?: boolean;
    /** 缓存过期时间（毫秒） */
    cacheExpiry?: number;
}
/**
 * 文档解析结果
 */
export interface DocumentParseResult {
    /** 文档元数据 */
    metadata: DocumentMetadata;
    /** 文档内容 */
    content: DocumentContent[];
    /** 按页面组织的内容 */
    pages?: DocumentPage[];
    /** 纯文本内容 */
    text?: string;
    /** 文档分块 */
    chunks?: {
        text: string;
        startIndex: number;
        endIndex: number;
        pageIndex?: number;
    }[];
    /** 解析时间（毫秒） */
    parseTime: number;
    /** 解析是否成功 */
    success: boolean;
    /** 错误信息（如果解析失败） */
    error?: string;
}
/**
 * 文档解析器接口
 */
export interface DocumentParser {
    /** 支持的文档类型 */
    supportedTypes: DocumentType[];
    /**
     * 检测文档类型
     */
    detectType(file: File | ArrayBuffer | string): Promise<DocumentType>;
    /**
     * 解析文档
     */
    parse(file: File | ArrayBuffer | string, options?: ParseOptions): Promise<DocumentParseResult>;
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
     * 分块处理文档
     */
    chunkDocument(content: string, chunkSize?: number, chunkOverlap?: number): {
        text: string;
        startIndex: number;
        endIndex: number;
    }[];
}
/**
 * 文档解析器注册表
 */
export interface DocumentParserRegistry {
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
