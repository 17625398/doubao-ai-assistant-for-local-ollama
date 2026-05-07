import { SupportedLanguage } from 'page-agent'
import { aiConfigManager } from '../utils/ai-config-manager'
import { loggerService } from './logger-service'

// 定义PageAgent类型
type PageAgent = {
  execute: (instruction: string) => Promise<any>
}

// 定义PageAgent初始化选项
export interface PageAgentOptions {
  model?: string
  baseURL?: string
  apiKey?: string
  language?: SupportedLanguage
  timeout?: number
  retryCount?: number
}

// 定义页面信息接口
export interface PageInfo {
  url: string
  title: string
  length: number
  wordCount: number
  metaDescription?: string
  metaKeywords?: string
  canonicalUrl?: string
}

export class PageAgentService {
  private agent: PageAgent | null = null
  private initialized = false
  private options: PageAgentOptions = {}
  private initializationPromise: Promise<void> | null = null

  private resolveBaseURL(baseURL?: string): string {
    const trimmedBaseURL = String(baseURL || '').trim()
    const browserOrigin = typeof window !== 'undefined' ? window.location.origin : null

    // 通过 Next.js 代理路径访问 Ollama，避免 CORS 问题
    // Next.js rewrites 会将 /api/ollama/* 转发到 Ollama 服务器

    if (
      !trimmedBaseURL ||
      trimmedBaseURL === '/api/ollama' ||
      trimmedBaseURL.startsWith('/api/ollama')
    ) {
      const proxyPath = '/api/ollama'
      loggerService.debug('Page-Agent using proxy path:', { proxyPath })
      return browserOrigin ? new URL(proxyPath, browserOrigin).toString() : proxyPath
    }

    if (trimmedBaseURL.startsWith('/')) {
      // 其他相对路径，直接使用
      return browserOrigin ? new URL(trimmedBaseURL, browserOrigin).toString() : trimmedBaseURL
    }

    // 绝对 URL - 检查是否需要转换路径
    try {
      const parsed = new URL(trimmedBaseURL)
      const pathname = parsed.pathname.replace(/\/+$/, '')

      // Ollama 代理路径转换
      if (
        pathname === '/api/ollama' ||
        pathname === '/api/ollama/api' ||
        pathname === '/api/ollama/v1'
      ) {
        parsed.pathname = '/api/ollama'
      } else if (pathname === '/v1' || pathname.endsWith('/v1')) {
        // 标准 OpenAI 兼容路径，转换为 Ollama 代理
        parsed.pathname = '/api/ollama'
      } else if (pathname === '/api' || pathname.endsWith('/api')) {
        parsed.pathname = pathname.replace(/\/api$/, '/api/ollama')
      }

      parsed.search = ''
      parsed.hash = ''
      return parsed.toString().replace(/\/$/, '')
    } catch {
      return trimmedBaseURL
    }
  }

  /**
   * 初始化 Page-Agent
   * @param options 初始化选项
   */
  async initialize(options: PageAgentOptions = {}) {
    // 如果已经初始化，直接返回
    if (this.initialized) {
      return
    }

    // 如果正在初始化，等待初始化完成
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    // 等待 AIConfigManager 配置加载完成
    await aiConfigManager.ensureLoaded()

    // 获取全局AI配置
    const config = aiConfigManager.getConfig()

    // 解析 baseURL - 优先使用 options，fallback 到配置
    const baseURL = this.resolveBaseURL(options.baseURL || config.ollama?.baseUrl)

    // 获取模型名称 - 优先使用 options，fallback 到配置的默认模型
    const model = options.model || config.ollama?.defaultModel || 'qwen3.6:latest'

    loggerService.debug('Using model:', { model })

    this.options = {
      model: model,
      baseURL: baseURL,
      apiKey: options.apiKey || 'ollama',
      language: options.language || ('zh-CN' as SupportedLanguage),
      timeout: options.timeout || config.ollama?.timeout || 300000,
      retryCount: options.retryCount || 5,
    }

    loggerService.info('Page-Agent initialized with:', {
      model: this.options.model,
      baseURL: this.options.baseURL,
    })

    // 创建初始化Promise
    this.initializationPromise = this.doInitialize()
    return this.initializationPromise
  }

  /**
   * 执行初始化操作
   */
  private async doInitialize() {
    try {
      if (typeof window === 'undefined') {
        loggerService.warn('Page-Agent only works in browser environment')
        return
      }

      const { PageAgent } = await import('page-agent')

      this.agent = new PageAgent({
        model: this.options.model || 'qwen3.6:latest',
        baseURL: this.options.baseURL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        apiKey: this.options.apiKey,
        language: this.options.language || ('zh-CN' as SupportedLanguage),
      })

      this.initialized = true
      loggerService.info('Page-Agent initialized successfully')
    } catch (error) {
      loggerService.error('Failed to initialize Page-Agent', { error })
      throw new Error(`Page-Agent initialization failed: ${(error as Error).message}`)
    } finally {
      this.initializationPromise = null
    }
  }

  /**
   * 执行自然语言指令
   * @param instruction 自然语言指令
   * @param options 执行选项
   * @returns 执行结果
   */
  async execute(
    instruction: string,
    options: { timeout?: number; retryCount?: number } = {}
  ): Promise<string> {
    // 确保Page-Agent已初始化
    if (!this.initialized) {
      await this.initialize()
    }

    if (!this.agent) {
      throw new Error('Page-Agent is not initialized')
    }

    const timeout = options.timeout || this.options.timeout || 300000 // 默认 5 分钟
    const retryCount = options.retryCount || this.options.retryCount || 5

    let lastError: Error | null = null

    // 重试机制
    for (let i = 0; i < retryCount; i++) {
      try {
        loggerService.debug(
          `Page-Agent execution attempt ${i + 1}/${retryCount}: ${instruction.substring(0, 100)}`
        )

        // 设置超时
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Execution timeout after ${timeout}ms`)), timeout)
        })

        const result = await Promise.race([this.agent.execute(instruction), timeoutPromise])

        loggerService.debug(`Page-Agent execution attempt ${i + 1} succeeded`)
        return typeof result === 'string' ? result : JSON.stringify(result)
      } catch (error) {
        lastError = error as Error
        const errorMessage = lastError.message || 'Unknown error'

        // 忽略中止错误，避免在日志中显示太多噪音
        if (
          errorMessage.includes('AbortError') ||
          errorMessage.includes('abort') ||
          errorMessage.includes('Network request aborted')
        ) {
          loggerService.warn(`Execution attempt ${i + 1}/${retryCount} was aborted, retrying...`)
        } else {
          loggerService.warn(`Execution attempt ${i + 1}/${retryCount} failed: ${errorMessage}`)
        }

        // 如果是最后一次尝试，抛出错误
        if (i === retryCount - 1) {
          loggerService.error(
            `Page-Agent execution failed after ${retryCount} attempts. Last error: ${errorMessage}`
          )
          throw new Error(
            `Page-Agent execution failed after ${retryCount} attempts: ${errorMessage}`
          )
        }

        // 等待一段时间后重试（指数退避，最长 30 秒）
        const delay = Math.min(1000 * Math.pow(2, i), 30000)
        loggerService.debug(`Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw new Error('Execution failed')
  }

  /**
   * 提取页面内容
   * @param selector CSS选择器
   * @param options 提取选项
   * @returns 提取的内容
   */
  async extractContent(
    selector: string,
    options: { timeout?: number; retryCount?: number } = {}
  ): Promise<string> {
    const instruction = `Extract content from elements matching selector: ${selector}`
    return this.execute(instruction, options)
  }

  /**
   * 导航到指定URL
   * @param url 目标URL
   * @param options 导航选项
   */
  async navigate(
    url: string,
    options: { timeout?: number; retryCount?: number } = {}
  ): Promise<void> {
    const instruction = `Navigate to ${url}`
    await this.execute(instruction, options)
  }

  /**
   * 点击指定元素
   * @param selector CSS选择器
   * @param options 点击选项
   */
  async click(
    selector: string,
    options: { timeout?: number; retryCount?: number } = {}
  ): Promise<void> {
    const instruction = `Click element matching selector: ${selector}`
    await this.execute(instruction, options)
  }

  /**
   * 输入文本
   * @param selector CSS选择器
   * @param text 输入文本
   * @param options 输入选项
   */
  async type(
    selector: string,
    text: string,
    options: { timeout?: number; retryCount?: number } = {}
  ): Promise<void> {
    const instruction = `Type "${text}" into element matching selector: ${selector}`
    await this.execute(instruction, options)
  }

  /**
   * 获取当前页面信息
   * @param options 选项
   * @returns 页面信息
   */
  async getPageInfo(options: { timeout?: number; retryCount?: number } = {}): Promise<PageInfo> {
    // 确保Page-Agent已初始化
    if (!this.initialized) {
      await this.initialize()
    }

    if (!this.agent) {
      throw new Error('Page-Agent is not initialized')
    }

    const timeout = options.timeout || this.options.timeout || 30000

    try {
      // 并行获取页面信息
      const [
        urlResult,
        titleResult,
        contentResult,
        descriptionResult,
        keywordsResult,
        canonicalResult,
      ] = await Promise.all([
        this.execute('Get current page URL', options),
        this.execute('Get current page title', options),
        this.execute('Get entire page content', options),
        this.execute('Get page meta description', options),
        this.execute('Get page meta keywords', options),
        this.execute('Get page canonical URL', options),
      ])

      const url = typeof urlResult === 'string' ? urlResult : JSON.stringify(urlResult)
      const title = typeof titleResult === 'string' ? titleResult : JSON.stringify(titleResult)
      const content =
        typeof contentResult === 'string' ? contentResult : JSON.stringify(contentResult)
      const metaDescription =
        typeof descriptionResult === 'string'
          ? descriptionResult
          : JSON.stringify(descriptionResult)
      const metaKeywords =
        typeof keywordsResult === 'string' ? keywordsResult : JSON.stringify(keywordsResult)
      const canonicalUrl =
        typeof canonicalResult === 'string' ? canonicalResult : JSON.stringify(canonicalResult)

      return {
        url: url.trim(),
        title: title.trim(),
        length: content.length,
        wordCount: content.split(/\s+/).filter((w: string) => w.length > 0).length,
        metaDescription: metaDescription.trim() || undefined,
        metaKeywords: metaKeywords.trim() || undefined,
        canonicalUrl: canonicalUrl.trim() || undefined,
      }
    } catch (error) {
      loggerService.error(`Failed to get page info: ${(error as Error).message}`)
      throw new Error(`Get page info failed: ${(error as Error).message}`)
    }
  }

  /**
   * 滚动页面
   * @param direction 滚动方向
   * @param distance 滚动距离
   * @param options 选项
   */
  async scroll(
    direction: 'up' | 'down' | 'top' | 'bottom',
    distance?: number,
    options: { timeout?: number; retryCount?: number } = {}
  ): Promise<void> {
    let instruction = ''

    switch (direction) {
      case 'up':
        instruction = distance ? `Scroll up by ${distance} pixels` : 'Scroll up on the page'
        break
      case 'down':
        instruction = distance ? `Scroll down by ${distance} pixels` : 'Scroll down on the page'
        break
      case 'top':
        instruction = 'Scroll to the top of the page'
        break
      case 'bottom':
        instruction = 'Scroll to the bottom of the page'
        break
    }

    await this.execute(instruction, options)
  }

  /**
   * 填写表单
   * @param formData 表单数据
   * @param options 选项
   */
  async fillForm(
    formData: Array<{ selector: string; value: string }>,
    options: { timeout?: number; retryCount?: number } = {}
  ): Promise<void> {
    for (const field of formData) {
      await this.type(field.selector, field.value, options)
    }
  }

  /**
   * 提交表单
   * @param selector 表单选择器
   * @param options 选项
   */
  async submitForm(
    selector: string,
    options: { timeout?: number; retryCount?: number } = {}
  ): Promise<void> {
    const instruction = `Submit form matching selector: ${selector}`
    await this.execute(instruction, options)
  }

  /**
   * 获取元素属性
   * @param selector CSS选择器
   * @param attribute 属性名
   * @param options 选项
   * @returns 属性值
   */
  async getElementAttribute(
    selector: string,
    attribute: string,
    options: { timeout?: number; retryCount?: number } = {}
  ): Promise<string> {
    const instruction = `Get attribute "${attribute}" from element matching selector: ${selector}`
    return this.execute(instruction, options)
  }

  /**
   * 等待元素出现
   * @param selector CSS选择器
   * @param timeout 超时时间
   * @param options 选项
   */
  async waitForElement(
    selector: string,
    timeout: number = 30000,
    options: { retryCount?: number } = {}
  ): Promise<void> {
    const instruction = `Wait until element matching selector "${selector}" is visible, timeout after ${timeout} milliseconds`
    await this.execute(instruction, { ...options, timeout })
  }

  /**
   * 检查Page-Agent是否已初始化
   * @returns 是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * 获取Page-Agent配置
   * @returns 配置选项
   */
  getOptions(): PageAgentOptions {
    return { ...this.options }
  }

  /**
   * 销毁Page-Agent实例
   */
  destroy() {
    if (this.agent) {
      // Page-Agent目前没有提供销毁方法，这里做清理工作
      this.agent = null
      this.initialized = false
      this.options = {}
      this.initializationPromise = null
      loggerService.debug('Page-Agent destroyed successfully')
    }
  }
}

// 导出单例实例
export const pageAgentService = new PageAgentService()
