/**
 * ChatClaw 对话集成服务
 * 处理ChatClaw与现有对话系统的集成
 */
import { ChatMessage } from '../types'
import { logger } from '../utils/logger'
import { eventBus } from '../utils/event-bus'

// 导入真正的 ChatClaw 服务
import { chatClawServerService as serverService } from './chatclaw-server-service'
import { chatClawIntegrationService as integrationService } from './chatclaw-integration-service'
import { chatClawMultiAskService as multiAskService } from './chatclaw-multi-ask-service'
import { chatClawDocumentService as documentService } from './chatclaw-document-service'
import { openKBService, OpenKBChatSession } from './openkb-service'

// 知识库集成配置
interface KnowledgeBaseIntegrationConfig {
  enabled: boolean
  autoQuery: boolean
  maxContextLength: number
  minQueryLength: number
  includeSources: boolean
  systemPromptTemplate: string
}

// 默认配置
const DEFAULT_KB_CONFIG: KnowledgeBaseIntegrationConfig = {
  enabled: true,
  autoQuery: true,
  maxContextLength: 2000,
  minQueryLength: 3,
  includeSources: true,
  systemPromptTemplate: `基于以下知识库信息回答用户问题：

{{knowledgeContext}}

---
用户问题：{{userQuestion}}

请根据知识库信息提供准确、有帮助的回答。如果知识库中没有相关信息，请明确告知。`,
}

// Lazy load services to avoid initialization issues
let TextSummaryService: any
let StructuredInformationExtractionService: any
let WebContentExtractionService: any
let JSHeavyWebProcessingService: any

// Load services dynamically
import('../index').then(module => {
  TextSummaryService = module.TextSummaryService
  StructuredInformationExtractionService = module.StructuredInformationExtractionService
  WebContentExtractionService = module.WebContentExtractionService
  // Note: JSHeavyWebProcessingService is NOT loaded - only works in Node.js environment
})

// Service instances
let textSummaryService: any = null
let structuredInformationExtractionService: any = null
let webContentExtractionService: any = null
let jsHeavyWebProcessingService: any = null

// Create depthReasoningService mock
const depthReasoningService = {
  reason: async () => ({ answer: 'Depth reasoning not implemented yet' }),
}

// Helper function to get service instances
function getTextSummaryService() {
  if (!textSummaryService && TextSummaryService) {
    textSummaryService = new TextSummaryService()
  }
  return textSummaryService
}

function getStructuredInformationExtractionService() {
  if (!structuredInformationExtractionService && StructuredInformationExtractionService) {
    structuredInformationExtractionService = new StructuredInformationExtractionService()
  }
  return structuredInformationExtractionService
}

function getWebContentExtractionService() {
  if (!webContentExtractionService && WebContentExtractionService) {
    webContentExtractionService = new WebContentExtractionService()
  }
  return webContentExtractionService
}

function getJSHeavyWebProcessingService() {
  // Note: JSHeavyWebProcessingService only works in Node.js, not in browser extension
  if (
    !jsHeavyWebProcessingService &&
    JSHeavyWebProcessingService &&
    typeof window === 'undefined'
  ) {
    jsHeavyWebProcessingService = new JSHeavyWebProcessingService()
  }
  return jsHeavyWebProcessingService
}

export class ChatClawChatIntegrationService {
  private kbConfig: KnowledgeBaseIntegrationConfig
  private kbSessions: Map<string, OpenKBChatSession> = new Map()

  constructor(config?: Partial<KnowledgeBaseIntegrationConfig>) {
    this.kbConfig = { ...DEFAULT_KB_CONFIG, ...config }
  }

  /**
   * 更新知识库集成配置
   */
  updateKBConfig(config: Partial<KnowledgeBaseIntegrationConfig>): void {
    this.kbConfig = { ...this.kbConfig, ...config }
  }

  /**
   * 获取知识库集成配置
   */
  getKBConfig(): KnowledgeBaseIntegrationConfig {
    return { ...this.kbConfig }
  }

  /**
   * 处理ChatClaw命令
   * @param message 用户消息
   * @returns 处理结果
   */
  async handleChatClawCommand(message: string): Promise<{ handled: boolean; response?: string }> {
    // 检查是否是ChatClaw命令
    if (!message.startsWith('/chatclaw') && !message.startsWith('/cc')) {
      return { handled: false }
    }

    // 解析命令
    const command = message.substring(message.startsWith('/chatclaw') ? 9 : 3).trim()
    const parts = command.split(' ')
    const action = parts[0].toLowerCase()
    const params = parts.slice(1).join(' ')

    try {
      switch (action) {
        case 'help':
          return {
            handled: true,
            response: this.getHelpMessage(),
          }
        case 'start':
          return await this.handleStartCommand()
        case 'stop':
          return await this.handleStopCommand()
        case 'status':
          return await this.handleStatusCommand()
        case 'models':
          return await this.handleModelsCommand()
        case 'multiask':
        case 'multi-ask':
          return await this.handleMultiAskCommand(params)
        case 'upload':
          return {
            handled: true,
            response: '请使用文件上传功能上传文档到ChatClaw知识库',
          }
        case 'search':
          return await this.handleSearchCommand(params)
        case 'summary':
        case 'summarize':
          return await this.handleSummaryCommand(params)
        case 'extract':
        case 'structure':
          return await this.handleExtractCommand(params)
        case 'extract-content':
        case 'extract-web':
        case 'web-extract':
          return await this.handleExtractContentCommand(params)
        case 'page-info':
        case 'pageinfo':
          return await this.handlePageInfoCommand()
        case 'extract-selection':
        case 'extract-select':
          return await this.handleExtractSelectionCommand()
        case 'process-js':
        case 'js-process':
        case 'process-heavy':
          return await this.handleProcessJSHeavyPageCommand()
        case 'reason':
        case 'think':
        case 'deep-think':
          return await this.handleReasonCommand(params)
        case 'openkb-query':
        case 'openkb-query':
          return await this.handleOpenKBQueryCommand(params)
        case 'openkb-chat':
        case 'openkb-chat':
          return await this.handleOpenKBChatCommand(params)
        case 'openkb-status':
        case 'openkb-status':
          return await this.handleOpenKBStatusCommand()
        default:
          return {
            handled: true,
            response: `未知的ChatClaw命令: ${action}\n输入 /chatclaw help 查看可用命令`,
          }
      }
    } catch (error) {
      logger.error('处理ChatClaw命令失败:', error)
      return {
        handled: true,
        response: `处理命令失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 获取帮助消息
   */
  private getHelpMessage(): string {
    return (
      `ChatClaw 命令帮助：

` +
      `/chatclaw help - 显示此帮助信息
` +
      `/chatclaw start - 启动ChatClaw服务
` +
      `/chatclaw stop - 停止ChatClaw服务
` +
      `/chatclaw status - 查看ChatClaw服务状态
` +
      `/chatclaw models - 查看可用模型
` +
      `/chatclaw multiask <问题> - 多模型同时回答
` +
      `/chatclaw search <查询> - 搜索知识库
` +
      `/chatclaw upload - 上传文档到知识库
` +
      `/chatclaw summary <文本> - 生成文本摘要
` +
      `/chatclaw summarize <文本> - 生成文本摘要
` +
      `/chatclaw extract <文本> - 提取结构化信息
` +
      `/chatclaw structure <文本> - 提取结构化信息
` +
      `/chatclaw extract-content - 提取网页内容
` +
      `/chatclaw extract-web - 提取网页内容
` +
      `/chatclaw page-info - 获取页面信息
` +
      `/chatclaw extract-selection - 提取选中文本
` +
      `/chatclaw process-js - 处理JavaScript-heavy网页
` +
      `/chatclaw js-process - 处理JavaScript-heavy网页
` +
      `/chatclaw process-heavy - 处理JavaScript-heavy网页
` +
      `/chatclaw reason <问题> - 执行深度推理
` +
      `/chatclaw think <问题> - 执行深度推理
` +
      `/chatclaw deep-think <问题> - 执行深度推理
` +
      `/chatclaw openkb-query <问题> - 查询 OpenKB 知识库
` +
      `/chatclaw openkb-chat <消息> - 与 OpenKB 知识库聊天
` +
      `/chatclaw openkb-status - 查看 OpenKB 知识库状态
`
    )
    ;+`
` + `也可以使用缩写形式：/cc help`
  }

  /**
   * 处理启动命令
   */
  private async handleStartCommand(): Promise<{ handled: boolean; response?: string }> {
    const success = await serverService.start()
    if (success) {
      return {
        handled: true,
        response: 'ChatClaw服务已成功启动',
      }
    } else {
      return {
        handled: true,
        response: 'ChatClaw服务启动失败',
      }
    }
  }

  /**
   * 处理停止命令
   */
  private async handleStopCommand(): Promise<{ handled: boolean; response?: string }> {
    const success = await serverService.stop()
    if (success) {
      return {
        handled: true,
        response: 'ChatClaw服务已成功停止',
      }
    } else {
      return {
        handled: true,
        response: 'ChatClaw服务停止失败',
      }
    }
  }

  /**
   * 处理状态命令
   */
  private async handleStatusCommand(): Promise<{ handled: boolean; response?: string }> {
    const status = serverService.getStatus()
    const isConnected = await integrationService.testConnection()

    return {
      handled: true,
      response:
        `ChatClaw服务状态：
` +
        `状态: ${status.isRunning ? '运行中' : '已停止'}\n` +
        `端口: ${status.port}\n` +
        `版本: ${status.version}\n` +
        `技能数量: ${status.skillsCount || 0}\n` +
        `知识库条目: ${status.knowledgeCount || 0}\n` +
        `外部连接: ${isConnected ? '已连接' : '未连接'}`,
    }
  }

  /**
   * 处理模型命令
   */
  private async handleModelsCommand(): Promise<{ handled: boolean; response?: string }> {
    return {
      handled: true,
      response:
        `可用模型：\n\n` + `• 模型功能暂未实现\n\n` + `提示：在ChatClaw集成面板中可以管理模型`,
    }
  }

  /**
   * 处理多问同开命令
   */
  private async handleMultiAskCommand(
    question: string
  ): Promise<{ handled: boolean; response?: string }> {
    if (!question) {
      return {
        handled: true,
        response: '请输入问题，例如：/chatclaw multiask 什么是人工智能？',
      }
    }

    return {
      handled: true,
      response:
        `多模型回答：\n\n` + `• 多模型功能暂未实现\n\n` + `提示：在ChatClaw集成面板中可以启用模型`,
    }
  }

  /**
   * 处理搜索命令
   */
  private async handleSearchCommand(
    query: string
  ): Promise<{ handled: boolean; response?: string }> {
    if (!query) {
      return {
        handled: true,
        response: '请输入搜索查询，例如：/chatclaw search 人工智能',
      }
    }

    // 搜索知识库
    const result = await documentService.searchKnowledge(query)

    if (result.success && result.results.length > 0) {
      let response = `知识库搜索结果：\n\n`
      result.results.forEach((item: any, index: number) => {
        response += `${index + 1}. ${item.title}\n`
        response += `${item.content.substring(0, 100)}${item.content.length > 100 ? '...' : ''}\n\n`
      })
      return {
        handled: true,
        response,
      }
    } else {
      return {
        handled: true,
        response: '知识库中没有找到相关内容',
      }
    }
  }

  /**
   * 处理摘要命令
   */
  private async handleSummaryCommand(
    text: string
  ): Promise<{ handled: boolean; response?: string }> {
    if (!text) {
      return {
        handled: true,
        response: '请输入要摘要的文本，例如：/chatclaw summary 这是一段需要摘要的长文本...',
      }
    }

    try {
      const textSummaryService = getTextSummaryService()
      if (!textSummaryService) {
        return {
          handled: true,
          response: '文本摘要服务初始化失败，请稍后再试',
        }
      }

      // 生成摘要
      const summary = await textSummaryService.generateSummary(text, 'extractive', 5)

      return {
        handled: true,
        response: `文本摘要：\n\n${summary}`,
      }
    } catch (error) {
      logger.error('生成摘要失败:', error)
      return {
        handled: true,
        response: `生成摘要失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 处理结构化信息提取命令
   */
  private async handleExtractCommand(
    text: string
  ): Promise<{ handled: boolean; response?: string }> {
    if (!text) {
      return {
        handled: true,
        response:
          '请输入要提取结构化信息的文本，例如：/chatclaw extract 这是一段包含实体和关系的文本...',
      }
    }

    try {
      const structuredService = getStructuredInformationExtractionService()
      if (!structuredService) {
        return {
          handled: true,
          response: '结构化信息提取服务初始化失败，请稍后再试',
        }
      }

      // 提取结构化信息
      const result = await structuredService.extractStructuredInformation(text)

      // 构建响应
      let response = `结构化信息提取结果：\n\n`

      if (result.entities.length > 0) {
        response += `实体：\n`
        result.entities.forEach((entity: any) => {
          response += `• ${entity.type}: ${entity.text}\n`
        })
        response += `\n`
      }

      if (result.relationships.length > 0) {
        response += `关系：\n`
        result.relationships.forEach((relation: any) => {
          const sourceEntity = result.entities.find((e: any) => e.id === relation.source)
          const targetEntity = result.entities.find((e: any) => e.id === relation.target)
          response += `• ${relation.type}: ${sourceEntity?.text || relation.source} → ${targetEntity?.text || relation.target}\n`
        })
      }

      return {
        handled: true,
        response,
      }
    } catch (error) {
      logger.error('提取结构化信息失败:', error)
      return {
        handled: true,
        response: `提取结构化信息失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 处理提取网页内容命令
   */
  private async handleExtractContentCommand(
    params: string
  ): Promise<{ handled: boolean; response?: string }> {
    try {
      const webService = getWebContentExtractionService()
      if (!webService) {
        return {
          handled: true,
          response: '网页内容提取服务初始化失败，请稍后再试',
        }
      }

      const options = params.includes('--include-images') ? { extractImageUrl: true } : {}
      const result = await webService.extractContent(options)

      return {
        handled: true,
        response: result.content,
      }
    } catch (error) {
      logger.error('提取网页内容失败:', error)
      return {
        handled: true,
        response: `提取网页内容失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 处理获取页面信息命令
   */
  private async handlePageInfoCommand(): Promise<{ handled: boolean; response?: string }> {
    try {
      const webService = getWebContentExtractionService()
      if (!webService) {
        return {
          handled: true,
          response: '网页内容提取服务初始化失败，请稍后再试',
        }
      }

      const info = webService.getPageInfo()

      let response = `页面信息：\n\n`
      response += `URL: ${info.url}\n`
      response += `标题: ${info.title}\n`
      response += `内容长度: ${info.length} 字符\n`
      response += `词数: ${info.wordCount} 词\n`

      return {
        handled: true,
        response,
      }
    } catch (error) {
      logger.error('获取页面信息失败:', error)
      return {
        handled: true,
        response: `获取页面信息失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 处理提取选中文本命令
   */
  private async handleExtractSelectionCommand(): Promise<{ handled: boolean; response?: string }> {
    try {
      const webService = getWebContentExtractionService()
      if (!webService) {
        return {
          handled: true,
          response: '网页内容提取服务初始化失败，请稍后再试',
        }
      }

      const selection = webService.extractSelection()

      if (!selection) {
        return {
          handled: true,
          response: '没有选中任何文本',
        }
      }

      return {
        handled: true,
        response: selection.text,
      }
    } catch (error) {
      logger.error('提取选中文本失败:', error)
      return {
        handled: true,
        response: `提取选中文本失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 处理JavaScript-heavy网页处理命令
   */
  private async handleProcessJSHeavyPageCommand(): Promise<{
    handled: boolean
    response?: string
  }> {
    try {
      const jsService = getJSHeavyWebProcessingService()
      if (!jsService) {
        return {
          handled: true,
          response: 'JavaScript-heavy网页处理服务初始化失败或在浏览器环境中不可用',
        }
      }

      const result = await jsService.processJSHeavyPage()

      return {
        handled: true,
        response: result.content,
      }
    } catch (error) {
      logger.error('处理JavaScript-heavy网页失败:', error)
      return {
        handled: true,
        response: `处理JavaScript-heavy网页失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 处理深度推理命令
   */
  private async handleReasonCommand(
    params: string
  ): Promise<{ handled: boolean; response?: string }> {
    try {
      if (!params) {
        return {
          handled: true,
          response: '请输入要推理的问题，例如：/chatclaw reason 如何解决气候变化问题？',
        }
      }

      const result = await depthReasoningService.reason()

      return {
        handled: true,
        response: result.answer,
      }
    } catch (error) {
      logger.error('执行深度推理失败:', error)
      return {
        handled: true,
        response: `执行深度推理失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 处理 OpenKB 查询命令
   */
  private async handleOpenKBQueryCommand(
    params: string
  ): Promise<{ handled: boolean; response?: string }> {
    try {
      if (!params) {
        return {
          handled: true,
          response: '请输入查询问题，例如：/chatclaw openkb-query 什么是人工智能？',
        }
      }

      logger.info('查询 OpenKB 知识库:', params)
      const result = await openKBService.query(params)

      if (result.success && result.answer) {
        let response = `**OpenKB 知识库回答：**\n\n${result.answer}`
        if (result.sources && result.sources.length > 0) {
          response += `\n\n**参考来源：**\n${result.sources.map(s => `- ${s}`).join('\n')}`
        }
        return {
          handled: true,
          response,
        }
      } else {
        return {
          handled: true,
          response: `查询失败: ${result.error || '未知错误'}`,
        }
      }
    } catch (error) {
      logger.error('OpenKB 查询失败:', error)
      return {
        handled: true,
        response: `OpenKB 查询失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 处理 OpenKB 聊天命令
   */
  private async handleOpenKBChatCommand(
    params: string
  ): Promise<{ handled: boolean; response?: string }> {
    try {
      if (!params) {
        return {
          handled: true,
          response: '请输入消息，例如：/chatclaw openkb-chat 请解释这个概念',
        }
      }

      logger.info('与 OpenKB 知识库聊天:', params)
      const result = await openKBService.chat(params)

      if (result.success && result.messages && result.messages.length > 0) {
        const lastMessage = result.messages[result.messages.length - 1]
        return {
          handled: true,
          response: `**OpenKB 助手：**\n\n${lastMessage.content}`,
        }
      } else {
        return {
          handled: true,
          response: `聊天失败: ${result.error || '未知错误'}`,
        }
      }
    } catch (error) {
      logger.error('OpenKB 聊天失败:', error)
      return {
        handled: true,
        response: `OpenKB 聊天失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 处理 OpenKB 状态命令
   */
  private async handleOpenKBStatusCommand(): Promise<{ handled: boolean; response?: string }> {
    try {
      logger.info('获取 OpenKB 知识库状态')
      const status = await openKBService.getStatus()

      const statusText = status.initialized ? '已初始化 ✅' : '未初始化 ❌'
      const wikiText = status.wikiReady ? 'Wiki 就绪 ✅' : 'Wiki 未就绪 ❌'

      return {
        handled: true,
        response:
          `**OpenKB 知识库状态：**\n\n` +
          `- 状态: ${statusText}\n` +
          `- 文档数: ${status.documentCount}\n` +
          `- ${wikiText}`,
      }
    } catch (error) {
      logger.error('获取 OpenKB 状态失败:', error)
      return {
        handled: true,
        response: `获取 OpenKB 状态失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }
  }

  /**
   * 集成ChatClaw功能到现有对话
   * @param message 消息内容
   * @returns 集成结果
   */
  async integrateWithChat(message: string): Promise<{ integrated: boolean; content?: string }> {
    // 检查是否是ChatClaw命令
    const commandResult = await this.handleChatClawCommand(message)
    if (commandResult.handled) {
      return {
        integrated: true,
        content: commandResult.response,
      }
    }

    // 检查是否需要使用ChatClaw的功能
    // 例如，用户可能提到了"chatclaw"或相关功能
    if (
      message.toLowerCase().includes('chatclaw') ||
      message.toLowerCase().includes('知识库') ||
      message.toLowerCase().includes('多模型') ||
      message.toLowerCase().includes('摘要') ||
      message.toLowerCase().includes('总结')
    ) {
      return {
        integrated: true,
        content:
          `您可以使用以下ChatClaw命令：\n\n` +
          `/chatclaw help - 显示帮助信息\n` +
          `/chatclaw start - 启动ChatClaw服务\n` +
          `/chatclaw status - 查看服务状态\n` +
          `/chatclaw multiask <问题> - 多模型同时回答\n` +
          `/chatclaw search <查询> - 搜索知识库\n` +
          `/chatclaw summary <文本> - 生成文本摘要\n` +
          `\n` +
          `也可以点击头部的ChatClaw图标打开集成面板`,
      }
    }

    return {
      integrated: false,
    }
  }

  /**
   * 使用知识库增强的聊天功能
   * 自动查询知识库并将相关信息注入到对话上下文中
   * @param message 用户消息
   * @param sessionId 会话ID（可选）
   * @returns 增强后的消息内容和知识库上下文
   */
  async chatWithKnowledgeBase(
    message: string,
    sessionId?: string
  ): Promise<{
    enhanced: boolean
    originalMessage: string
    enhancedPrompt?: string
    knowledgeContext?: string
    sources?: string[]
    sessionId: string
    kbAvailable: boolean
  }> {
    const result: {
      enhanced: boolean
      originalMessage: string
      enhancedPrompt?: string
      knowledgeContext?: string
      sources?: string[]
      sessionId: string
      kbAvailable: boolean
    } = {
      enhanced: false,
      originalMessage: message,
      sessionId: sessionId || this.generateSessionId(),
      kbAvailable: false,
    }

    // 检查知识库功能是否启用
    if (!this.kbConfig.enabled) {
      logger.info('[ChatClawChatIntegration] 知识库集成已禁用')
      return result
    }

    // 检查消息长度是否满足最小查询要求
    if (message.length < this.kbConfig.minQueryLength) {
      logger.info('[ChatClawChatIntegration] 消息长度太短，跳过知识库查询')
      return result
    }

    try {
      logger.info('[ChatClawChatIntegration] 查询知识库:', message)

      // 查询 OpenKB 知识库
      const queryResult = await openKBService.query(message)

      if (!queryResult.success || !queryResult.answer) {
        logger.info('[ChatClawChatIntegration] 知识库中没有找到相关内容')
        return result
      }

      result.kbAvailable = true

      // 构建知识库上下文
      const knowledgeContext = this.buildKnowledgeContext(queryResult.answer, queryResult.sources)

      // 截断上下文以符合最大长度限制
      const truncatedContext = this.truncateContext(knowledgeContext)

      // 构建增强的提示词
      const enhancedPrompt = this.kbConfig.systemPromptTemplate
        .replace('{{knowledgeContext}}', truncatedContext)
        .replace('{{userQuestion}}', message)

      result.enhanced = true
      result.enhancedPrompt = enhancedPrompt
      result.knowledgeContext = truncatedContext
      result.sources = this.kbConfig.includeSources ? queryResult.sources : undefined

      logger.info('[ChatClawChatIntegration] 知识库上下文已注入')

      return result
    } catch (error) {
      logger.error('[ChatClawChatIntegration] 知识库查询失败:', error)
      return result
    }
  }

  /**
   * 基于知识库的完整对话流程
   * 包含知识库查询和 OpenKB 聊天
   */
  async knowledgeBaseChat(
    message: string,
    sessionId?: string,
    options?: {
      systemPrompt?: string
      maxHistory?: number
      includeSources?: boolean
    }
  ): Promise<{
    success: boolean
    response?: string
    sources?: string[]
    sessionId: string
    error?: string
  }> {
    const sid = sessionId || this.generateSessionId()

    try {
      logger.info('[ChatClawChatIntegration] 开始知识库对话:', { message, sessionId: sid })

      // 使用 OpenKB 的聊天功能
      const chatResult = await openKBService.chatWithKnowledgeBase(message, {
        sessionId: sid,
        systemPrompt: options?.systemPrompt,
        maxHistory: options?.maxHistory,
        includeSources: options?.includeSources ?? this.kbConfig.includeSources,
      })

      if (!chatResult.success) {
        return {
          success: false,
          sessionId: sid,
          error: chatResult.error || '知识库对话失败',
        }
      }

      return {
        success: true,
        response: chatResult.message?.content,
        sources: chatResult.message?.sources,
        sessionId: chatResult.sessionId || sid,
      }
    } catch (error) {
      logger.error('[ChatClawChatIntegration] 知识库对话失败:', error)
      return {
        success: false,
        sessionId: sid,
        error: error instanceof Error ? error.message : '未知错误',
      }
    }
  }

  /**
   * 智能处理用户消息
   * 自动检测是否使用知识库应答
   * @param message 用户消息
   * @param options 配置选项
   * @returns 处理结果，包含是否使用了知识库
   */
  async processMessageWithKnowledgeBase(
    message: string,
    options?: {
      sessionId?: string
      preferKnowledgeBase?: boolean  // 是否优先使用知识库
      fallbackToGeneral?: boolean    // 知识库无结果时是否回退到一般对话
    }
  ): Promise<{
    usedKnowledgeBase: boolean
    response: string
    sources?: string[]
    sessionId: string
    knowledgeContext?: string
  }> {
    const sessionId = options?.sessionId || this.generateSessionId()
    
    // 默认优先使用知识库
    const preferKB = options?.preferKnowledgeBase !== false
    
    // 如果优先使用知识库，先尝试查询
    if (preferKB) {
      logger.info('[ChatClawChatIntegration] 尝试使用知识库应答:', message)
      
      try {
        // 使用知识库增强查询
        const kbResult = await this.chatWithKnowledgeBase(message, sessionId)
        
        if (kbResult.enhanced && kbResult.enhancedPrompt) {
          logger.info('[ChatClawChatIntegration] 知识库查询成功，使用增强提示词')
          
          return {
            usedKnowledgeBase: true,
            response: kbResult.enhancedPrompt,
            sources: kbResult.sources,
            sessionId: kbResult.sessionId,
            knowledgeContext: kbResult.knowledgeContext,
          }
        }
        
        // 知识库无结果，检查是否回退到一般对话
        if (options?.fallbackToGeneral !== false) {
          logger.info('[ChatClawChatIntegration] 知识库无结果，回退到一般对话')
        } else {
          return {
            usedKnowledgeBase: false,
            response: '我在知识库中没有找到与您问题相关的内容。请尝试：\n1. 上传包含相关内容的文档\n2. 使用更具体的关键词\n3. 检查知识库中是否有相关文档',
            sessionId,
          }
        }
      } catch (error) {
        logger.warn('[ChatClawChatIntegration] 知识库查询失败:', error)
        if (options?.fallbackToGeneral === false) {
          return {
            usedKnowledgeBase: false,
            response: '知识库查询失败，请稍后重试。',
            sessionId,
          }
        }
      }
    }
    
    // 不使用知识库或知识库无结果且允许回退
    return {
      usedKnowledgeBase: false,
      response: message,  // 返回原始消息，由上层处理
      sessionId,
    }
  }

  /**
   * 构建知识库上下文
   */
  private buildKnowledgeContext(answer: string, sources?: string[]): string {
    let context = answer

    if (this.kbConfig.includeSources && sources && sources.length > 0) {
      context += '\n\n[来源]: ' + sources.join(', ')
    }

    return context
  }

  /**
   * 截断上下文以符合最大长度限制
   */
  private truncateContext(context: string): string {
    if (context.length <= this.kbConfig.maxContextLength) {
      return context
    }

    return context.substring(0, this.kbConfig.maxContextLength) + '...'
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `kb_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 处理文档上传到ChatClaw知识库
   * @param file 文件对象
   * @param fileName 文件名
   */
  async handleDocumentUpload(
    file: File,
    fileName: string
  ): Promise<{ success: boolean; message: string; suggestion?: string; diagnostic?: any; openKBAdded?: boolean }> {
    try {
      const result = (await documentService.uploadDocument(file, fileName)) as any
      if (result.success) {
        // 构建成功消息
        let message = `文档 "${fileName}" 已成功上传到ChatClaw知识库`
        
        // 检查是否已自动添加到 OpenKB（PDF 自动转入）
        const isPDF = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')
        const openKBAdded = result.openKB?.added === true
        
        if (isPDF) {
          if (openKBAdded) {
            message += '\n\n✅ PDF 已自动转入 OpenKB 知识库，您可以基于该文档进行问答。'
            
            // 如果文档页数较多，提示 PageIndex 已构建
            if (result.document?.chunks && result.document.chunks > 20) {
              message += '\n📚 长文档已使用 PageIndex 进行索引，支持高效检索。'
            }
          } else {
            message += '\n\n⚠️ PDF 转入 OpenKB 失败，但仍可在 ChatClaw 中使用。'
            if (result.openKB?.error) {
              message += `\n错误: ${result.openKB.error}`
            }
          }
        }
        
        return {
          success: true,
          message,
          openKBAdded,
        }
      } else {
        // 构建详细的错误消息
        let errorMessage = result.error || '文档上传失败'

        // 如果有诊断信息，添加建议
        if (result.suggestion) {
          return {
            success: false,
            message: errorMessage,
            suggestion: result.suggestion,
            diagnostic: result.diagnostic,
          }
        }

        return {
          success: false,
          message: errorMessage,
          diagnostic: result.diagnostic,
        }
      }
    } catch (error) {
      logger.error('上传文档到ChatClaw知识库失败:', error)

      // 尝试导入诊断工具进行更好的错误处理
      let suggestion = '请尝试重新上传文件。'

      if (error instanceof Error) {
        if (error.message.includes('memory') || error.message.includes('heap')) {
          suggestion = '文件太大导致内存不足，请尝试使用更小的文件。'
        } else if (error.message.includes('timeout')) {
          suggestion = '处理超时，请稍后重试或使用更小的文件。'
        } else if (error.message.includes('encoding')) {
          suggestion = '文件编码有问题，请尝试使用UTF-8编码保存后重新上传。'
        }
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : '文档上传失败',
        suggestion,
      }
    }
  }
}

// 导出单例
export const chatClawChatIntegrationService = new ChatClawChatIntegrationService()
