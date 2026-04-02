// AI 文档处理模块
import { ollamaClient } from './ollama-client';
import { OpenAICompatibleClient } from './openai-compatible-client';
import { aiConfigManager } from './ai-config-manager';
import { logger } from './logger';
/**
 * AI 文档处理器
 */
export class AIDocumentProcessor {
    async generateText(params) {
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
    async vectorizeDocument(document) {
        const vectors = [];
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
            }
            catch (error) {
                logger.error('Failed to vectorize chunk:', error);
            }
        }
        return vectors;
    }
    /**
     * 生成文本嵌入
     */
    async generateEmbedding(text) {
        // 这里是嵌入生成的占位符
        // 实际实现中可以使用 Ollama 的 embedding API 或其他嵌入模型
        // 暂时返回随机向量作为示例
        return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
    }
    /**
     * 语义检索
     */
    async retrieveRelevantContent(query, vectors, topK = 3) {
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
        }
        catch (error) {
            logger.error('Failed to retrieve relevant content:', error);
            return [];
        }
    }
    /**
     * 计算余弦相似度
     */
    cosineSimilarity(a, b) {
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
    async answerDocumentQuestion(question, document, options) {
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
        }
        catch (error) {
            logger.error('Failed to answer document question:', error);
            return {
                answer: 'Failed to generate answer',
            };
        }
    }
    /**
     * 构建文档问答提示词
     */
    buildDocumentQAPrompt(question, relevantContent) {
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
    async generateDocumentSummary(document, options) {
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
        }
        catch (error) {
            logger.error('Failed to generate document summary:', error);
            return 'Failed to generate summary';
        }
    }
    /**
     * 提取文档关键信息
     */
    async extractKeyInformation(document, options) {
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
            }
            catch (parseError) {
                logger.error('Failed to parse key information response:', parseError);
                return {};
            }
        }
        catch (error) {
            logger.error('Failed to extract key information:', error);
            return {};
        }
    }
    /**
     * 多语言文档处理
     */
    async processMultilingualDocument(document, targetLanguage = 'English', options) {
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
        }
        catch (error) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWktZG9jdW1lbnQtcHJvY2Vzc29yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL2FpLWRvY3VtZW50LXByb2Nlc3Nvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZO0FBR1osT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUN0RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBNEJsQzs7R0FFRztBQUNILE1BQU0sT0FBTyxtQkFBbUI7SUFDdEIsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUEyRDtRQUNwRixNQUFNLE1BQU0sR0FBRyxlQUFlLENBQUMsU0FBUyxFQUFFLENBQUM7UUFFM0MsSUFBSSxNQUFNLENBQUMsUUFBUSxLQUFLLFFBQVEsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEQsTUFBTSxRQUFRLEdBQUcsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7Z0JBQzFELEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSztnQkFDbkIsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNO2FBQ3RCLENBQUMsQ0FBQztZQUNILE9BQU8sUUFBUSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDakMsQ0FBQztRQUVELElBQUksTUFBTSxDQUFDLFFBQVEsS0FBSyxRQUFRLElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2xELE1BQU0sTUFBTSxHQUFHLElBQUksc0JBQXNCLENBQUM7Z0JBQ3hDLE9BQU8sRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sSUFBSSwyQkFBMkI7Z0JBQzdELE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU07Z0JB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QUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUVqQyxTQUFTO1lBQ1QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDO1lBQ3ZCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsU0FBUztnQkFDM0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxHQUFHLGlCQUFpQjtnQkFDbEQsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUVULFVBQVU7WUFDVixNQUFNLE1BQU0sR0FBRyx1Q0FBdUMsY0FBYywwRUFBMEUsYUFBYSxFQUFFLENBQUM7WUFFOUosTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDO2dCQUM3QyxNQUFNO2dCQUNOLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSztnQkFDckIsTUFBTSxFQUFFLHNGQUFzRjthQUMvRixDQUFDLENBQUM7WUFFSCxPQUFPO2dCQUNMLGNBQWM7Z0JBQ2QsZUFBZTthQUNoQixDQUFDO1FBQ0osQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixNQUFNLENBQUMsS0FBSyxDQUFDLDBDQUEwQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2hFLE9BQU87Z0JBQ0wsY0FBYyxFQUFFLG9CQUFvQjthQUNyQyxDQUFDO1FBQ0osQ0FBQztJQUNILENBQUM7Q0FDRjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO0FBRTdELGVBQWUsbUJBQW1CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBBSSDmlofmoaPlpITnkIbmqKHlnZdcblxuaW1wb3J0IHsgRG9jdW1lbnRQYXJzZVJlc3VsdCwgRG9jdW1lbnRDb250ZW50LCBDb250ZW50VHlwZSB9IGZyb20gJy4uL3R5cGVzL2RvY3VtZW50JztcbmltcG9ydCB7IG9sbGFtYUNsaWVudCB9IGZyb20gJy4vb2xsYW1hLWNsaWVudCc7XG5pbXBvcnQgeyBPcGVuQUlDb21wYXRpYmxlQ2xpZW50IH0gZnJvbSAnLi9vcGVuYWktY29tcGF0aWJsZS1jbGllbnQnO1xuaW1wb3J0IHsgYWlDb25maWdNYW5hZ2VyIH0gZnJvbSAnLi9haS1jb25maWctbWFuYWdlcic7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tICcuL2xvZ2dlcic7XG5cbi8qKlxuICog5paH5qGj5ZCR6YeP5YyW57uT5p6cXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRG9jdW1lbnRWZWN0b3Ige1xuICB0ZXh0OiBzdHJpbmc7XG4gIGVtYmVkZGluZzogbnVtYmVyW107XG4gIG1ldGFkYXRhOiB7XG4gICAgc3RhcnRJbmRleDogbnVtYmVyO1xuICAgIGVuZEluZGV4OiBudW1iZXI7XG4gICAgcGFnZUluZGV4PzogbnVtYmVyO1xuICB9O1xufVxuXG4vKipcbiAqIOaWh+aho+ajgOe0oue7k+aenFxuICovXG5leHBvcnQgaW50ZXJmYWNlIERvY3VtZW50UmV0cmlldmFsUmVzdWx0IHtcbiAgdGV4dDogc3RyaW5nO1xuICBzY29yZTogbnVtYmVyO1xuICBtZXRhZGF0YToge1xuICAgIHN0YXJ0SW5kZXg6IG51bWJlcjtcbiAgICBlbmRJbmRleDogbnVtYmVyO1xuICAgIHBhZ2VJbmRleD86IG51bWJlcjtcbiAgfTtcbn1cblxuLyoqXG4gKiBBSSDmlofmoaPlpITnkIblmahcbiAqL1xuZXhwb3J0IGNsYXNzIEFJRG9jdW1lbnRQcm9jZXNzb3Ige1xuICBwcml2YXRlIGFzeW5jIGdlbmVyYXRlVGV4dChwYXJhbXM6IHsgcHJvbXB0OiBzdHJpbmc7IHN5c3RlbT86IHN0cmluZzsgbW9kZWw/OiBzdHJpbmcgfSk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgY29uZmlnID0gYWlDb25maWdNYW5hZ2VyLmdldENvbmZpZygpO1xuXG4gICAgaWYgKGNvbmZpZy5wcm92aWRlciA9PT0gJ29sbGFtYScgJiYgY29uZmlnLm9sbGFtYSkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBvbGxhbWFDbGllbnQuZ2VuZXJhdGUocGFyYW1zLnByb21wdCwge1xuICAgICAgICBtb2RlbDogcGFyYW1zLm1vZGVsLFxuICAgICAgICBzeXN0ZW06IHBhcmFtcy5zeXN0ZW0sXG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXNwb25zZS5yZXNwb25zZSB8fCAnJztcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLnByb3ZpZGVyID09PSAnb3BlbmFpJyAmJiBjb25maWcub3BlbmFpKSB7XG4gICAgICBjb25zdCBjbGllbnQgPSBuZXcgT3BlbkFJQ29tcGF0aWJsZUNsaWVudCh7XG4gICAgICAgIGJhc2VVcmw6IGNvbmZpZy5vcGVuYWkuYmFzZVVybCB8fCAnaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MScsXG4gICAgICAgIGFwaUtleTogY29uZmlnLm9wZW5haS5hcGlLZXksXG4gICAgICAgIGRlZmF1bHRNb2RlbDogY29uZmlnLm9wZW5haS5kZWZhdWx0TW9kZWwsXG4gICAgICAgIHRpbWVvdXQ6IGNvbmZpZy5vcGVuYWkudGltZW91dCA/PyAzMDAwMCxcbiAgICAgICAgc3RyZWFtRW5hYmxlZDogY29uZmlnLm9wZW5haS5zdHJlYW1FbmFibGVkID8/IHRydWUsXG4gICAgICAgIGhlYWRlcnM6IGNvbmZpZy5vcGVuYWkuaGVhZGVycyxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjbGllbnQuZ2VuZXJhdGUoe1xuICAgICAgICBwcm9tcHQ6IHBhcmFtcy5wcm9tcHQsXG4gICAgICAgIHN5c3RlbTogcGFyYW1zLnN5c3RlbSxcbiAgICAgICAgbW9kZWw6IHBhcmFtcy5tb2RlbCxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmNvbnRlbnQ7XG4gICAgfVxuXG4gICAgaWYgKGNvbmZpZy5wcm92aWRlciA9PT0gJ2N1c3RvbScgJiYgY29uZmlnLmN1c3RvbSkge1xuICAgICAgY29uc3QgY2xpZW50ID0gbmV3IE9wZW5BSUNvbXBhdGlibGVDbGllbnQoe1xuICAgICAgICBiYXNlVXJsOiBjb25maWcuY3VzdG9tLmJhc2VVcmwsXG4gICAgICAgIGFwaUtleTogY29uZmlnLmN1c3RvbS5hcGlLZXksXG4gICAgICAgIGRlZmF1bHRNb2RlbDogY29uZmlnLmN1c3RvbS5kZWZhdWx0TW9kZWwsXG4gICAgICAgIHRpbWVvdXQ6IGNvbmZpZy5jdXN0b20udGltZW91dCA/PyAzMDAwMCxcbiAgICAgICAgc3RyZWFtRW5hYmxlZDogY29uZmlnLmN1c3RvbS5zdHJlYW1FbmFibGVkID8/IHRydWUsXG4gICAgICAgIGhlYWRlcnM6IGNvbmZpZy5jdXN0b20uaGVhZGVycyxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjbGllbnQuZ2VuZXJhdGUoe1xuICAgICAgICBwcm9tcHQ6IHBhcmFtcy5wcm9tcHQsXG4gICAgICAgIHN5c3RlbTogcGFyYW1zLnN5c3RlbSxcbiAgICAgICAgbW9kZWw6IHBhcmFtcy5tb2RlbCxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLmNvbnRlbnQ7XG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKCdBSSDmnI3liqHmnKrphY3nva4nKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDlkJHph4/ljJbmlofmoaNcbiAgICovXG4gIGFzeW5jIHZlY3Rvcml6ZURvY3VtZW50KGRvY3VtZW50OiBEb2N1bWVudFBhcnNlUmVzdWx0KTogUHJvbWlzZTxEb2N1bWVudFZlY3RvcltdPiB7XG4gICAgY29uc3QgdmVjdG9yczogRG9jdW1lbnRWZWN0b3JbXSA9IFtdO1xuICAgIFxuICAgIC8vIOS9v+eUqOaWh+aho+WIhuWdl+i/m+ihjOWQkemHj+WMllxuICAgIGNvbnN0IGNodW5rcyA9IGRvY3VtZW50LmNodW5rcyB8fCBbXTtcbiAgICBcbiAgICBmb3IgKGNvbnN0IGNodW5rIG9mIGNodW5rcykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8g6L+Z6YeM5L2/55SoIE9sbGFtYSDmqKHlnovnlJ/miJDltYzlhaVcbiAgICAgICAgLy8g5a6e6ZmF5a6e546w5Lit5Y+v6IO96ZyA6KaB5L2/55So5LiT6Zeo55qE5bWM5YWl5qih5Z6LXG4gICAgICAgIGNvbnN0IGVtYmVkZGluZyA9IGF3YWl0IHRoaXMuZ2VuZXJhdGVFbWJlZGRpbmcoY2h1bmsudGV4dCk7XG4gICAgICAgIHZlY3RvcnMucHVzaCh7XG4gICAgICAgICAgdGV4dDogY2h1bmsudGV4dCxcbiAgICAgICAgICBlbWJlZGRpbmcsXG4gICAgICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgICAgIHN0YXJ0SW5kZXg6IGNodW5rLnN0YXJ0SW5kZXgsXG4gICAgICAgICAgICBlbmRJbmRleDogY2h1bmsuZW5kSW5kZXgsXG4gICAgICAgICAgICBwYWdlSW5kZXg6IGNodW5rLnBhZ2VJbmRleCxcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHZlY3Rvcml6ZSBjaHVuazonLCBlcnJvcik7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB2ZWN0b3JzO1xuICB9XG5cbiAgLyoqXG4gICAqIOeUn+aIkOaWh+acrOW1jOWFpVxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBnZW5lcmF0ZUVtYmVkZGluZyh0ZXh0OiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcltdPiB7XG4gICAgLy8g6L+Z6YeM5piv5bWM5YWl55Sf5oiQ55qE5Y2g5L2N56ymXG4gICAgLy8g5a6e6ZmF5a6e546w5Lit5Y+v5Lul5L2/55SoIE9sbGFtYSDnmoQgZW1iZWRkaW5nIEFQSSDmiJblhbbku5bltYzlhaXmqKHlnotcbiAgICAvLyDmmoLml7bov5Tlm57pmo/mnLrlkJHph4/kvZzkuLrnpLrkvotcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh7IGxlbmd0aDogNzY4IH0sICgpID0+IE1hdGgucmFuZG9tKCkgKiAyIC0gMSk7XG4gIH1cblxuICAvKipcbiAgICog6K+t5LmJ5qOA57SiXG4gICAqL1xuICBhc3luYyByZXRyaWV2ZVJlbGV2YW50Q29udGVudChcbiAgICBxdWVyeTogc3RyaW5nLFxuICAgIHZlY3RvcnM6IERvY3VtZW50VmVjdG9yW10sXG4gICAgdG9wSzogbnVtYmVyID0gM1xuICApOiBQcm9taXNlPERvY3VtZW50UmV0cmlldmFsUmVzdWx0W10+IHtcbiAgICB0cnkge1xuICAgICAgLy8g55Sf5oiQ5p+l6K+i55qE5bWM5YWlXG4gICAgICBjb25zdCBxdWVyeUVtYmVkZGluZyA9IGF3YWl0IHRoaXMuZ2VuZXJhdGVFbWJlZGRpbmcocXVlcnkpO1xuICAgICAgXG4gICAgICAvLyDorqHnrpfnm7jkvLzluqZcbiAgICAgIGNvbnN0IHJlc3VsdHMgPSB2ZWN0b3JzLm1hcCh2ZWN0b3IgPT4gKHtcbiAgICAgICAgdGV4dDogdmVjdG9yLnRleHQsXG4gICAgICAgIHNjb3JlOiB0aGlzLmNvc2luZVNpbWlsYXJpdHkocXVlcnlFbWJlZGRpbmcsIHZlY3Rvci5lbWJlZGRpbmcpLFxuICAgICAgICBtZXRhZGF0YTogdmVjdG9yLm1ldGFkYXRhLFxuICAgICAgfSkpO1xuICAgICAgXG4gICAgICAvLyDmjInnm7jkvLzluqbmjpLluo/lubbov5Tlm57liY0gdG9wSyDkuKrnu5PmnpxcbiAgICAgIHJldHVybiByZXN1bHRzXG4gICAgICAgIC5zb3J0KChhLCBiKSA9PiBiLnNjb3JlIC0gYS5zY29yZSlcbiAgICAgICAgLnNsaWNlKDAsIHRvcEspO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byByZXRyaWV2ZSByZWxldmFudCBjb250ZW50OicsIGVycm9yKTtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog6K6h566X5L2Z5bym55u45Ly85bqmXG4gICAqL1xuICBwcml2YXRlIGNvc2luZVNpbWlsYXJpdHkoYTogbnVtYmVyW10sIGI6IG51bWJlcltdKTogbnVtYmVyIHtcbiAgICBpZiAoYS5sZW5ndGggIT09IGIubGVuZ3RoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZlY3RvcnMgbXVzdCBoYXZlIHRoZSBzYW1lIGxlbmd0aCcpO1xuICAgIH1cbiAgICBcbiAgICBsZXQgZG90UHJvZHVjdCA9IDA7XG4gICAgbGV0IG5vcm1BID0gMDtcbiAgICBsZXQgbm9ybUIgPSAwO1xuICAgIFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgICAgZG90UHJvZHVjdCArPSBhW2ldICogYltpXTtcbiAgICAgIG5vcm1BICs9IGFbaV0gKiBhW2ldO1xuICAgICAgbm9ybUIgKz0gYltpXSAqIGJbaV07XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBkb3RQcm9kdWN0IC8gKE1hdGguc3FydChub3JtQSkgKiBNYXRoLnNxcnQobm9ybUIpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDmlofmoaPpl67nrZRcbiAgICovXG4gIGFzeW5jIGFuc3dlckRvY3VtZW50UXVlc3Rpb24oXG4gICAgcXVlc3Rpb246IHN0cmluZyxcbiAgICBkb2N1bWVudDogRG9jdW1lbnRQYXJzZVJlc3VsdCxcbiAgICBvcHRpb25zPzoge1xuICAgICAgbW9kZWw/OiBzdHJpbmc7XG4gICAgICBpbmNsdWRlUmVmZXJlbmNlcz86IGJvb2xlYW47XG4gICAgfVxuICApOiBQcm9taXNlPHtcbiAgICBhbnN3ZXI6IHN0cmluZztcbiAgICByZWZlcmVuY2VzPzoge1xuICAgICAgdGV4dDogc3RyaW5nO1xuICAgICAgc3RhcnRJbmRleDogbnVtYmVyO1xuICAgICAgZW5kSW5kZXg6IG51bWJlcjtcbiAgICAgIHBhZ2VJbmRleD86IG51bWJlcjtcbiAgICB9W107XG4gIH0+IHtcbiAgICB0cnkge1xuICAgICAgLy8g5ZCR6YeP5YyW5paH5qGjXG4gICAgICBjb25zdCB2ZWN0b3JzID0gYXdhaXQgdGhpcy52ZWN0b3JpemVEb2N1bWVudChkb2N1bWVudCk7XG4gICAgICBcbiAgICAgIC8vIOajgOe0ouebuOWFs+WGheWuuVxuICAgICAgY29uc3QgcmVsZXZhbnRDb250ZW50ID0gYXdhaXQgdGhpcy5yZXRyaWV2ZVJlbGV2YW50Q29udGVudChxdWVzdGlvbiwgdmVjdG9ycyk7XG4gICAgICBcbiAgICAgIC8vIOaehOW7uuaPkOekuuivjVxuICAgICAgY29uc3QgcHJvbXB0ID0gdGhpcy5idWlsZERvY3VtZW50UUFQcm9tcHQocXVlc3Rpb24sIHJlbGV2YW50Q29udGVudCk7XG5cbiAgICAgIGNvbnN0IGFuc3dlciA9IGF3YWl0IHRoaXMuZ2VuZXJhdGVUZXh0KHtcbiAgICAgICAgcHJvbXB0LFxuICAgICAgICBtb2RlbDogb3B0aW9ucz8ubW9kZWwsXG4gICAgICAgIHN5c3RlbTogJ1lvdSBhcmUgYSBoZWxwZnVsIGFzc2lzdGFudCB0aGF0IGFuc3dlcnMgcXVlc3Rpb25zIGJhc2VkIG9uIHRoZSBwcm92aWRlZCBkb2N1bWVudCBjb250ZW50LiBBbHdheXMgcmVmZXJlbmNlIHRoZSBvcmlnaW5hbCBkb2N1bWVudCB3aGVuIGFuc3dlcmluZy4nLFxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGFuc3dlcixcbiAgICAgICAgcmVmZXJlbmNlczogb3B0aW9ucz8uaW5jbHVkZVJlZmVyZW5jZXMgPyByZWxldmFudENvbnRlbnQubWFwKGl0ZW0gPT4gKHtcbiAgICAgICAgICB0ZXh0OiBpdGVtLnRleHQsXG4gICAgICAgICAgc3RhcnRJbmRleDogaXRlbS5tZXRhZGF0YS5zdGFydEluZGV4LFxuICAgICAgICAgIGVuZEluZGV4OiBpdGVtLm1ldGFkYXRhLmVuZEluZGV4LFxuICAgICAgICAgIHBhZ2VJbmRleDogaXRlbS5tZXRhZGF0YS5wYWdlSW5kZXgsXG4gICAgICAgIH0pKSA6IHVuZGVmaW5lZCxcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIGFuc3dlciBkb2N1bWVudCBxdWVzdGlvbjonLCBlcnJvcik7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBhbnN3ZXI6ICdGYWlsZWQgdG8gZ2VuZXJhdGUgYW5zd2VyJyxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOaehOW7uuaWh+aho+mXruetlOaPkOekuuivjVxuICAgKi9cbiAgcHJpdmF0ZSBidWlsZERvY3VtZW50UUFQcm9tcHQocXVlc3Rpb246IHN0cmluZywgcmVsZXZhbnRDb250ZW50OiBEb2N1bWVudFJldHJpZXZhbFJlc3VsdFtdKTogc3RyaW5nIHtcbiAgICBjb25zdCBjb250ZXh0ID0gcmVsZXZhbnRDb250ZW50XG4gICAgICAubWFwKChpdGVtLCBpbmRleCkgPT4gYFtSZWZlcmVuY2UgJHtpbmRleCArIDF9XVxuJHtpdGVtLnRleHR9XG5gKVxuICAgICAgLmpvaW4oJ1xcbicpO1xuICAgIFxuICAgIHJldHVybiBgQ29udGV4dDpcXG4ke2NvbnRleHR9XFxuXFxuUXVlc3Rpb246ICR7cXVlc3Rpb259XFxuXFxuQW5zd2VyIGJhc2VkIG9uIHRoZSBwcm92aWRlZCBjb250ZXh0LiBJbmNsdWRlIHJlZmVyZW5jZXMgdG8gdGhlIG9yaWdpbmFsIGNvbnRlbnQgd2hlcmUgYXBwcm9wcmlhdGUuYDtcbiAgfVxuXG4gIC8qKlxuICAgKiDnlJ/miJDmlofmoaPmkZjopoFcbiAgICovXG4gIGFzeW5jIGdlbmVyYXRlRG9jdW1lbnRTdW1tYXJ5KFxuICAgIGRvY3VtZW50OiBEb2N1bWVudFBhcnNlUmVzdWx0LFxuICAgIG9wdGlvbnM/OiB7XG4gICAgICBtb2RlbD86IHN0cmluZztcbiAgICAgIHN1bW1hcnlMZW5ndGg/OiAnc2hvcnQnIHwgJ21lZGl1bScgfCAnbG9uZyc7XG4gICAgfVxuICApOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIHRyeSB7XG4gICAgICAvLyDmj5Dlj5bmlofmoaPmlofmnKxcbiAgICAgIGNvbnN0IHRleHQgPSBkb2N1bWVudC50ZXh0IHx8ICcnO1xuICAgICAgXG4gICAgICAvLyDpmZDliLbmlofmnKzplb/luqbvvIzpgb/lhY3otoXlh7rmqKHlnovkuIrkuIvmlofnqpflj6NcbiAgICAgIGNvbnN0IG1heExlbmd0aCA9IDgwMDA7IC8vIOWPr+agueaNruaooeWei+S4iuS4i+aWh+eql+WPo+iwg+aVtFxuICAgICAgY29uc3QgdHJ1bmNhdGVkVGV4dCA9IHRleHQubGVuZ3RoID4gbWF4TGVuZ3RoIFxuICAgICAgICA/IHRleHQuc3Vic3RyaW5nKDAsIG1heExlbmd0aCkgKyAnLi4uICh0cnVuY2F0ZWQpJyBcbiAgICAgICAgOiB0ZXh0O1xuICAgICAgXG4gICAgICAvLyDmnoTlu7rmkZjopoHmj5DnpLror41cbiAgICAgIGNvbnN0IGxlbmd0aEluc3RydWN0aW9uID0ge1xuICAgICAgICBzaG9ydDogJ0tlZXAgdGhlIHN1bW1hcnkgY29uY2lzZSwgdW5kZXIgMTAwIHdvcmRzLicsXG4gICAgICAgIG1lZGl1bTogJ1Byb3ZpZGUgYSBiYWxhbmNlZCBzdW1tYXJ5LCBhcm91bmQgMjAwLTMwMCB3b3Jkcy4nLFxuICAgICAgICBsb25nOiAnUHJvdmlkZSBhIGRldGFpbGVkIHN1bW1hcnksIGluY2x1ZGluZyBrZXkgcG9pbnRzIGFuZCBkZXRhaWxzLicsXG4gICAgICB9W29wdGlvbnM/LnN1bW1hcnlMZW5ndGggfHwgJ21lZGl1bSddO1xuICAgICAgXG4gICAgICBjb25zdCBwcm9tcHQgPSBgUGxlYXNlIHN1bW1hcml6ZSB0aGUgZm9sbG93aW5nIGRvY3VtZW50LiAke2xlbmd0aEluc3RydWN0aW9ufVxcblxcbiR7dHJ1bmNhdGVkVGV4dH1gO1xuXG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZW5lcmF0ZVRleHQoe1xuICAgICAgICBwcm9tcHQsXG4gICAgICAgIG1vZGVsOiBvcHRpb25zPy5tb2RlbCxcbiAgICAgICAgc3lzdGVtOiAnWW91IGFyZSBhIGhlbHBmdWwgYXNzaXN0YW50IHRoYXQgc3VtbWFyaXplcyBkb2N1bWVudHMgYWNjdXJhdGVseSBhbmQgY29uY2lzZWx5LicsXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gZ2VuZXJhdGUgZG9jdW1lbnQgc3VtbWFyeTonLCBlcnJvcik7XG4gICAgICByZXR1cm4gJ0ZhaWxlZCB0byBnZW5lcmF0ZSBzdW1tYXJ5JztcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICog5o+Q5Y+W5paH5qGj5YWz6ZSu5L+h5oGvXG4gICAqL1xuICBhc3luYyBleHRyYWN0S2V5SW5mb3JtYXRpb24oXG4gICAgZG9jdW1lbnQ6IERvY3VtZW50UGFyc2VSZXN1bHQsXG4gICAgb3B0aW9ucz86IHtcbiAgICAgIG1vZGVsPzogc3RyaW5nO1xuICAgICAgY2F0ZWdvcmllcz86IHN0cmluZ1tdO1xuICAgIH1cbiAgKTogUHJvbWlzZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4+IHtcbiAgICB0cnkge1xuICAgICAgLy8g5o+Q5Y+W5paH5qGj5paH5pysXG4gICAgICBjb25zdCB0ZXh0ID0gZG9jdW1lbnQudGV4dCB8fCAnJztcbiAgICAgIFxuICAgICAgLy8g6ZmQ5Yi25paH5pys6ZW/5bqmXG4gICAgICBjb25zdCBtYXhMZW5ndGggPSA4MDAwO1xuICAgICAgY29uc3QgdHJ1bmNhdGVkVGV4dCA9IHRleHQubGVuZ3RoID4gbWF4TGVuZ3RoIFxuICAgICAgICA/IHRleHQuc3Vic3RyaW5nKDAsIG1heExlbmd0aCkgKyAnLi4uICh0cnVuY2F0ZWQpJyBcbiAgICAgICAgOiB0ZXh0O1xuICAgICAgXG4gICAgICAvLyDmnoTlu7rmj5Dlj5bmj5DnpLror41cbiAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSBvcHRpb25zPy5jYXRlZ29yaWVzIHx8IFsnS2V5IFBvaW50cycsICdJbXBvcnRhbnQgRGV0YWlscycsICdBY3Rpb24gSXRlbXMnLCAnUXVlc3Rpb25zJywgJ0NvbmNsdXNpb25zJ107XG4gICAgICBjb25zdCBjYXRlZ29yaWVzTGlzdCA9IGNhdGVnb3JpZXMuam9pbignLCAnKTtcbiAgICAgIFxuICAgICAgY29uc3QgcHJvbXB0ID0gYEV4dHJhY3QgdGhlIGZvbGxvd2luZyBpbmZvcm1hdGlvbiBmcm9tIHRoZSBkb2N1bWVudDogJHtjYXRlZ29yaWVzTGlzdH1cXG5cXG5Eb2N1bWVudDpcXG4ke3RydW5jYXRlZFRleHR9XFxuXFxuRm9ybWF0IHlvdXIgcmVzcG9uc2UgYXMgYSBKU09OIG9iamVjdCB3aGVyZSBlYWNoIGtleSBpcyBhIGNhdGVnb3J5IG5hbWUgYW5kIHRoZSB2YWx1ZSBpcyBhbiBhcnJheSBvZiBleHRyYWN0ZWQgaXRlbXMuYDtcblxuICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuZ2VuZXJhdGVUZXh0KHtcbiAgICAgICAgcHJvbXB0LFxuICAgICAgICBtb2RlbDogb3B0aW9ucz8ubW9kZWwsXG4gICAgICAgIHN5c3RlbTogJ1lvdSBhcmUgYSBoZWxwZnVsIGFzc2lzdGFudCB0aGF0IGV4dHJhY3RzIGtleSBpbmZvcm1hdGlvbiBmcm9tIGRvY3VtZW50cyBpbiBhIHN0cnVjdHVyZWQgZm9ybWF0LicsXG4gICAgICB9KTtcblxuICAgICAgLy8g6Kej5p6QIEpTT04g5ZON5bqUXG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShjb250ZW50IHx8ICd7fScpO1xuICAgICAgfSBjYXRjaCAocGFyc2VFcnJvcikge1xuICAgICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBwYXJzZSBrZXkgaW5mb3JtYXRpb24gcmVzcG9uc2U6JywgcGFyc2VFcnJvcik7XG4gICAgICAgIHJldHVybiB7fTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gZXh0cmFjdCBrZXkgaW5mb3JtYXRpb246JywgZXJyb3IpO1xuICAgICAgcmV0dXJuIHt9O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDlpJror63oqIDmlofmoaPlpITnkIZcbiAgICovXG4gIGFzeW5jIHByb2Nlc3NNdWx0aWxpbmd1YWxEb2N1bWVudChcbiAgICBkb2N1bWVudDogRG9jdW1lbnRQYXJzZVJlc3VsdCxcbiAgICB0YXJnZXRMYW5ndWFnZTogc3RyaW5nID0gJ0VuZ2xpc2gnLFxuICAgIG9wdGlvbnM/OiB7XG4gICAgICBtb2RlbD86IHN0cmluZztcbiAgICB9XG4gICk6IFByb21pc2U8e1xuICAgIHRyYW5zbGF0ZWRUZXh0OiBzdHJpbmc7XG4gICAgZGV0ZWN0ZWRMYW5ndWFnZT86IHN0cmluZztcbiAgfT4ge1xuICAgIHRyeSB7XG4gICAgICAvLyDmj5Dlj5bmlofmoaPmlofmnKxcbiAgICAgIGNvbnN0IHRleHQgPSBkb2N1bWVudC50ZXh0IHx8ICcnO1xuICAgICAgXG4gICAgICAvLyDpmZDliLbmlofmnKzplb/luqZcbiAgICAgIGNvbnN0IG1heExlbmd0aCA9IDgwMDA7XG4gICAgICBjb25zdCB0cnVuY2F0ZWRUZXh0ID0gdGV4dC5sZW5ndGggPiBtYXhMZW5ndGggXG4gICAgICAgID8gdGV4dC5zdWJzdHJpbmcoMCwgbWF4TGVuZ3RoKSArICcuLi4gKHRydW5jYXRlZCknIFxuICAgICAgICA6IHRleHQ7XG4gICAgICBcbiAgICAgIC8vIOaehOW7uue/u+ivkeaPkOekuuivjVxuICAgICAgY29uc3QgcHJvbXB0ID0gYFRyYW5zbGF0ZSB0aGUgZm9sbG93aW5nIGRvY3VtZW50IHRvICR7dGFyZ2V0TGFuZ3VhZ2V9LiBQcmVzZXJ2ZSB0aGUgb3JpZ2luYWwgbWVhbmluZyBhbmQgZm9ybWF0dGluZyBhcyBtdWNoIGFzIHBvc3NpYmxlLlxcblxcbiR7dHJ1bmNhdGVkVGV4dH1gO1xuXG4gICAgICBjb25zdCB0cmFuc2xhdGVkVGV4dCA9IGF3YWl0IHRoaXMuZ2VuZXJhdGVUZXh0KHtcbiAgICAgICAgcHJvbXB0LFxuICAgICAgICBtb2RlbDogb3B0aW9ucz8ubW9kZWwsXG4gICAgICAgIHN5c3RlbTogJ1lvdSBhcmUgYSBza2lsbGVkIHRyYW5zbGF0b3IgdGhhdCBhY2N1cmF0ZWx5IHRyYW5zbGF0ZXMgZG9jdW1lbnRzIGJldHdlZW4gbGFuZ3VhZ2VzLicsXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHJhbnNsYXRlZFRleHQsXG4gICAgICAgIC8vIOi/memHjOWPr+S7pea3u+WKoOivreiogOajgOa1i+WKn+iDvVxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gcHJvY2VzcyBtdWx0aWxpbmd1YWwgZG9jdW1lbnQ6JywgZXJyb3IpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHJhbnNsYXRlZFRleHQ6ICdUcmFuc2xhdGlvbiBmYWlsZWQnLFxuICAgICAgfTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiDlhajlsYAgQUkg5paH5qGj5aSE55CG5Zmo5a6e5L6LXG4gKi9cbmV4cG9ydCBjb25zdCBhaURvY3VtZW50UHJvY2Vzc29yID0gbmV3IEFJRG9jdW1lbnRQcm9jZXNzb3IoKTtcblxuZXhwb3J0IGRlZmF1bHQgQUlEb2N1bWVudFByb2Nlc3NvcjtcbiJdfQ==