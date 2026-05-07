import { v4 as uuidv4 } from 'uuid';
import { Context } from './context-engineering-system';
import { safeLocalStorage } from './storage-helper';

// 预批准响应模板接口
export interface CannedResponse {
  id: string; // 唯一标识符
  name: string; // 模板名称
  description: string; // 模板描述
  content: string; // 模板文本
  tags?: string[]; // 标签
  usageCount: number; // 使用次数
  createdAt: Date; // 创建时间
  updatedAt: Date; // 更新时间
}

// 模板管理接口
export interface CannedResponseManager {
  // 创建模板
  create(response: Omit<CannedResponse, 'id' | 'createdAt' | 'updatedAt'>): Promise<CannedResponse>;
  
  // 更新模板
  update(id: string, response: Partial<CannedResponse>): Promise<CannedResponse>;
  
  // 删除模板
  delete(id: string): Promise<void>;
  
  // 获取模板
  get(id: string): Promise<CannedResponse>;
  
  // 获取所有模板
  getAll(): Promise<CannedResponse[]>;
  
  // 匹配模板
  match(context: Context, input: string): Promise<CannedResponse[]>;
}

// 模板管理器实现
export class CannedResponseManagerImpl implements CannedResponseManager {
  private responses: Map<string, CannedResponse> = new Map();
  private storageKey = 'canned-response-manager-responses';

  constructor() {
    this.loadFromStorage();
    this.initializeSampleData();
  }

  // 初始化范例数据
  private initializeSampleData(): void {
    const initializedKey = 'canned-response-manager-initialized';
    const isInitialized = safeLocalStorage.getItem(initializedKey);
    
    if (!isInitialized) {
      const now = new Date();
      const sampleResponses = [
        {
          id: uuidv4(),
          name: '欢迎问候',
          description: '用于欢迎新用户的标准问候语',
          content: '您好！欢迎使用我们的服务。我很乐意为您提供帮助，请告诉我您需要什么？',
          tags: ['问候', '欢迎', '开场白'],
          usageCount: 0,
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          name: '感谢回复',
          description: '用于感谢用户的标准回复',
          content: '感谢您的反馈！我们非常重视您的意见。',
          tags: ['感谢', '反馈', '礼貌'],
          usageCount: 0,
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          name: '问题确认',
          description: '用于确认理解用户问题的回复',
          content: '我理解您的问题了。让我为您详细解答：',
          tags: ['确认', '理解', '问题处理'],
          usageCount: 0,
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          name: '技术支持模板',
          description: '用于技术支持的标准回复模板',
          content: '关于您遇到的技术问题，请尝试以下步骤：\n1. 检查网络连接\n2. 清除浏览器缓存\n3. 重启应用\n\n如果问题仍然存在，请提供更多详细信息。',
          tags: ['技术', '支持', '故障排除'],
          usageCount: 0,
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          name: '产品介绍模板',
          description: '用于产品介绍的标准回复',
          content: '我们的产品具有以下核心功能：\n- 智能数据分析\n- 实时报告生成\n- 多平台支持\n\n如需了解更多详情，请随时提问。',
          tags: ['产品', '介绍', '销售'],
          usageCount: 0,
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          name: '结束对话',
          description: '用于礼貌结束对话的回复',
          content: '很高兴能够帮助您！如果还有其他问题，请随时联系我们。祝您愉快！',
          tags: ['结束', '道别', '礼貌'],
          usageCount: 0,
          createdAt: now,
          updatedAt: now
        }
      ];

      sampleResponses.forEach(response => {
        this.responses.set(response.id, response);
      });

      this.saveToStorage();
      safeLocalStorage.setItem(initializedKey, 'true');
    }
  }

  // 从存储加载模板
  private loadFromStorage(): void {
    try {
      const stored = safeLocalStorage.getItem(this.storageKey);
      if (stored) {
        const responses = JSON.parse(stored);
        responses.forEach((response: CannedResponse) => {
          // 转换日期字符串为Date对象
          response.createdAt = new Date(response.createdAt);
          response.updatedAt = new Date(response.updatedAt);
          this.responses.set(response.id, response);
        });
      }
    } catch (error) {
      console.error('Failed to load canned responses from storage:', error);
    }
  }

  // 保存模板到存储
  private saveToStorage(): void {
    try {
      const responses = Array.from(this.responses.values());
      safeLocalStorage.setItem(this.storageKey, JSON.stringify(responses));
    } catch (error) {
      console.error('Failed to save canned responses to storage:', error);
    }
  }

  // 创建模板
  async create(response: Omit<CannedResponse, 'id' | 'createdAt' | 'updatedAt'>): Promise<CannedResponse> {
    const now = new Date();
    const newResponse: CannedResponse = {
      ...response,
      id: uuidv4(),
      usageCount: 0,
      createdAt: now,
      updatedAt: now
    };

    this.responses.set(newResponse.id, newResponse);
    this.saveToStorage();
    return newResponse;
  }

  // 更新模板
  async update(id: string, response: Partial<CannedResponse>): Promise<CannedResponse> {
    const existing = this.responses.get(id);
    if (!existing) {
      throw new Error(`Canned response with id ${id} not found`);
    }

    const updated: CannedResponse = {
      ...existing,
      ...response,
      updatedAt: new Date()
    };

    this.responses.set(id, updated);
    this.saveToStorage();
    return updated;
  }

  // 删除模板
  async delete(id: string): Promise<void> {
    if (!this.responses.has(id)) {
      throw new Error(`Canned response with id ${id} not found`);
    }

    this.responses.delete(id);
    this.saveToStorage();
  }

  // 获取模板
  async get(id: string): Promise<CannedResponse> {
    const response = this.responses.get(id);
    if (!response) {
      throw new Error(`Canned response with id ${id} not found`);
    }
    return response;
  }

  // 获取所有模板
  async getAll(): Promise<CannedResponse[]> {
    return Array.from(this.responses.values());
  }

  // 匹配模板
  async match(context: Context, input: string): Promise<CannedResponse[]> {
    const matched: CannedResponse[] = [];

    for (const response of this.responses.values()) {
      if (this.evaluateMatch(response, context, input)) {
        matched.push(response);
      }
    }

    // 按相关性排序
    return this.sortByRelevance(matched, context, input);
  }

  // 评估模板匹配
  private evaluateMatch(response: CannedResponse, context: Context, input: string): boolean {
    try {
      const lowerInput = input.toLowerCase();
      const lowerContent = response.content.toLowerCase();

      // 检查模板文本是否与输入相关
      if (lowerContent.includes(lowerInput) || lowerInput.includes(lowerContent)) {
        return true;
      }

      // 检查标签是否与输入相关
      if (response.tags) {
        return response.tags.some(tag => {
          return lowerInput.includes(tag.toLowerCase());
        });
      }

      return false;
    } catch (error) {
      console.error('Error evaluating canned response match:', error);
      return false;
    }
  }

  // 按相关性排序
  private sortByRelevance(responses: CannedResponse[], context: Context, input: string): CannedResponse[] {
    return responses.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, context, input);
      const scoreB = this.calculateRelevanceScore(b, context, input);
      return scoreB - scoreA;
    });
  }

  // 计算相关性分数
  private calculateRelevanceScore(response: CannedResponse, context: Context, input: string): number {
    let score = 0;
    const lowerInput = input.toLowerCase();
    const lowerContent = response.content.toLowerCase();

    // 文本匹配分数
    if (lowerContent.includes(lowerInput)) {
      score += 10;
    }
    if (lowerInput.includes(lowerContent)) {
      score += 8;
    }

    // 标签匹配分数
    if (response.tags) {
      response.tags.forEach(tag => {
        if (lowerInput.includes(tag.toLowerCase())) {
          score += 5;
        }
      });
    }

    // 上下文匹配分数
    if (context.guidelines.length > 0) {
      context.guidelines.forEach(guideline => {
        const lowerAction = guideline.action.toLowerCase();
        if (lowerContent.includes(lowerAction)) {
          score += 3;
        }
      });
    }

    // 使用次数分数（使用次数越多，分数越高）
    score += response.usageCount * 0.1;

    return score;
  }

  // 增加模板使用次数
  private async incrementUsageCount(id: string): Promise<void> {
    const response = this.responses.get(id);
    if (response) {
      response.usageCount += 1;
      response.updatedAt = new Date();
      this.responses.set(id, response);
      this.saveToStorage();
    }
  }

  // 获取最佳匹配模板
  async getBestMatch(context: Context, input: string): Promise<CannedResponse | null> {
    const matched = await this.match(context, input);
    return matched.length > 0 ? matched[0] : null;
  }
}

// 创建单例实例
let cannedResponseManagerInstance: CannedResponseManagerImpl | null = null;

export function getCannedResponseManager(): CannedResponseManager {
  if (!cannedResponseManagerInstance) {
    cannedResponseManagerInstance = new CannedResponseManagerImpl();
  }
  return cannedResponseManagerInstance;
}

// 为了向后兼容，保留原有导出名称
export const cannedResponseManager = getCannedResponseManager();