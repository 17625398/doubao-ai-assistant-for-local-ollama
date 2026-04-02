// AI 文档处理模块

import { DocumentParseResult, DocumentContent, ContentType } from '../types/document';
import { ollamaClient } from './ollama-client';
import { OpenAICompatibleClient } from './openai-compatible-client';
import { aiConfigManager } from './ai-config-manager';
import { logger } from './logger';

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
export class AIDocumentProcessor {
  private async generateText(params: { prompt: string; system?: string; model?: string }): Promise<string> {
    const config = aiConfigManager.getConfig();

    if (config.provider === 'ollama' && config.ollama) {
      const response = await ollamaClient.generate(params.prompt, {
        model: params.model,
        system: params.system,
      });
      return response.response || '';
    }

    if (config.provider === 'openai' && config.openai) {
      const client = new OpenAICompatibleClient({
        baseUrl: config.openai.baseUrl || 'https://api.openai.com/v1',
        apiKey: config.openai.apiKey,
        defaultModel: config.openai.defaultModel,
        timeout: config.openai.timeout ?? 30000,
        streamEnabled: config.openai.streamEnabled ?? true,
        headers: config.openai.headers,
      });
      const response = await client.generate({
        prompt: params.prompt,
        system: params.system,
        model: params.model,
      });
      return response.content;
    }

    if (config.provider === 'custom' && config.custom) {
      const client = new OpenAICompatibleClient({
        baseUrl: config.custom.baseUrl,
        apiKey: config.custom.apiKey,
        defaultModel: config.custom.defaultModel,
        timeout: config.custom.timeout ?? 30000,
        streamEnabled: config.custom.streamEnabled ?? true,
        headers: config.custom.headers,
      });
      const response = await client.generate({
        prompt: params.prompt,
        system: params.system,
        model: params.model,
      });
      return response.content;
    }

    throw new Error('AI 服务未配置');
  }

  /**
   * 向量化文档
   */
  async vectorizeDocument(document: DocumentParseResult): Promise<DocumentVector[]> {
    const vectors: DocumentVector[] = [];
    
    // 使用文档分块进行向量化
    const chunks = document.chunks || [];
    
    for (const chunk of chunks) {
      try {
        // 这里使用 Ollama 模型生成嵌入
        // 实际实现中可能需要使用专门的嵌入模型
        const embedding = await this.generateEmbedding(chunk.text);
        vectors.push({
          text: chunk.text,
          embedding,
          metadata: {
            startIndex: chunk.startIndex,
            endIndex: chunk.endIndex,
            pageIndex: chunk.pageIndex,
          },
        });
      } catch (error) {
        logger.error('Failed to vectorize chunk:', error);
      }
    }
    
    return vectors;
  }

  /**
   * 生成文本嵌入
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // 这里是嵌入生成的占位符
    // 实际实现中可以使用 Ollama 的 embedding API 或其他嵌入模型
    // 暂时返回随机向量作为示例
    return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
  }

  /**
   * 语义检索
   */
  async retrieveRelevantContent(
    query: string,
    vectors: DocumentVector[],
    topK: number = 3
  ): Promise<DocumentRetrievalResult[]> {
    try {
      // 生成查询的嵌入
      const queryEmbedding = await this.generateEmbedding(query);
      
      // 计算相似度
      const results = vectors.map(vector => ({
        text: vector.text,
        score: this.cosineSimilarity(queryEmbedding, vector.embedding),
        metadata: vector.metadata,
      }));
      
      // 按相似度排序并返回前 topK 个结果
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    } catch (error) {
      logger.error('Failed to retrieve relevant content:', error);
      return [];
    }
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 文档问答
   */
  async answerDocumentQuestion(
    question: string,
    document: DocumentParseResult,
    options?: {
      model?: string;
      includeReferences?: boolean;
    }
  ): Promise<{
    answer: string;
    references?: {
      text: string;
      startIndex: number;
      endIndex: number;
      pageIndex?: number;
    }[];
  }> {
    try {
      // 向量化文档
      const vectors = await this.vectorizeDocument(document);
      
      // 检索相关内容
      const relevantContent = await this.retrieveRelevantContent(question, vectors);
      
      // 构建提示词
      const prompt = this.buildDocumentQAPrompt(question, relevantContent);

      const answer = await this.generateText({
        prompt,
        model: options?.model,
        system: 'You are a helpful assistant that answers questions based on the provided document content. Always reference the original document when answering.',
      });

      return {
        answer,
        references: options?.includeReferences ? relevantContent.map(item => ({
          text: item.text,
          startIndex: item.metadata.startIndex,
          endIndex: item.metadata.endIndex,
          pageIndex: item.metadata.pageIndex,
        })) : undefined,
      };
    } catch (error) {
      logger.error('Failed to answer document question:', error);
      return {
        answer: 'Failed to generate answer',
      };
    }
  }

  /**
   * 构建文档问答提示词
   */
  private buildDocumentQAPrompt(question: string, relevantContent: DocumentRetrievalResult[]): string {
    const context = relevantContent
      .map((item, index) => `[Reference ${index + 1}]
${item.text}
`)
      .join('\n');
    
    return `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer based on the provided context. Include references to the original content where appropriate.`;
  }

  /**
   * 生成文档摘要
   */
  async generateDocumentSummary(
    document: DocumentParseResult,
    options?: {
      model?: string;
      summaryLength?: 'short' | 'medium' | 'long';
    }
  ): Promise<string> {
    try {
      // 提取文档文本
      const text = document.text || '';
      
      // 限制文本长度，避免超出模型上下文窗口
      const maxLength = 8000; // 可根据模型上下文窗口调整
      const truncatedText = text.length > maxLength 
        ? text.substring(0, maxLength) + '... (truncated)' 
        : text;
      
      // 构建摘要提示词
      const lengthInstruction = {
        short: 'Keep the summary concise, under 100 words.',
        medium: 'Provide a balanced summary, around 200-300 words.',
        long: 'Provide a detailed summary, including key points and details.',
      }[options?.summaryLength || 'medium'];
      
      const prompt = `Please summarize the following document. ${lengthInstruction}\n\n${truncatedText}`;

      return await this.generateText({
        prompt,
        model: options?.model,
        system: 'You are a helpful assistant that summarizes documents accurately and concisely.',
      });
    } catch (error) {
      logger.error('Failed to generate document summary:', error);
      return 'Failed to generate summary';
    }
  }

  /**
   * 提取文档关键信息
   */
  async extractKeyInformation(
    document: DocumentParseResult,
    options?: {
      model?: string;
      categories?: string[];
    }
  ): Promise<Record<string, string[]>> {
    try {
      // 提取文档文本
      const text = document.text || '';
      
      // 限制文本长度
      const maxLength = 8000;
      const truncatedText = text.length > maxLength 
        ? text.substring(0, maxLength) + '... (truncated)' 
        : text;
      
      // 构建提取提示词
      const categories = options?.categories || ['Key Points', 'Important Details', 'Action Items', 'Questions', 'Conclusions'];
      const categoriesList = categories.join(', ');
      
      const prompt = `Extract the following information from the document: ${categoriesList}\n\nDocument:\n${truncatedText}\n\nFormat your response as a JSON object where each key is a category name and the value is an array of extracted items.`;

      const content = await this.generateText({
        prompt,
        model: options?.model,
        system: 'You are a helpful assistant that extracts key information from documents in a structured format.',
      });

      // 解析 JSON 响应
      try {
        return JSON.parse(content || '{}');
      } catch (parseError) {
        logger.error('Failed to parse key information response:', parseError);
        return {};
      }
    } catch (error) {
      logger.error('Failed to extract key information:', error);
      return {};
    }
  }

  /**
   * 多语言文档处理
   */
  async processMultilingualDocument(
    document: DocumentParseResult,
    targetLanguage: string = 'English',
    options?: {
      model?: string;
    }
  ): Promise<{
    translatedText: string;
    detectedLanguage?: string;
  }> {
    try {
      // 提取文档文本
      const text = document.text || '';
      
      // 限制文本长度
      const maxLength = 8000;
      const truncatedText = text.length > maxLength 
        ? text.substring(0, maxLength) + '... (truncated)' 
        : text;
      
      // 构建翻译提示词
      const prompt = `Translate the following document to ${targetLanguage}. Preserve the original meaning and formatting as much as possible.\n\n${truncatedText}`;

      const translatedText = await this.generateText({
        prompt,
        model: options?.model,
        system: 'You are a skilled translator that accurately translates documents between languages.',
      });

      return {
        translatedText,
        // 这里可以添加语言检测功能
      };
    } catch (error) {
      logger.error('Failed to process multilingual document:', error);
      return {
        translatedText: 'Translation failed',
      };
    }
  }
}

/**
 * 全局 AI 文档处理器实例
 */
export const aiDocumentProcessor = new AIDocumentProcessor();

export default AIDocumentProcessor;
