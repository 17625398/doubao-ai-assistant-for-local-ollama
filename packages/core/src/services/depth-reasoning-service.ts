/**
 * 深度推理服务
 * 提供基于思维链的深度推理功能，支持复杂问题的分析和解决
 */

import { OpenAICompatibleClient } from '../utils/openai-compatible-client';
import { logger } from '../utils/logger';

// ChatClawCommand 类型定义
export interface ChatClawCommand {
  type: string;
  args?: string;
  parameters?: Record<string, any>;
}

logger.setPrefix('[DepthReasoningService]');

export interface ReasoningOptions {
  /** 推理深度级别 */
  depth?: 'shallow' | 'medium' | 'deep';
  /** 是否启用思维链可视化 */
  visualize?: boolean;
  /** 最大推理步数 */
  maxSteps?: number;
  /** 推理模式 */
  mode?: 'deductive' | 'inductive' | 'abductive';
  /** 语言 */
  language?: string;
}

export interface ReasoningResult {
  /** 最终答案 */
  answer: string;
  /** 推理过程 */
  reasoning: string;
  /** 推理步骤 */
  steps: ReasoningStep[];
  /** 推理深度 */
  depth: string;
  /** 推理时间 */
  time: number;
  /** 推理模式 */
  mode: string;
  /** 成功状态 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

export interface ReasoningStep {
  /** 步骤编号 */
  step: number;
  /** 步骤类型 */
  type: string;
  /** 步骤内容 */
  content: string;
  /** 步骤时间 */
  time: number;
}

export class DepthReasoningService {
  private openAIClient: OpenAICompatibleClient | null = null;
  private tokenBudget: number = 10000; // 默认Token预算
  private tokenUsage: number = 0; // 已使用的Token数

  constructor() {
    // 延迟初始化OpenAICompatibleClient实例
  }

  private getOpenAIClient(): OpenAICompatibleClient {
    if (!this.openAIClient) {
      this.openAIClient = new OpenAICompatibleClient({
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '', // 会在运行时从配置中获取
        defaultModel: 'gpt-3.5-turbo',
        timeout: 60000,
        streamEnabled: true
      });
    }
    return this.openAIClient;
  }

  /**
   * 设置Token预算
   * @param budget Token预算
   */
  setTokenBudget(budget: number): void {
    this.tokenBudget = budget;
    logger.info(`Token预算已设置为: ${budget}`);
  }

  /**
   * 获取Token使用情况
   * @returns Token使用情况
   */
  getTokenUsage(): { used: number; budget: number; remaining: number } {
    return {
      used: this.tokenUsage,
      budget: this.tokenBudget,
      remaining: this.tokenBudget - this.tokenUsage
    };
  }

  /**
   * 重置Token使用计数
   */
  resetTokenUsage(): void {
    this.tokenUsage = 0;
    logger.info('Token使用计数已重置');
  }

  /**
   * 估算文本的Token数
   * @param text 文本
   * @returns 估算的Token数
   */
  estimateTokenCount(text: string): number {
    // 粗略估算：1个Token约等于4个字符
    return Math.ceil(text.length / 4);
  }

  /**
   * 检查Token预算是否足够
   * @param estimatedTokens 估算的Token数
   * @returns 是否足够
   */
  private checkTokenBudget(estimatedTokens: number): boolean {
    const remaining = this.tokenBudget - this.tokenUsage;
    if (remaining < estimatedTokens) {
      logger.warn(`Token预算不足: 剩余 ${remaining}, 需要 ${estimatedTokens}`);
      return false;
    }
    return true;
  }

  /**
   * 记录Token使用
   * @param tokens 使用的Token数
   */
  private recordTokenUsage(tokens: number): void {
    this.tokenUsage += tokens;
    logger.info(`Token使用更新: 已使用 ${this.tokenUsage}, 剩余 ${this.tokenBudget - this.tokenUsage}`);
  }

  /**
   * 执行深度推理
   * @param question 问题
   * @param options 推理选项
   * @returns 推理结果
   */
  async reason(question: string, options: ReasoningOptions = {}): Promise<ReasoningResult> {
    const startTime = Date.now();
    
    try {
      const {
        depth = 'medium',
        visualize = true,
        maxSteps = 10,
        mode = 'deductive',
        language = 'auto'
      } = options;

      // 构建推理提示
      const prompt = this.buildReasoningPrompt(question, { depth, mode, language });

      // 估算Token使用
      const estimatedTokens = this.estimateTokenCount(prompt) + 1000; // 额外预留1000Token用于响应
      
      // 检查Token预算
      if (!this.checkTokenBudget(estimatedTokens)) {
        // 尝试降低推理深度以减少Token使用
        const adjustedOptions: ReasoningOptions = { ...options, depth: 'shallow' };
        const adjustedPrompt = this.buildReasoningPrompt(question, { depth: 'shallow', mode, language });
        const adjustedEstimatedTokens = this.estimateTokenCount(adjustedPrompt) + 500;
        
        if (this.checkTokenBudget(adjustedEstimatedTokens)) {
          logger.warn('Token预算不足，自动降低推理深度');
          return this.reason(question, adjustedOptions);
        }
        
        return {
          answer: '',
          reasoning: '',
          steps: [],
          depth: 'shallow',
          time: Date.now() - startTime,
          mode: 'deductive',
          success: false,
          error: 'Token预算不足，无法执行深度推理'
        };
      }

      // 调用OpenAI API进行推理
      const response = await this.getOpenAIClient().generate({ prompt });

      // 记录Token使用
      const actualTokens = this.estimateTokenCount(prompt + response.content);
      this.recordTokenUsage(actualTokens);

      // 解析推理结果
      const result = this.parseReasoningResponse(response.content, question, startTime, {
        depth, mode, visualize
      });

      logger.info('深度推理执行成功');
      return result;
    } catch (error) {
      logger.error('深度推理执行失败:', error);
      return {
        answer: '',
        reasoning: '',
        steps: [],
        depth: 'shallow',
        time: Date.now() - startTime,
        mode: 'deductive',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 构建推理提示
   * @param question 问题
   * @param options 推理选项
   * @returns 提示词
   */
  private buildReasoningPrompt(question: string, options: {
    depth: string;
    mode: string;
    language: string;
  }): string {
    const { depth, mode, language } = options;
    
    const depthInstructions = {
      shallow: '提供简短的推理过程，直接回答问题。',
      medium: '提供详细的推理过程，逐步分析问题。',
      deep: '提供深度的推理过程，考虑多种可能性和边缘情况，全面分析问题。'
    };

    const modeInstructions = {
      deductive: '使用演绎推理，从一般原理出发，推导出具体结论。',
      inductive: '使用归纳推理，从具体例子出发，概括出一般规律。',
      abductive: '使用溯因推理，从观察到的现象出发，提出最合理的解释。'
    };

    const languageInstructions = language === 'auto' 
      ? '使用与问题相同的语言回答。' 
      : `使用${language}语言回答。`;

    return `You are a deep reasoning assistant. Please follow these instructions:

${languageInstructions}

${depthInstructions[depth as keyof typeof depthInstructions]}

${modeInstructions[mode as keyof typeof modeInstructions]}

Please structure your response as follows:

Step 1: [Step type]
[Step content]

Step 2: [Step type]
[Step content]

...

---
Final Answer: [Your final answer]

Now, please answer the following question:

${question}`;
  }

  /**
   * 解析推理响应
   * @param response API响应
   * @param question 问题
   * @param startTime 开始时间
   * @param options 推理选项
   * @returns 推理结果
   */
  private parseReasoningResponse(response: string, question: string, startTime: number, options: {
    depth: string;
    mode: string;
    visualize: boolean;
  }): ReasoningResult {
    const { depth, mode, visualize } = options;
    
    // 提取推理步骤
    const steps: ReasoningStep[] = [];
    const stepRegex = /Step (\d+):\s*\[(.*?)\]\s*(.*?)(?=Step \d+:|\n---\nFinal Answer:|$)/gs;
    let match;
    
    while ((match = stepRegex.exec(response)) !== null) {
      steps.push({
        step: parseInt(match[1]),
        type: match[2].trim(),
        content: match[3].trim(),
        time: Date.now() - startTime
      });
    }

    // 提取最终答案
    const answerRegex = /\n---\nFinal Answer:\s*(.*)/s;
    const answerMatch = answerRegex.exec(response);
    const answer = answerMatch ? answerMatch[1].trim() : '';

    // 构建推理过程文本
    const reasoning = steps.map(step => 
      `Step ${step.step}: [${step.type}]
${step.content}`
    ).join('\n\n');

    return {
      answer,
      reasoning,
      steps,
      depth,
      time: Date.now() - startTime,
      mode,
      success: true
    };
  }

  /**
   * 处理深度推理命令
   * @param command 命令对象
   * @returns 推理结果
   */
  async handleReasonCommand(command: ChatClawCommand): Promise<string> {
    try {
      const question = command.args || '';
      
      if (!question) {
        return '请输入要推理的问题，例如：/chatclaw reason 如何解决气候变化问题？';
      }

      const options: ReasoningOptions = {
        depth: 'deep',
        visualize: true,
        maxSteps: 10,
        mode: 'deductive',
        language: 'auto'
      };

      // 解析命令参数
      if (command.args) {
        if (command.args.includes('--shallow')) {
          options.depth = 'shallow';
        } else if (command.args.includes('--deep')) {
          options.depth = 'deep';
        }
        
        if (command.args.includes('--inductive')) {
          options.mode = 'inductive';
        } else if (command.args.includes('--abductive')) {
          options.mode = 'abductive';
        }
      }

      // 执行推理
      const result = await this.reason(question, options);

      // 构建响应
      let response = `# 深度推理结果\n\n`;
      response += `## 问题\n${question}\n\n`;
      response += `## 推理模式\n${options.mode === 'deductive' ? '演绎推理' : options.mode === 'inductive' ? '归纳推理' : '溯因推理'}\n\n`;
      response += `## 推理深度\n${options.depth === 'shallow' ? '浅层' : options.depth === 'medium' ? '中层' : '深层'}\n\n`;
      
      if (result.steps.length > 0) {
        response += `## 推理过程\n`;
        result.steps.forEach(step => {
          response += `### Step ${step.step}: [${step.type}]\n${step.content}\n\n`;
        });
      }
      
      response += `## 最终答案\n${result.answer}\n\n`;
      response += `## 推理统计\n`;
      response += `- 推理步数: ${result.steps.length}\n`;
      response += `- 推理时间: ${result.time}ms\n`;

      return response;
    } catch (error) {
      logger.error('处理推理命令失败:', error);
      return `执行深度推理失败: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * 执行多步骤推理
   * @param problem 问题
   * @param steps 推理步骤
   * @returns 推理结果
   */
  async multiStepReasoning(problem: string, steps: string[]): Promise<ReasoningResult> {
    const startTime = Date.now();
    
    try {
      let context = problem;
      const reasoningSteps: ReasoningStep[] = [];
      let totalEstimatedTokens = 0;
      
      // 估算总Token使用
      for (let i = 0; i < steps.length; i++) {
        const stepPrompt = `\n\nStep ${i + 1}: ${steps[i]}\n\nContext: ${context}\n\nPlease provide your reasoning for this step.`;
        totalEstimatedTokens += this.estimateTokenCount(stepPrompt) + 500; // 每个步骤预留500Token
      }
      
      // 估算最终答案的Token使用
      const finalPrompt = `\n\nBased on the reasoning steps above, please provide a final answer to the original problem:\n\n${problem}`;
      totalEstimatedTokens += this.estimateTokenCount(finalPrompt) + 500;
      
      // 检查Token预算
      if (!this.checkTokenBudget(totalEstimatedTokens)) {
        return {
          answer: '',
          reasoning: '',
          steps: [],
          depth: 'shallow',
          time: Date.now() - startTime,
          mode: 'deductive',
          success: false,
          error: 'Token预算不足，无法执行多步骤推理'
        };
      }
      
      for (let i = 0; i < steps.length; i++) {
        const stepPrompt = `\n\nStep ${i + 1}: ${steps[i]}\n\nContext: ${context}\n\nPlease provide your reasoning for this step.`;
        
        const response = await this.getOpenAIClient().generate({ prompt: stepPrompt });
        
        // 记录Token使用
        const stepTokens = this.estimateTokenCount(stepPrompt + response.content);
        this.recordTokenUsage(stepTokens);
        
        reasoningSteps.push({
          step: i + 1,
          type: steps[i],
          content: response.content,
          time: Date.now() - startTime
        });
        
        context += `\n\nStep ${i + 1} Result: ${response.content}`;
      }
      
      // 生成最终答案
      const finalPromptActual = `\n\nBased on the reasoning steps above, please provide a final answer to the original problem:\n\n${problem}`;
      const finalResponse = await this.getOpenAIClient().generate({ prompt: finalPromptActual });
      
      // 记录最终答案的Token使用
      const finalTokens = this.estimateTokenCount(finalPromptActual + finalResponse.content);
      this.recordTokenUsage(finalTokens);
      
      const reasoning = reasoningSteps.map(step => 
        `Step ${step.step}: [${step.type}]\n${step.content}`
      ).join('\n\n');
      
      return {
        answer: finalResponse.content,
        reasoning,
        steps: reasoningSteps,
        depth: 'deep',
        time: Date.now() - startTime,
        mode: 'deductive',
        success: true
      };
    } catch (error) {
      logger.error('多步骤推理失败:', error);
      return {
        answer: '',
        reasoning: '',
        steps: [],
        depth: 'shallow',
        time: Date.now() - startTime,
        mode: 'deductive',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// 导出单例实例
export const depthReasoningService = new DepthReasoningService();
