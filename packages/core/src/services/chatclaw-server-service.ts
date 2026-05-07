/**
 * ChatClaw 后台服务
 * 实现ChatClaw的核心功能，使用TypeScript/JavaScript
 * 集成 OpenClaw 的 Daemon、技能、多 Agent 路由等功能
 */
import { chatClawIntegrationService } from './chatclaw-integration-service';
import { chatClawDocumentService } from './chatclaw-document-service';
import { chatClawGatewayService } from './chatclaw-gateway-service';
import { chatClawAgentService } from './chatclaw-multi-agent-service';
import { chatClawMemoryService } from './chatclaw-memory-service';
import { chatClawOpenClawSkillService, SkillExecutionResult } from './chatclaw-openclaw-skill-service';
import { OllamaClient } from '../utils/ollama-client';
import { aiConfigManager } from '../utils/ai-config-manager';
import { logger } from '../utils/logger';

export interface OpenClawConfig {
  daemonPort: number;
  workspacesPath: string;
  skillsPath: string;
  enabledChannels: string[];
  autoStartDaemon: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface SessionInfo {
  id: string;
  channelId?: string;
  agentId?: string;
  startTime: string;
  lastActivity: string;
  messageCount: number;
}

export class ChatClawServerService {
  private isRunning: boolean = false;
  private daemonIsRunning: boolean = false;
  private port: number = 8080;
  private daemonPort: number = 18789;
  private server: any = null;
  private skills: any[] = [];
  private knowledgeBase: any[] = [];
  private chatHistory: any[] = [];
  private sessions: Map<string, SessionInfo> = new Map();
  private ollamaClient: OllamaClient;
  private config: OpenClawConfig = {
    daemonPort: 18789,
    workspacesPath: './workspaces',
    skillsPath: './skills',
    enabledChannels: ['telegram', 'discord', 'slack'],
    autoStartDaemon: true,
    logLevel: 'info'
  };

  constructor() {
    this.ollamaClient = new OllamaClient();
  }

  /**
   * 启动 ChatClaw 后台服务
   */
  async start(): Promise<boolean> {
    try {
      // 检查是否已经运行
      if (this.isRunning) {
        return true;
      }

      logger.info('ChatClaw 后台服务正在启动...');
      
      // 初始化默认技能
      this.initializeDefaultSkills();
      
      // 初始化默认知识库
      this.initializeDefaultKnowledgeBase();
      
      // 启动 Gateway 服务
      await chatClawGatewayService.start();
      
      // 如果配置了自动启动 Daemon，则启动 Daemon
      if (this.config.autoStartDaemon) {
        await this.startDaemon();
      }
      
      // 延迟模拟启动过程
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 标记服务为运行状态
      this.isRunning = true;
      logger.info(`ChatClaw 后台服务已启动，监听端口 ${this.port}`);

      return true;
    } catch (error) {
      logger.error('ChatClaw 后台服务启动失败:', error);
      return false;
    }
  }

  /**
   * 启动 OpenClaw Daemon
   */
  async startDaemon(): Promise<boolean> {
    try {
      if (this.daemonIsRunning) {
        return true;
      }

      logger.info(`OpenClaw Daemon 正在启动，端口: ${this.daemonPort}`);
      
      // 模拟 Daemon 启动过程
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 启用配置的渠道
      for (const channelId of this.config.enabledChannels) {
        try {
          await chatClawGatewayService.enableChannel(channelId);
          logger.info(`已启用渠道: ${channelId}`);
        } catch (error) {
          logger.error(`启用渠道失败: ${channelId}`, error);
        }
      }
      
      this.daemonIsRunning = true;
      logger.info('OpenClaw Daemon 已成功启动');
      
      return true;
    } catch (error) {
      logger.error('OpenClaw Daemon 启动失败:', error);
      return false;
    }
  }

  /**
   * 停止 OpenClaw Daemon
   */
  async stopDaemon(): Promise<boolean> {
    try {
      if (!this.daemonIsRunning) {
        return true;
      }

      logger.info('OpenClaw Daemon 正在停止...');
      
      // 禁用所有渠道
      for (const channelId of this.config.enabledChannels) {
        try {
          await chatClawGatewayService.disableChannel(channelId);
        } catch (error) {
          logger.error(`禁用渠道失败: ${channelId}`, error);
        }
      }
      
      // 停止 Gateway 服务
      await chatClawGatewayService.stop();
      
      // 模拟 Daemon 停止过程
      await new Promise(resolve => setTimeout(resolve, 800));
      
      this.daemonIsRunning = false;
      logger.info('OpenClaw Daemon 已停止');
      
      return true;
    } catch (error) {
      logger.error('OpenClaw Daemon 停止失败:', error);
      return false;
    }
  }

  /**
   * 停止 ChatClaw 后台服务
   */
  async stop(): Promise<boolean> {
    try {
      // 检查是否运行
      if (!this.isRunning) {
        return true;
      }

      logger.info('ChatClaw 后台服务正在停止...');
      
      // 停止 Daemon
      if (this.daemonIsRunning) {
        await this.stopDaemon();
      }
      
      // 停止 Gateway 服务
      await chatClawGatewayService.stop();
      
      // 延迟模拟停止过程
      await new Promise(resolve => setTimeout(resolve, 500));

      // 标记服务为停止状态
      this.isRunning = false;
      logger.info('ChatClaw 后台服务已停止');

      return true;
    } catch (error) {
      logger.error('ChatClaw 后台服务停止失败:', error);
      return false;
    }
  }

  /**
   * 获取 OpenClaw 配置
   */
  getConfig(): OpenClawConfig {
    return { ...this.config };
  }

  /**
   * 更新 OpenClaw 配置
   */
  updateConfig(updates: Partial<OpenClawConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('OpenClaw 配置已更新');
  }

  /**
   * 创建新会话
   */
  createSession(channelId?: string, agentId?: string): SessionInfo {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: SessionInfo = {
      id: sessionId,
      channelId,
      agentId,
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      messageCount: 0
    };

    this.sessions.set(sessionId, session);
    logger.info(`创建新会话: ${sessionId}`);
    
    return session;
  }

  /**
   * 获取会话信息
   */
  getSession(sessionId: string): SessionInfo | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 更新会话活动时间
   */
  updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date().toISOString();
      session.messageCount += 1;
      this.sessions.set(sessionId, session);
    }
  }

  /**
   * 获取所有会话
   */
  getAllSessions(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 关闭会话
   */
  closeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const lastActivityTime = new Date(session.lastActivity).getTime();
      if (now - lastActivityTime > maxAgeMs) {
        this.sessions.delete(sessionId);
        cleanedCount++;
        logger.debug(`清理过期会话: ${sessionId}`);
      }
    }

    return cleanedCount;
  }

  /**
   * 检查服务状态
   */
  getStatus(): {
    isRunning: boolean;
    daemonIsRunning: boolean;
    port: number;
    daemonPort: number;
    version: string;
    skillsCount: number;
    knowledgeCount: number;
    sessionCount: number;
    enabledChannels: string[];
  } {
    // 使用ChatClawDocumentService获取知识库统计信息
    const stats = chatClawDocumentService.getKnowledgeBaseStats();
    
    return {
      isRunning: this.isRunning,
      daemonIsRunning: this.daemonIsRunning,
      port: this.port,
      daemonPort: this.daemonPort,
      version: '1.0.0',
      skillsCount: this.skills.length,
      knowledgeCount: stats.documentCount,
      sessionCount: this.sessions.size,
      enabledChannels: this.config.enabledChannels
    };
  }

  /**
   * 多 Agent 智能路由 - 根据消息内容选择合适的 Agent
   */
  async routeToAgent(message: string, sessionId?: string): Promise<{
    agentId: string;
    reasoning: string;
  }> {
    // 获取所有可用的 Agent
    const agents = await chatClawAgentService.getAgents();
    
    if (agents.length === 0) {
      return {
        agentId: 'default',
        reasoning: '使用默认 Agent'
      };
    }

    // 分析消息内容，选择最合适的 Agent
    const lowerMessage = message.toLowerCase();
    
    // 简单的规则基路由
    for (const agent of agents) {
      const keywords = agent.keywords || [];
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          return {
            agentId: agent.id,
            reasoning: `检测到关键词 "${keyword}"，选择 Agent: ${agent.name}`
          };
        }
      }
    }

    // 如果没有匹配，使用默认 Agent
    const defaultAgent = agents.find(a => a.isDefault) || agents[0];
    return {
      agentId: defaultAgent.id,
      reasoning: `未检测到特定关键词，使用默认 Agent: ${defaultAgent.name}`
    };
  }

  /**
   * 通过指定 Agent 发送聊天消息
   */
  async sendChatWithAgent(
    message: string,
    agentId?: string,
    sessionId?: string
  ): Promise<any> {
    // 如果没有指定 Agent，使用智能路由选择
    let selectedAgentId = agentId;
    let routingReasoning = '';
    
    if (!selectedAgentId) {
      const routingResult = await this.routeToAgent(message, sessionId);
      selectedAgentId = routingResult.agentId;
      routingReasoning = routingResult.reasoning;
      logger.info(routingReasoning);
    }

    // 如果有会话，更新会话
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const session = this.createSession(undefined, selectedAgentId);
      currentSessionId = session.id;
    } else {
      this.updateSessionActivity(currentSessionId);
    }

    // 获取会话历史（从记忆服务）
    const context = sessionId 
      ? await chatClawMemoryService.getConversationHistory(sessionId)
      : [];

    // 使用指定 Agent 生成响应
    const response = await this.generateChatResponseWithAgent(
      message, 
      selectedAgentId, 
      context
    );

    // 保存到记忆服务
    await chatClawMemoryService.saveMessage(currentSessionId, {
      role: 'user',
      content: message
    });
    await chatClawMemoryService.saveMessage(currentSessionId, {
      role: 'assistant',
      content: response
    });

    const chatEntry = {
      id: (this.chatHistory.length + 1).toString(),
      message: message,
      response: response,
      agentId: selectedAgentId,
      routingReasoning: routingReasoning,
      timestamp: new Date().toISOString()
    };

    this.chatHistory.push(chatEntry);

    return {
      success: true,
      answer: response,
      conversationId: currentSessionId,
      agentId: selectedAgentId,
      routingReasoning: routingReasoning
    };
  }

  /**
   * 使用指定 Agent 生成聊天响应
   */
  private async generateChatResponseWithAgent(
    message: string,
    agentId: string,
    context: any[] = []
  ): Promise<string> {
    try {
      // 获取 Agent 配置
      const agentConfig = await chatClawAgentService.getAgent(agentId);
      const model = agentConfig?.model || aiConfigManager.getDefaultModel();
      const systemPrompt = agentConfig?.systemPrompt || '你是 ChatClaw 智能助手，一个有帮助的 AI 助手。请用中文回答用户的问题。';

      // 构建消息历史
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...context,
        { role: 'user' as const, content: message }
      ];

      // 使用 OllamaClient 发送请求
      const response = await this.ollamaClient.chat({
        model: model,
        messages: messages,
        stream: false
      });

      if (response.message && response.message.content) {
        return response.message.content;
      }

      return '抱歉，我没有得到有效的回复。';
    } catch (error) {
      logger.error('Failed to generate chat response with agent:', error);
      return `抱歉，处理您的请求时出现错误：${error instanceof Error ? error.message : '未知错误'}`;
    }
  }

  /**
   * 设置服务端口
   */
  setPort(port: number): void {
    this.port = port;
  }

  /**
   * 获取服务端口
   */
  getPort(): number {
    return this.port;
  }

  /**
   * 测试服务连接
   */
  async testConnection(): Promise<boolean> {
    return this.isRunning;
  }

  /**
   * 初始化默认技能
   */
  private initializeDefaultSkills(): void {
    this.skills = [
      {
        id: 'chat',
        name: '聊天技能',
        description: '与AI进行聊天对话',
        version: '1.0.0',
        tools: {
          chat: {
            name: 'chat',
            description: '与AI聊天',
            parameters: {
              message: {
                type: 'string',
                description: '聊天消息'
              }
            }
          }
        }
      },
      {
        id: 'knowledge',
        name: '知识库技能',
        description: '查询和管理知识库',
        version: '1.0.0',
        tools: {
          searchKnowledge: {
            name: 'searchKnowledge',
            description: '搜索知识库',
            parameters: {
              query: {
                type: 'string',
                description: '搜索查询'
              },
              limit: {
                type: 'number',
                description: '结果数量限制'
              }
            }
          }
        }
      },
      {
        id: 'weather',
        name: '天气技能',
        description: '查询天气信息',
        version: '1.0.0',
        tools: {
          getWeather: {
            name: 'getWeather',
            description: '获取天气信息',
            parameters: {
              location: {
                type: 'string',
                description: '位置'
              }
            }
          }
        }
      }
    ];
  }

  /**
   * 初始化默认知识库
   */
  private initializeDefaultKnowledgeBase(): void {
    this.knowledgeBase = [
      {
        id: '1',
        title: 'ChatClaw 介绍',
        content: 'ChatClaw 是一款开源的本地知识库、OpenClaw 图形化桌面管家应用，无需编程，一键部署至本地电脑。',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        title: '主要功能',
        content: 'ChatClaw 提供本地知识库管理、多 Agent 模式、5000+ 技能库、记忆功能、多渠道通讯集成等功能。',
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        title: '使用指南',
        content: '1. 启动 ChatClaw 服务\n2. 配置 API 地址\n3. 测试连接\n4. 开始使用技能和知识库功能',
        createdAt: new Date().toISOString()
      }
    ];
  }

  /**
   * 获取技能列表
   */
  getSkills(): any {
    return {
      skills: this.skills
    };
  }

  /**
   * 执行技能
   */
  async executeSkill(skillId: string, toolName: string, params: any): Promise<any> {
    const skill = this.skills.find(s => s.id === skillId);
    if (!skill) {
      return {
        success: false,
        error: '技能不存在'
      };
    }

    if (!skill.tools[toolName]) {
      return {
        success: false,
        error: '工具不存在'
      };
    }

    // 执行技能
    switch (skillId) {
      case 'chat':
        if (toolName === 'chat') {
          const response = await this.generateChatResponse(params.message);
          return {
            success: true,
            result: response
          };
        }
        break;
      case 'knowledge':
        if (toolName === 'searchKnowledge') {
          const results = await this.searchKnowledgeBase(params.query, params.limit || 5);
          return {
            success: true,
            result: results
          };
        }
        break;
      case 'weather':
        if (toolName === 'getWeather') {
          const weather = this.getWeather(params.location);
          return {
            success: true,
            result: weather
          };
        }
        break;
    }

    return {
      success: false,
      error: '技能执行失败'
    };
  }

  /**
   * 搜索知识库
   */
  async searchKnowledgeBase(query: string, limit: number = 5): Promise<any[]> {
    // 使用ChatClawDocumentService处理知识库搜索
    const result = await chatClawDocumentService.searchKnowledge(query, limit);
    return result.results || [];
  }

  /**
   * 生成聊天响应 - 使用全局 AI 模型
   */
  private async generateChatResponse(message: string): Promise<string> {
    try {
      // 获取当前配置的模型
      const model = aiConfigManager.getDefaultModel();

      // 使用 OllamaClient 发送请求
      const response = await this.ollamaClient.chat({
        model: model,
        messages: [
          {
            role: 'system',
            content: '你是 ChatClaw 智能助手，一个有帮助的 AI 助手。请用中文回答用户的问题。'
          },
          {
            role: 'user',
            content: message
          }
        ],
        stream: false
      });

      if (response.message && response.message.content) {
        return response.message.content;
      }

      return '抱歉，我没有得到有效的回复。';
    } catch (error) {
      console.error('Failed to generate chat response:', error);
      return `抱歉，处理您的请求时出现错误：${error instanceof Error ? error.message : '未知错误'}`;
    }
  }

  /**
   * 获取天气信息
   */
  private getWeather(location: string): string {
    // 模拟天气信息
    const weathers = ['晴朗', '多云', '小雨', '中雨', '大雨', '阴天'];
    const randomWeather = weathers[Math.floor(Math.random() * weathers.length)];
    const temperature = Math.floor(Math.random() * 30) + 10;

    return `${location} 的天气：${randomWeather}，温度 ${temperature}°C`;
  }

  /**
   * 上传文档到知识库
   */
  async uploadDocument(file: File, fileName: string): Promise<any> {
    // 使用ChatClawDocumentService处理文档上传
    const result = await chatClawDocumentService.uploadDocument(file, fileName);
    return result;
  }

  /**
   * 发送聊天消息（使用智能 Agent 路由）
   */
  async sendChat(message: string, context?: any): Promise<any> {
    // 使用智能 Agent 路由发送消息
    return this.sendChatWithAgent(message, undefined, undefined);
  }

  // ==================== OpenClaw 技能相关方法 ====================

  /**
   * 获取所有可用技能
   */
  getAllSkills() {
    return chatClawOpenClawSkillService.getAllSkills();
  }

  /**
   * 获取启用的技能
   */
  getEnabledSkills() {
    return chatClawOpenClawSkillService.getEnabledSkills();
  }

  /**
   * 获取技能分类
   */
  getSkillCategories() {
    return chatClawOpenClawSkillService.getSkillCategories();
  }

  /**
   * 获取指定分类的技能
   */
  getSkillsByCategory(category: string) {
    return chatClawOpenClawSkillService.getSkillsByCategory(category);
  }

  /**
   * 搜索技能
   */
  searchSkills(query: string) {
    return chatClawOpenClawSkillService.searchSkills(query);
  }

  /**
   * 启用/禁用技能
   */
  setSkillEnabled(skillId: string, enabled: boolean): boolean {
    return chatClawOpenClawSkillService.setSkillEnabled(skillId, enabled);
  }

  /**
   * 执行技能工具
   */
  async executeSkillTool(
    skillId: string,
    toolName: string,
    params: any
  ): Promise<SkillExecutionResult> {
    return chatClawOpenClawSkillService.executeSkillTool(skillId, toolName, params);
  }

  /**
   * 智能执行技能 - 根据消息内容自动选择和执行技能
   */
  async executeSkillByMessage(
    message: string,
    sessionId?: string
  ): Promise<{
    success: boolean;
    executed?: SkillExecutionResult;
    reasoning: string;
  }> {
    const lowerMessage = message.toLowerCase();
    const enabledSkills = this.getEnabledSkills();

    // 查找匹配的技能
    for (const skill of enabledSkills) {
      const keywords = skill.keywords || [];
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          // 找到匹配的技能，尝试执行
          const toolNames = Object.keys(skill.tools);
          if (toolNames.length > 0) {
            const primaryTool = toolNames[0];
            const tool = skill.tools[primaryTool];
            
            // 构建简单的参数
            const params: any = {};
            for (const param of tool.parameters) {
              if (param.name === 'message' || param.name === 'query') {
                params[param.name] = message;
              } else if (param.name === 'location' && lowerMessage.includes('北京')) {
                params[param.name] = '北京';
              } else if (param.default !== undefined) {
                params[param.name] = param.default;
              }
            }

            try {
              const result = await this.executeSkillTool(skill.id, primaryTool, params);
              return {
                success: result.success,
                executed: result,
                reasoning: `检测到关键词 "${keyword}"，执行技能 ${skill.name}.${primaryTool}`
              };
            } catch (error) {
              logger.error(`执行技能失败: ${skill.id}.${primaryTool}`, error);
            }
          }
        }
      }
    }

    return {
      success: false,
      reasoning: '未找到匹配的技能'
    };
  }

  /**
   * 获取技能统计信息
   */
  getSkillStats() {
    return chatClawOpenClawSkillService.getSkillStats();
  }
}

// 导出单例
export const chatClawServerService = new ChatClawServerService();
