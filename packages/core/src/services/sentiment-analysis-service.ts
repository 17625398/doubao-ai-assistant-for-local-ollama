/**
 * 情感分析服务
 * 提供详细的情感分析功能，包括情感强度分析、情感类型识别等
 */

import { OpenAICompatibleClient } from '../utils/openai-compatible-client';
import { logger } from '../utils/logger';

logger.setPrefix('[SentimentAnalysisService]');

export interface SentimentAnalysisOptions {
  /** 分析深度级别 */
  depth?: 'shallow' | 'medium' | 'deep';
  /** 是否分析情感强度 */
  analyzeIntensity?: boolean;
  /** 是否识别情感类型 */
  identifyTypes?: boolean;
  /** 是否分析情感原因 */
  analyzeReasons?: boolean;
  /** 语言 */
  language?: string;
}

export interface SentimentAnalysisResult {
  /** 情感得分（-1 到 1） */
  score: number;
  /** 情感标签 */
  label: 'positive' | 'negative' | 'neutral';
  /** 情感强度 */
  intensity?: number;
  /** 情感类型 */
  types?: Array<{
    type: string;
    confidence: number;
  }>;
  /** 情感原因 */
  reasons?: string[];
  /** 处理时间 */
  processingTime: number;
  /** 成功状态 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

export class SentimentAnalysisService {
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
   * 分析文本情感
   * @param text 文本
   * @param options 分析选项
   * @returns 分析结果
   */
  async analyze(text: string, options: SentimentAnalysisOptions = {}): Promise<SentimentAnalysisResult> {
    const startTime = Date.now();

    try {
      const {
        depth = 'medium',
        analyzeIntensity = true,
        identifyTypes = true,
        analyzeReasons = false,
        language = 'auto'
      } = options;

      // 构建分析提示
      const prompt = this.buildAnalysisPrompt(text, {
        depth,
        analyzeIntensity,
        identifyTypes,
        analyzeReasons,
        language
      });

      // 调用OpenAI API进行分析
      const response = await this.getOpenAIClient().generate({ prompt });

      // 解析分析结果
      const result = this.parseAnalysisResponse(response.content, startTime, {
        analyzeIntensity,
        identifyTypes,
        analyzeReasons
      });

      logger.info('情感分析执行成功');
      return result;
    } catch (error) {
      logger.error('情感分析执行失败:', error);
      return {
        score: 0,
        label: 'neutral',
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
    analyzeIntensity: boolean;
    identifyTypes: boolean;
    analyzeReasons: boolean;
    language: string;
  }): string {
    const { depth, analyzeIntensity, identifyTypes, analyzeReasons, language } = options;

    const depthInstructions = {
      shallow: '提供简短的情感分析，直接回答情感倾向。',
      medium: '提供详细的情感分析，包括情感得分和标签。',
      deep: '提供深度的情感分析，包括情感强度、类型和原因。'
    };

    const languageInstructions = language === 'auto' 
      ? '使用与文本相同的语言回答。' 
      : `使用${language}语言回答。`;

    let prompt = `You are a sentiment analysis assistant. Please analyze the sentiment of the following text:\n\n`;
    prompt += `${text}\n\n`;
    prompt += `Instructions:\n`;
    prompt += `${languageInstructions}\n`;
    prompt += `${depthInstructions[depth as keyof typeof depthInstructions]}\n\n`;
    prompt += `Please provide the analysis in the following format:\n\n`;
    prompt += `## Sentiment\n`;
    prompt += `- Score: [Sentiment score -1 to 1]\n`;
    prompt += `- Label: [positive, negative, or neutral]\n`;

    if (analyzeIntensity) {
      prompt += `- Intensity: [Intensity score 0 to 1]\n`;
    }

    if (identifyTypes) {
      prompt += `\n## Sentiment Types\n`;
      prompt += `[List of sentiment types in the format: Type (Confidence: 0-1)]\n`;
    }

    if (analyzeReasons) {
      prompt += `\n## Sentiment Reasons\n`;
      prompt += `[List of reasons for the sentiment]\n`;
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
    analyzeIntensity: boolean;
    identifyTypes: boolean;
    analyzeReasons: boolean;
  }): SentimentAnalysisResult {
    const { analyzeIntensity, identifyTypes, analyzeReasons } = options;

    // 提取情感部分
    const sentimentRegex = /## Sentiment\n- Score: (.*?)\n- Label: (.*?)(?:\n- Intensity: (.*?))?(?=\n## |$)/s;
    const sentimentMatch = sentimentRegex.exec(response);

    let score = 0;
    let label: 'positive' | 'negative' | 'neutral' = 'neutral';
    let intensity: number | undefined;

    if (sentimentMatch) {
      score = parseFloat(sentimentMatch[1].trim());
      label = sentimentMatch[2].trim() as 'positive' | 'negative' | 'neutral';
      if (analyzeIntensity && sentimentMatch[3]) {
        intensity = parseFloat(sentimentMatch[3].trim());
      }
    }

    // 提取情感类型
    let types;
    if (identifyTypes) {
      const typesRegex = /## Sentiment Types\n([\s\S]*?)(?=## |$)/;
      const typesMatch = typesRegex.exec(response);
      if (typesMatch) {
        types = this.parseSentimentTypes(typesMatch[1].trim());
      }
    }

    // 提取情感原因
    let reasons;
    if (analyzeReasons) {
      const reasonsRegex = /## Sentiment Reasons\n([\s\S]*?)(?=## |$)/;
      const reasonsMatch = reasonsRegex.exec(response);
      if (reasonsMatch) {
        reasons = this.parseSentimentReasons(reasonsMatch[1].trim());
      }
    }

    return {
      score,
      label,
      intensity,
      types,
      reasons,
      processingTime: Date.now() - startTime,
      success: true
    };
  }

  /**
   * 解析情感类型
   * @param typesText 情感类型文本
   * @returns 解析后的情感类型
   */
  private parseSentimentTypes(typesText: string): Array<{
    type: string;
    confidence: number;
  }> {
    const types: Array<{
      type: string;
      confidence: number;
    }> = [];

    const lines = typesText.split('\n');
    lines.forEach(line => {
      const match = line.match(/(.*?) \(Confidence: (0\.\d+)\)/);
      if (match) {
        types.push({
          type: match[1].trim(),
          confidence: parseFloat(match[2])
        });
      }
    });

    return types;
  }

  /**
   * 解析情感原因
   * @param reasonsText 情感原因文本
   * @returns 解析后的情感原因
   */
  private parseSentimentReasons(reasonsText: string): string[] {
    const reasons: string[] = [];

    const lines = reasonsText.split('\n');
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        reasons.push(trimmedLine);
      }
    });

    return reasons;
  }

  /**
   * 批量分析情感
   * @param texts 文本数组
   * @param options 分析选项
   * @returns 分析结果数组
   */
  async batchAnalyze(texts: string[], options: SentimentAnalysisOptions = {}): Promise<SentimentAnalysisResult[]> {
    const results: SentimentAnalysisResult[] = [];

    for (const text of texts) {
      const result = await this.analyze(text, options);
      results.push(result);
    }

    return results;
  }

  /**
   * 分析文本情感强度
   * @param text 文本
   * @returns 情感强度
   */
  async analyzeIntensity(text: string): Promise<number> {
    const result = await this.analyze(text, {
      depth: 'medium',
      analyzeIntensity: true,
      identifyTypes: false,
      analyzeReasons: false
    });

    return result.intensity || 0;
  }

  /**
   * 识别文本情感类型
   * @param text 文本
   * @returns 情感类型
   */
  async identifySentimentTypes(text: string): Promise<Array<{
    type: string;
    confidence: number;
  }>> {
    const result = await this.analyze(text, {
      depth: 'deep',
      analyzeIntensity: false,
      identifyTypes: true,
      analyzeReasons: false
    });

    return result.types || [];
  }

  /**
   * 分析文本情感原因
   * @param text 文本
   * @returns 情感原因
   */
  async analyzeSentimentReasons(text: string): Promise<string[]> {
    const result = await this.analyze(text, {
      depth: 'deep',
      analyzeIntensity: false,
      identifyTypes: false,
      analyzeReasons: true
    });

    return result.reasons || [];
  }
}

// 导出单例实例
export const sentimentAnalysisService = new SentimentAnalysisService();
