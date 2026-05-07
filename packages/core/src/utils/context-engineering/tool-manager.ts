import { v4 as uuidv4 } from 'uuid';
import { safeLocalStorage } from './storage-helper';

// 参数接口
export interface Parameter {
  name: string; // 参数名称
  type: string; // 参数类型
  required: boolean; // 是否必填
  description: string; // 参数描述
}

// 工具接口
export interface Tool {
  id: string; // 唯一标识符
  name: string; // 工具名称
  description: string; // 工具描述
  implementation: Function; // 工具实现
  parameters: Parameter[]; // 参数列表
  createdAt: Date; // 创建时间
  updatedAt: Date; // 更新时间
}

// 工具管理接口
export interface ToolManager {
  // 注册工具
  register(tool: Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tool>;
  
  // 注销工具
  unregister(id: string): Promise<void>;
  
  // 获取工具
  get(id: string): Promise<Tool>;
  
  // 获取所有工具
  getAll(): Promise<Tool[]>;
  
  // 调用工具
  call(id: string, parameters: any): Promise<any>;
}

// 工具管理器实现
export class ToolManagerImpl implements ToolManager {
  private tools: Map<string, Tool> = new Map();
  private storageKey = 'tool-manager-tools';

  constructor() {
    this.loadFromStorage();
    this.initializeSampleData();
  }

  // 初始化范例数据
  private initializeSampleData(): void {
    const initializedKey = 'tool-manager-initialized';
    const isInitialized = safeLocalStorage.getItem(initializedKey);
    
    if (!isInitialized) {
      const now = new Date();
      const sampleTools = [
        {
          id: uuidv4(),
          name: '数据查询工具',
          description: '用于查询和检索数据库中的数据',
          implementation: async (params: any) => {
            return { 
              success: true, 
              message: '数据查询完成', 
              data: params.query ? `查询结果: ${params.query}` : '请提供查询参数' 
            };
          },
          parameters: [
            {
              name: 'query',
              type: 'string',
              required: true,
              description: '查询语句或关键词'
            },
            {
              name: 'limit',
              type: 'number',
              required: false,
              description: '返回结果数量限制'
            }
          ],
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          name: '时间工具',
          description: '获取当前时间和日期信息',
          implementation: async (params: any) => {
            const now = new Date();
            return {
              success: true,
              currentTime: now.toISOString(),
              timestamp: now.getTime(),
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };
          },
          parameters: [
            {
              name: 'format',
              type: 'string',
              required: false,
              description: '时间格式（ISO, timestamp等）'
            }
          ],
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          name: '数学计算器',
          description: '执行基本的数学运算',
          implementation: async (params: any) => {
            try {
              let result;
              const { operation, a, b } = params;
              switch (operation) {
                case 'add':
                  result = a + b;
                  break;
                case 'subtract':
                  result = a - b;
                  break;
                case 'multiply':
                  result = a * b;
                  break;
                case 'divide':
                  result = b !== 0 ? a / b : '除数不能为零';
                  break;
                default:
                  result = '未知的操作类型';
              }
              return { success: true, operation, result };
            } catch (error) {
              return { success: false, error: '计算错误' };
            }
          },
          parameters: [
            {
              name: 'operation',
              type: 'string',
              required: true,
              description: '运算类型：add, subtract, multiply, divide'
            },
            {
              name: 'a',
              type: 'number',
              required: true,
              description: '第一个操作数'
            },
            {
              name: 'b',
              type: 'number',
              required: true,
              description: '第二个操作数'
            }
          ],
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          name: '文本处理工具',
          description: '对文本进行各种处理操作',
          implementation: async (params: any) => {
            const { text, operation } = params;
            let result = text;
            switch (operation) {
              case 'uppercase':
                result = text.toUpperCase();
                break;
              case 'lowercase':
                result = text.toLowerCase();
                break;
              case 'length':
                result = text.length;
                break;
              case 'reverse':
                result = text.split('').reverse().join('');
                break;
              default:
                result = '未知的文本操作';
            }
            return { success: true, originalText: text, operation, result };
          },
          parameters: [
            {
              name: 'text',
              type: 'string',
              required: true,
              description: '要处理的文本'
            },
            {
              name: 'operation',
              type: 'string',
              required: true,
              description: '操作类型：uppercase, lowercase, length, reverse'
            }
          ],
          createdAt: now,
          updatedAt: now
        }
      ];

      sampleTools.forEach(tool => {
        this.tools.set(tool.id, tool);
      });

      this.saveToStorage();
      safeLocalStorage.setItem(initializedKey, 'true');
    }
  }

  // 从存储加载工具
  private loadFromStorage(): void {
    try {
      const stored = safeLocalStorage.getItem(this.storageKey);
      if (stored) {
        const tools = JSON.parse(stored);
        tools.forEach((tool: Tool) => {
          // 转换日期字符串为Date对象
          tool.createdAt = new Date(tool.createdAt);
          tool.updatedAt = new Date(tool.updatedAt);
          // 注意：实现函数无法从存储中恢复，需要重新注册
          this.tools.set(tool.id, tool);
        });
      }
    } catch (error) {
      console.error('Failed to load tools from storage:', error);
    }
  }

  // 保存工具到存储
  private saveToStorage(): void {
    try {
      const tools = Array.from(this.tools.values());
      // 移除实现函数，因为它无法被序列化
      const serializableTools = tools.map(tool => ({
        ...tool,
        implementation: undefined
      }));
      safeLocalStorage.setItem(this.storageKey, JSON.stringify(serializableTools));
    } catch (error) {
      console.error('Failed to save tools to storage:', error);
    }
  }

  // 注册工具
  async register(tool: Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tool> {
    const now = new Date();
    const newTool: Tool = {
      ...tool,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    };

    this.tools.set(newTool.id, newTool);
    this.saveToStorage();
    return newTool;
  }

  // 注销工具
  async unregister(id: string): Promise<void> {
    if (!this.tools.has(id)) {
      throw new Error(`Tool with id ${id} not found`);
    }

    this.tools.delete(id);
    this.saveToStorage();
  }

  // 获取工具
  async get(id: string): Promise<Tool> {
    const tool = this.tools.get(id);
    if (!tool) {
      throw new Error(`Tool with id ${id} not found`);
    }
    return tool;
  }

  // 获取所有工具
  async getAll(): Promise<Tool[]> {
    return Array.from(this.tools.values());
  }

  // 调用工具
  async call(id: string, parameters: any): Promise<any> {
    const tool = this.tools.get(id);
    if (!tool) {
      throw new Error(`Tool with id ${id} not found`);
    }

    if (!tool.implementation) {
      throw new Error(`Tool with id ${id} has no implementation`);
    }

    try {
      return await tool.implementation(parameters);
    } catch (error) {
      console.error(`Error calling tool ${id}:`, error);
      throw error;
    }
  }
}

// 创建单例实例
let toolManagerInstance: ToolManagerImpl | null = null;

export function getToolManager(): ToolManager {
  if (!toolManagerInstance) {
    toolManagerInstance = new ToolManagerImpl();
  }
  return toolManagerInstance;
}

// 为了向后兼容，保留原有导出名称
export const toolManager = getToolManager();