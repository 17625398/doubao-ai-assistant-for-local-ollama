import { v4 as uuidv4 } from 'uuid';
import { Condition } from './guideline-manager';
import { safeLocalStorage } from './storage-helper';

// 对话流程状态接口
export interface JourneyState {
  id: string; // 唯一标识符
  name: string; // 状态名称
  description: string; // 状态描述
  response?: string; // 状态响应
  transitions: JourneyTransition[]; // 转换列表
}

// 对话流程转换接口
export interface JourneyTransition {
  id: string; // 唯一标识符
  targetStateId: string; // 目标状态ID
  condition: Condition; // 转换条件
  action?: string; // 转换动作
}

// 对话流程接口
export interface Journey {
  id: string; // 唯一标识符
  name: string; // 流程名称
  description: string; // 流程描述
  conditions: Condition[]; // 触发条件列表
  states: JourneyState[]; // 状态列表
  createdAt: Date; // 创建时间
  updatedAt: Date; // 更新时间
}

// 对话流程管理接口
export interface JourneyManager {
  // 创建流程
  create(journey: Omit<Journey, 'id' | 'createdAt' | 'updatedAt'>): Promise<Journey>;
  
  // 更新流程
  update(id: string, journey: Partial<Journey>): Promise<Journey>;
  
  // 删除流程
  delete(id: string): Promise<void>;
  
  // 获取流程
  get(id: string): Promise<Journey>;
  
  // 获取所有流程
  getAll(): Promise<Journey[]>;
  
  // 匹配流程
  match(input: string, conversationHistory: any[]): Promise<Journey[]>;
  
  // 更新流程状态
  updateState(journeyId: string, stateId: string): Promise<JourneyState>;
  
  // 处理流程转换
  processTransition(journeyId: string, input: string, conversationHistory: any[]): Promise<JourneyState | null>;
  
  // 获取当前流程状态
  getCurrentState(journeyId: string): Promise<JourneyState | null>;
}

// 对话流程管理器实现
export class JourneyManagerImpl implements JourneyManager {
  private journeys: Map<string, Journey> = new Map();
  private currentStates: Map<string, string> = new Map(); // journeyId -> stateId
  private storageKey = 'journey-manager-journeys';
  private stateStorageKey = 'journey-manager-states';

  constructor() {
    this.loadFromStorage();
    this.initializeSampleData();
  }

  // 初始化范例数据
  private initializeSampleData(): void {
    const initializedKey = 'journey-manager-initialized';
    const isInitialized = safeLocalStorage.getItem(initializedKey);
    
    if (!isInitialized) {
      const now = new Date();
      
      const startStateId = uuidv4();
      const collectInfoStateId = uuidv4();
      const solutionStateId = uuidv4();
      const followUpStateId = uuidv4();
      
      const sampleJourneys = [
        {
          id: uuidv4(),
          name: '客户服务流程',
          description: '处理客户咨询和问题的标准对话流程',
          conditions: ['帮助、咨询、问题、客服'],
          states: [
            {
              id: startStateId,
              name: '初始问候',
              description: '向用户表示欢迎并询问如何提供帮助',
              response: '您好！欢迎使用我们的服务。请问有什么我可以帮助您的？',
              transitions: [
                {
                  id: uuidv4(),
                  targetStateId: collectInfoStateId,
                  condition: '',
                  action: '收集用户问题信息'
                }
              ]
            },
            {
              id: collectInfoStateId,
              name: '收集信息',
              description: '收集用户问题的详细信息',
              response: '为了更好地帮助您，请告诉我更多关于您问题的详细信息。',
              transitions: [
                {
                  id: uuidv4(),
                  targetStateId: solutionStateId,
                  condition: '技术、错误、故障',
                  action: '提供技术解决方案'
                },
                {
                  id: uuidv4(),
                  targetStateId: followUpStateId,
                  condition: '感谢、谢谢、好的',
                  action: '确认问题已解决并结束对话'
                }
              ]
            },
            {
              id: solutionStateId,
              name: '提供解决方案',
              description: '向用户提供问题的解决方案',
              response: '根据您的描述，我建议您尝试以下解决方案：...',
              transitions: [
                {
                  id: uuidv4(),
                  targetStateId: followUpStateId,
                  condition: '有用、解决、谢谢',
                  action: '确认解决方案有效'
                },
                {
                  id: uuidv4(),
                  targetStateId: collectInfoStateId,
                  condition: '不行、没用、再试',
                  action: '收集更多信息'
                }
              ]
            },
            {
              id: followUpStateId,
              name: '跟进确认',
              description: '确认用户是否满意并结束对话',
              response: '很高兴能够帮助到您！如果还有其他问题，请随时告诉我。',
              transitions: []
            }
          ],
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          name: '产品订购流程',
          description: '引导用户完成产品订购的对话流程',
          conditions: ['购买、订购、下单、价格'],
          states: [
            {
              id: uuidv4(),
              name: '产品介绍',
              description: '向用户介绍产品信息',
              response: '很高兴您对我们的产品感兴趣！让我为您介绍一下我们的产品...',
              transitions: [
                {
                  id: uuidv4(),
                  targetStateId: uuidv4(),
                  condition: '好的、继续、了解',
                  action: '进入确认阶段'
                }
              ]
            }
          ],
          createdAt: now,
          updatedAt: now
        }
      ];

      sampleJourneys.forEach(journey => {
        this.journeys.set(journey.id, journey);
      });

      this.saveToStorage();
      safeLocalStorage.setItem(initializedKey, 'true');
    }
  }

  // 从存储加载流程
  private loadFromStorage(): void {
    try {
      // 加载流程
      const storedJourneys = safeLocalStorage.getItem(this.storageKey);
      if (storedJourneys) {
        const journeys = JSON.parse(storedJourneys);
        journeys.forEach((journey: Journey) => {
          // 转换日期字符串为Date对象
          journey.createdAt = new Date(journey.createdAt);
          journey.updatedAt = new Date(journey.updatedAt);
          this.journeys.set(journey.id, journey);
        });
      }

      // 加载当前状态
      const storedStates = safeLocalStorage.getItem(this.stateStorageKey);
      if (storedStates) {
        const states = JSON.parse(storedStates);
        Object.entries(states).forEach(([journeyId, stateId]) => {
          this.currentStates.set(journeyId, stateId as string);
        });
      }
    } catch (error) {
      console.error('Failed to load journeys from storage:', error);
    }
  }

  // 保存流程到存储
  private saveToStorage(): void {
    try {
      // 保存流程
      const journeys = Array.from(this.journeys.values());
      safeLocalStorage.setItem(this.storageKey, JSON.stringify(journeys));

      // 保存当前状态
      const states = Object.fromEntries(this.currentStates);
      safeLocalStorage.setItem(this.stateStorageKey, JSON.stringify(states));
    } catch (error) {
      console.error('Failed to save journeys to storage:', error);
    }
  }

  // 创建流程
  async create(journey: Omit<Journey, 'id' | 'createdAt' | 'updatedAt'>): Promise<Journey> {
    const now = new Date();
    const newJourney: Journey = {
      ...journey,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    };

    this.journeys.set(newJourney.id, newJourney);
    this.saveToStorage();
    return newJourney;
  }

  // 更新流程
  async update(id: string, journey: Partial<Journey>): Promise<Journey> {
    const existing = this.journeys.get(id);
    if (!existing) {
      throw new Error(`Journey with id ${id} not found`);
    }

    const updated: Journey = {
      ...existing,
      ...journey,
      updatedAt: new Date()
    };

    this.journeys.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  // 删除流程
  async delete(id: string): Promise<void> {
    if (!this.journeys.has(id)) {
      throw new Error(`Journey with id ${id} not found`);
    }

    this.journeys.delete(id);
    this.currentStates.delete(id);
    this.saveToStorage();
  }

  // 获取流程
  async get(id: string): Promise<Journey> {
    const journey = this.journeys.get(id);
    if (!journey) {
      throw new Error(`Journey with id ${id} not found`);
    }
    return journey;
  }

  // 获取所有流程
  async getAll(): Promise<Journey[]> {
    return Array.from(this.journeys.values());
  }

  // 匹配流程
  async match(input: string, conversationHistory: any[]): Promise<Journey[]> {
    const matched: Journey[] = [];

    for (const journey of this.journeys.values()) {
      if (this.evaluateConditions(journey.conditions, input, conversationHistory)) {
        matched.push(journey);
      }
    }

    return matched;
  }

  // 更新流程状态
  async updateState(journeyId: string, stateId: string): Promise<JourneyState> {
    const journey = this.journeys.get(journeyId);
    if (!journey) {
      throw new Error(`Journey with id ${journeyId} not found`);
    }

    const state = journey.states.find(s => s.id === stateId);
    if (!state) {
      throw new Error(`State with id ${stateId} not found in journey ${journeyId}`);
    }

    this.currentStates.set(journeyId, stateId);
    this.saveToStorage();
    return state;
  }

  // 评估条件
  private evaluateConditions(conditions: Condition[], input: string, conversationHistory: any[]): boolean {
    try {
      const lowerInput = input.toLowerCase();
      const historyText = conversationHistory
        .map((msg: any) => msg.content?.toLowerCase() || '')
        .join(' ');

      // 检查是否有任何条件在输入或对话历史中
      return conditions.some(condition => {
        return lowerInput.includes(condition.toLowerCase()) || historyText.includes(condition.toLowerCase());
      });
    } catch (error) {
      console.error('Error evaluating conditions:', error);
      return false;
    }
  }

  // 获取当前流程状态
  async getCurrentState(journeyId: string): Promise<JourneyState | null> {
    const stateId = this.currentStates.get(journeyId);
    if (!stateId) {
      return null;
    }

    const journey = this.journeys.get(journeyId);
    if (!journey) {
      return null;
    }

    return journey.states.find(s => s.id === stateId) || null;
  }

  // 处理流程转换
  async processTransition(journeyId: string, input: string, conversationHistory: any[]): Promise<JourneyState | null> {
    const currentState = await this.getCurrentState(journeyId);
    if (!currentState) {
      return null;
    }

    const journey = this.journeys.get(journeyId);
    if (!journey) {
      return null;
    }

    // 找到匹配的转换
    for (const transition of currentState.transitions) {
      if (this.evaluateConditions([transition.condition], input, conversationHistory)) {
        // 更新状态
        return this.updateState(journeyId, transition.targetStateId);
      }
    }

    return currentState;
  }
}

// 创建单例实例
let journeyManagerInstance: JourneyManagerImpl | null = null;

export function getJourneyManager(): JourneyManager {
  if (!journeyManagerInstance) {
    journeyManagerInstance = new JourneyManagerImpl();
  }
  return journeyManagerInstance;
}

// 为了向后兼容，保留原有导出名称
export const journeyManager = getJourneyManager();