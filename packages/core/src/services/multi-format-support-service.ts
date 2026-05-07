import { documentParserRegistry } from '../document-parsers/document-parser-registry';
import { DocumentType, DocumentParseResult, ParseOptions } from '../types/document';
import { pdfProcessingPolicyService } from './pdf-processing-policy-service';

export class MultiFormatSupportService {
  private parserRegistry = documentParserRegistry;

  constructor() {
  }

  /**
   * 解析文档
   * @param file 文件路径或ArrayBuffer
   * @returns 解析后的文档
   */
  async parseDocument(file: string | ArrayBuffer, options?: ParseOptions): Promise<DocumentParseResult> {
    const normalizedOptions = this.normalizeParseOptions(file, options)
    return await this.parserRegistry.parse(file, normalizedOptions);
  }

  private normalizeParseOptions(file: string | ArrayBuffer, options?: ParseOptions): ParseOptions | undefined {
    const isPdf =
      (typeof file === 'string' && file.toLowerCase().endsWith('.pdf')) ||
      options?.pdfOcrPolicy !== undefined ||
      options?.enableOCR !== undefined
    if (!isPdf) return options
    return pdfProcessingPolicyService.applyPolicyToOptions(options)
  }

  /**
   * 根据文件扩展名获取内容类型
   * @param filename 文件名
   * @returns 内容类型
   */
  getContentTypeFromFilename(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'txt':
        return 'text/plain';
      case 'html':
      case 'htm':
        return 'text/html';
      case 'md':
      case 'markdown':
        return 'text/markdown';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'doc':
        return 'application/msword';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'xls':
        return 'application/vnd.ms-excel';
      case 'pptx':
        return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case 'ppt':
        return 'application/vnd.ms-powerpoint';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * 支持的文件格式
   * @returns 支持的文件格式列表
   */
  getSupportedFormats(): Array<{
    extension: string;
    contentType: string;
    description: string;
  }> {
    return [
      { extension: 'pdf', contentType: 'application/pdf', description: 'PDF文档' },
      { extension: 'txt', contentType: 'text/plain', description: '文本文件' },
      { extension: 'html', contentType: 'text/html', description: 'HTML文件' },
      { extension: 'md', contentType: 'text/markdown', description: 'Markdown文件' },
      { extension: 'docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', description: 'Word文档' },
      { extension: 'xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', description: 'Excel表格' },
      { extension: 'pptx', contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', description: 'PowerPoint演示' },
      { extension: 'jpg', contentType: 'image/jpeg', description: 'JPEG图片' },
      { extension: 'png', contentType: 'image/png', description: 'PNG图片' },
      { extension: 'gif', contentType: 'image/gif', description: 'GIF图片' },
      { extension: 'webp', contentType: 'image/webp', description: 'WebP图片' },
    ];
  }

  /**
   * 批量解析多个文档
   * @param files 文件列表
   * @returns 解析结果列表
   */
  async batchParse(files: Array<{
    file: string | ArrayBuffer;
  }>): Promise<Array<{
    index: number;
    document: DocumentParseResult;
    error?: string;
  }>> {
    const results = await Promise.all(
      files.map(async (fileInfo, index) => {
        try {
          const document = await this.parseDocument(fileInfo.file);
          return { index, document };
        } catch (error: any) {
          return { 
            index, 
            document: { 
              metadata: { name: 'Unknown', type: DocumentType.UNKNOWN, size: 0, createdAt: new Date(), modifiedAt: new Date() },
              content: [],
              parseTime: 0,
              success: false,
              error: error.message
            }, 
            error: error.message 
          };
        }
      })
    );

    return results;
  }

  /**
   * 获取所有支持的文档类型
   * @returns 支持的文档类型列表
   */
  getSupportedTypes(): DocumentType[] {
    return this.parserRegistry.getSupportedTypes();
  }
}
