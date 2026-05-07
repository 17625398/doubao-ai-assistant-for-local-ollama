export class TextChunkingService {
  private readonly DEFAULT_CHUNK_SIZE = 1000;
  private readonly DEFAULT_OVERLAP = 100;

  /**
   * 对长文本进行分块处理
   * @param text 输入文本
   * @param chunkSize 块大小
   * @param overlap 重叠大小
   * @returns 分块后的文本数组
   */
  chunkText(text: string, chunkSize: number = this.DEFAULT_CHUNK_SIZE, overlap: number = this.DEFAULT_OVERLAP): string[] {
    if (!text || text.length <= chunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let start = 0;
    const textLength = text.length;

    while (start < textLength) {
      const end = Math.min(start + chunkSize, textLength);
      chunks.push(text.substring(start, end));
      start += chunkSize - overlap;
    }

    return chunks;
  }

  /**
   * 基于句子边界进行智能分块
   * @param text 输入文本
   * @param chunkSize 块大小
   * @param overlap 重叠大小
   * @returns 分块后的文本数组
   */
  chunkBySentences(text: string, chunkSize: number = this.DEFAULT_CHUNK_SIZE, overlap: number = this.DEFAULT_OVERLAP): string[] {
    if (!text || text.length <= chunkSize) {
      return [text];
    }

    // 分割句子
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const sentenceWithPunctuation = sentence.trim() + '.';
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentenceWithPunctuation;

      if (potentialChunk.length <= chunkSize) {
        currentChunk = potentialChunk;
      } else {
        chunks.push(currentChunk);
        currentChunk = sentenceWithPunctuation;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * 基于段落边界进行分块
   * @param text 输入文本
   * @returns 分块后的文本数组
   */
  chunkByParagraphs(text: string): string[] {
    if (!text) {
      return [];
    }

    return text.split(/\n\s*\n/).filter(paragraph => paragraph.trim().length > 0);
  }

  /**
   * 计算文本的token数量（基于粗略估计）
   * @param text 输入文本
   * @returns token数量估计
   */
  estimateTokenCount(text: string): number {
    if (!text) {
      return 0;
    }
    // 粗略估计：1个token约等于4个字符
    return Math.ceil(text.length / 4);
  }

  /**
   * 优化分块策略，根据文本长度和类型自动调整
   * @param text 输入文本
   * @param maxTokens 最大token数
   * @returns 优化后的分块数组
   */
  optimizeChunks(text: string, maxTokens: number = 2000): string[] {
    if (!text) {
      return [];
    }

    const estimatedTokens = this.estimateTokenCount(text);
    
    if (estimatedTokens <= maxTokens) {
      return [text];
    }

    // 根据token数计算合适的块大小
    const optimalChunkSize = Math.floor((maxTokens * 4) * 0.8); // 预留20%的安全空间
    return this.chunkBySentences(text, optimalChunkSize, 100);
  }
}
