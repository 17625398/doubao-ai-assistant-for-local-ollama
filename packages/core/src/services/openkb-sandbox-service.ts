/**
 * OpenKB 沙箱服务
 * 为浏览器环境提供 OpenKB 功能支持
 * 通过 API 调用后端服务执行文件操作
 */

import { logger } from '../utils/logger'

// 沙箱配置
interface SandboxConfig {
  apiEndpoint: string
  timeout?: number
}

// 默认配置
const DEFAULT_CONFIG: SandboxConfig = {
  apiEndpoint: '/api/openkb',
  timeout: 300000, // 5分钟
}

// 沙箱文件存储（模拟文件系统）
interface SandboxFile {
  id: string
  name: string
  content: ArrayBuffer
  type: string
  size: number
  createdAt: number
}

export class OpenKBSandboxService {
  private config: SandboxConfig
  private fileStore: Map<string, SandboxFile> = new Map()

  constructor(config?: Partial<SandboxConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 检查是否在沙箱环境中运行
   */
  isSandboxEnvironment(): boolean {
    return typeof window !== 'undefined' && typeof process === 'undefined'
  }

  /**
   * 上传文件到沙箱
   * @param file 浏览器 File 对象
   * @returns 文件 ID
   */
  async uploadFile(file: File): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      logger.info('[OpenKBSandbox] Uploading file:', file.name)

      // 读取文件内容
      const arrayBuffer = await file.arrayBuffer()

      // 生成文件 ID
      const fileId = `sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // 存储到内存
      const sandboxFile: SandboxFile = {
        id: fileId,
        name: file.name,
        content: arrayBuffer,
        type: file.type,
        size: file.size,
        createdAt: Date.now(),
      }

      this.fileStore.set(fileId, sandboxFile)

      logger.info('[OpenKBSandbox] File uploaded:', fileId)

      return {
        success: true,
        fileId,
      }
    } catch (error) {
      logger.error('[OpenKBSandbox] Upload failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      }
    }
  }

  /**
   * 添加文档到 OpenKB（通过 API）
   * @param fileId 沙箱文件 ID
   * @param fileName 文件名
   */
  async addDocument(
    fileId: string,
    fileName: string
  ): Promise<{ success: boolean; documentId?: string; summaryPath?: string; error?: string }> {
    try {
      logger.info('[OpenKBSandbox] Adding document to OpenKB:', fileName)

      // 获取文件
      const file = this.fileStore.get(fileId)
      if (!file) {
        return {
          success: false,
          error: 'File not found in sandbox',
        }
      }

      // 创建 FormData
      const formData = new FormData()
      const blob = new Blob([file.content], { type: file.type })
      formData.append('file', blob, fileName)
      formData.append('fileName', fileName)

      // 调用后端 API
      const response = await fetch(`${this.config.apiEndpoint}/add`, {
        method: 'POST',
        body: formData,
        timeout: this.config.timeout,
      } as RequestInit)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      logger.info('[OpenKBSandbox] Document added:', result.documentId)

      return {
        success: true,
        documentId: result.documentId,
        summaryPath: result.summaryPath,
      }
    } catch (error) {
      logger.error('[OpenKBSandbox] Add document failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Add document failed',
      }
    }
  }

  /**
   * 查询知识库（通过 API）
   * @param question 查询问题
   */
  async query(
    question: string
  ): Promise<{ success: boolean; answer?: string; sources?: string[]; error?: string }> {
    try {
      logger.info('[OpenKBSandbox] Querying:', question)

      const response = await fetch(`${this.config.apiEndpoint}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
        timeout: 120000,
      } as RequestInit)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      return {
        success: true,
        answer: result.answer,
        sources: result.sources,
      }
    } catch (error) {
      logger.error('[OpenKBSandbox] Query failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Query failed',
      }
    }
  }

  /**
   * 获取文件
   */
  getFile(fileId: string): SandboxFile | null {
    return this.fileStore.get(fileId) || null
  }

  /**
   * 删除文件
   */
  deleteFile(fileId: string): boolean {
    return this.fileStore.delete(fileId)
  }

  /**
   * 清空文件存储
   */
  clearFiles(): void {
    this.fileStore.clear()
  }

  /**
   * 获取存储统计
   */
  getStats(): { fileCount: number; totalSize: number } {
    let totalSize = 0
    for (const file of this.fileStore.values()) {
      totalSize += file.size
    }
    return {
      fileCount: this.fileStore.size,
      totalSize,
    }
  }

  /**
   * 获取知识库文档列表
   */
  async getDocuments(): Promise<{
    success: boolean
    documents?: Array<{
      id: string
      name: string
      title: string
      type: string
      updatedAt: string
    }>
    status?: {
      initialized: boolean
      documentCount: number
      wikiReady: boolean
    }
    error?: string
  }> {
    try {
      logger.info('[OpenKBSandbox] Fetching document list')

      const response = await fetch(`${this.config.apiEndpoint}/documents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      return {
        success: true,
        documents: result.documents,
        status: result.status,
      }
    } catch (error) {
      logger.error('[OpenKBSandbox] Failed to fetch documents:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch documents',
      }
    }
  }

  /**
   * 初始化 OpenKB 知识库
   */
  async init(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      logger.info('[OpenKBSandbox] Initializing OpenKB...')

      const response = await fetch(`${this.config.apiEndpoint}/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      if (result.success) {
        logger.info('[OpenKBSandbox] OpenKB initialized successfully')
      } else {
        logger.error('[OpenKBSandbox] Failed to initialize OpenKB:', result.error)
      }

      return result
    } catch (error) {
      logger.error('[OpenKBSandbox] Failed to initialize:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize OpenKB',
      }
    }
  }

  /**
   * 获取 OpenKB 状态
   */
  async getStatus(): Promise<{
    success: boolean
    status?: {
      initialized: boolean
      documentCount: number
      wikiReady: boolean
    }
    error?: string
  }> {
    try {
      logger.info('[OpenKBSandbox] Getting OpenKB status...')

      const response = await fetch(`${this.config.apiEndpoint}/init`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      return {
        success: true,
        status: result.status,
      }
    } catch (error) {
      logger.error('[OpenKBSandbox] Failed to get status:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get status',
      }
    }
  }

  /**
   * 获取 OpenKB 配置
   */
  async getConfig(): Promise<{
    success: boolean
    config?: {
      model: string
      ollamaBaseUrl: string
      openaiBaseUrl?: string
      openaiApiKey?: string
      timeout: number
    }
    supportedModels?: Array<{
      value: string
      label: string
      provider: string
    }>
    error?: string
  }> {
    try {
      logger.info('[OpenKBSandbox] Getting OpenKB config...')

      const response = await fetch(`${this.config.apiEndpoint}/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      return {
        success: true,
        config: result.config,
        supportedModels: result.supportedModels,
      }
    } catch (error) {
      logger.error('[OpenKBSandbox] Failed to get config:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get config',
      }
    }
  }

  /**
   * 保存 OpenKB 配置
   */
  async saveConfig(config: {
    model: string
    ollamaBaseUrl: string
    openaiBaseUrl?: string
    openaiApiKey?: string
    timeout: number
  }): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      logger.info('[OpenKBSandbox] Saving OpenKB config:', config)

      const response = await fetch(`${this.config.apiEndpoint}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()

      return {
        success: true,
        message: result.message,
      }
    } catch (error) {
      logger.error('[OpenKBSandbox] Failed to save config:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save config',
      }
    }
  }
}

// 导出单例实例
export const openKBSandboxService = new OpenKBSandboxService()
