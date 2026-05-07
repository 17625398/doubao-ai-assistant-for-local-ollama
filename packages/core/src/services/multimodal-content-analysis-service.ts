/**
 * 多模态内容分析服务
 * 提供分析和理解多种类型内容的功能，包括文本、图像、视频、音频等
 */

import { OpenAICompatibleClient } from '../utils/openai-compatible-client';
import { logger } from '../utils/logger';
import { MultiFormatSupportService } from './multi-format-support-service';
import { DocumentType } from '../types/document';

logger.setPrefix('[MultimodalContentAnalysisService]');

export interface MultimodalAnalysisOptions {
  /** 分析深度级别 */
  depth?: 'shallow' | 'medium' | 'deep';
  /** 是否分析文本内容 */
  analyzeText?: boolean;
  /** 是否分析图像内容 */
  analyzeImages?: boolean;
  /** 是否分析视频内容 */
  analyzeVideos?: boolean;
  /** 是否分析音频内容 */
  analyzeAudio?: boolean;
  /** 是否生成摘要 */
  generateSummary?: boolean;
  /** 语言 */
  language?: string;
}

export interface MultimodalAnalysisResult {
  /** 分析结果 */
  analysis: string;
  /** 文本分析结果 */
  textAnalysis?: {
    content: string;
    sentiment: {
      score: number;
      label: 'positive' | 'negative' | 'neutral';
    };
    entities: Array<{
      type: string;
      text: string;
      confidence: number;
    }>;
  };
  /** 图像分析结果 */
  imageAnalysis?: Array<{
    url: string;
    description: string;
    objects: Array<{
      name: string;
      confidence: number;
      boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
    faces?: Array<{
      confidence: number;
      boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
    sentiment: {
      score: number;
      label: 'positive' | 'negative' | 'neutral';
    };
  }>;
  /** 视频分析结果 */
  videoAnalysis?: {
    duration: number;
    frames: Array<{
      timestamp: number;
      description: string;
      objects: Array<{
        name: string;
        confidence: number;
      }>;
    }>;
    audioTranscript?: string;
  };
  /** 音频分析结果 */
  audioAnalysis?: {
    duration: number;
    transcript: string;
    sentiment: {
      score: number;
      label: 'positive' | 'negative' | 'neutral';
    };
    speakers?: Array<{
      id: number;
      transcript: string;
    }>;
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

export class MultimodalContentAnalysisService {
  private openAIClient: OpenAICompatibleClient | null = null;
  private multiFormatService: MultiFormatSupportService;

  constructor() {
    this.multiFormatService = new MultiFormatSupportService();
  }

  private getOpenAIClient(): OpenAICompatibleClient {
    if (!this.openAIClient) {
      this.openAIClient = new OpenAICompatibleClient({
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '', // 会在运行时从配置中获取
        defaultModel: 'gpt-3.5-turbo',
        timeout: 60000,
        streamEnabled: true
      });
    }
    return this.openAIClient;
  }

  /**
   * 分析多模态内容
   * @param content 内容
   * @param contentType 内容类型
   * @param options 分析选项
   * @returns 分析结果
   */
  async analyze(content: any, contentType: string, options: MultimodalAnalysisOptions = {}): Promise<MultimodalAnalysisResult> {
    const startTime = Date.now();

    try {
      const {
        depth = 'medium',
        analyzeText = true,
        analyzeImages = true,
        analyzeVideos = true,
        analyzeAudio = true,
        generateSummary = true,
        language = 'auto'
      } = options;

      // 根据内容类型进行不同的分析
      let analysisResult: MultimodalAnalysisResult = {
        analysis: '',
        processingTime: Date.now() - startTime,
        success: true
      };

      switch (contentType.toLowerCase()) {
        case 'text':
        case 'plain/text':
        case 'text/plain':
          if (analyzeText) {
            analysisResult.textAnalysis = await this.analyzeText(content, depth, language);
          }
          break;
        case 'image':
        case 'image/jpeg':
        case 'image/png':
        case 'image/gif':
        case 'image/webp':
          if (analyzeImages) {
            analysisResult.imageAnalysis = [await this.analyzeImage(content, depth, language)];
          }
          break;
        case 'video':
        case 'video/mp4':
        case 'video/webm':
          if (analyzeVideos) {
            analysisResult.videoAnalysis = await this.analyzeVideo(content, depth, language);
          }
          break;
        case 'audio':
        case 'audio/mp3':
        case 'audio/wav':
        case 'audio/ogg':
          if (analyzeAudio) {
            analysisResult.audioAnalysis = await this.analyzeAudio(content, depth, language);
          }
          break;
        case 'file':
          // 处理文件
          if (content instanceof File) {
            // 读取文件内容
            const fileContent = await content.arrayBuffer();
            const fileResult = await this.multiFormatService.parseDocument(fileContent);
            if (fileResult.success) {
              // 根据文件类型进行分析
              const fileType = fileResult.metadata.type;
              if (fileType === DocumentType.TEXT) {
                if (analyzeText) {
                  const textContent = fileResult.content.join('\n');
                  analysisResult.textAnalysis = await this.analyzeText(textContent, depth, language);
                }
              } else if (fileType === DocumentType.IMAGE) {
                if (analyzeImages) {
                  analysisResult.imageAnalysis = [];
                  const imageUrl = URL.createObjectURL(content);
                  const imageAnalysis = await this.analyzeImage(imageUrl, depth, language);
                  analysisResult.imageAnalysis.push(imageAnalysis);
                }
              }
            } else {
              throw new Error(`文件处理失败: ${fileResult.error}`);
            }
          }
          break;
        default:
          throw new Error(`不支持的内容类型: ${contentType}`);
      }

      // 生成分析结果
      analysisResult.analysis = this.generateAnalysisSummary(analysisResult);

      // 生成摘要
      if (generateSummary) {
        analysisResult.summary = this.generateSummary(analysisResult);
      }

      analysisResult.processingTime = Date.now() - startTime;
      logger.info('多模态内容分析执行成功');
      return analysisResult;
    } catch (error) {
      logger.error('多模态内容分析执行失败:', error);
      return {
        analysis: '',
        processingTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 分析文本内容
   * @param text 文本
   * @param depth 分析深度
   * @param language 语言
   * @returns 文本分析结果
   */
  private async analyzeText(text: string, depth: string, language: string): Promise<{
    content: string;
    sentiment: {
      score: number;
      label: 'positive' | 'negative' | 'neutral';
    };
    entities: Array<{
      type: string;
      text: string;
      confidence: number;
    }>;
  }> {
    // 构建分析提示
    const prompt = `分析以下文本的情感和实体：\n\n${text}\n\n请以JSON格式返回结果，包含sentiment（情感）和entities（实体）字段。`;

    // 调用OpenAI API进行分析
    const response = await this.getOpenAIClient().generate({ prompt });

    // 解析分析结果
    const result = JSON.parse(response.content);

    return {
      content: text,
      sentiment: result.sentiment || {
        score: 0,
        label: 'neutral'
      },
      entities: result.entities || []
    };
  }

  /**
   * 分析图像内容
   * @param image 图像
   * @param depth 分析深度
   * @param language 语言
   * @returns 图像分析结果
   */
  private async analyzeImage(image: string | File, depth: string, language: string): Promise<{
    url: string;
    description: string;
    objects: Array<{
      name: string;
      confidence: number;
      boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
    faces?: Array<{
      confidence: number;
      boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
    sentiment: {
      score: number;
      label: 'positive' | 'negative' | 'neutral';
    };
  }> {
    // 构建分析提示
    const prompt = `分析以下图像的内容、物体、人脸和情感：\n\n[Image URL: ${typeof image === 'string' ? image : 'file'}]\n\n请以JSON格式返回结果，包含description（描述）、objects（物体）、faces（人脸）和sentiment（情感）字段。`;

    // 调用OpenAI API进行分析
    const response = await this.getOpenAIClient().generate({ prompt });

    // 解析分析结果
    const result = JSON.parse(response.content);

    return {
      url: typeof image === 'string' ? image : URL.createObjectURL(image),
      description: result.description || '',
      objects: result.objects || [],
      faces: result.faces,
      sentiment: result.sentiment || {
        score: 0,
        label: 'neutral'
      }
    };
  }

  /**
   * 分析视频内容
   * @param video 视频
   * @param depth 分析深度
   * @param language 语言
   * @returns 视频分析结果
   */
  private async analyzeVideo(video: string | File, depth: string, language: string): Promise<{
    duration: number;
    frames: Array<{
      timestamp: number;
      description: string;
      objects: Array<{
        name: string;
        confidence: number;
      }>;
    }>;
    audioTranscript?: string;
  }> {
    // 构建分析提示
    const prompt = `分析以下视频的内容、关键帧和音频：\n\n[Video URL: ${typeof video === 'string' ? video : 'file'}]\n\n请以JSON格式返回结果，包含duration（时长）、frames（关键帧）和audioTranscript（音频转录）字段。`;

    // 调用OpenAI API进行分析
    const response = await this.getOpenAIClient().generate({ prompt });

    // 解析分析结果
    const result = JSON.parse(response.content);

    return {
      duration: result.duration || 0,
      frames: result.frames || [],
      audioTranscript: result.audioTranscript
    };
  }

  /**
   * 分析音频内容
   * @param audio 音频
   * @param depth 分析深度
   * @param language 语言
   * @returns 音频分析结果
   */
  private async analyzeAudio(audio: string | File, depth: string, language: string): Promise<{
    duration: number;
    transcript: string;
    sentiment: {
      score: number;
      label: 'positive' | 'negative' | 'neutral';
    };
    speakers?: Array<{
      id: number;
      transcript: string;
    }>;
  }> {
    // 构建分析提示
    const prompt = `分析以下音频的内容、情感和说话人：\n\n[Audio URL: ${typeof audio === 'string' ? audio : 'file'}]\n\n请以JSON格式返回结果，包含duration（时长）、transcript（转录）、sentiment（情感）和speakers（说话人）字段。`;

    // 调用OpenAI API进行分析
    const response = await this.getOpenAIClient().generate({ prompt });

    // 解析分析结果
    const result = JSON.parse(response.content);

    return {
      duration: result.duration || 0,
      transcript: result.transcript || '',
      sentiment: result.sentiment || {
        score: 0,
        label: 'neutral'
      },
      speakers: result.speakers
    };
  }

  /**
   * 生成分析摘要
   * @param result 分析结果
   * @returns 分析摘要
   */
  private generateAnalysisSummary(result: MultimodalAnalysisResult): string {
    let summary = '';

    if (result.textAnalysis) {
      summary += `文本分析：\n`;
      summary += `- 情感：${result.textAnalysis.sentiment.label} (得分: ${result.textAnalysis.sentiment.score})\n`;
      if (result.textAnalysis.entities.length > 0) {
        summary += `- 实体：${result.textAnalysis.entities.map(e => `${e.text} (${e.type})`).join(', ')}\n`;
      }
    }

    if (result.imageAnalysis && result.imageAnalysis.length > 0) {
      summary += `\n图像分析：\n`;
      result.imageAnalysis.forEach((image, index) => {
        summary += `- 图像 ${index + 1}：${image.description}\n`;
        if (image.objects.length > 0) {
          summary += `- 物体：${image.objects.map(o => `${o.name} (${o.confidence})`).join(', ')}\n`;
        }
        summary += `- 情感：${image.sentiment.label} (得分: ${image.sentiment.score})\n`;
      });
    }

    if (result.videoAnalysis) {
      summary += `\n视频分析：\n`;
      summary += `- 时长：${result.videoAnalysis.duration}秒\n`;
      if (result.videoAnalysis.frames.length > 0) {
        summary += `- 关键帧：${result.videoAnalysis.frames.length}个\n`;
      }
      if (result.videoAnalysis.audioTranscript) {
        summary += `- 音频转录：${result.videoAnalysis.audioTranscript.substring(0, 100)}${result.videoAnalysis.audioTranscript.length > 100 ? '...' : ''}\n`;
      }
    }

    if (result.audioAnalysis) {
      summary += `\n音频分析：\n`;
      summary += `- 时长：${result.audioAnalysis.duration}秒\n`;
      summary += `- 转录：${result.audioAnalysis.transcript.substring(0, 100)}${result.audioAnalysis.transcript.length > 100 ? '...' : ''}\n`;
      summary += `- 情感：${result.audioAnalysis.sentiment.label} (得分: ${result.audioAnalysis.sentiment.score})\n`;
      if (result.audioAnalysis.speakers && result.audioAnalysis.speakers.length > 0) {
        summary += `- 说话人：${result.audioAnalysis.speakers.length}个\n`;
      }
    }

    return summary;
  }

  /**
   * 生成摘要
   * @param result 分析结果
   * @returns 摘要
   */
  private generateSummary(result: MultimodalAnalysisResult): string {
    let summary = '';

    if (result.textAnalysis) {
      summary += `文本内容：${result.textAnalysis.content.substring(0, 100)}${result.textAnalysis.content.length > 100 ? '...' : ''}\n`;
    }

    if (result.imageAnalysis && result.imageAnalysis.length > 0) {
      summary += `图像内容：${result.imageAnalysis.map(img => img.description).join('; ')}\n`;
    }

    if (result.videoAnalysis) {
      summary += `视频内容：包含${result.videoAnalysis.frames.length}个关键帧，时长${result.videoAnalysis.duration}秒\n`;
    }

    if (result.audioAnalysis) {
      summary += `音频内容：${result.audioAnalysis.transcript.substring(0, 100)}${result.audioAnalysis.transcript.length > 100 ? '...' : ''}\n`;
    }

    return summary;
  }

  /**
   * 批量分析多模态内容
   * @param contents 内容数组
   * @param contentTypes 内容类型数组
   * @param options 分析选项
   * @returns 分析结果数组
   */
  async batchAnalyze(contents: any[], contentTypes: string[], options: MultimodalAnalysisOptions = {}): Promise<MultimodalAnalysisResult[]> {
    const results: MultimodalAnalysisResult[] = [];

    for (let i = 0; i < contents.length; i++) {
      const result = await this.analyze(contents[i], contentTypes[i], options);
      results.push(result);
    }

    return results;
  }
}

// 导出单例实例
export const multimodalContentAnalysisService = new MultimodalContentAnalysisService();
