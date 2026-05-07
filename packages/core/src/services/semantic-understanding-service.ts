/**
 * 语义理解服务
 * 提供文本语义分析、意图识别、实体链接等功能
 */

import { OpenAICompatibleClient } from '../utils/openai-compatible-client';
import { logger } from '../utils/logger';

logger.setPrefix('[SemanticUnderstandingService]');

export interface SemanticUnderstandingOptions {
  /** 分析深度级别 */
  depth?: 'shallow' | 'medium' | 'deep';
  /** 是否识别意图 */
  recognizeIntent?: boolean;
  /** 是否提取实体 */
  extractEntities?: boolean;
  /** 是否分析情感 */
  analyzeSentiment?: boolean;
  /** 是否生成摘要 */
  generateSummary?: boolean;
  /** 语言 */
  language?: string;
}

export interface SemanticAnalysisResult {
  /** 语义理解结果 */
  understanding: string;
  /** 意图识别结果 */
  intent?: {
    type: string;
    confidence: number;
    parameters: Record<string, any>;
  };
  /** 实体提取结果 */
  entities?: Array<{
    type: string;
    text: string;
    confidence: number;
    start: number;
    end: number;
  }>;
  /** 情感分析结果 */
  sentiment?: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  /** 摘要 */
  summary?: string;
  /** 处理时间 */
  processingTime: number;
  /** 成功状态 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

export class SemanticUnderstandingService {
  private openAIClient: OpenAICompatibleClient | null = null;

  constructor() {
    // 延迟初始化OpenAIClient实例
  }

  private getOpenAIClient(): OpenAICompatibleClient {
    if (!this.openAIClient) {
      this.openAIClient = new OpenAICompatibleClient({
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '', // 会在运行时从配置中获取
        defaultModel: 'gpt-3.5-turbo',
        timeout: 30000,
        streamEnabled: true
      });
    }
    return this.openAIClient;
  }

  /**
   * 分析文本语义
   * @param text 文本
   * @param options 分析选项
   * @returns 分析结果
   */
  async analyze(text: string, options: SemanticUnderstandingOptions = {}): Promise<SemanticAnalysisResult> {
    const startTime = Date.now();

    try {
      const {
        depth = 'medium',
        recognizeIntent = true,
        extractEntities = true,
        analyzeSentiment = false,
        generateSummary = false,
        language = 'auto'
      } = options;

      // 构建分析提示
      const prompt = this.buildAnalysisPrompt(text, {
        depth,
        recognizeIntent,
        extractEntities,
        analyzeSentiment,
        generateSummary,
        language
      });

      // 调用OpenAI API进行分析
      const response = await this.getOpenAIClient().generate({ prompt });

      // 解析分析结果
      const result = this.parseAnalysisResponse(response.content, startTime, {
        recognizeIntent,
        extractEntities,
        analyzeSentiment,
        generateSummary
      });

      logger.info('语义分析执行成功');
      return result;
    } catch (error) {
      logger.error('语义分析执行失败:', error);
      return {
        understanding: '',
        processingTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 构建分析提示
   * @param text 文本
   * @param options 分析选项
   * @returns 提示词
   */
  private buildAnalysisPrompt(text: string, options: {
    depth: string;
    recognizeIntent: boolean;
    extractEntities: boolean;
    analyzeSentiment: boolean;
    generateSummary: boolean;
    language: string;
  }): string {
    const { depth, recognizeIntent, extractEntities, analyzeSentiment, generateSummary, language } = options;

    const depthInstructions = {
      shallow: '提供简短的语义分析，直接回答核心问题。',
      medium: '提供详细的语义分析，全面理解文本内容。',
      deep: '提供深度的语义分析，考虑上下文、隐含意义和潜在意图。'
    };

    const languageInstructions = language === 'auto' 
      ? '使用与文本相同的语言回答。' 
      : `使用${language}语言回答。`;

    let prompt = `You are a semantic understanding assistant. Please analyze the following text:\n\n`;
    prompt += `${text}\n\n`;
    prompt += `Instructions:\n`;
    prompt += `${languageInstructions}\n`;
    prompt += `${depthInstructions[depth as keyof typeof depthInstructions]}\n\n`;
    prompt += `Please provide the analysis in the following format:\n\n`;
    prompt += `## Understanding\n[Your semantic understanding of the text]\n\n`;

    if (recognizeIntent) {
      prompt += `## Intent\n`;
      prompt += `- Type: [Intent type]\n`;
      prompt += `- Confidence: [Confidence score 0-1]\n`;
      prompt += `- Parameters: [Key-value pairs of intent parameters]\n\n`;
    }

    if (extractEntities) {
      prompt += `## Entities\n`;
      prompt += `[List of entities in the format: Type: Text (Confidence: 0-1, Start: position, End: position)]\n\n`;
    }

    if (analyzeSentiment) {
      prompt += `## Sentiment\n`;
      prompt += `- Score: [Sentiment score -1 to 1]\n`;
      prompt += `- Label: [positive, negative, or neutral]\n\n`;
    }

    if (generateSummary) {
      prompt += `## Summary\n[Brief summary of the text]\n\n`;
    }

    return prompt;
  }

  /**
   * 解析分析响应
   * @param response API响应
   * @param startTime 开始时间
   * @param options 分析选项
   * @returns 分析结果
   */
  private parseAnalysisResponse(response: string, startTime: number, options: {
    recognizeIntent: boolean;
    extractEntities: boolean;
    analyzeSentiment: boolean;
    generateSummary: boolean;
  }): SemanticAnalysisResult {
    const { recognizeIntent, extractEntities, analyzeSentiment, generateSummary } = options;

    // 提取理解部分
    const understandingRegex = /## Understanding\n([\s\S]*?)(?=## |$)/;
    const understandingMatch = understandingRegex.exec(response);
    const understanding = understandingMatch ? understandingMatch[1].trim() : '';

    // 提取意图部分
    let intent;
    if (recognizeIntent) {
      const intentRegex = /## Intent\n- Type: (.*?)\n- Confidence: (.*?)\n- Parameters: (.*?)(?=## |$)/s;
      const intentMatch = intentRegex.exec(response);
      if (intentMatch) {
        intent = {
          type: intentMatch[1].trim(),
          confidence: parseFloat(intentMatch[2].trim()),
          parameters: this.parseParameters(intentMatch[3].trim())
        };
      }
    }

    // 提取实体部分
    let entities;
    if (extractEntities) {
      const entitiesRegex = /## Entities\n([\s\S]*?)(?=## |$)/;
      const entitiesMatch = entitiesRegex.exec(response);
      if (entitiesMatch) {
        entities = this.parseEntities(entitiesMatch[1].trim());
      }
    }

    // 提取情感部分
    let sentiment;
    if (analyzeSentiment) {
      const sentimentRegex = /## Sentiment\n- Score: (.*?)\n- Label: (.*?)(?=## |$)/;
      const sentimentMatch = sentimentRegex.exec(response);
      if (sentimentMatch) {
        sentiment = {
          score: parseFloat(sentimentMatch[1].trim()),
          label: sentimentMatch[2].trim() as 'positive' | 'negative' | 'neutral'
        };
      }
    }

    // 提取摘要部分
    let summary;
    if (generateSummary) {
      const summaryRegex = /## Summary\n([\s\S]*?)(?=## |$)/;
      const summaryMatch = summaryRegex.exec(response);
      if (summaryMatch) {
        summary = summaryMatch[1].trim();
      }
    }

    return {
      understanding,
      intent,
      entities,
      sentiment,
      summary,
      processingTime: Date.now() - startTime,
      success: true
    };
  }

  /**
   * 解析参数
   * @param parametersText 参数文本
   * @returns 解析后的参数
   */
  private parseParameters(parametersText: string): Record<string, any> {
    try {
      // 尝试解析为JSON
      return JSON.parse(parametersText);
    } catch {
      // 尝试解析为键值对
      const parameters: Record<string, any> = {};
      const pairs = parametersText.split(',');
      pairs.forEach(pair => {
        const [key, value] = pair.split(':').map(item => item.trim());
        if (key && value) {
          parameters[key] = value;
        }
      });
      return parameters;
    }
  }

  /**
   * 解析实体
   * @param entitiesText 实体文本
   * @returns 解析后的实体
   */
  private parseEntities(entitiesText: string): Array<{
    type: string;
    text: string;
    confidence: number;
    start: number;
    end: number;
  }> {
    const entities: Array<{
      type: string;
      text: string;
      confidence: number;
      start: number;
      end: number;
    }> = [];

    const lines = entitiesText.split('\n');
    lines.forEach(line => {
      const match = line.match(/(\w+): (.*?) \(Confidence: (0\.\d+), Start: (\d+), End: (\d+)\)/);
      if (match) {
        entities.push({
          type: match[1],
          text: match[2],
          confidence: parseFloat(match[3]),
          start: parseInt(match[4]),
          end: parseInt(match[5])
        });
      }
    });

    return entities;
  }

  /**
   * 识别文本意图
   * @param text 文本
   * @returns 意图识别结果
   */
  async recognizeIntent(text: string): Promise<{
    type: string;
    confidence: number;
    parameters: Record<string, any>;
  }> {
    const result = await this.analyze(text, {
      depth: 'medium',
      recognizeIntent: true,
      extractEntities: false,
      analyzeSentiment: false,
      generateSummary: false
    });

    return result.intent || {
      type: 'unknown',
      confidence: 0,
      parameters: {}
    };
  }

  /**
   * 提取文本实体
   * @param text 文本
   * @returns 实体提取结果
   */
  async extractEntities(text: string): Promise<Array<{
    type: string;
    text: string;
    confidence: number;
    start: number;
    end: number;
  }>> {
    const result = await this.analyze(text, {
      depth: 'medium',
      recognizeIntent: false,
      extractEntities: true,
      analyzeSentiment: false,
      generateSummary: false
    });

    return result.entities || [];
  }

  /**
   * 分析文本情感
   * @param text 文本
   * @returns 情感分析结果
   */
  async analyzeSentiment(text: string): Promise<{
    score: number;
    label: 'positive' | 'negative' | 'neutral';
  }> {
    const result = await this.analyze(text, {
      depth: 'shallow',
      recognizeIntent: false,
      extractEntities: false,
      analyzeSentiment: true,
      generateSummary: false
    });

    return result.sentiment || {
      score: 0,
      label: 'neutral'
    };
  }

  /**
   * 生成文本摘要
   * @param text 文本
   * @returns 摘要
   */
  async generateSummary(text: string): Promise<string> {
    const result = await this.analyze(text, {
      depth: 'medium',
      recognizeIntent: false,
      extractEntities: false,
      analyzeSentiment: false,
      generateSummary: true
    });

    return result.summary || '';
  }
}

// 导出单例实例
export const semanticUnderstandingService = new SemanticUnderstandingService();
