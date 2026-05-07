import { Guideline } from './guideline-manager';
import { Observation } from './observation-manager';
import { Tool } from './tool-manager';
import { CannedResponse } from './canned-response-manager';
import { GlossaryTerm } from './glossary-manager';
import { JourneyState } from './journey-manager';

// 决策记录接口
export interface DecisionLog {
  timestamp: Date; // 时间戳
  type: string; // 决策类型
  description: string; // 决策描述
  details: any; // 详细信息
}

// 输入上下文接口
export interface InputContext {
  userId: string; // 用户ID
  input: string; // 用户输入
  conversationHistory: any[]; // 对话历史
  metadata: any; // 元数据
}

// 输出上下文接口
export interface Context {
  guidelines: Guideline[]; // 匹配的规则
  observations: Observation[]; // 匹配的观察
  tools: Tool[]; // 调用的工具
  toolResults: any[]; // 工具调用结果
  cannedResponses: CannedResponse[]; // 匹配的预批准模板
  glossaryTerms: GlossaryTerm[]; // 匹配的词汇表术语
  journeyState?: JourneyState; // 当前对话流程状态
  decisionLog: DecisionLog[]; // 决策过程记录
  response?: string | undefined; // 生成的响应
}

// 上下文工程系统接口
export interface ContextEngineeringSystem {
  // 初始化系统
  initialize(): Promise<void>;
  
  // 处理用户输入，生成上下文和响应
  processInput(context: InputContext): Promise<Context>;
  
  // 生成响应
  generateResponse(context: Context, input: string): Promise<string | undefined>;
  
  // 获取系统状态
  getState(): any;
  
  // 设置系统状态
  setState(state: any): void;
}

// 上下文工程系统实现
export class ContextEngineeringSystemImpl implements ContextEngineeringSystem {
  private guidelineManager: any;
  private observationManager: any;
  private toolManager: any;
  private cannedResponseManager: any;
  private glossaryManager: any;
  private journeyManager: any;
  private decisionLogger: any;

  constructor() {
    // 延迟加载依赖，避免循环依赖
    this.initManagers();
  }

  // 初始化管理器
  private async initManagers() {
    // 动态导入以避免循环依赖
    const { getGuidelineManager } = await import('./guideline-manager');
    const { getObservationManager } = await import('./observation-manager');
    const { getToolManager } = await import('./tool-manager');
    const { getCannedResponseManager } = await import('./canned-response-manager');
    const { getGlossaryManager } = await import('./glossary-manager');
    const { getJourneyManager } = await import('./journey-manager');
    const { getDecisionLogger } = await import('./decision-logger');

    this.guidelineManager = getGuidelineManager();
    this.observationManager = getObservationManager();
    this.toolManager = getToolManager();
    this.cannedResponseManager = getCannedResponseManager();
    this.glossaryManager = getGlossaryManager();
    this.journeyManager = getJourneyManager();
    this.decisionLogger = getDecisionLogger();
  }

  // 初始化系统
  async initialize(): Promise<void> {
    await this.initManagers();
    // 可以在这里添加其他初始化逻辑
  }

  // 处理用户输入，生成上下文和响应
  async processInput(inputContext: InputContext): Promise<Context> {
    const { input, conversationHistory } = inputContext;
    
    // 确保管理器已初始化
    if (!this.guidelineManager) {
      await this.initManagers();
    }

    // 记录决策开始
    this.decisionLogger.log('processInput', '开始处理用户输入', { input, conversationHistory });

    // 匹配规则
    const guidelines = await this.guidelineManager.match(input, conversationHistory);
    this.decisionLogger.log('processInput', '匹配规则', { guidelines });

    // 匹配观察
    const observations = await this.observationManager.match(input, conversationHistory);
    this.decisionLogger.log('processInput', '匹配观察', { observations });

    // 调用工具
    const tools: Tool[] = [];
    const toolResults: any[] = [];
    for (const observation of observations) {
      for (const toolId of observation.tools) {
        try {
          const tool = await this.toolManager.get(toolId);
          tools.push(tool);
          // 调用工具
          const result = await this.toolManager.call(toolId, { input, conversationHistory });
          toolResults.push(result);
        } catch (error) {
          console.error('Error calling tool:', error);
        }
      }
    }
    this.decisionLogger.log('processInput', '调用工具', { tools, toolResults });

    // 匹配预批准模板
    const context: Partial<Context> = {
      guidelines,
      observations,
      tools,
      toolResults,
      cannedResponses: [],
      glossaryTerms: [],
      decisionLog: this.decisionLogger.getLogs()
    };

    const cannedResponses = await this.cannedResponseManager.match(context as Context, input);
    this.decisionLogger.log('processInput', '匹配预批准模板', { cannedResponses });

    // 匹配词汇表术语
    const glossaryTerms = await this.glossaryManager.match(input);
    this.decisionLogger.log('processInput', '匹配词汇表术语', { glossaryTerms });

    // 匹配对话流程
    const journeys = await this.journeyManager.match(input, conversationHistory);
    let journeyState: JourneyState | undefined;
    if (journeys.length > 0) {
      // 处理流程转换
      for (const journey of journeys) {
        const state = await this.journeyManager.processTransition(journey.id, input, conversationHistory);
        if (state) {
          journeyState = state;
          break;
        }
      }
    }
    this.decisionLogger.log('processInput', '匹配对话流程', { journeys, journeyState });

    // 构建完整上下文
    const finalContext: Context = {
      guidelines,
      observations,
      tools,
      toolResults,
      cannedResponses,
      glossaryTerms,
      journeyState,
      decisionLog: this.decisionLogger.getLogs()
    };

    // 生成响应
    const response = await this.generateResponse(finalContext, input);
    finalContext.response = response;

    this.decisionLogger.log('processInput', '生成上下文和响应完成', { finalContext });
    return finalContext;
  }

  // 生成响应
  async generateResponse(context: Context, input: string): Promise<string | undefined> {
    // 检查是否有严格模式的规则
    const strictGuidelines = context.guidelines.filter(g => g.compositionMode === 'strict');

    if (strictGuidelines.length > 0 && context.cannedResponses.length > 0) {
      // 使用预批准模板
      const bestTemplate = context.cannedResponses[0];
      this.decisionLogger.log('generateResponse', '使用预批准模板', { bestTemplate });
      return bestTemplate.content;
    } else {
      // 检查是否有流程状态的响应
      if (context.journeyState && context.journeyState.response) {
        this.decisionLogger.log('generateResponse', '使用流程状态响应', { journeyState: context.journeyState });
        return context.journeyState.response;
      }
      
      // 检查是否有工具结果可以使用
      if (context.toolResults && context.toolResults.length > 0) {
        this.decisionLogger.log('generateResponse', '使用工具结果', { toolResults: context.toolResults });
        return `工具执行结果: ${JSON.stringify(context.toolResults)}`;
      }
      
      // 没有匹配到任何规则，返回undefined，让请求传递给Ollama模型
      this.decisionLogger.log('generateResponse', '没有匹配到规则，返回undefined');
      return undefined;
    }
  }

  // 获取系统状态
  getState(): any {
    return {
      // 这里可以返回系统状态
    };
  }

  // 设置系统状态
  setState(state: any): void {
    // 这里可以设置系统状态
  }
}

// 创建单例实例
let contextEngineeringSystemInstance: ContextEngineeringSystemImpl | null = null;

export function getContextEngineeringSystem(): ContextEngineeringSystem {
  if (!contextEngineeringSystemInstance) {
    contextEngineeringSystemInstance = new ContextEngineeringSystemImpl();
  }
  return contextEngineeringSystemInstance;
}

// 为了向后兼容，保留原有导出名称
export const contextEngineeringSystem = getContextEngineeringSystem();