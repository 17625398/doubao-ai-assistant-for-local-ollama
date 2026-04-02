import { DocumentParseResult } from '../types/document';
/**
 * 文档向量化结果
 */
export interface DocumentVector {
    text: string;
    embedding: number[];
    metadata: {
        startIndex: number;
        endIndex: number;
        pageIndex?: number;
    };
}
/**
 * 文档检索结果
 */
export interface DocumentRetrievalResult {
    text: string;
    score: number;
    metadata: {
        startIndex: number;
        endIndex: number;
        pageIndex?: number;
    };
}
/**
 * AI 文档处理器
 */
export declare class AIDocumentProcessor {
    private generateText;
    /**
     * 向量化文档
     */
    vectorizeDocument(document: DocumentParseResult): Promise<DocumentVector[]>;
    /**
     * 生成文本嵌入
     */
    private generateEmbedding;
    /**
     * 语义检索
     */
    retrieveRelevantContent(query: string, vectors: DocumentVector[], topK?: number): Promise<DocumentRetrievalResult[]>;
    /**
     * 计算余弦相似度
     */
    private cosineSimilarity;
    /**
     * 文档问答
     */
    answerDocumentQuestion(question: string, document: DocumentParseResult, options?: {
        model?: string;
        includeReferences?: boolean;
    }): Promise<{
        answer: string;
        references?: {
            text: string;
            startIndex: number;
            endIndex: number;
            pageIndex?: number;
        }[];
    }>;
    /**
     * 构建文档问答提示词
     */
    private buildDocumentQAPrompt;
    /**
     * 生成文档摘要
     */
    generateDocumentSummary(document: DocumentParseResult, options?: {
        model?: string;
        summaryLength?: 'short' | 'medium' | 'long';
    }): Promise<string>;
    /**
     * 提取文档关键信息
     */
    extractKeyInformation(document: DocumentParseResult, options?: {
        model?: string;
        categories?: string[];
    }): Promise<Record<string, string[]>>;
    /**
     * 多语言文档处理
     */
    processMultilingualDocument(document: DocumentParseResult, targetLanguage?: string, options?: {
        model?: string;
    }): Promise<{
        translatedText: string;
        detectedLanguage?: string;
    }>;
}
/**
 * 全局 AI 文档处理器实例
 */
export declare const aiDocumentProcessor: AIDocumentProcessor;
export default AIDocumentProcessor;
