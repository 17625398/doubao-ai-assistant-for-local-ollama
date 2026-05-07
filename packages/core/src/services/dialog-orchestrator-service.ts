import type {
  DialogIntent,
  StructuredAssistantResponse,
  SuggestedFollowUp
} from '../types';
import {
  enhancedFollowUpService,
  FollowUpContext,
  FollowUpOption
} from './enhanced-followup-service';
import { logger } from '../utils/logger';

export interface DialogOrchestratorContext {
  userInput: string;
  assistantOutput: string;
  intent?: DialogIntent;
  conversationId?: string;
  managedContext?: {
    summary?: string;
    keyPoints?: string[];
    strategy?: string;
    compressionRatio?: number;
  };
  /** 额外上下文 */
  extraContext?: {
    keyEntities?: string[];
    keyTopics?: string[];
    detectedQuestions?: string[];
    sentiment?: 'positive' | 'neutral' | 'negative';
    complexity?: 'simple' | 'moderate' | 'complex';
    hasLinks?: boolean;
    hasCode?: boolean;
    hasNumbers?: boolean;
  };
}

export class DialogOrchestratorService {
  detectIntent(input: string): DialogIntent {
    const normalized = input.trim().toLowerCase();

    if (/(搜索|查找|搜一下|search|lookup|找资料|最新|新闻)/.test(normalized)) {
      return 'search';
    }
    if (/(总结|概括|摘要|summar)/.test(normalized)) {
      return 'summary';
    }
    if (/(分析|对比|原因|为什么|推导|评估|review|诊断)/.test(normalized)) {
      return 'analysis';
    }
    if (/(写|润色|改写|文案|邮件|报告|方案|draft)/.test(normalized)) {
      return 'writing';
    }
    if (/(待办|任务|计划|下一步|todo|安排)/.test(normalized)) {
      return 'task';
    }
    if (/(文档|pdf|附件|文件|上传|知识库)/.test(normalized)) {
      return 'document';
    }
    if (/^\/|工具|调用|openclaw|omb|browser/.test(normalized)) {
      return 'tool_call';
    }

    return 'general_chat';
  }

  buildStructuredResponse(context: DialogOrchestratorContext): StructuredAssistantResponse {
    const intent = context.intent || this.detectIntent(context.userInput);
    const answer = context.assistantOutput.trim();
    const summary = this.buildSummary(answer, context.managedContext?.summary);
    const evidence = this.extractEvidence(answer, context.managedContext?.keyPoints);
    const actions = this.buildActions(context.userInput, answer, context.managedContext);

    // 使用增强追问服务生成建议
    const enhancedFollowUps = this.buildEnhancedFollowUps(context, intent);

    return {
      summary,
      answer,
      evidence,
      suggestedFollowUps: enhancedFollowUps,
      actions
    };
  }

  /**
   * 使用增强追问服务生成追问建议
   */
  private buildEnhancedFollowUps(
    context: DialogOrchestratorContext,
    intent: DialogIntent
  ): SuggestedFollowUp[] {
    try {
      // 构建追问上下文
      const followUpContext: FollowUpContext = {
        conversationId: context.conversationId,
        userIntent: context.intent || intent,
        assistantResponse: context.assistantOutput,
        keyEntities: context.extraContext?.keyEntities,
        keyTopics: context.extraContext?.keyTopics,
        detectedQuestions: context.extraContext?.detectedQuestions,
        sentiment: context.extraContext?.sentiment,
        complexity: context.extraContext?.complexity,
        hasLinks: context.extraContext?.hasLinks ?? /https?:\/\//.test(context.assistantOutput),
        hasCode: context.extraContext?.hasCode ?? /```[\s\S]*?```/.test(context.assistantOutput),
        hasNumbers: context.extraContext?.hasNumbers ?? /\d+/.test(context.assistantOutput)
      };

      // 生成增强追问
      const enhancedOptions = enhancedFollowUpService.generateFollowUps(followUpContext);

      // 转换格式
      return enhancedOptions.map((option: FollowUpOption) => ({
        id: option.id,
        label: option.label,
        prompt: option.prompt
      }));
    } catch (error) {
      logger.warn('[DialogOrchestrator] Failed to generate enhanced follow-ups, using fallback');
      // 回退到原有逻辑
      return this.buildFollowUps(
        intent,
        context.userInput,
        context.assistantOutput,
        context.managedContext?.keyPoints || []
      );
    }
  }

  private buildSummary(answer: string, contextSummary?: string): string {
    const normalized = answer.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return contextSummary || '暂无可提炼摘要';
    }

    const sentence = normalized.split(/(?<=[。！？!?.])\s+/)[0]?.trim() || normalized;
    const shortSentence = sentence.length > 80 ? `${sentence.slice(0, 80)}...` : sentence;

    if (!contextSummary || contextSummary.trim() === shortSentence) {
      return shortSentence;
    }

    return `${shortSentence} | 上下文：${contextSummary.trim().slice(0, 40)}${contextSummary.trim().length > 40 ? '...' : ''}`;
  }

  private extractEvidence(answer: string, keyPoints: string[] = []): string[] | undefined {
    const lines = answer
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const evidence = lines.filter((line) =>
      /^(\d+\.|- |\* )/.test(line) || /(原因|依据|结论|建议|风险|步骤)/.test(line)
    );

    const merged = [...evidence, ...keyPoints].filter(Boolean);
    const unique = Array.from(new Set(merged));

    return unique.length > 0 ? unique.slice(0, 4) : undefined;
  }

  private buildActions(
    userInput: string,
    answer: string,
    managedContext?: DialogOrchestratorContext['managedContext']
  ): string[] | undefined {
    const actions: string[] = [];
    const normalizedInput = userInput.toLowerCase();
    const normalizedAnswer = answer.toLowerCase();

    if (/(修复|排查|报错|失败|错误)/.test(normalizedInput) || /(fix|error|failed)/.test(normalizedAnswer)) {
      actions.push('继续排查根因');
      actions.push('输出修复步骤');
    }
    if (/(方案|计划|实现|改造)/.test(normalizedInput)) {
      actions.push('拆解为可执行任务');
    }
    if (/(总结|摘要)/.test(normalizedInput)) {
      actions.push('提炼成要点列表');
    }
    if (managedContext?.compressionRatio && managedContext.compressionRatio < 1) {
      actions.push('基于上下文摘要继续追问');
    }
    if (managedContext?.strategy === 'adaptive' && managedContext.keyPoints?.length) {
      actions.push('围绕关键点继续展开');
    }

    const unique = Array.from(new Set(actions));
    return unique.length > 0 ? unique : undefined;
  }

  /**
   * 回退追问方法（增强服务失败时使用）
   */
  private buildFollowUps(
    intent: DialogIntent,
    userInput: string,
    answer: string,
    keyPoints: string[] = []
  ): SuggestedFollowUp[] {
    const prompts = this.getIntentFollowUps(intent, userInput, answer, keyPoints).slice(0, 4);

    return prompts.map((prompt, index) => ({
      id: `followup-${intent}-${index + 1}`,
      label: prompt.length > 18 ? `${prompt.slice(0, 18)}...` : prompt,
      prompt
    }));
  }

  private getIntentFollowUps(
    intent: DialogIntent,
    userInput: string,
    answer: string,
    keyPoints: string[] = []
  ): string[] {
    if (keyPoints.length > 0) {
      const contextualPrompts = keyPoints
        .filter((item) => item.trim().length > 0)
        .slice(0, 2)
        .map((item) => `继续展开这一点：${item}`);

      if (contextualPrompts.length > 0) {
        return [...contextualPrompts, ...this.getIntentFollowUps(intent, userInput, answer, [])];
      }
    }

    switch (intent) {
      case 'search':
        return [
          '把结果整理成 3 条重点结论',
          '给我这些信息的可信度判断',
          '继续搜索相关的最新进展',
          '基于这些结果给出下一步建议'
        ];
      case 'summary':
        return [
          '再压缩成一句话结论',
          '改写成适合汇报的版本',
          '提炼成 5 个要点',
          '给出可执行的下一步'
        ];
      case 'analysis':
        return [
          '继续展开根因分析',
          '给出修复或优化方案',
          '按优先级列出风险点',
          '总结成行动清单'
        ];
      case 'writing':
        return [
          '改成更专业的语气',
          '再简洁一点',
          '补充一个示例版本',
          '生成可直接发送的最终稿'
        ];
      case 'task':
        return [
          '按优先级重排任务',
          '拆成今天可执行的步骤',
          '标出依赖和风险',
          '生成简短日报'
        ];
      case 'document':
        return [
          '提取文档里的关键结论',
          '列出值得关注的问题',
          '按章节整理要点',
          '基于文档给出后续动作'
        ];
      case 'tool_call':
        return [
          '继续执行下一步操作',
          '把结果整理成摘要',
          '列出执行中发现的问题',
          '生成一份排障报告'
        ];
      default:
        return this.buildGeneralFollowUps(userInput, answer);
    }
  }

  private buildGeneralFollowUps(userInput: string, answer: string): string[] {
    const prompts = [
      '展开讲讲这个结论',
      '给我一个更简洁的版本',
      '列出下一步可以做什么',
      '把重点整理成清单'
    ];

    if (/(代码|实现|开发|重构)/.test(userInput) || /(代码|实现|接口|服务)/.test(answer)) {
      return [
        '给出具体实现步骤',
        '标出可能的风险点',
        '补一版更适合落地的方案',
        '列出需要修改的文件'
      ];
    }

    return prompts;
  }
}

export const dialogOrchestratorService = new DialogOrchestratorService();
