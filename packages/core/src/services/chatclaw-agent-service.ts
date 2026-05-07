/**
 * ChatClaw Agent 服务
 * 借鉴豆包 AI 的 Agent 能力实现
 * 支持工具调用、任务规划、自主执行、记忆管理
 */

import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';
import { chatClawThinkingModeService, ThinkingMode } from './chatclaw-thinking-mode-service';
import { chatClawContextManager } from './chatclaw-context-manager';

/**
 * 工具定义
 */
export interface Tool {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 工具参数定义 */
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
  /** 工具执行函数 */
  execute: (args: Record<string, any>) => Promise<any>;
}

/**
 * 工具调用结果
 */
export interface ToolCallResult {
  /** 工具名称 */
  toolName: string;
  /** 调用参数 */
  arguments: Record<string, any>;
  /** 执行结果 */
  result: any;
  /** 执行时间（毫秒） */
  executionTime: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 任务规划
 */
export interface TaskPlan {
  /** 任务 ID */
  id: string;
  /** 任务描述 */
  description: string;
  /** 子任务列表 */
  subtasks: SubTask[];
  /** 任务状态 */
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  /** 创建时间 */
  createdAt: number;
  /** 完成时间 */
  completedAt?: number;
}

/**
 * 子任务
 */
export interface SubTask {
  /** 子任务 ID */
  id: string;
  /** 子任务描述 */
  description: string;
  /** 所需工具 */
  requiredTools: string[];
  /** 依赖的子任务 */
  dependencies: string[];
  /** 子任务状态 */
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  /** 执行结果 */
  result?: any;
  /** 错误信息 */
  error?: string;
}

/**
 * Agent 配置
 */
export interface AgentConfig {
  /** Agent 名称 */
  name: string;
  /** Agent 描述 */
  description: string;
  /** 可用工具列表 */
  tools: Tool[];
  /** 系统提示词 */
  systemPrompt: string;
  /** 思考模式 */
  thinkingMode?: ThinkingMode;
  /** 最大迭代次数 */
  maxIterations?: number;
  /** 是否启用记忆 */
  enableMemory?: boolean;
  /** 记忆容量 */
  memoryCapacity?: number;
}

/**
 * Agent 执行结果
 */
export interface AgentResult {
  /** 最终结果 */
  result: string;
  /** 执行的任务计划 */
  taskPlan: TaskPlan;
  /** 工具调用历史 */
  toolCalls: ToolCallResult[];
  /** 执行迭代次数 */
  iterations: number;
  /** 总执行时间（毫秒） */
  totalTime: number;
  /** 思考过程 */
  reasoning?: string;
}

/**
 * 记忆条目
 */
export interface MemoryEntry {
  /** 记忆 ID */
  id: string;
  /** 记忆内容 */
  content: string;
  /** 记忆类型 */
  type: 'fact' | 'preference' | 'context' | 'task';
  /** 重要性分数 */
  importance: number;
  /** 创建时间 */
  createdAt: number;
  /** 最后访问时间 */
  lastAccessed: number;
  /** 访问次数 */
  accessCount: number;
}

/**
 * Agent 服务
 * 借鉴豆包 AI 的 Agent 架构：规划-执行-反思循环
 */
export class ChatClawAgentService {
  private config: AgentConfig;
  private memory: Map<string, MemoryEntry> = new Map();
  private toolRegistry: Map<string, Tool> = new Map();
  private isExecuting = false;

  constructor(config: AgentConfig) {
    this.config = {
      maxIterations: 10,
      enableMemory: true,
      memoryCapacity: 100,
      thinkingMode: 'think_medium',
      ...config,
    };

    // 注册工具
    this.config.tools.forEach(tool => this.registerTool(tool));

    logger.info(`[ChatClawAgentService] Agent "${config.name}" initialized with ${config.tools.length} tools`);
  }

  /**
   * 注册工具
   */
  registerTool(tool: Tool): void {
    this.toolRegistry.set(tool.name, tool);
    logger.info(`[ChatClawAgentService] Tool registered: ${tool.name}`);
  }

  /**
   * 执行 Agent 任务
   * 借鉴豆包的规划-执行-反思循环
   */
  async execute(userInput: string, context?: string): Promise<AgentResult> {
    if (this.isExecuting) {
      throw new Error('Agent 正在执行其他任务，请稍后再试');
    }

    this.isExecuting = true;
    const startTime = Date.now();

    try {
      logger.info(`[ChatClawAgentService] Executing task: ${userInput}`);
      eventBus.emit('agent:task-started', { input: userInput });

      // 1. 任务规划（借鉴豆包的深度推理能力）
      const taskPlan = await this.planTask(userInput, context);
      logger.info(`[ChatClawAgentService] Task planned with ${taskPlan.subtasks.length} subtasks`);

      // 2. 执行子任务
      const toolCalls: ToolCallResult[] = [];
      let iterations = 0;

      for (const subtask of taskPlan.subtasks) {
        if (iterations >= (this.config.maxIterations || 10)) {
          logger.warn('[ChatClawAgentService] Max iterations reached');
          break;
        }

        // 检查依赖是否完成
        const dependenciesMet = subtask.dependencies.every(depId => {
          const dep = taskPlan.subtasks.find(t => t.id === depId);
          return dep?.status === 'completed';
        });

        if (!dependenciesMet) {
          logger.warn(`[ChatClawAgentService] Dependencies not met for subtask: ${subtask.id}`);
          subtask.status = 'failed';
          subtask.error = '依赖任务未完成';
          continue;
        }

        // 执行子任务
        subtask.status = 'in_progress';
        eventBus.emit('agent:subtask-started', { subtask });

        try {
          const result = await this.executeSubtask(subtask);
          subtask.result = result;
          subtask.status = 'completed';
          toolCalls.push(...result.toolCalls);
          
          logger.info(`[ChatClawAgentService] Subtask completed: ${subtask.id}`);
          eventBus.emit('agent:subtask-completed', { subtask, result });
        } catch (error) {
          subtask.status = 'failed';
          subtask.error = error instanceof Error ? error.message : '执行失败';
          
          logger.error(`[ChatClawAgentService] Subtask failed: ${subtask.id}`, error);
          eventBus.emit('agent:subtask-failed', { subtask, error });

          // 尝试修复或替代方案
          const recovered = await this.attemptRecovery(subtask, error as Error);
          if (recovered) {
            subtask.status = 'completed';
            subtask.result = recovered;
          }
        }

        iterations++;
      }

      // 3. 反思和总结
      const reflection = await this.reflectOnExecution(taskPlan, toolCalls);
      
      // 4. 生成最终结果
      const result = await this.generateResult(taskPlan, reflection);

      // 5. 保存到记忆
      if (this.config.enableMemory) {
        this.saveToMemory(userInput, result, taskPlan);
      }

      const totalTime = Date.now() - startTime;
      taskPlan.status = 'completed';
      taskPlan.completedAt = Date.now();

      const agentResult: AgentResult = {
        result,
        taskPlan,
        toolCalls,
        iterations,
        totalTime,
        reasoning: reflection,
      };

      logger.info(`[ChatClawAgentService] Task completed in ${totalTime}ms`);
      eventBus.emit('agent:task-completed', agentResult);

      return agentResult;
    } catch (error) {
      logger.error('[ChatClawAgentService] Task execution failed:', error);
      eventBus.emit('agent:task-failed', { error });
      throw error;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * 任务规划
   * 借鉴豆包的深度推理能力，将复杂任务分解为可执行的子任务
   */
  private async planTask(userInput: string, context?: string): Promise<TaskPlan> {
    const thinkingMode = this.config.thinkingMode || 'think_medium';
    const modeConfig = chatClawThinkingModeService.getModeConfig(thinkingMode);

    // 构建规划提示词
    const planningPrompt = this.buildPlanningPrompt(userInput, context);

    // 这里应该调用实际的 AI 模型进行任务规划
    // 目前使用模拟实现
    logger.info('[ChatClawAgentService] Planning task...');

    // 模拟任务规划
    const subtasks: SubTask[] = this.simulateTaskPlanning(userInput);

    return {
      id: `task-${Date.now()}`,
      description: userInput,
      subtasks,
      status: 'in_progress',
      createdAt: Date.now(),
    };
  }

  /**
   * 构建规划提示词
   */
  private buildPlanningPrompt(userInput: string, context?: string): string {
    const availableTools = Array.from(this.toolRegistry.values())
      .map(tool => `- ${tool.name}: ${tool.description}`)
      .join('\n');

    return `
你是一位专业的任务规划专家。请将用户的请求分解为具体的、可执行的子任务。

可用工具：
${availableTools}

用户请求：${userInput}
${context ? `上下文：${context}` : ''}

请按以下格式输出任务计划：
1. 子任务描述
   - 所需工具：[工具名]
   - 依赖：[依赖的子任务编号]

要求：
- 每个子任务应该是原子性的，不可再分
- 明确标注子任务之间的依赖关系
- 考虑异常情况和备选方案
`.trim();
  }

  /**
   * 模拟任务规划
   */
  private simulateTaskPlanning(userInput: string): SubTask[] {
    // 根据输入内容生成不同的任务计划
    if (userInput.includes('搜索') || userInput.includes('查询')) {
      return [
        {
          id: 'subtask-1',
          description: '分析查询意图和关键词',
          requiredTools: ['analyze_intent'],
          dependencies: [],
          status: 'pending',
        },
        {
          id: 'subtask-2',
          description: '执行搜索查询',
          requiredTools: ['search'],
          dependencies: ['subtask-1'],
          status: 'pending',
        },
        {
          id: 'subtask-3',
          description: '整理和总结搜索结果',
          requiredTools: ['summarize'],
          dependencies: ['subtask-2'],
          status: 'pending',
        },
      ];
    }

    if (userInput.includes('分析') || userInput.includes('计算')) {
      return [
        {
          id: 'subtask-1',
          description: '收集相关数据',
          requiredTools: ['fetch_data'],
          dependencies: [],
          status: 'pending',
        },
        {
          id: 'subtask-2',
          description: '执行数据分析',
          requiredTools: ['analyze_data'],
          dependencies: ['subtask-1'],
          status: 'pending',
        },
        {
          id: 'subtask-3',
          description: '生成分析报告',
          requiredTools: ['generate_report'],
          dependencies: ['subtask-2'],
          status: 'pending',
        },
      ];
    }

    // 默认任务计划
    return [
      {
        id: 'subtask-1',
        description: '理解用户意图',
        requiredTools: ['understand_intent'],
        dependencies: [],
        status: 'pending',
      },
      {
        id: 'subtask-2',
        description: '执行主要任务',
        requiredTools: ['execute_task'],
        dependencies: ['subtask-1'],
        status: 'pending',
      },
      {
        id: 'subtask-3',
        description: '验证和总结结果',
        requiredTools: ['verify_result'],
        dependencies: ['subtask-2'],
        status: 'pending',
      },
    ];
  }

  /**
   * 执行子任务
   */
  private async executeSubtask(subtask: SubTask): Promise<{ result: any; toolCalls: ToolCallResult[] }> {
    const toolCalls: ToolCallResult[] = [];
    const results: any[] = [];

    for (const toolName of subtask.requiredTools) {
      const tool = this.toolRegistry.get(toolName);
      
      if (!tool) {
        throw new Error(`工具未找到: ${toolName}`);
      }

      const startTime = Date.now();
      
      try {
        // 构建工具参数
        const args = this.buildToolArgs(tool, subtask);
        
        // 执行工具
        logger.info(`[ChatClawAgentService] Executing tool: ${toolName}`);
        const result = await tool.execute(args);
        
        const executionTime = Date.now() - startTime;
        
        toolCalls.push({
          toolName,
          arguments: args,
          result,
          executionTime,
          success: true,
        });

        results.push(result);
        
        logger.info(`[ChatClawAgentService] Tool executed successfully: ${toolName} (${executionTime}ms)`);
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        toolCalls.push({
          toolName,
          arguments: {},
          result: null,
          executionTime,
          success: false,
          error: error instanceof Error ? error.message : '执行失败',
        });

        throw error;
      }
    }

    return {
      result: results.length === 1 ? results[0] : results,
      toolCalls,
    };
  }

  /**
   * 构建工具参数
   */
  private buildToolArgs(tool: Tool, subtask: SubTask): Record<string, any> {
    const args: Record<string, any> = {};
    
    // 根据工具参数定义构建参数
    for (const [key, param] of Object.entries(tool.parameters.properties)) {
      if (param.enum) {
        args[key] = param.enum[0];
      } else {
        switch (param.type) {
          case 'string':
            args[key] = subtask.description;
            break;
          case 'number':
            args[key] = 0;
            break;
          case 'boolean':
            args[key] = true;
            break;
          case 'array':
            args[key] = [];
            break;
          case 'object':
            args[key] = {};
            break;
          default:
            args[key] = null;
        }
      }
    }

    return args;
  }

  /**
   * 尝试恢复失败的子任务
   */
  private async attemptRecovery(subtask: SubTask, error: Error): Promise<any> {
    logger.info(`[ChatClawAgentService] Attempting recovery for subtask: ${subtask.id}`);

    // 尝试使用替代工具
    for (const toolName of subtask.requiredTools) {
      const alternativeTool = this.findAlternativeTool(toolName);
      
      if (alternativeTool) {
        try {
          const args = this.buildToolArgs(alternativeTool, subtask);
          const result = await alternativeTool.execute(args);
          
          logger.info(`[ChatClawAgentService] Recovery successful with alternative tool: ${alternativeTool.name}`);
          return result;
        } catch (altError) {
          logger.warn(`[ChatClawAgentService] Alternative tool failed: ${alternativeTool.name}`);
        }
      }
    }

    // 尝试简化任务
    const simplifiedSubtask: SubTask = {
      ...subtask,
      description: `简化版: ${subtask.description}`,
      requiredTools: subtask.requiredTools.slice(0, 1), // 只使用第一个工具
    };

    try {
      const result = await this.executeSubtask(simplifiedSubtask);
      logger.info(`[ChatClawAgentService] Recovery successful with simplified task`);
      return result;
    } catch (simplifiedError) {
      logger.error(`[ChatClawAgentService] Recovery failed`);
      return null;
    }
  }

  /**
   * 查找替代工具
   */
  private findAlternativeTool(toolName: string): Tool | undefined {
    const tool = this.toolRegistry.get(toolName);
    if (!tool) return undefined;

    // 查找功能相似的替代工具
    for (const [name, candidate] of this.toolRegistry) {
      if (name !== toolName && this.isSimilarTool(tool, candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  /**
   * 判断工具是否相似
   */
  private isSimilarTool(tool1: Tool, tool2: Tool): boolean {
    // 简化实现：比较描述相似度
    const words1 = tool1.description.toLowerCase().split(' ');
    const words2 = tool2.description.toLowerCase().split(' ');
    const commonWords = words1.filter(w => words2.includes(w));
    
    return commonWords.length / Math.max(words1.length, words2.length) > 0.5;
  }

  /**
   * 反思执行过程
   * 借鉴豆包的自我反思能力
   */
  private async reflectOnExecution(
    taskPlan: TaskPlan,
    toolCalls: ToolCallResult[]
  ): Promise<string> {
    const completedSubtasks = taskPlan.subtasks.filter(t => t.status === 'completed').length;
    const failedSubtasks = taskPlan.subtasks.filter(t => t.status === 'failed').length;
    const successfulToolCalls = toolCalls.filter(t => t.success).length;

    const reflection = `
任务执行反思：
- 总子任务数: ${taskPlan.subtasks.length}
- 完成子任务: ${completedSubtasks}
- 失败子任务: ${failedSubtasks}
- 成功工具调用: ${successfulToolCalls}/${toolCalls.length}

执行总结：
${taskPlan.subtasks.map(t => `- ${t.description}: ${t.status}${t.error ? ` (${t.error})` : ''}`).join('\n')}
    `.trim();

    return reflection;
  }

  /**
   * 生成最终结果
   */
  private async generateResult(taskPlan: TaskPlan, reflection: string): Promise<string> {
    // 整合所有子任务的结果
    const results = taskPlan.subtasks
      .filter(t => t.status === 'completed' && t.result)
      .map(t => t.result);

    if (results.length === 0) {
      return '任务执行失败，未能获取有效结果。';
    }

    // 这里应该调用 AI 模型生成最终回答
    // 简化实现：直接返回结果摘要
    return `
任务执行完成！

执行摘要：
- 共执行 ${taskPlan.subtasks.length} 个子任务
- 成功完成 ${taskPlan.subtasks.filter(t => t.status === 'completed').length} 个
- 失败 ${taskPlan.subtasks.filter(t => t.status === 'failed').length} 个

结果：
${results.map((r, i) => `${i + 1}. ${JSON.stringify(r)}`).join('\n')}
    `.trim();
  }

  /**
   * 保存到记忆
   */
  private saveToMemory(input: string, result: string, taskPlan: TaskPlan): void {
    // 提取关键信息
    const memory: MemoryEntry = {
      id: `memory-${Date.now()}`,
      content: `任务: ${input}\n结果: ${result}`,
      type: 'task',
      importance: 0.7,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1,
    };

    this.memory.set(memory.id, memory);

    // 清理旧记忆
    if (this.memory.size > (this.config.memoryCapacity || 100)) {
      this.cleanupMemory();
    }

    logger.info(`[ChatClawAgentService] Memory saved: ${memory.id}`);
  }

  /**
   * 清理记忆
   */
  private cleanupMemory(): void {
    // 按重要性排序，删除最不重要的记忆
    const sortedMemories = Array.from(this.memory.values())
      .sort((a, b) => a.importance - b.importance);

    const toDelete = sortedMemories.slice(0, Math.floor(sortedMemories.length * 0.2));
    toDelete.forEach(m => this.memory.delete(m.id));

    logger.info(`[ChatClawAgentService] Memory cleanup: removed ${toDelete.length} entries`);
  }

  /**
   * 检索相关记忆
   */
  async retrieveRelevantMemories(query: string, limit: number = 5): Promise<MemoryEntry[]> {
    // 简化实现：返回最近访问的记忆
    return Array.from(this.memory.values())
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, limit);
  }

  /**
   * 获取 Agent 状态
   */
  getStatus(): {
    isExecuting: boolean;
    toolCount: number;
    memoryCount: number;
  } {
    return {
      isExecuting: this.isExecuting,
      toolCount: this.toolRegistry.size,
      memoryCount: this.memory.size,
    };
  }

  /**
   * 获取可用工具列表
   */
  getAvailableTools(): Tool[] {
    return Array.from(this.toolRegistry.values());
  }

  /**
   * 清空记忆
   */
  clearMemory(): void {
    this.memory.clear();
    logger.info('[ChatClawAgentService] Memory cleared');
  }
}

// 导出常用工具工厂函数
export function createSearchTool(searchFn: (query: string) => Promise<any>): Tool {
  return {
    name: 'search',
    description: '搜索信息',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索查询' },
      },
      required: ['query'],
    },
    execute: async (args) => searchFn(args.query),
  };
}

export function createCalculatorTool(): Tool {
  return {
    name: 'calculator',
    description: '执行数学计算',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: '数学表达式' },
      },
      required: ['expression'],
    },
    execute: async (args) => {
      try {
        // 注意：实际应用中应该使用安全的计算库
        const result = eval(args.expression);
        return { result };
      } catch (error) {
        throw new Error('计算失败: ' + (error instanceof Error ? error.message : '未知错误'));
      }
    },
  };
}

export function createDataFetchTool(fetchFn: (url: string) => Promise<any>): Tool {
  return {
    name: 'fetch_data',
    description: '获取数据',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: '数据 URL' },
      },
      required: ['url'],
    },
    execute: async (args) => fetchFn(args.url),
  };
}

/**
 * 创建 AgentReach 互联网搜索工具
 * 为 AI Agent 提供访问互联网的能力
 */
export function createAgentReachTools(agentReachService: any): Tool[] {
  return [
    // 网页搜索工具
    {
      name: 'internet_search',
      description: '搜索互联网获取最新信息。当需要查找实时新闻、研究资料、当前事件或任何需要网络检索的内容时使用此工具。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词或问题'
          },
          num_results: {
            type: 'number',
            description: '返回结果数量，默认10条'
          }
        },
        required: ['query'],
      },
      execute: async (args) => {
        const results = await agentReachService.search(args.query, {
          numResults: args.num_results || 10
        });
        return {
          query: args.query,
          results: results.map((r: any) => ({
            title: r.title,
            url: r.url,
            snippet: r.snippet
          })),
          count: results.length
        };
      }
    },

    // 读取网页内容工具
    {
      name: 'read_webpage',
      description: '读取并提取网页的完整内容。用于获取特定网页的详细信息，如文章、文档、报告等。',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: '网页 URL'
          },
          extract: {
            type: 'string',
            description: '可选，要提取的内容部分'
          }
        },
        required: ['url'],
      },
      execute: async (args) => {
        const content = await agentReachService.readWebPage(args.url, {
          extract: args.extract
        });
        return {
          title: content.title,
          url: content.url,
          content: content.content,
          readingTime: content.readingTime,
          excerpt: content.excerpt
        };
      }
    },

    // GitHub 搜索工具
    {
      name: 'search_github',
      description: '搜索 GitHub 仓库、代码、Issue 和用户。当需要查找开源项目、代码示例、技术文档或开发者信息时使用。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'GitHub 搜索关键词'
          },
          type: {
            type: 'string',
            description: '搜索类型：repo, code, issue, user',
            enum: ['repo', 'code', 'issue', 'user']
          },
          limit: {
            type: 'number',
            description: '返回结果数量，默认10'
          }
        },
        required: ['query'],
      },
      execute: async (args) => {
        const result = await agentReachService.getGitHubInfo({
          action: 'search',
          query: args.query,
          per_page: args.limit || 10
        });
        return result;
      }
    },

    // 视频信息获取工具
    {
      name: 'get_video_info',
      description: '获取 YouTube 或 Bilibili 视频的信息和字幕。用于获取视频内容、转录或视频元数据。',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: '视频 URL'
          },
          extract_subtitles: {
            type: 'boolean',
            description: '是否提取字幕，默认true'
          },
          extract_transcript: {
            type: 'boolean',
            description: '是否提取完整转录文本，默认true'
          }
        },
        required: ['url'],
      },
      execute: async (args) => {
        const videoInfo = await agentReachService.getVideoInfo(args.url, {
          extractSubtitles: args.extract_subtitles !== false,
          extractTranscript: args.extract_transcript !== false
        });
        return videoInfo;
      }
    },

    // Reddit 内容获取工具
    {
      name: 'get_reddit',
      description: '获取 Reddit 帖子、评论和社区内容。用于获取社区讨论、热门帖子、用户信息等。',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: '操作类型：subreddit, post, user, search',
            enum: ['subreddit', 'post', 'user', 'search']
          },
          subreddit: {
            type: 'string',
            description: '子版块名称（用于 subreddit 和 search 操作）'
          },
          post_id: {
            type: 'string',
            description: '帖子 ID（用于 post 操作）'
          },
          username: {
            type: 'string',
            description: '用户名（用于 user 操作）'
          },
          query: {
            type: 'string',
            description: '搜索关键词（用于 search 操作）'
          },
          sort: {
            type: 'string',
            description: '排序方式：hot, new, top, rising',
            enum: ['hot', 'new', 'top', 'rising']
          },
          limit: {
            type: 'number',
            description: '返回结果数量，默认10'
          }
        },
        required: ['action'],
      },
      execute: async (args) => {
        const result = await agentReachService.getRedditInfo({
          action: args.action,
          subreddit: args.subreddit,
          postId: args.post_id,
          username: args.username,
          query: args.query,
          sort: args.sort || 'hot',
          limit: args.limit || 10
        });
        return result;
      }
    },

    // Twitter/X 内容获取工具
    {
      name: 'get_twitter',
      description: '获取 Twitter/X 用户信息和推文内容。用于获取用户资料、推文或话题搜索。',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: '操作类型：user, tweet, search',
            enum: ['user', 'tweet', 'search']
          },
          username: {
            type: 'string',
            description: 'Twitter 用户名（用于 user 操作）'
          },
          tweet_id: {
            type: 'string',
            description: '推文 ID（用于 tweet 操作）'
          },
          query: {
            type: 'string',
            description: '搜索关键词（用于 search 操作）'
          },
          limit: {
            type: 'number',
            description: '返回结果数量，默认10'
          }
        },
        required: ['action'],
      },
      execute: async (args) => {
        const result = await agentReachService.getTwitterInfo({
          action: args.action,
          username: args.username,
          tweetId: args.tweet_id,
          query: args.query,
          maxResults: args.limit || 10
        });
        return result;
      }
    },

    // RSS 订阅源获取工具
    {
      name: 'get_rss',
      description: '获取 RSS/Atom 订阅源的最新内容。用于获取博客、新闻网站或任何支持 RSS 的内容源的更新。',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'RSS/Atom 订阅源 URL'
          },
          limit: {
            type: 'number',
            description: '返回条目数量，默认20'
          }
        },
        required: ['url'],
      },
      execute: async (args) => {
        const result = await agentReachService.getRSSFeed(args.url, args.limit || 20);
        return result;
      }
    }
  ];
}
