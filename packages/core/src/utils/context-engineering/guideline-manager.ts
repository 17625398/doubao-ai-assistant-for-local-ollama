import { v4 as uuidv4 } from 'uuid';
import { safeLocalStorage } from './storage-helper';

// 条件类型
export type Condition = string; // 条件表达式，支持简单的布尔逻辑

// 动作类型
export type Action = string; // 动作描述，指导LLM如何响应

// 优先级类型
export type Priority = number; // 优先级，数值越大优先级越高

// 组合模式类型
export enum CompositionMode {
  FLUID = 'fluid', // 流体模式，允许LLM自由生成响应
  STRICT = 'strict' // 严格模式，使用预批准模板
}

// 规则关系类型
export enum RuleRelationshipType {
  DEPENDENCY = 'dependency', // 依赖关系
  EXCLUSION = 'exclusion' // 排除关系
}

// 行为规则接口
export interface Guideline {
  id: string; // 唯一标识符
  name: string; // 规则名称
  description: string; // 规则描述
  condition: Condition; // 触发条件
  action: Action; // 执行动作
  priority: Priority; // 优先级
  compositionMode: CompositionMode; // 组合模式
  cannedResponses?: string[]; // 预批准响应模板ID列表
  dependencies?: string[]; // 依赖的规则ID列表
  exclusions?: string[]; // 排除的规则ID列表
  createdAt: Date; // 创建时间
  updatedAt: Date; // 更新时间
}

// 规则管理接口
export interface GuidelineManager {
  // 创建规则
  create(guideline: Omit<Guideline, 'id' | 'createdAt' | 'updatedAt'>): Promise<Guideline>;
  
  // 更新规则
  update(id: string, guideline: Partial<Guideline>): Promise<Guideline>;
  
  // 删除规则
  delete(id: string): Promise<void>;
  
  // 获取规则
  get(id: string): Promise<Guideline>;
  
  // 获取所有规则
  getAll(): Promise<Guideline[]>;
  
  // 匹配规则
  match(input: string, conversationHistory: any[]): Promise<Guideline[]>;
}

// 规则管理器实现
export class GuidelineManagerImpl implements GuidelineManager {
  private guidelines: Map<string, Guideline> = new Map();
  private storageKey = 'guideline-manager-guidelines';

  constructor() {
    this.loadFromStorage();
    this.initializeSampleData();
  }

  // 初始化范例数据
  private initializeSampleData(): void {
    const initializedKey = 'guideline-manager-initialized';
    const isInitialized = safeLocalStorage.getItem(initializedKey);
    
    if (!isInitialized) {
      const now = new Date();
      const sampleGuidelines = [
        {
          id: uuidv4(),
          name: '礼貌用语规则',
          description: '当用户使用礼貌用语时，使用更友好的语气回应',
          condition: '请、谢谢、您好、麻烦',
          action: '使用礼貌、友好的语气回应用户，感谢用户的礼貌，并提供帮助',
          priority: 2,
          compositionMode: CompositionMode.FLUID,
          cannedResponses: [],
          dependencies: [],
          exclusions: [],
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          name: '技术问题规则',
          description: '当用户询问技术问题时，提供详细的技术解释',
          condition: '怎么、如何、为什么、错误、问题',
          action: '分析问题的技术细节，提供清晰、准确的解释，并尽可能提供解决方案',
          priority: 3,
          compositionMode: CompositionMode.FLUID,
          cannedResponses: [],
          dependencies: [],
          exclusions: [],
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          name: '紧急情况规则',
          description: '当用户表达紧急情况时，优先处理',
          condition: '紧急、尽快、马上、立刻',
          action: '立即响应用户，表示理解紧急性，并提供最直接的解决方案',
          priority: 5,
          compositionMode: CompositionMode.STRICT,
          cannedResponses: [],
          dependencies: [],
          exclusions: [],
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          name: '产品咨询规则',
          description: '当用户询问产品信息时，提供详细的产品介绍',
          condition: '产品、介绍、功能、价格',
          action: '详细介绍产品的核心功能、特点和优势',
          priority: 2,
          compositionMode: CompositionMode.FLUID,
          cannedResponses: [],
          dependencies: [],
          exclusions: [],
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          name: '反馈处理规则',
          description: '当用户提供反馈时，感谢用户并承诺处理',
          condition: '反馈、建议、意见',
          action: '感谢用户的宝贵反馈，表示会认真考虑并改进',
          priority: 3,
          compositionMode: CompositionMode.FLUID,
          cannedResponses: [],
          dependencies: [],
          exclusions: [],
          createdAt: now,
          updatedAt: now
        }
      ];

      sampleGuidelines.forEach(guideline => {
        this.guidelines.set(guideline.id, guideline);
      });

      this.saveToStorage();
      safeLocalStorage.setItem(initializedKey, 'true');
    }
  }

  // 从存储加载规则
  private loadFromStorage(): void {
    try {
      const stored = safeLocalStorage.getItem(this.storageKey);
      if (stored) {
        const guidelines = JSON.parse(stored);
        guidelines.forEach((guideline: Guideline) => {
          // 转换日期字符串为Date对象
          guideline.createdAt = new Date(guideline.createdAt);
          guideline.updatedAt = new Date(guideline.updatedAt);
          this.guidelines.set(guideline.id, guideline);
        });
      }
    } catch (error) {
      console.error('Failed to load guidelines from storage:', error);
    }
  }

  // 保存规则到存储
  private saveToStorage(): void {
    try {
      const guidelines = Array.from(this.guidelines.values());
      safeLocalStorage.setItem(this.storageKey, JSON.stringify(guidelines));
    } catch (error) {
      console.error('Failed to save guidelines to storage:', error);
    }
  }

  // 创建规则
  async create(guideline: Omit<Guideline, 'id' | 'createdAt' | 'updatedAt'>): Promise<Guideline> {
    const now = new Date();
    const newGuideline: Guideline = {
      ...guideline,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    };

    this.guidelines.set(newGuideline.id, newGuideline);
    this.saveToStorage();
    return newGuideline;
  }

  // 更新规则
  async update(id: string, guideline: Partial<Guideline>): Promise<Guideline> {
    const existing = this.guidelines.get(id);
    if (!existing) {
      throw new Error(`Guideline with id ${id} not found`);
    }

    const updated: Guideline = {
      ...existing,
      ...guideline,
      updatedAt: new Date()
    };

    this.guidelines.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  // 删除规则
  async delete(id: string): Promise<void> {
    if (!this.guidelines.has(id)) {
      throw new Error(`Guideline with id ${id} not found`);
    }

    this.guidelines.delete(id);
    this.saveToStorage();
  }

  // 获取规则
  async get(id: string): Promise<Guideline> {
    const guideline = this.guidelines.get(id);
    if (!guideline) {
      throw new Error(`Guideline with id ${id} not found`);
    }
    return guideline;
  }

  // 获取所有规则
  async getAll(): Promise<Guideline[]> {
    return Array.from(this.guidelines.values());
  }

  // 匹配规则
  async match(input: string, conversationHistory: any[]): Promise<Guideline[]> {
    const matched: Guideline[] = [];

    for (const guideline of this.guidelines.values()) {
      if (this.evaluateCondition(guideline.condition, input, conversationHistory)) {
        matched.push(guideline);
      }
    }

    // 按优先级排序
    matched.sort((a, b) => b.priority - a.priority);

    // 处理规则关系
    return this.processRelationships(matched);
  }

  // 评估条件
  private evaluateCondition(condition: Condition, input: string, conversationHistory: any[]): boolean {
    try {
      // 简单的条件评估
      // 实际应用中可能需要更复杂的表达式解析
      const lowerInput = input.toLowerCase();
      const historyText = conversationHistory
        .map((msg: any) => msg.content?.toLowerCase() || '')
        .join(' ');

      // 检查条件是否在输入或对话历史中
      return lowerInput.includes(condition.toLowerCase()) || historyText.includes(condition.toLowerCase());
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }

  // 处理规则关系
  private processRelationships(guidelines: Guideline[]): Guideline[] {
    const result: Guideline[] = [];
    const processed = new Set<string>();

    for (const guideline of guidelines) {
      if (processed.has(guideline.id)) {
        continue;
      }

      // 检查依赖关系
      const dependenciesMet = guideline.dependencies?.every(depId => {
        return guidelines.some(g => g.id === depId);
      }) ?? true;

      if (!dependenciesMet) {
        continue;
      }

      // 检查排除关系
      const hasExclusions = guideline.exclusions?.some(exclId => {
        return guidelines.some(g => g.id === exclId);
      }) ?? false;

      if (hasExclusions) {
        continue;
      }

      result.push(guideline);
      processed.add(guideline.id);
    }

    return result;
  }
}

// 创建单例实例
let guidelineManagerInstance: GuidelineManagerImpl | null = null;

export function getGuidelineManager(): GuidelineManager {
  if (!guidelineManagerInstance) {
    guidelineManagerInstance = new GuidelineManagerImpl();
  }
  return guidelineManagerInstance;
}

// 为了向后兼容，保留原有导出名称
export const guidelineManager = getGuidelineManager();