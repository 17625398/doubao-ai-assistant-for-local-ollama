/**
 * ChatClaw 多 Agent 服务
 * 提供预配置的 Agent 实例管理
 */

import { ChatClawAgentService, Tool, createSearchTool, createCalculatorTool, createDataFetchTool } from './chatclaw-agent-service';
import { logger } from '../utils/logger';
import { aiConfigManager } from '../utils/ai-config-manager';

/**
 * 预配置 Agent 类型
 */
export type PreconfiguredAgentType = 'general' | 'research' | 'calculator' | 'data-analyst';

/**
 * 多 Agent 服务
 * 管理和提供预配置的 Agent 实例
 */
export class ChatClawMultiAgentService {
  private agents: Map<string, ChatClawAgentService> = new Map();
  private defaultAgent?: ChatClawAgentService;

  constructor() {
    logger.info('[ChatClawMultiAgentService] Initialized');
    this.initializeDefaultAgents();
  }

  /**
   * 初始化默认 Agent
   */
  private initializeDefaultAgents(): void {
    // 创建通用 Agent
    const generalAgent = new ChatClawAgentService({
      name: 'general-assistant',
      description: '通用助手，可以回答各种问题并执行基本任务',
      tools: [
        createCalculatorTool(),
        createSearchTool(async (query) => {
          // 模拟搜索
          return { results: [`搜索结果: ${query}`] };
        }),
      ],
      systemPrompt: '你是一个 helpful 的 AI 助手，可以帮助用户完成各种任务。',
      thinkingMode: 'think_medium',
      enableMemory: true,
    });

    this.registerAgent('general', generalAgent, true);

    // 创建研究 Agent
    const researchAgent = new ChatClawAgentService({
      name: 'research-assistant',
      description: '研究助手，擅长信息搜索和数据分析',
      tools: [
        createSearchTool(async (query) => {
          return {
            query,
            results: [
              { title: '结果 1', snippet: '相关内容...' },
              { title: '结果 2', snippet: '更多内容...' },
            ],
          };
        }),
        createDataFetchTool(async (url) => {
          return { url, data: '获取的数据...' };
        }),
      ],
      systemPrompt: '你是一个研究助手，擅长搜索信息、分析数据和生成报告。',
      thinkingMode: 'think_high',
      enableMemory: true,
    });

    this.registerAgent('research', researchAgent);

    // 创建计算器 Agent
    const calculatorAgent = new ChatClawAgentService({
      name: 'calculator-assistant',
      description: '计算器助手，擅长数学计算',
      tools: [createCalculatorTool()],
      systemPrompt: '你是一个计算器助手，可以执行各种数学计算。',
      thinkingMode: 'no_think',
      enableMemory: false,
    });

    this.registerAgent('calculator', calculatorAgent);

    logger.info('[ChatClawMultiAgentService] Default agents initialized');
  }

  /**
   * 注册 Agent
   */
  registerAgent(id: string, agent: ChatClawAgentService, isDefault: boolean = false): void {
    this.agents.set(id, agent);
    
    if (isDefault || !this.defaultAgent) {
      this.defaultAgent = agent;
    }

    logger.info(`[ChatClawMultiAgentService] Agent registered: ${id}`);
  }

  /**
   * 获取 Agent（兼容旧 API）
   * 返回带有 model 和 systemPrompt 属性的对象
   */
  async getAgent(id: string): Promise<{
    id: string;
    model: string;
    systemPrompt: string;
    agent: ChatClawAgentService;
  } | undefined> {
    const agent = this.agents.get(id);
    if (!agent) return undefined;

    // 优先从 aiConfigManager 获取默认模型配置
    // 避免使用 OpenAI 模型名称（如 gpt-4）导致错误
    let defaultModel: string;
    try {
      // 确保配置已加载
      await aiConfigManager.ensureLoaded();
      defaultModel = aiConfigManager.getDefaultModel();
    } catch (error) {
      // 如果获取失败，使用环境变量或默认值
      defaultModel = process.env.NEXT_PUBLIC_DEFAULT_OLLAMA_MODEL || 'gemma4:26b';
      logger.warn('[ChatClawMultiAgentService] Failed to get model from aiConfigManager, using fallback:', defaultModel);
    }

    return {
      id,
      model: defaultModel,
      systemPrompt: '你是 ChatClaw 智能助手，一个有帮助的 AI 助手。',
      agent,
    };
  }

  /**
   * 获取默认 Agent
   */
  getDefaultAgent(): ChatClawAgentService {
    if (!this.defaultAgent) {
      throw new Error('没有可用的默认 Agent');
    }
    return this.defaultAgent;
  }

  /**
   * 获取所有 Agent（新 API）
   */
  getAllAgents(): Array<{ id: string; agent: ChatClawAgentService }> {
    return Array.from(this.agents.entries()).map(([id, agent]) => ({ id, agent }));
  }

  /**
   * 获取所有 Agent（兼容旧 API）
   * 返回带有 id, name, description, keywords, isDefault 的对象数组
   */
  async getAgents(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    keywords: string[];
    isDefault: boolean;
  }>> {
    return Array.from(this.agents.entries()).map(([id, agent]) => {
      const isDefault = agent === this.defaultAgent;
      // 根据 id 推断关键词
      let keywords: string[] = [];
      if (id === 'calculator') {
        keywords = ['计算', '数学', '公式', '算术'];
      } else if (id === 'research') {
        keywords = ['搜索', '查询', '研究', '分析'];
      } else {
        keywords = ['通用', '帮助', '问答'];
      }

      return {
        id,
        name: id,
        description: `${id} agent`,
        keywords,
        isDefault,
      };
    });
  }

  /**
   * 创建自定义 Agent
   */
  createCustomAgent(
    id: string,
    config: {
      name: string;
      description: string;
      tools: Tool[];
      systemPrompt: string;
      thinkingMode?: 'no_think' | 'think_low' | 'think_medium' | 'think_high';
    },
    isDefault: boolean = false
  ): ChatClawAgentService {
    const agent = new ChatClawAgentService({
      ...config,
      thinkingMode: config.thinkingMode || 'think_medium',
      enableMemory: true,
    });

    this.registerAgent(id, agent, isDefault);
    return agent;
  }

  /**
   * 移除 Agent
   */
  removeAgent(id: string): boolean {
    const removed = this.agents.delete(id);
    
    if (removed) {
      logger.info(`[ChatClawMultiAgentService] Agent removed: ${id}`);
    }

    return removed;
  }

  /**
   * 获取 Agent 状态
   */
  getStatus(): {
    totalAgents: number;
    agentIds: string[];
    defaultAgentId: string | null;
  } {
    let defaultAgentId: string | null = null;
    
    for (const [id, agent] of this.agents) {
      if (agent === this.defaultAgent) {
        defaultAgentId = id;
        break;
      }
    }

    return {
      totalAgents: this.agents.size,
      agentIds: Array.from(this.agents.keys()),
      defaultAgentId,
    };
  }
}

// 导出单例实例
export const chatClawAgentService = new ChatClawMultiAgentService();
