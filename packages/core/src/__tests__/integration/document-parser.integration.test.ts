import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  DocumentParserUtil,
  TextDocumentParser,
  PDFDocumentParser,
  WordDocumentParser,
  ExcelDocumentParser,
  PowerPointDocumentParser,
  ImageDocumentParser,
  DefaultDocumentParserRegistry,
} from '../../utils/document-parser'
import { DocumentType, ContentType } from '../../types/document'
import { cacheManager } from '../../utils/cache-manager'

// 模拟 logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// 模拟 mammoth
vi.mock('mammoth', () => ({
  extractRawText: vi.fn(),
}))

// 模拟 xlsx
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
  },
}))

// 模拟 jszip
const mockJSZipInstances: any[] = []
vi.mock('jszip', () => ({
  default: class JSZip {
    files: Record<string, { async: (type: string) => Promise<string> }> = {}
    file = vi.fn((name: string) => this.files[name])
    forEach = vi.fn((callback: (path: string) => void) => {
      Object.keys(this.files).forEach(key => callback(key))
    })
    static loadAsync = vi.fn().mockImplementation((buffer: ArrayBuffer) => {
      const instance = new JSZip()
      mockJSZipInstances.push(instance)
      return Promise.resolve(instance)
    })
    constructor() {
      mockJSZipInstances.push(this)
    }
  },
}))

// 模拟 tesseract.js
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({
    reinitialize: vi.fn().mockResolvedValue(undefined),
    recognize: vi.fn().mockResolvedValue({ data: { text: 'OCR text result' } }),
    terminate: vi.fn().mockResolvedValue(undefined),
  }),
}))

// 模拟 pdfjs-dist
const mockPdfjs = {
  getDocument: vi.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 2,
      getPage: vi.fn().mockResolvedValue({
        getViewport: vi.fn().mockReturnValue({ width: 800, height: 1000 }),
        render: vi.fn().mockReturnValue({
          promise: Promise.resolve(),
        }),
        cleanup: vi.fn(),
      }),
      destroy: vi.fn().mockResolvedValue(undefined),
    }),
  }),
}
vi.mock('pdfjs-dist', () => ({
  default: mockPdfjs,
  ...mockPdfjs,
}))

describe('Document Parser Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cacheManager.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Text Document Parsing', () => {
    it('should parse text file and extract content', async () => {
      const parser = new TextDocumentParser()
      const textContent = 'Hello, this is a test document.\nIt has multiple lines.'

      const result = await parser.parse(textContent)

      expect(result.success).toBe(true)
      expect(result.text).toBe(textContent)
      expect(result.metadata.type).toBe(DocumentType.TEXT)
      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe(ContentType.TEXT)
    })

    it('should detect text document type from string', async () => {
      const parser = new TextDocumentParser()
      const type = await parser.detectType('document.txt')
      expect(type).toBe(DocumentType.TEXT)
    })

    it('should extract text with options', async () => {
      const parser = new TextDocumentParser()
      const textContent = 'Test content for extraction'

      const extractedText = await parser.extractText(textContent, { extractText: true })

      expect(extractedText).toBe(textContent)
    })
  })

  describe('Document Type Detection', () => {
    it('should detect PDF from filename', async () => {
      const registry = new DefaultDocumentParserRegistry()
      const type = await registry.detectType('document.pdf')
      expect(type).toBe(DocumentType.PDF)
    })

    it('should detect Word document from filename', async () => {
      const registry = new DefaultDocumentParserRegistry()
      const type = await registry.detectType('document.docx')
      expect(type).toBe(DocumentType.WORD)
    })

    it('should detect Excel from filename', async () => {
      const registry = new DefaultDocumentParserRegistry()
      const type = await registry.detectType('spreadsheet.xlsx')
      expect(type).toBe(DocumentType.EXCEL)
    })

    it('should detect PowerPoint from filename', async () => {
      const registry = new DefaultDocumentParserRegistry()
      const type = await registry.detectType('presentation.pptx')
      expect(type).toBe(DocumentType.POWERPOINT)
    })

    it('should detect image from filename', async () => {
      const registry = new DefaultDocumentParserRegistry()
      const type = await registry.detectType('image.png')
      expect(type).toBe(DocumentType.IMAGE)
    })

    it('should detect document type from ArrayBuffer header', async () => {
      const parser = new TextDocumentParser()
      // PDF header: %PDF-1.
      const pdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])
      const type = await parser.detectType(pdfBuffer.buffer)
      expect(type).toBe(DocumentType.PDF)
    })
  })

  describe('Document Parser Registry', () => {
    it('should register and retrieve parsers', () => {
      const registry = new DefaultDocumentParserRegistry()
      const textParser = new TextDocumentParser()

      registry.registerParser(textParser)

      const retrieved = registry.getParser(DocumentType.TEXT)
      expect(retrieved).toBe(textParser)
    })

    it('should get parser for file automatically', async () => {
      const registry = new DefaultDocumentParserRegistry()
      registry.registerParser(new TextDocumentParser())

      const parser = await registry.getParserForFile('test.txt')
      expect(parser).toBeDefined()
      expect(parser?.supportedTypes).toContain(DocumentType.TEXT)
    })

    it('should return supported types', () => {
      const registry = new DefaultDocumentParserRegistry()
      registry.registerParser(new TextDocumentParser())
      registry.registerParser(new PDFDocumentParser())

      const types = registry.getSupportedTypes()
      expect(types).toContain(DocumentType.TEXT)
      expect(types).toContain(DocumentType.PDF)
    })
  })

  describe('DocumentParserUtil Static Methods', () => {
    it('should parse document using utility', async () => {
      const textContent = 'Utility test content'
      const result = await DocumentParserUtil.parse(textContent, { extractText: true })

      expect(result.success).toBe(true)
      expect(result.text).toBe(textContent)
    })

    it('should extract text using utility', async () => {
      const textContent = 'Text extraction test'
      const extracted = await DocumentParserUtil.extractText(textContent)

      expect(extracted).toBe(textContent)
    })

    it('should chunk document content', () => {
      const content = 'a'.repeat(5000)
      const chunks = DocumentParserUtil.chunkDocument(content, 2000, 200)

      expect(chunks.length).toBeGreaterThan(1)
      expect(chunks[0].text.length).toBeLessThanOrEqual(2000)
    })

    it('should return supported types', () => {
      const types = DocumentParserUtil.getSupportedTypes()
      expect(types.length).toBeGreaterThan(0)
    })
  })

  describe('Cache Integration', () => {
    it('should cache parse results when enabled', async () => {
      const registry = new DefaultDocumentParserRegistry()
      registry.registerParser(new TextDocumentParser())

      const content = 'Cache test content'
      const options = { enableCache: true, extractText: true }

      // First parse
      const result1 = await registry.parse(content, options)
      expect(result1.success).toBe(true)

      // Second parse should use cache
      const result2 = await registry.parse(content, options)
      expect(result2.success).toBe(true)
    })

    it('should generate consistent cache keys', () => {
      const key1 = cacheManager.generateKey('test-file.txt')
      const key2 = cacheManager.generateKey('test-file.txt')
      expect(key1).toBe(key2)
    })
  })

  describe('Error Handling', () => {
    it('should handle unsupported file types gracefully', async () => {
      const registry = new DefaultDocumentParserRegistry()
      const result = await registry.parse('unknown.xyz')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No suitable parser')
    })

    it('should handle empty content', async () => {
      const parser = new TextDocumentParser()
      const result = await parser.parse('')

      expect(result.success).toBe(true)
      expect(result.text).toBe('')
    })
  })

  describe('Word Document Parser', () => {
    it('should reject old .doc format', async () => {
      const parser = new WordDocumentParser()
      const mockFile = new File([''], 'test.doc', { type: 'application/msword' })

      const result = await parser.parse(mockFile)

      expect(result.success).toBe(false)
      expect(result.error).toContain('.doc format is not supported')
    })
  })

  describe('Excel Document Parser', () => {
    it('should parse Excel file and extract table data', async () => {
      const { read, utils } = await import('xlsx')
      const mockWorkbook = {
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      }
      ;(read as any).mockReturnValue(mockWorkbook)
      ;(utils.sheet_to_json as any).mockReturnValue([
        ['Name', 'Age'],
        ['Alice', '30'],
        ['Bob', '25'],
      ])

      const parser = new ExcelDocumentParser()
      const mockBuffer = new ArrayBuffer(10)

      const result = await parser.parse(mockBuffer)

      expect(result.success).toBe(true)
      expect(result.content).toHaveLength(2) // TABLE + TEXT
      expect(result.content[0].type).toBe(ContentType.TABLE)
    })
  })

  describe('PowerPoint Document Parser', () => {
    it('should parse PPTX file and extract slide content', async () => {
      const { default: JSZip } = await import('jszip')

      // 配置静态 loadAsync 返回一个设置了 files 的实例
      const mockZip = new JSZip()
      mockZip.files = {
        'ppt/slides/slide1.xml': {
          async: vi.fn().mockResolvedValue('<a:t>Slide 1 Title</a:t><a:t>Slide 1 Content</a:t>'),
        },
        'ppt/slides/slide2.xml': {
          async: vi.fn().mockResolvedValue('<a:t>Slide 2 Title</a:t>'),
        },
        'docProps/app.xml': {
          async: vi.fn().mockResolvedValue('<Title>Test Presentation</Title>'),
        },
      }
      ;(JSZip.loadAsync as any).mockResolvedValue(mockZip)

      const parser = new PowerPointDocumentParser()
      const mockBuffer = new ArrayBuffer(10)

      const result = await parser.parse(mockBuffer)

      expect(result.success).toBe(true)
      expect(result.metadata.pageCount).toBe(2)
      expect(result.content.length).toBeGreaterThan(0)
    })
  })

  describe('Image Document Parser', () => {
    it('should parse image file', async () => {
      const parser = new ImageDocumentParser()
      const mockBuffer = new ArrayBuffer(10)

      const result = await parser.parse(mockBuffer)

      expect(result.success).toBe(true)
      expect(result.content[0].type).toBe(ContentType.IMAGE)
    })

    it('should perform OCR when enabled', async () => {
      const parser = new ImageDocumentParser()
      const mockBuffer = new ArrayBuffer(10)

      const result = await parser.parse(mockBuffer, { enableOCR: true, ocrLanguage: 'eng' })

      expect(result.success).toBe(true)
      expect(result.content.length).toBeGreaterThan(1)
    })
  })

  describe('PDF Document Parser', () => {
    it('should parse PDF and convert to images', async () => {
      const parser = new PDFDocumentParser()
      const mockBuffer = new ArrayBuffer(10)

      // Mock canvas
      const mockCanvas = {
        getContext: vi.fn().mockReturnValue({
          fillRect: vi.fn(),
        }),
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,abc123'),
        width: 0,
        height: 0,
      }
      vi.stubGlobal('document', {
        createElement: vi.fn().mockReturnValue(mockCanvas),
      })

      const result = await parser.parse(mockBuffer, { maxPages: 2 })

      expect(result.success).toBe(true)
      expect(result.metadata.pageCount).toBe(2)

      vi.unstubAllGlobals()
    })
  })

  describe('Document Metadata', () => {
    it('should extract metadata from File object', async () => {
      const parser = new TextDocumentParser()
      const mockFile = new File(['test content'], 'test.txt', {
        type: 'text/plain',
        lastModified: Date.now(),
      })

      const metadata = await parser.parseMetadata(mockFile)

      expect(metadata.name).toBe('test.txt')
      expect(metadata.size).toBe(12)
      expect(metadata.type).toBe(DocumentType.TEXT)
    })

    it('should extract metadata from string path', async () => {
      const parser = new TextDocumentParser()
      const metadata = await parser.parseMetadata('/path/to/document.txt')

      expect(metadata.name).toBe('document.txt')
      expect(metadata.type).toBe(DocumentType.TEXT)
    })
  })
})
