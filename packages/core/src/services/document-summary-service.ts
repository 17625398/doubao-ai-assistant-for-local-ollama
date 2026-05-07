import { DocumentParseResult, DocumentContent, ContentType } from '../types/document'
import { ollamaClient } from '../utils/ollama-client'
import { logger } from '../utils/logger'

export interface DocumentSummary {
  id: string
  title: string
  content: string
  keyPoints: string[]
  topics: string[]
  entities: string[]
  generatedAt: number
  wordCount: number
  readTime: number
}

function extractTextFromContent(parts: DocumentContent[]): string {
  return parts
    .map(part => {
      switch (part.type) {
        case ContentType.TEXT:
          return (part as { text: string }).text
        case ContentType.TABLE: {
          const table = part as {
            headers?: string[]
            rows: string[][]
            rawCsv?: string
            title?: string
          }
          const lines: string[] = []
          if (table.title) lines.push(table.title)
          if (table.headers) lines.push(table.headers.join('\t'))
          table.rows.forEach(row => lines.push(row.join('\t')))
          return lines.join('\n')
        }
        case ContentType.IMAGE: {
          const img = part as { alt?: string; title?: string }
          return img.alt || img.title || '[图片]'
        }
        case ContentType.HEADER:
        case ContentType.FOOTER: {
          const container = part as { content: DocumentContent[] }
          return extractTextFromContent(container.content)
        }
        default:
          return ''
      }
    })
    .filter(Boolean)
    .join('\n')
}

export class DocumentSummaryService {
  async generateSummary(
    document: DocumentParseResult,
    model: string = 'llama3'
  ): Promise<DocumentSummary> {
    try {
      if (!document.success) {
        throw new Error('Document parsing failed')
      }

      const documentText = extractTextFromContent(document.content)
      const wordCount = documentText.split(/\s+/).filter(Boolean).length
      const readTime = Math.ceil(wordCount / 200)

      const prompt = `基于以下文档内容，生成一个详细的摘要，包括：\n1. 文档标题\n2. 主要内容摘要\n3. 关键要点（至少5点）\n4. 主要话题\n5. 重要实体（人物、组织、地点等）\n\n文档内容：\n${documentText}\n\n请以JSON格式返回，例如：{"title": "文档标题", "content": "摘要内容", "keyPoints": ["要点1", "要点2"], "topics": ["话题1", "话题2"], "entities": ["实体1", "实体2"]}`

      const response = await ollamaClient.generate(prompt, { model, stream: false })

      if (!response.response) {
        throw new Error('No response from model')
      }

      const parsed = JSON.parse(response.response)
      if (parsed) {
        return {
          id: `doc_summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: parsed.title || document.metadata.name || '未命名文档',
          content: parsed.content || '无摘要',
          keyPoints: parsed.keyPoints || [],
          topics: parsed.topics || [],
          entities: parsed.entities || [],
          generatedAt: Date.now(),
          wordCount,
          readTime,
        }
      }

      return this.createDefaultSummary(document, wordCount, readTime)
    } catch (error) {
      logger.error('Failed to generate document summary:', error)
      const documentText = extractTextFromContent(document.content)
      const wordCount = documentText.split(/\s+/).filter(Boolean).length
      const readTime = Math.ceil(wordCount / 200)
      return this.createDefaultSummary(document, wordCount, readTime)
    }
  }

  async extractKeyInformation(
    document: DocumentParseResult,
    model: string = 'llama3'
  ): Promise<{
    keyPoints: string[]
    topics: string[]
    entities: string[]
  }> {
    try {
      if (!document.success) {
        throw new Error('Document parsing failed')
      }

      const documentText = extractTextFromContent(document.content)

      const prompt = `基于以下文档内容，提取：\n1. 关键要点（至少5点）\n2. 主要话题\n3. 重要实体（人物、组织、地点等）\n\n文档内容：\n${documentText}\n\n请以JSON格式返回，例如：{"keyPoints": ["要点1", "要点2"], "topics": ["话题1", "话题2"], "entities": ["实体1", "实体2"]}`

      const response = await ollamaClient.generate(prompt, { model, stream: false })

      if (!response.response) {
        throw new Error('No response from model')
      }

      const parsed = JSON.parse(response.response)
      if (parsed) {
        return {
          keyPoints: parsed.keyPoints || [],
          topics: parsed.topics || [],
          entities: parsed.entities || [],
        }
      }

      return { keyPoints: [], topics: [], entities: [] }
    } catch (error) {
      logger.error('Failed to extract key information:', error)
      return { keyPoints: [], topics: [], entities: [] }
    }
  }

  private createDefaultSummary(
    document: DocumentParseResult,
    wordCount: number,
    readTime: number
  ): DocumentSummary {
    return {
      id: `doc_summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: document.metadata.name || '未命名文档',
      content: '无法生成摘要',
      keyPoints: [],
      topics: [],
      entities: [],
      generatedAt: Date.now(),
      wordCount,
      readTime,
    }
  }
}

export const documentSummaryService = new DocumentSummaryService()
