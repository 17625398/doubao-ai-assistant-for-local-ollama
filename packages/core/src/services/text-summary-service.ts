import { TextChunkingService } from './text-chunking-service';

export class TextSummaryService {
  private textChunkingService: TextChunkingService;
  
  constructor() {
    this.textChunkingService = new TextChunkingService();
  }

  /**
   * 生成文本摘要
   * @param text 输入文本
   * @param type 摘要类型：extractive（提取式）或abstractive（生成式）
   * @param length 摘要长度（句子数）
   * @returns 生成的摘要
   */
  async generateSummary(text: string, type: 'extractive' | 'abstractive' = 'extractive', length: number = 5): Promise<string> {
    if (!text || text.length === 0) {
      return '';
    }

    if (type === 'extractive') {
      return this.extractiveSummary(text, length);
    } else {
      return this.abstractiveSummary(text, length);
    }
  }

  /**
   * 提取式摘要（基于TextRank算法）
   * @param text 输入文本
   * @param sentenceCount 摘要句子数
   * @returns 提取的摘要
   */
  private extractiveSummary(text: string, sentenceCount: number): string {
    // 分割句子
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= sentenceCount) {
      return text;
    }

    // 计算句子相似度矩阵
    const similarityMatrix = this.calculateSimilarityMatrix(sentences);
    
    // 应用TextRank算法
    const scores = this.textRank(similarityMatrix);
    
    // 排序句子并选择 top N
    const rankedSentences = sentences
      .map((sentence, index) => ({ sentence, score: scores[index] }))
      .sort((a, b) => b.score - a.score)
      .slice(0, sentenceCount)
      .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence));
    
    return rankedSentences.map(item => item.sentence.trim()).join('. ') + '.';
  }

  /**
   * 生成式摘要（基于大语言模型）
   * @param text 输入文本
   * @param sentenceCount 摘要句子数
   * @returns 生成的摘要
   */
  private async abstractiveSummary(text: string, sentenceCount: number): Promise<string> {
    // 这里使用模拟实现，实际应用中应该调用大语言模型API
    // 例如：OpenAI API, Gemini API, 或本地部署的模型
    
    // 简单的模拟实现
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const summarySentences = sentences.slice(0, sentenceCount);
    return summarySentences.map(s => s.trim()).join('. ') + '.';
  }

  /**
   * 计算句子相似度矩阵
   * @param sentences 句子数组
   * @returns 相似度矩阵
   */
  private calculateSimilarityMatrix(sentences: string[]): number[][] {
    const matrix: number[][] = [];
    const n = sentences.length;
    
    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 0;
        } else {
          matrix[i][j] = this.calculateSimilarity(sentences[i], sentences[j]);
        }
      }
    }
    
    return matrix;
  }

  /**
   * 计算两个句子的相似度
   * @param sentence1 第一个句子
   * @param sentence2 第二个句子
   * @returns 相似度分数
   */
  private calculateSimilarity(sentence1: string, sentence2: string): number {
    const words1 = this.tokenize(sentence1);
    const words2 = this.tokenize(sentence2);
    
    if (words1.length === 0 || words2.length === 0) {
      return 0;
    }
    
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.sqrt(words1.length * words2.length);
  }

  /**
   * 分词
   * @param text 输入文本
   * @returns 词数组
   */
  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  /**
   * TextRank算法
   * @param similarityMatrix 相似度矩阵
   * @returns 句子得分
   */
  private textRank(similarityMatrix: number[][]): number[] {
    const n = similarityMatrix.length;
    const dampingFactor = 0.85;
    const scores = Array(n).fill(1.0);
    const maxIterations = 100;
    const tolerance = 0.0001;
    
    for (let iter = 0; iter < maxIterations; iter++) {
      const newScores = Array(n).fill(0);
      
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i !== j) {
            const sum = similarityMatrix[j].reduce((acc, val) => acc + val, 0);
            if (sum > 0) {
              newScores[i] += dampingFactor * (similarityMatrix[j][i] / sum) * scores[j];
            }
          }
        }
        newScores[i] += (1 - dampingFactor);
      }
      
      // 检查收敛
      let converged = true;
      for (let i = 0; i < n; i++) {
        if (Math.abs(newScores[i] - scores[i]) > tolerance) {
          converged = false;
          break;
        }
      }
      
      if (converged) {
        break;
      }
      
      for (let i = 0; i < n; i++) {
        scores[i] = newScores[i];
      }
    }
    
    return scores;
  }

  /**
   * 生成摘要的高级选项
   * @param text 输入文本
   * @param options 摘要选项
   * @returns 生成的摘要
   */
  async generateSummaryWithOptions(text: string, options: {
    type: 'extractive' | 'abstractive';
    length: number;
    language?: string;
    format?: 'plain' | 'bullet' | 'paragraph';
  }): Promise<string> {
    const summary = await this.generateSummary(text, options.type, options.length);
    
    if (options.format === 'bullet') {
      return summary.split('. ').filter(s => s.trim().length > 0)
        .map(sentence => `- ${sentence}`)
        .join('\n');
    }
    
    return summary;
  }
}
