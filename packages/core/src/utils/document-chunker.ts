export interface ChunkOptions {
  chunkSize: number;
  chunkOverlap: number;
  minLength?: number;
  maxLength?: number;
  separator?: string;
}

export interface Chunk {
  text: string;
  index: number;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  source?: string;
  title?: string;
  heading?: string;
  headingLevel?: number;
  sectionPath?: string[];
  page?: number;
  startIndex: number;
  endIndex: number;
  tokenCount?: number;
}

export interface ChunkResult {
  chunks: Chunk[];
  totalTokens: number;
  originalLength: number;
  strategy: 'fixed' | 'semantic' | 'markdown' | 'mixed';
}

export class DocumentChunker {
  private defaultOptions: Required<ChunkOptions>;

  constructor(options: Partial<ChunkOptions> = {}) {
    this.defaultOptions = {
      chunkSize: options.chunkSize || 500,
      chunkOverlap: options.chunkOverlap || 50,
      minLength: options.minLength || 50,
      maxLength: options.maxLength || 2000,
      separator: options.separator || '\n\n',
    };
  }

  chunk(text: string, options?: Partial<ChunkOptions>): ChunkResult {
    const opts = { ...this.defaultOptions, ...options };

    if (this.isMarkdown(text)) {
      return this.markdownChunk(text, opts);
    }

    if (text.length < opts.maxLength * 1.5) {
      return this.semanticChunk(text, opts);
    }

    return this.fixedChunk(text, opts);
  }

  private isMarkdown(text: string): boolean {
    const mdPatterns = [
      /^#{1,6}\s/m,
      /\[.+\]\(.+\)/,
      /`{3}[\s\S]*?`{3}/,
      /^\s*[-*+]\s/m,
      /^\s*\d+\.\s/m,
    ];
    return mdPatterns.some(p => p.test(text.slice(0, 2000)));
  }

  fixedChunk(text: string, opts: Required<ChunkOptions>): ChunkResult {
    const chunks: Chunk[] = [];
    let start = 0;
    let index = 0;

    while (start < text.length) {
      let end = start + opts.chunkSize;

      if (end < text.length) {
        const breakPoint = this.findBreakpoint(text, start, end);
        end = breakPoint;
      }

      const chunkText = text.slice(start, end).trim();
      if (chunkText.length >= (opts.minLength || 0)) {
        chunks.push({
          text: chunkText,
          index,
          metadata: {
            startIndex: start,
            endIndex: end,
            tokenCount: this.estimateTokens(chunkText),
          },
        });
        index++;
      }

      start = end - (chunks.length > 0 ? opts.chunkOverlap : 0);
    }

    return {
      chunks,
      totalTokens: chunks.reduce((sum, c) => sum + (c.metadata.tokenCount || 0), 0),
      originalLength: text.length,
      strategy: 'fixed',
    };
  }

  semanticChunk(text: string, opts: Required<ChunkOptions>): ChunkResult {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: Chunk[] = [];
    let current = '';
    let globalIndex = 0;

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      if (!current) {
        current = trimmed;
        continue;
      }

      if ((current + '\n\n' + trimmed).length <= opts.chunkSize) {
        current += '\n\n' + trimmed;
      } else {
        if (current.trim().length >= (opts.minLength || 0)) {
          chunks.push({
            text: current.trim(),
            index: globalIndex++,
            metadata: {
              startIndex: text.indexOf(current),
              endIndex: text.indexOf(current) + current.length,
              tokenCount: this.estimateTokens(current),
            },
          });
        }
        current = trimmed;
      }
    }

    if (current.trim().length >= (opts.minLength || 0)) {
      chunks.push({
        text: current.trim(),
        index: globalIndex,
        metadata: {
          startIndex: text.lastIndexOf(current),
          endIndex: text.length,
          tokenCount: this.estimateTokens(current),
        },
      });
    }

    return {
      chunks,
      totalTokens: chunks.reduce((sum, c) => sum + (c.metadata.tokenCount || 0), 0),
      originalLength: text.length,
      strategy: 'semantic',
    };
  }

  markdownChunk(text: string, opts: Required<ChunkOptions>): ChunkResult {
    const lines = text.split('\n');
    const chunks: Chunk[] = [];
    let currentSection: string[] = [];
    let currentHeading = '';
    let currentHeadingLevel = 0;
    const sectionPath: string[] = [];
    let globalIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();

        if (currentSection.length > 0) {
          const sectionText = currentSection.join('\n').trim();
          if (sectionText.length > 0) {
            const subChunks = this.fixedChunk(sectionText, opts);
            subChunks.chunks.forEach(sc => {
              sc.metadata.heading = currentHeading;
              sc.metadata.headingLevel = currentHeadingLevel;
              sc.metadata.sectionPath = [...sectionPath];
              sc.index = globalIndex++;
              chunks.push(sc);
            });
          }
        }

        while (sectionPath.length >= level) {
          sectionPath.pop();
        }
        sectionPath.push(title);

        currentHeading = title;
        currentHeadingLevel = level;
        currentSection = [line];
      } else {
        currentSection.push(line);
      }
    }

    if (currentSection.length > 0) {
      const sectionText = currentSection.join('\n').trim();
      if (sectionText.length > 0) {
        const subChunks = this.fixedChunk(sectionText, opts);
        subChunks.chunks.forEach(sc => {
          sc.metadata.heading = currentHeading;
          sc.metadata.headingLevel = currentHeadingLevel;
          sc.metadata.sectionPath = [...sectionPath];
          sc.index = globalIndex++;
          chunks.push(sc);
        });
      }
    }

    return {
      chunks,
      totalTokens: chunks.reduce((sum, c) => sum + (c.metadata.tokenCount || 0), 0),
      originalLength: text.length,
      strategy: 'markdown',
    };
  }

  private findBreakpoint(text: string, start: number, end: number): number {
    const candidates = ['\n\n', '\n', '。', '.', ' ', ''];

    for (const sep of candidates) {
      const lastIdx = text.lastIndexOf(sep, end);
      if (lastIdx > start + this.defaultOptions.minLength) {
        return lastIdx + sep.length;
      }
    }

    return end;
  }

  estimateTokens(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars * 1.5 + otherChars / 4);
  }
}

export const documentChunker = new DocumentChunker();
