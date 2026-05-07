/**
 * ChatClaw 四层思考模式服务
 * 借鉴豆包 AI 的四层思考模式实现
 * no_think / think_low / think_medium / think_high
 */

import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';

/**
 * 思考模式类型
 */
export type ThinkingMode = 'no_think' | 'think_low' | 'think_medium' | 'think_high';

/**
 * 思考模式配置
 */
export interface ThinkingModeConfig {
  /** 温度参数 */
  temperature: number;
  /** 最大 token 数 */
  maxTokens: number;
  /** 推理努力程度 */
  reasoningEffort: 'low' | 'medium' | 'high';
  /** 是否启用深度推理 */
  enableDeepReasoning: boolean;
  /** 上下文窗口大小 */
  contextWindow: number;
  /** 响应速度优先级 */
  speedPriority: number; // 0-1, 越高越注重速度
  /** 质量优先级 */
  qualityPriority: number; // 0-1, 越高越注重质量
}

/**
 * AI 请求选项
 */
export interface AIRequestOptions {
  /** 思考模式 */
  thinkingMode?: ThinkingMode;
  /** 最大 token 数 */
  maxTokens?: number;
  /** 温度参数 */
  temperature?: number;
  /** 上下文窗口 */
  contextWindow?: number;
  /** 系统提示词 */
  systemPrompt?: string;
  /** 是否流式输出 */
  streaming?: boolean;
}

/**
 * AI 响应结果
 */
export interface AIResponse {
  /** 响应内容 */
  content: string;
  /** 使用的思考模式 */
  thinkingMode: ThinkingMode;
  /** 使用的 token 数 */
  tokensUsed: number;
  /** 响应时间（毫秒） */
  responseTime: number;
  /** 是否使用了深度推理 */
  usedDeepReasoning: boolean;
}

/**
 * 四层思考模式服务
 * 借鉴豆包 AI 的动态计算分配设计哲学
 */
export class ChatClawThinkingModeService {
  private currentMode: ThinkingMode = 'think_medium';
  private modeConfigs: Map<ThinkingMode, ThinkingModeConfig> = new Map();

  constructor() {
    this.initializeModeConfigs();
    logger.info('[ChatClawThinkingModeService] Initialized with 4 thinking modes');
  }

  /**
   * 初始化各思考模式的配置
   * 基于豆包 AI 的四层思考模式设计
   */
  private initializeModeConfigs(): void {
    // no_think 模式：毫秒级响应，适合简单查询
    this.modeConfigs.set('no_think', {
      temperature: 0.3,
      maxTokens: 256,
      reasoningEffort: 'low',
      enableDeepReasoning: false,
      contextWindow: 2048,
      speedPriority: 1.0,
      qualityPriority: 0.2,
    });

    // think_low 模式：快速响应，适合一般对话
    this.modeConfigs.set('think_low', {
      temperature: 0.5,
      maxTokens: 512,
      reasoningEffort: 'low',
      enableDeepReasoning: false,
      contextWindow: 4096,
      speedPriority: 0.8,
      qualityPriority: 0.4,
    });

    // think_medium 模式：平衡模式，适合常规任务（默认）
    this.modeConfigs.set('think_medium', {
      temperature: 0.7,
      maxTokens: 1024,
      reasoningEffort: 'medium',
      enableDeepReasoning: false,
      contextWindow: 8192,
      speedPriority: 0.5,
      qualityPriority: 0.7,
    });

    // think_high 模式：深度思考，适合复杂推理
    this.modeConfigs.set('think_high', {
      temperature: 0.9,
      maxTokens: 2048,
      reasoningEffort: 'high',
      enableDeepReasoning: true,
      contextWindow: 32768, // 32K 上下文
      speedPriority: 0.2,
      qualityPriority: 1.0,
    });
  }

  /**
   * 获取指定思考模式的配置
   */
  getModeConfig(mode: ThinkingMode): ThinkingModeConfig {
    const config = this.modeConfigs.get(mode);
    if (!config) {
      logger.warn(`[ChatClawThinkingModeService] Unknown mode: ${mode}, using medium`);
      return this.modeConfigs.get('think_medium')!;
    }
    return config;
  }

  /**
   * 获取当前思考模式
   */
  getCurrentMode(): ThinkingMode {
    return this.currentMode;
  }

  /**
   * 设置当前思考模式
   */
  setCurrentMode(mode: ThinkingMode): void {
    if (!this.modeConfigs.has(mode)) {
      logger.error(`[ChatClawThinkingModeService] Invalid mode: ${mode}`);
      return;
    }
    this.currentMode = mode;
    eventBus.emit('thinking-mode:changed', { mode, config: this.getModeConfig(mode) });
    logger.info(`[ChatClawThinkingModeService] Mode changed to: ${mode}`);
  }

  /**
   * 根据查询自动选择思考模式
   * 基于查询复杂度、长度、关键词等因素
   */
  autoSelectMode(query: string): ThinkingMode {
    const complexity = this.analyzeQueryComplexity(query);
    
    if (complexity < 0.3) {
      return 'no_think';
    } else if (complexity < 0.5) {
      return 'think_low';
    } else if (complexity < 0.8) {
      return 'think_medium';
    } else {
      return 'think_high';
    }
  }

  /**
   * 分析查询复杂度
   * 返回 0-1 的复杂度分数
   */
  private analyzeQueryComplexity(query: string): number {
    let complexity = 0.5; // 基础复杂度

    // 1. 查询长度
    const length = query.length;
    if (length < 20) {
      complexity -= 0.2;
    } else if (length > 200) {
      complexity += 0.2;
    }

    // 2. 复杂关键词检测
    const complexKeywords = [
      '分析', '解释', '比较', '对比', '评估', '推理',
      '为什么', '如何', '怎么做', '步骤', '流程',
      '优化', '改进', '设计', '架构', '方案',
      '数学', '计算', '证明', '推导', '逻辑',
      '代码', '编程', '算法', '调试', '错误',
    ];
    
    for (const keyword of complexKeywords) {
      if (query.includes(keyword)) {
        complexity += 0.1;
      }
    }

    // 3. 多部分问题检测
    const questionMarks = (query.match(/[?？]/g) || []).length;
    if (questionMarks > 1) {
      complexity += 0.15 * questionMarks;
    }

    // 4. 代码或技术内容检测
    const codePatterns = [
      /```[\s\S]*?```/, // 代码块
      /`[^`]+`/, // 行内代码
      /\b(function|class|const|let|var|if|for|while)\b/, // 代码关键字
      /\b(import|export|from|require)\b/, // 模块关键字
    ];
    
    for (const pattern of codePatterns) {
      if (pattern.test(query)) {
        complexity += 0.15;
        break;
      }
    }

    // 5. 长文档或数据分析检测
    if (query.includes('文档') || query.includes('文件') || 
        query.includes('数据') || query.includes('报告')) {
      complexity += 0.1;
    }

    // 限制在 0-1 范围内
    return Math.max(0, Math.min(1, complexity));
  }

  /**
   * 构建 AI 请求配置
   * 根据思考模式和其他选项生成最终的请求配置
   */
  buildRequestConfig(options: AIRequestOptions = {}): {
    temperature: number;
    maxTokens: number;
    reasoningEffort: 'low' | 'medium' | 'high';
    contextWindow: number;
    systemPrompt?: string;
  } {
    const mode = options.thinkingMode || this.currentMode;
    const modeConfig = this.getModeConfig(mode);

    return {
      temperature: options.temperature ?? modeConfig.temperature,
      maxTokens: options.maxTokens ?? modeConfig.maxTokens,
      reasoningEffort: modeConfig.reasoningEffort,
      contextWindow: options.contextWindow ?? modeConfig.contextWindow,
      systemPrompt: options.systemPrompt,
    };
  }

  /**
   * 获取思考模式的描述信息
   */
  getModeDescription(mode: ThinkingMode): {
    name: string;
    description: string;
    useCases: string[];
    estimatedTime: string;
  } {
    const descriptions: Record<ThinkingMode, {
      name: string;
      description: string;
      useCases: string[];
      estimatedTime: string;
    }> = {
      no_think: {
        name: '极速模式',
        description: '毫秒级响应，适合简单查询和快速确认',
        useCases: [
          '简单的事实查询',
          '快速确认',
          '简短问候',
          '简单指令',
        ],
        estimatedTime: '< 1秒',
      },
      think_low: {
        name: '快速模式',
        description: '快速响应，适合一般对话和常见问题',
        useCases: [
          '日常对话',
          '简单解释',
          '常见问题',
          '快速建议',
        ],
        estimatedTime: '1-2秒',
      },
      think_medium: {
        name: '平衡模式',
        description: '平衡速度与质量，适合大多数任务（默认）',
        useCases: [
          '一般咨询',
          '内容创作',
          '代码辅助',
          '数据分析',
        ],
        estimatedTime: '2-5秒',
      },
      think_high: {
        name: '深度模式',
        description: '深度思考，适合复杂推理和专业任务',
        useCases: [
          '复杂分析',
          '数学推理',
          '代码调试',
          '架构设计',
          '长文档处理',
        ],
        estimatedTime: '5-15秒',
      },
    };

    return descriptions[mode];
  }

  /**
   * 获取所有可用的思考模式
   */
  getAllModes(): ThinkingMode[] {
    return ['no_think', 'think_low', 'think_medium', 'think_high'];
  }

  /**
   * 思考模式切换建议
   * 根据当前对话历史建议合适的思考模式
   */
  suggestModeForConversation(
    messages: Array<{ role: string; content: string }>,
    currentQuery: string
  ): ThinkingMode {
    // 1. 分析当前查询
    const queryComplexity = this.analyzeQueryComplexity(currentQuery);
    
    // 2. 分析对话历史
    let historyComplexity = 0.5;
    if (messages.length > 0) {
      const recentMessages = messages.slice(-5); // 最近 5 条消息
      const avgLength = recentMessages.reduce((sum, m) => sum + m.content.length, 0) / recentMessages.length;
      
      if (avgLength > 500) {
        historyComplexity += 0.2;
      }
      
      // 检测是否有复杂话题
      const complexTopics = ['错误', '问题', '调试', '优化', '设计', '架构'];
      for (const msg of recentMessages) {
        for (const topic of complexTopics) {
          if (msg.content.includes(topic)) {
            historyComplexity += 0.1;
            break;
          }
        }
      }
    }

    // 3. 综合评分
    const totalComplexity = (queryComplexity + historyComplexity) / 2;
    
    if (totalComplexity < 0.3) return 'no_think';
    if (totalComplexity < 0.5) return 'think_low';
    if (totalComplexity < 0.8) return 'think_medium';
    return 'think_high';
  }
}

// 导出单例实例
export const chatClawThinkingModeService = new ChatClawThinkingModeService();
