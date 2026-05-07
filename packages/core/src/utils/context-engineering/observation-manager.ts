import { v4 as uuidv4 } from 'uuid';
import { Condition } from './guideline-manager';
import { safeLocalStorage } from './storage-helper';

// 观察接口
export interface Observation {
  id: string; // 唯一标识符
  name: string; // 观察名称
  condition: Condition; // 触发条件
  tools: string[]; // 触发的工具ID列表
  createdAt: Date; // 创建时间
  updatedAt: Date; // 更新时间
}

// 观察管理接口
export interface ObservationManager {
  // 创建观察
  create(observation: Omit<Observation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Observation>;
  
  // 更新观察
  update(id: string, observation: Partial<Observation>): Promise<Observation>;
  
  // 删除观察
  delete(id: string): Promise<void>;
  
  // 获取观察
  get(id: string): Promise<Observation>;
  
  // 获取所有观察
  getAll(): Promise<Observation[]>;
  
  // 匹配观察
  match(input: string, conversationHistory: any[]): Promise<Observation[]>;
}

// 观察管理器实现
export class ObservationManagerImpl implements ObservationManager {
  private observations: Map<string, Observation> = new Map();
  private storageKey = 'observation-manager-observations';

  constructor() {
    this.loadFromStorage();
  }

  // 从存储加载观察
  private loadFromStorage(): void {
    try {
      const stored = safeLocalStorage.getItem(this.storageKey);
      if (stored) {
        const observations = JSON.parse(stored);
        observations.forEach((observation: Observation) => {
          // 转换日期字符串为Date对象
          observation.createdAt = new Date(observation.createdAt);
          observation.updatedAt = new Date(observation.updatedAt);
          this.observations.set(observation.id, observation);
        });
      }
    } catch (error) {
      console.error('Failed to load observations from storage:', error);
    }
  }

  // 保存观察到存储
  private saveToStorage(): void {
    try {
      const observations = Array.from(this.observations.values());
      safeLocalStorage.setItem(this.storageKey, JSON.stringify(observations));
    } catch (error) {
      console.error('Failed to save observations to storage:', error);
    }
  }

  // 创建观察
  async create(observation: Omit<Observation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Observation> {
    const now = new Date();
    const newObservation: Observation = {
      ...observation,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    };

    this.observations.set(newObservation.id, newObservation);
    this.saveToStorage();
    return newObservation;
  }

  // 更新观察
  async update(id: string, observation: Partial<Observation>): Promise<Observation> {
    const existing = this.observations.get(id);
    if (!existing) {
      throw new Error(`Observation with id ${id} not found`);
    }

    const updated: Observation = {
      ...existing,
      ...observation,
      updatedAt: new Date()
    };

    this.observations.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  // 删除观察
  async delete(id: string): Promise<void> {
    if (!this.observations.has(id)) {
      throw new Error(`Observation with id ${id} not found`);
    }

    this.observations.delete(id);
    this.saveToStorage();
  }

  // 获取观察
  async get(id: string): Promise<Observation> {
    const observation = this.observations.get(id);
    if (!observation) {
      throw new Error(`Observation with id ${id} not found`);
    }
    return observation;
  }

  // 获取所有观察
  async getAll(): Promise<Observation[]> {
    return Array.from(this.observations.values());
  }

  // 匹配观察
  async match(input: string, conversationHistory: any[]): Promise<Observation[]> {
    const matched: Observation[] = [];

    for (const observation of this.observations.values()) {
      if (this.evaluateCondition(observation.condition, input, conversationHistory)) {
        matched.push(observation);
      }
    }

    return matched;
  }

  // 评估条件
  private evaluateCondition(condition: Condition, input: string, conversationHistory: any[]): boolean {
    try {
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
}

// 创建单例实例
let observationManagerInstance: ObservationManagerImpl | null = null;

export function getObservationManager(): ObservationManager {
  if (!observationManagerInstance) {
    observationManagerInstance = new ObservationManagerImpl();
  }
  return observationManagerInstance;
}

// 为了向后兼容，保留原有导出名称
export const observationManager = getObservationManager();