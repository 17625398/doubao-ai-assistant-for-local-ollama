import { logger } from '../utils/logger'
import {
  pageIndexService,
  PageIndexTree,
  PageIndexSearchResult,
  PageIndexConfig,
  ChunkingStrategy,
} from './page-index-service'

// 检测运行环境
const isNodeEnvironment = typeof process !== 'undefined' && process.versions?.node

// 动态导入 Node.js 模块（仅在 Node 环境中）
let spawn: any
let execAsync: any
let path: any

if (isNodeEnvironment) {
  try {
    const childProcess = require('child_process')
    const util = require('util')
    path = require('path')
    spawn = childProcess.spawn
    execAsync = util.promisify(childProcess.exec)
  } catch (e) {
    logger.warn('[OpenKBService] Failed to load Node.js modules:', e)
  }
}

export interface OpenKBAddResult {
  success: boolean
  documentId?: string
  summaryPath?: string
  error?: string
}

export interface OpenKBQueryResult {
  success: boolean
  answer?: string
  sources?: string[]
  error?: string
}

export interface OpenKBChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
  sources?: string[] // 知识库来源
}

export interface OpenKBChatResult {
  success: boolean
  message?: OpenKBChatMessage // 当前回复消息
  messages?: OpenKBChatMessage[] // 完整会话历史
  sessionId?: string
  error?: string
}

export interface OpenKBChatSession {
  sessionId: string
  messages: OpenKBChatMessage[]
  createdAt: number
  updatedAt: number
  metadata?: {
    title?: string
    description?: string
    documentCount?: number
  }
}

export interface OpenKBChatOptions {
  sessionId?: string
  systemPrompt?: string
  maxHistory?: number // 最大历史消息数
  includeSources?: boolean // 是否包含知识库来源
  temperature?: number
  stream?: boolean // 是否流式输出
}

export interface OpenKBStatus {
  initialized: boolean
  documentCount: number
  wikiReady: boolean
}

export class OpenKBService {
  private knowledgeBasePath: string
  private isInitialized: boolean = false
  private isNodeEnv: boolean
  private chatSessions: Map<string, OpenKBChatSession> = new Map()
  private watchProcessId: number | null = null
  private readonly DEFAULT_MAX_HISTORY = 20
  private readonly DEFAULT_SYSTEM_PROMPT = `你是一个基于知识库的AI助手。你的回答应该：
1. 基于提供的知识库内容
2. 如果知识库中没有相关信息，明确告知用户
3. 引用相关的知识库来源
4. 保持友好和专业的语气`

  /**
   * 获取 openkb 命令的完整路径
   */
  private getOpenKBCommand(): string {
    // 在 Windows 上，尝试找到 openkb 的完整路径
    if (process.platform === 'win32') {
      // 尝试从环境变量获取 Python Scripts 路径
      const envPaths = (process.env.PATH || '').split(';')

      // 常见的 Python 虚拟环境路径
      const possiblePaths = [
        'D:\\ks\\.venv\\Scripts\\openkb.exe',
        'D:\\ks\\.venv\\Scripts\\openkb',
        path.join(process.env.USERPROFILE || '', '.venv', 'Scripts', 'openkb.exe'),
        path.join(process.env.USERPROFILE || '', '.venv', 'Scripts', 'openkb'),
        path.join(
          process.env.LOCALAPPDATA || '',
          'Programs',
          'Python',
          'Python313',
          'Scripts',
          'openkb.exe'
        ),
        path.join(
          process.env.LOCALAPPDATA || '',
          'Programs',
          'Python',
          'Python312',
          'Scripts',
          'openkb.exe'
        ),
        path.join(
          process.env.LOCALAPPDATA || '',
          'Programs',
          'Python',
          'Python311',
          'Scripts',
          'openkb.exe'
        ),
        'openkb', // 如果 PATH 中有，直接使用
        'openkb.exe',
      ]

      for (const cmdPath of possiblePaths) {
        try {
          if (cmdPath === 'openkb' || cmdPath === 'openkb.exe') {
            return cmdPath
          }
          if (require('fs').existsSync(cmdPath)) {
            logger.info('[OpenKBService] Found openkb at:', cmdPath)
            return cmdPath
          }
        } catch (e) {
          // 继续尝试下一个路径
        }
      }
    }

    return 'openkb'
  }

  constructor(knowledgeBasePath?: string) {
    this.isNodeEnv = typeof process !== 'undefined' && !!process.versions?.node

    if (this.isNodeEnv && path) {
      this.knowledgeBasePath = knowledgeBasePath || path.join(process.cwd(), 'knowledge-base')
      this.checkInitialization()
    } else {
      this.knowledgeBasePath = knowledgeBasePath || ''
      this.isInitialized = false
    }
  }

  private async checkInitialization(): Promise<void> {
    if (!this.isNodeEnv || !path) {
      this.isInitialized = false
      return
    }
    try {
      const configPath = path.join(this.knowledgeBasePath, '.openkb', 'config.yaml')
      const fs = await import('fs')
      this.isInitialized = fs.existsSync(configPath)
    } catch (error) {
      logger.error('[OpenKBService] Failed to check initialization:', error)
      this.isInitialized = false
    }
  }

  /**
   * Initialize OpenKB knowledge base
   */
  async init(): Promise<boolean> {
    if (!this.isNodeEnv || !execAsync) {
      const error = new Error('OpenKB operations are only available in Node.js environment')
      logger.error('[OpenKBService]', error.message)
      throw error
    }

    try {
      logger.info('[OpenKBService] Initializing OpenKB knowledge base...')
      logger.info('[OpenKBService] Knowledge base path:', this.knowledgeBasePath)

      // 确保知识库目录存在
      const fs = await import('fs')
      if (!fs.existsSync(this.knowledgeBasePath)) {
        logger.info('[OpenKBService] Creating knowledge base directory:', this.knowledgeBasePath)
        fs.mkdirSync(this.knowledgeBasePath, { recursive: true })
      }

      const openkbCmd = this.getOpenKBCommand()
      logger.info('[OpenKBService] Using openkb command:', openkbCmd)

      // 检查 openkb 命令是否存在（使用 where 命令）
      try {
        const { stdout: whereOutput } = await execAsync(`where openkb`, { timeout: 5000 })
        logger.info('[OpenKBService] Found openkb using where:', whereOutput.trim())
      } catch (whereError) {
        logger.warn('[OpenKBService] where openkb failed, trying direct path:', whereError)
      }

      // 设置环境变量，确保能找到 openkb
      // 设置默认模型，避免交互式提示
      const env = {
        ...process.env,
        PATH: `D:\\ks\\.venv\\Scripts;${process.env.PATH}`,
        OPENKB_MODEL: process.env.OPENKB_MODEL || 'ollama/qwen3.6',
        OPENKB_OLLAMA_BASE_URL: process.env.OPENKB_OLLAMA_BASE_URL || 'http://192.168.0.32:11434',
      }

      // 首先创建配置文件避免交互式提示（复用上面已导入的 fs）
      const configDir = path.join(this.knowledgeBasePath, '.openkb')
      const configPath = path.join(configDir, 'config.yaml')

      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
      }

      // 如果配置文件不存在，创建默认配置
      if (!fs.existsSync(configPath)) {
        const defaultConfig = `# OpenKB Configuration
model: ollama/qwen3.6
ollama_base_url: http://192.168.0.32:11434
`
        fs.writeFileSync(configPath, defaultConfig, 'utf-8')
        logger.info('[OpenKBService] Created default config at:', configPath)
      }

      let stdout = ''
      let stderr = ''

      try {
        // 使用 echo 管道提供默认答案，避免交互式提示
        const result = await execAsync(`echo "" | "${openkbCmd}" init`, {
          timeout: 60000,
          cwd: this.knowledgeBasePath,
          env,
        })
        stdout = result.stdout
        stderr = result.stderr
      } catch (execError: any) {
        logger.error('[OpenKBService] Exec error details:', {
          message: execError.message,
          stdout: execError.stdout,
          stderr: execError.stderr,
          code: execError.code,
          cmd: execError.cmd,
        })

        // 检查是否是 "already initialized" 的错误
        const errorOutput = (execError.stderr || '') + (execError.stdout || '')
        if (
          errorOutput.includes('already initialized') ||
          errorOutput.includes('Knowledge base already initialized')
        ) {
          logger.info('[OpenKBService] Knowledge base already initialized')
          this.isInitialized = true
          return true
        }

        // 其他错误，包装后抛出
        const wrappedError = new Error(
          `OpenKB init failed: ${execError.message}. Stderr: ${execError.stderr || 'N/A'}. Stdout: ${execError.stdout || 'N/A'}`
        )
        throw wrappedError
      }

      logger.info('[OpenKBService] Init stdout:', stdout)
      if (
        stderr &&
        !stderr.includes('already initialized') &&
        !stderr.includes('Knowledge base already initialized')
      ) {
        logger.warn('[OpenKBService] Init warning:', stderr)
      }

      this.isInitialized = true
      logger.info('[OpenKBService] OpenKB initialized successfully')
      return true
    } catch (error) {
      logger.error('[OpenKBService] Failed to initialize OpenKB:', error)
      if (error instanceof Error) {
        logger.error('[OpenKBService] Error message:', error.message)
        logger.error('[OpenKBService] Error stack:', error.stack)
      }
      throw error
    }
  }

  /**
   * Add document to knowledge base
   */
  async addDocument(filePath: string): Promise<OpenKBAddResult> {
    if (!this.isNodeEnv || !execAsync) {
      return {
        success: false,
        error: 'OpenKB operations are only available in Node.js environment',
      }
    }

    try {
      if (!this.isInitialized) {
        await this.init()
      }

      logger.info('[OpenKBService] Adding document to knowledge base:', filePath)

      // 确保 raw 目录存在
      const fs = await import('fs')
      const path = await import('path')
      const rawDir = path.join(this.knowledgeBasePath, 'raw')
      if (!fs.existsSync(rawDir)) {
        fs.mkdirSync(rawDir, { recursive: true })
      }

      // 复制文件到 raw 目录
      const fileName = path.basename(filePath)
      const destPath = path.join(rawDir, fileName)
      fs.copyFileSync(filePath, destPath)
      logger.info('[OpenKBService] File copied to raw directory:', destPath)

      // 使用相对路径调用 openkb add
      const openkbCmd = this.getOpenKBCommand()
      const relativePath = path.join('raw', fileName)

      // 设置环境变量，确保能找到 openkb
      const env = {
        ...process.env,
        PATH: `D:\\ks\\.venv\\Scripts;${process.env.PATH}`,
      }

      const { stdout, stderr } = await execAsync(
        `"${openkbCmd}" add "${relativePath}"`,
        { timeout: 300000, cwd: this.knowledgeBasePath, env } // 5 minutes timeout for large documents
      )

      if (stderr) {
        logger.warn('[OpenKBService] Add document warning:', stderr)
      }

      logger.info('[OpenKBService] OpenKB add output:', stdout)

      // Parse output to extract document ID and summary path
      const documentId = this.extractDocumentId(stdout) || fileName
      const summaryPath = this.extractSummaryPath(stdout)

      logger.info('[OpenKBService] Document added successfully:', documentId)

      // 自动执行 build 生成 wiki 页面
      try {
        logger.info('[OpenKBService] Building wiki pages...')
        const { stdout: buildStdout, stderr: buildStderr } = await execAsync(
          `"${openkbCmd}" build`,
          { timeout: 300000, cwd: this.knowledgeBasePath, env }
        )
        if (buildStderr) {
          logger.warn('[OpenKBService] Build warning:', buildStderr)
        }
        logger.info('[OpenKBService] Build output:', buildStdout)
      } catch (buildError) {
        logger.warn('[OpenKBService] Build failed (non-critical):', buildError)
        // 构建失败不阻止返回成功，因为文档已经添加
      }

      return {
        success: true,
        documentId,
        summaryPath,
      }
    } catch (error) {
      logger.error('[OpenKBService] Failed to add document:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Query knowledge base
   */
  async query(question: string): Promise<OpenKBQueryResult> {
    if (!this.isNodeEnv || !execAsync) {
      return {
        success: false,
        error: 'OpenKB operations are only available in Node.js environment',
      }
    }

    try {
      if (!this.isInitialized) {
        return {
          success: false,
          error: 'Knowledge base not initialized',
        }
      }

      logger.info('[OpenKBService] Querying knowledge base:', question)

      const openkbCmd = this.getOpenKBCommand()

      // 设置环境变量，确保能找到 openkb
      const env = {
        ...process.env,
        PATH: `D:\\ks\\.venv\\Scripts;${process.env.PATH}`,
      }

      const { stdout, stderr } = await execAsync(
        `"${openkbCmd}" query "${question}"`,
        { timeout: 120000, cwd: this.knowledgeBasePath, env } // 2 minutes timeout
      )

      if (stderr) {
        logger.warn('[OpenKBService] Query warning:', stderr)
      }

      // Parse output to extract answer and sources
      const { answer, sources } = this.parseQueryOutput(stdout)

      return {
        success: true,
        answer,
        sources,
      }
    } catch (error) {
      logger.error('[OpenKBService] Failed to query:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Chat with knowledge base (基础版本 - 兼容原有接口)
   */
  async chat(message: string, sessionId?: string): Promise<OpenKBChatResult> {
    return this.chatWithKnowledgeBase(message, { sessionId })
  }

  /**
   * 基于知识库的聊天对话（增强版本）
   * 支持会话历史、系统提示词、知识库来源引用
   */
  async chatWithKnowledgeBase(
    message: string,
    options: OpenKBChatOptions = {}
  ): Promise<OpenKBChatResult> {
    if (!this.isNodeEnv || !execAsync) {
      return {
        success: false,
        error: 'OpenKB operations are only available in Node.js environment',
      }
    }

    try {
      if (!this.isInitialized) {
        return {
          success: false,
          error: 'Knowledge base not initialized',
        }
      }

      const {
        sessionId = this.generateSessionId(),
        systemPrompt = this.DEFAULT_SYSTEM_PROMPT,
        maxHistory = this.DEFAULT_MAX_HISTORY,
        includeSources = true,
      } = options

      logger.info('[OpenKBService] Chatting with knowledge base:', { message, sessionId })

      // 获取或创建会话
      let session = this.chatSessions.get(sessionId)
      if (!session) {
        session = {
          sessionId,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        this.chatSessions.set(sessionId, session)
      }

      // 先查询知识库获取相关信息
      const queryResult = await this.query(message)
      const relevantContext =
        queryResult.success && queryResult.answer
          ? `\n\n[知识库相关信息]:\n${queryResult.answer}\n\n[来源]: ${queryResult.sources?.join(', ') || '未知'}`
          : ''

      // 构建带知识库上下文的用户消息
      const userMessageWithContext = relevantContext
        ? `${message}\n\n---\n${relevantContext}`
        : message

      // 添加用户消息到会话
      const userMessage: OpenKBChatMessage = {
        role: 'user',
        content: message, // 保存原始消息，不包含上下文
        timestamp: Date.now(),
      }
      session.messages.push(userMessage)

      // 构建完整的消息历史用于生成回复
      const messagesForLLM = this.buildMessagesForLLM(session, systemPrompt, maxHistory)

      // 调用 openkb chat 命令
      const openkbCmd = this.getOpenKBCommand()
      const messagesJson = JSON.stringify(messagesForLLM).replace(/"/g, '\\"')
      const command = `"${openkbCmd}" chat "${userMessageWithContext.replace(/"/g, '\\"')}" --session ${sessionId} --format json`

      // 设置环境变量，确保能找到 openkb
      const env = {
        ...process.env,
        PATH: `D:\\ks\\.venv\\Scripts;${process.env.PATH}`,
      }

      const { stdout, stderr } = await execAsync(command, {
        timeout: 120000,
        cwd: this.knowledgeBasePath,
        env,
      })

      if (stderr && !stderr.includes('warning')) {
        logger.warn('[OpenKBService] Chat warning:', stderr)
      }

      // 解析 AI 回复
      const assistantContent = this.extractAssistantResponse(stdout)
      const sources = includeSources ? queryResult.sources : undefined

      // 添加助手回复到会话
      const assistantMessage: OpenKBChatMessage = {
        role: 'assistant',
        content: assistantContent,
        timestamp: Date.now(),
        sources,
      }
      session.messages.push(assistantMessage)
      session.updatedAt = Date.now()

      // 限制历史消息数量
      if (session.messages.length > maxHistory * 2) {
        session.messages = session.messages.slice(-maxHistory * 2)
      }

      return {
        success: true,
        message: assistantMessage,
        messages: [...session.messages],
        sessionId,
      }
    } catch (error) {
      logger.error('[OpenKBService] Failed to chat with knowledge base:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 获取会话历史
   */
  getChatSession(sessionId: string): OpenKBChatSession | null {
    return this.chatSessions.get(sessionId) || null
  }

  /**
   * 获取所有会话列表
   */
  getAllChatSessions(): OpenKBChatSession[] {
    return Array.from(this.chatSessions.values()).sort((a, b) => b.updatedAt - a.updatedAt)
  }

  /**
   * 删除会话
   */
  deleteChatSession(sessionId: string): boolean {
    return this.chatSessions.delete(sessionId)
  }

  /**
   * 清空会话历史
   */
  clearChatSession(sessionId: string): boolean {
    const session = this.chatSessions.get(sessionId)
    if (session) {
      session.messages = []
      session.updatedAt = Date.now()
      return true
    }
    return false
  }

  /**
   * 创建新会话
   */
  createChatSession(options: { title?: string; systemPrompt?: string } = {}): OpenKBChatSession {
    const sessionId = this.generateSessionId()
    const session: OpenKBChatSession = {
      sessionId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {
        title: options.title || '新对话',
        description: options.systemPrompt?.slice(0, 100),
      },
    }
    this.chatSessions.set(sessionId, session)
    logger.info(`[OpenKBService] Created chat session: ${sessionId}`)
    return session
  }

  /**
   * 更新会话信息
   */
  updateChatSession(sessionId: string, updates: { title?: string }): OpenKBChatSession | null {
    const session = this.chatSessions.get(sessionId)
    if (session) {
      if (updates.title) {
        session.metadata = { ...session.metadata, title: updates.title }
      }
      session.updatedAt = Date.now()
      return session
    }
    return null
  }

  /**
   * 列出所有会话（按更新时间排序）
   */
  listChatSessions(): OpenKBChatSession[] {
    return this.getAllChatSessions()
  }

  /**
   * 清除所有会话
   */
  clearAllChatSessions(): void {
    this.chatSessions.clear()
    logger.info('[OpenKBService] All chat sessions cleared')
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 构建用于 LLM 的消息列表
   */
  private buildMessagesForLLM(
    session: OpenKBChatSession,
    systemPrompt: string,
    maxHistory: number
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = []

    // 添加系统提示词
    messages.push({
      role: 'system',
      content: systemPrompt,
    })

    // 添加历史消息（限制数量）
    const recentMessages = session.messages.slice(-maxHistory)
    for (const msg of recentMessages) {
      if (msg.role !== 'system') {
        messages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    }

    return messages
  }

  /**
   * 从输出中提取助手回复
   */
  private extractAssistantResponse(output: string): string {
    // 尝试解析 JSON 格式
    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.response || parsed.message || parsed.content) {
          return parsed.response || parsed.message || parsed.content
        }
      }
    } catch {
      // 不是 JSON 格式，继续尝试其他方式
    }

    // 尝试提取 Assistant: 开头的行
    const lines = output.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('Assistant:')) {
        return lines[i].replace('Assistant:', '').trim()
      }
    }

    // 返回整个输出作为回复
    return output.trim()
  }

  /**
   * Get knowledge base status
   */
  async getStatus(): Promise<OpenKBStatus> {
    if (!this.isNodeEnv || !path) {
      return {
        initialized: false,
        documentCount: 0,
        wikiReady: false,
      }
    }

    try {
      const fs = await import('fs')
      const wikiPath = path.join(this.knowledgeBasePath, 'wiki')

      let documentCount = 0
      if (fs.existsSync(wikiPath)) {
        const files = fs.readdirSync(wikiPath)
        documentCount = files.filter(f => f.endsWith('.md')).length
      }

      return {
        initialized: this.isInitialized,
        documentCount,
        wikiReady: fs.existsSync(path.join(wikiPath, 'index.md')),
      }
    } catch (error) {
      logger.error('[OpenKBService] Failed to get status:', error)
      return {
        initialized: false,
        documentCount: 0,
        wikiReady: false,
      }
    }
  }

  /**
   * Get wiki content
   */
  async getWikiContent(pageName: string = 'index'): Promise<string | null> {
    if (!this.isNodeEnv || !path) {
      return null
    }

    try {
      const fs = await import('fs')
      const pagePath = path.join(this.knowledgeBasePath, 'wiki', `${pageName}.md`)

      if (!fs.existsSync(pagePath)) {
        return null
      }

      return fs.readFileSync(pagePath, 'utf-8')
    } catch (error) {
      logger.error('[OpenKBService] Failed to get wiki content:', error)
      return null
    }
  }

  /**
   * List all wiki pages
   */
  async listWikiPages(): Promise<string[]> {
    if (!this.isNodeEnv || !path) {
      return []
    }

    try {
      const fs = await import('fs')
      const wikiPath = path.join(this.knowledgeBasePath, 'wiki')

      if (!fs.existsSync(wikiPath)) {
        return []
      }

      const files = fs.readdirSync(wikiPath)
      return files.filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
    } catch (error) {
      logger.error('[OpenKBService] Failed to list wiki pages:', error)
      return []
    }
  }

  // Helper methods
  private extractDocumentId(output: string): string | undefined {
    // 尝试多种可能的输出格式
    const patterns = [/Document ID: ([\w-]+)/, /Added:\s*(.+)/, /Processing:\s*(.+)/, /→\s*(.+)/]
    for (const pattern of patterns) {
      const match = output.match(pattern)
      if (match?.[1]) return match[1].trim()
    }
    return undefined
  }

  private extractSummaryPath(output: string): string | undefined {
    const patterns = [/Summary:\s*(.+)/, /wiki[\/\\]summaries[\/\\](.+)/]
    for (const pattern of patterns) {
      const match = output.match(pattern)
      if (match?.[1]) return match[1].trim()
    }
    return undefined
  }

  private parseQueryOutput(output: string): { answer: string; sources: string[] } {
    const lines = output.split('\n')
    let answer = ''
    const sources: string[] = []
    let inAnswer = false

    for (const line of lines) {
      if (line.startsWith('Answer:')) {
        inAnswer = true
        answer = line.replace('Answer:', '').trim()
      } else if (line.startsWith('Sources:')) {
        inAnswer = false
      } else if (inAnswer) {
        answer += '\n' + line
      } else if (line.trim().startsWith('-')) {
        sources.push(line.trim().substring(1).trim())
      }
    }

    return { answer: answer.trim(), sources }
  }

  private parseChatOutput(output: string): OpenKBChatMessage[] {
    const messages: OpenKBChatMessage[] = []
    const lines = output.split('\n')

    for (const line of lines) {
      if (line.startsWith('User:')) {
        messages.push({
          role: 'user',
          content: line.replace('User:', '').trim(),
        })
      } else if (line.startsWith('Assistant:')) {
        messages.push({
          role: 'assistant',
          content: line.replace('Assistant:', '').trim(),
        })
      }
    }

    return messages
  }

  // ==================== PageIndex 功能 ====================

  /**
   * 检查文档是否需要使用 PageIndex
   */
  shouldUsePageIndex(pageCount: number): boolean {
    return pageIndexService.shouldUsePageIndex(pageCount)
  }

  /**
   * 为长文档构建 PageIndex 索引
   */
  async buildPageIndex(
    documentId: string,
    documentTitle: string,
    pages: { index: number; content: string; text: string }[],
    metadata?: { wordCount?: number; imageCount?: number; tableCount?: number }
  ): Promise<PageIndexTree | null> {
    if (!this.isNodeEnv) {
      logger.warn('[OpenKBService] PageIndex is only available in Node.js environment')
      return null
    }

    try {
      logger.info('[OpenKBService] Building PageIndex for:', documentTitle)

      const tree = await pageIndexService.buildIndexTree(documentId, documentTitle, pages, metadata)

      logger.info('[OpenKBService] PageIndex built successfully')
      return tree
    } catch (error) {
      logger.error('[OpenKBService] Failed to build PageIndex:', error)
      return null
    }
  }

  /**
   * 使用 PageIndex 检索文档
   */
  async searchWithPageIndex(
    documentId: string,
    query: string,
    maxResults?: number
  ): Promise<PageIndexSearchResult[]> {
    if (!this.isNodeEnv) {
      return []
    }

    try {
      logger.info('[OpenKBService] Searching with PageIndex:', query)

      const results = await pageIndexService.search(documentId, query, {
        maxResults: maxResults || 5,
        minRelevance: 0.3,
        includeContext: true,
        contextPages: 2,
      })

      return results
    } catch (error) {
      logger.error('[OpenKBService] PageIndex search failed:', error)
      return []
    }
  }

  /**
   * 获取 PageIndex 树概览
   */
  getPageIndexOverview(documentId: string): { title: string; structure: string } | null {
    return pageIndexService.getTreeOverview(documentId)
  }

  /**
   * 使用 PageIndex 增强查询
   * 对于长文档，先使用 PageIndex 定位相关章节，再查询
   */
  async queryWithPageIndex(question: string, documentId?: string): Promise<OpenKBQueryResult> {
    if (!this.isNodeEnv) {
      return {
        success: false,
        error: 'PageIndex is only available in Node.js environment',
      }
    }

    try {
      // 如果有指定文档ID，先使用 PageIndex 检索
      if (documentId) {
        const pageIndexResults = await this.searchWithPageIndex(documentId, question, 3)

        if (pageIndexResults.length > 0) {
          // 构建基于 PageIndex 的上下文
          const context = pageIndexResults
            .map(
              r =>
                `[${r.node.title} (Pages ${r.node.pageRange.start + 1}-${r.node.pageRange.end + 1})]:\n${r.node.summary}`
            )
            .join('\n\n')

          // 使用增强的上下文进行查询
          const enhancedQuestion = `基于以下文档内容回答问题：\n\n${context}\n\n问题：${question}`

          const result = await this.query(enhancedQuestion)

          if (result.success) {
            // 添加 PageIndex 来源信息
            const sources = pageIndexResults.map(
              r =>
                `${r.node.title} (Pages ${r.node.pageRange.start + 1}-${r.node.pageRange.end + 1})`
            )

            return {
              ...result,
              sources: [...(result.sources || []), ...sources],
            }
          }
        }
      }

      // 回退到普通查询
      return await this.query(question)
    } catch (error) {
      logger.error('[OpenKBService] Query with PageIndex failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 启动 Watch 模式
   * 监控 raw/ 目录文件变化并自动编译
   */
  async startWatch(interval: number = 30): Promise<{ success: boolean; error?: string }> {
    if (!this.isNodeEnv || !execAsync) {
      return { success: false, error: 'Watch mode is only available in Node.js environment' }
    }

    try {
      logger.info(`[OpenKBService] Starting watch mode with interval: ${interval}s`)

      const openkbCmd = this.getOpenKBCommand()

      // 使用 spawn 启动 watch 进程
      const watchProcess = spawn(openkbCmd, ['watch', '--interval', interval.toString()], {
        cwd: this.knowledgeBasePath,
        detached: true,
        stdio: 'pipe',
      })

      // 存储进程 ID 以便后续停止
      this.watchProcessId = watchProcess.pid

      watchProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString()
        logger.info('[OpenKBService] Watch output:', output)
      })

      watchProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString()
        logger.warn('[OpenKBService] Watch stderr:', output)
      })

      watchProcess.on('close', (code: number) => {
        logger.info(`[OpenKBService] Watch process exited with code: ${code}`)
        this.watchProcessId = null
      })

      logger.info(`[OpenKBService] Watch mode started with PID: ${watchProcess.pid}`)
      return { success: true }
    } catch (error) {
      logger.error('[OpenKBService] Failed to start watch mode:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start watch mode',
      }
    }
  }

  /**
   * 停止 Watch 模式
   */
  async stopWatch(): Promise<{ success: boolean; error?: string }> {
    if (!this.isNodeEnv) {
      return { success: false, error: 'Watch mode is only available in Node.js environment' }
    }

    try {
      if (this.watchProcessId) {
        logger.info(`[OpenKBService] Stopping watch process: ${this.watchProcessId}`)

        // 在 Windows 上使用 taskkill，在 Unix 上使用 kill
        const isWindows = process.platform === 'win32'
        const killCmd = isWindows
          ? `taskkill /PID ${this.watchProcessId} /T /F`
          : `kill -TERM ${this.watchProcessId}`

        await execAsync(killCmd)
        this.watchProcessId = null

        logger.info('[OpenKBService] Watch mode stopped')
        return { success: true }
      }

      // 如果没有记录的进程 ID，尝试通过命令停止
      const openkbCmd = this.getOpenKBCommand()
      try {
        await execAsync(`"${openkbCmd}" watch --stop`, { cwd: this.knowledgeBasePath })
        logger.info('[OpenKBService] Watch mode stopped via command')
        return { success: true }
      } catch (e) {
        // 可能 watch 没有在运行
        return { success: true, error: 'Watch mode was not running' }
      }
    } catch (error) {
      logger.error('[OpenKBService] Failed to stop watch mode:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop watch mode',
      }
    }
  }

  /**
   * 检查 Watch 模式状态
   */
  async isWatchRunning(): Promise<{ running: boolean; pid?: number }> {
    if (!this.isNodeEnv || !this.watchProcessId) {
      return { running: false }
    }

    try {
      // 检查进程是否存在
      const isWindows = process.platform === 'win32'
      const checkCmd = isWindows
        ? `tasklist /FI "PID eq ${this.watchProcessId}" /NH`
        : `ps -p ${this.watchProcessId} -o pid=`

      const { stdout } = await execAsync(checkCmd)
      const isRunning = stdout.includes(this.watchProcessId.toString())

      if (!isRunning) {
        this.watchProcessId = null
      }

      return { running: isRunning, pid: this.watchProcessId || undefined }
    } catch (error) {
      this.watchProcessId = null
      return { running: false }
    }
  }

  /**
   * 获取 PageIndex 配置
   */
  getPageIndexConfig(): PageIndexConfig {
    return {
      threshold: 20,
      maxDepth: 4,
      maxPagesPerNode: 50,
      minPagesPerNode: 5,
      generateSummaries: true,
      extractConcepts: true,
      enableMultimodal: true,
      enableSemanticSearch: true,
      chunkingStrategy: ChunkingStrategy.HYBRID,
      enablePersistence: true,
    }
  }

  /**
   * 运行 Lint 检查
   * 检查知识库的健康状况
   */
  async lint(): Promise<{
    success: boolean
    report?: {
      contradictions: Array<{
        page1: string
        page2: string
        description: string
        severity: 'high' | 'medium' | 'low'
      }>
      orphans: Array<{
        page: string
        reason: string
      }>
      gaps: Array<{
        concept: string
        suggestedPages: string[]
      }>
      stale: Array<{
        page: string
        lastUpdated: string
        daysOld: number
      }>
      brokenLinks: Array<{
        page: string
        brokenLink: string
      }>
    }
    summary?: {
      totalPages: number
      totalIssues: number
      criticalIssues: number
      warningIssues: number
      infoIssues: number
    }
    error?: string
  }> {
    if (!this.isNodeEnv || !execAsync) {
      return { success: false, error: 'Lint is only available in Node.js environment' }
    }

    try {
      logger.info('[OpenKBService] Running lint check...')

      const openkbCmd = this.getOpenKBCommand()

      // 设置环境变量
      const env = {
        ...process.env,
        PATH: `D:\\ks\\.venv\\Scripts;${process.env.PATH}`,
      }

      // 运行 openkb lint 命令
      const { stdout, stderr } = await execAsync(`"${openkbCmd}" lint --format json`, {
        timeout: 120000,
        cwd: this.knowledgeBasePath,
        env,
      })

      if (stderr && !stderr.includes('warning')) {
        logger.warn('[OpenKBService] Lint warning:', stderr)
      }

      // 尝试解析 JSON 输出
      try {
        const lintResult = JSON.parse(stdout)
        logger.info('[OpenKBService] Lint completed:', lintResult)
        return {
          success: true,
          report: lintResult.report || this.parseLintOutput(stdout),
          summary: lintResult.summary || this.generateLintSummary(lintResult.report),
        }
      } catch (e) {
        // 如果不是 JSON，解析文本输出
        const report = this.parseLintOutput(stdout)
        const summary = this.generateLintSummary(report)
        return {
          success: true,
          report,
          summary,
        }
      }
    } catch (error) {
      logger.error('[OpenKBService] Lint failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Lint check failed',
      }
    }
  }

  /**
   * 解析 Lint 文本输出
   */
  private parseLintOutput(output: string): {
    contradictions: Array<{
      page1: string
      page2: string
      description: string
      severity: 'high' | 'medium' | 'low'
    }>
    orphans: Array<{ page: string; reason: string }>
    gaps: Array<{ concept: string; suggestedPages: string[] }>
    stale: Array<{ page: string; lastUpdated: string; daysOld: number }>
    brokenLinks: Array<{ page: string; brokenLink: string }>
  } {
    const report = {
      contradictions: [] as Array<{
        page1: string
        page2: string
        description: string
        severity: 'high' | 'medium' | 'low'
      }>,
      orphans: [] as Array<{ page: string; reason: string }>,
      gaps: [] as Array<{ concept: string; suggestedPages: string[] }>,
      stale: [] as Array<{ page: string; lastUpdated: string; daysOld: number }>,
      brokenLinks: [] as Array<{ page: string; brokenLink: string }>,
    }

    const lines = output.split('\n')
    let currentSection = ''

    for (const line of lines) {
      const trimmedLine = line.trim()

      // 检测部分标题
      if (trimmedLine.includes('Contradiction') || trimmedLine.includes('矛盾')) {
        currentSection = 'contradictions'
        continue
      }
      if (trimmedLine.includes('Orphan') || trimmedLine.includes('孤立')) {
        currentSection = 'orphans'
        continue
      }
      if (trimmedLine.includes('Gap') || trimmedLine.includes('缺失')) {
        currentSection = 'gaps'
        continue
      }
      if (trimmedLine.includes('Stale') || trimmedLine.includes('过期')) {
        currentSection = 'stale'
        continue
      }
      if (trimmedLine.includes('Broken Link') || trimmedLine.includes('断链')) {
        currentSection = 'brokenLinks'
        continue
      }

      // 解析具体内容
      if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
        const content = trimmedLine.substring(1).trim()

        switch (currentSection) {
          case 'contradictions':
            const contraMatch = content.match(/(.+?)\s*vs\s*(.+?):\s*(.+)/)
            if (contraMatch) {
              report.contradictions.push({
                page1: contraMatch[1].trim(),
                page2: contraMatch[2].trim(),
                description: contraMatch[3].trim(),
                severity: 'medium',
              })
            }
            break

          case 'orphans':
            const orphanMatch = content.match(/(.+?)\s*[-:]\s*(.+)/)
            if (orphanMatch) {
              report.orphans.push({
                page: orphanMatch[1].trim(),
                reason: orphanMatch[2].trim(),
              })
            }
            break

          case 'gaps':
            report.gaps.push({
              concept: content,
              suggestedPages: [],
            })
            break

          case 'stale':
            const staleMatch = content.match(/(.+?)\s*\((.+?)\)/)
            if (staleMatch) {
              report.stale.push({
                page: staleMatch[1].trim(),
                lastUpdated: staleMatch[2].trim(),
                daysOld: 30,
              })
            }
            break

          case 'brokenLinks':
            const brokenMatch = content.match(/(.+?)\s*->\s*(.+)/)
            if (brokenMatch) {
              report.brokenLinks.push({
                page: brokenMatch[1].trim(),
                brokenLink: brokenMatch[2].trim(),
              })
            }
            break
        }
      }
    }

    return report
  }

  /**
   * 生成 Lint 摘要
   */
  private generateLintSummary(report: any): {
    totalPages: number
    totalIssues: number
    criticalIssues: number
    warningIssues: number
    infoIssues: number
  } {
    const contradictions = report?.contradictions?.length || 0
    const orphans = report?.orphans?.length || 0
    const gaps = report?.gaps?.length || 0
    const stale = report?.stale?.length || 0
    const brokenLinks = report?.brokenLinks?.length || 0

    return {
      totalPages: 0,
      totalIssues: contradictions + orphans + gaps + stale + brokenLinks,
      criticalIssues: contradictions,
      warningIssues: orphans + brokenLinks,
      infoIssues: gaps + stale,
    }
  }

  /**
   * 修复 Lint 发现的问题
   */
  async fixLintIssues(
    fixType?: 'contradictions' | 'orphans' | 'gaps' | 'stale' | 'brokenLinks' | 'all',
    pageName?: string
  ): Promise<{ success: boolean; message?: string; fixed?: number; error?: string }> {
    if (!this.isNodeEnv || !execAsync) {
      return { success: false, error: 'Fix is only available in Node.js environment' }
    }

    try {
      logger.info('[OpenKBService] Fixing lint issues:', { fixType, pageName })

      const openkbCmd = this.getOpenKBCommand()

      // 设置环境变量
      const env = {
        ...process.env,
        PATH: `D:\\ks\\.venv\\Scripts;${process.env.PATH}`,
      }

      let command = `"${openkbCmd}" lint --fix`

      if (fixType && fixType !== 'all') {
        command += ` --fix-type ${fixType}`
      }

      if (pageName) {
        command += ` --page "${pageName}"`
      }

      const { stdout, stderr } = await execAsync(command, {
        timeout: 120000,
        cwd: this.knowledgeBasePath,
        env,
      })

      logger.info('[OpenKBService] Fix completed:', stdout)

      // 解析修复结果
      const fixedMatch = stdout.match(/Fixed\s+(\d+)\s+issues?/i)
      const fixed = fixedMatch ? parseInt(fixedMatch[1]) : 0

      return {
        success: true,
        message: `Successfully fixed ${fixed} issues`,
        fixed,
      }
    } catch (error) {
      logger.error('[OpenKBService] Fix failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fix issues',
      }
    }
  }
}

// Export singleton instance
export const openKBService = new OpenKBService()
