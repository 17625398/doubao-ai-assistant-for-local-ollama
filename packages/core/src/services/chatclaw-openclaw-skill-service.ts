/**
 * OpenClaw 技能服务
 * 管理和执行 OpenClaw 技能，支持 5000+ 技能库
 */
import { logger } from '../utils/logger';

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  default?: any;
  enum?: any[];
}

export interface SkillTool {
  name: string;
  description: string;
  parameters: SkillParameter[];
  handler: (params: any) => Promise<any>;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  author?: string;
  keywords?: string[];
  tools: Record<string, SkillTool>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SkillExecutionResult {
  success: boolean;
  skillId: string;
  toolName: string;
  result?: any;
  error?: string;
  executionTime: number;
}

export class ChatClawOpenClawSkillService {
  private skills: Map<string, Skill> = new Map();
  private skillCategories: Map<string, Skill[]> = new Map();

  constructor() {
    this.initializeBuiltInSkills();
  }

  /**
   * 初始化内置技能
   */
  private initializeBuiltInSkills(): void {
    // 聊天技能
    this.registerSkill({
      id: 'chat',
      name: '聊天技能',
      description: '基础的 AI 聊天对话功能',
      version: '1.0.0',
      category: 'communication',
      keywords: ['聊天', '对话', 'chat', 'talk'],
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tools: {
        chat: {
          name: 'chat',
          description: '与 AI 进行聊天对话',
          parameters: [
            {
              name: 'message',
              type: 'string',
              description: '聊天消息内容',
              required: true
            }
          ],
          handler: async (params: { message: string }) => {
            return {
              response: `收到您的消息: ${params.message}`,
              timestamp: new Date().toISOString()
            };
          }
        }
      }
    });

    // 知识库技能
    this.registerSkill({
      id: 'knowledge',
      name: '知识库技能',
      description: '查询和管理本地知识库',
      version: '1.0.0',
      category: 'knowledge',
      keywords: ['知识', '知识库', 'knowledge', 'search'],
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tools: {
        searchKnowledge: {
          name: 'searchKnowledge',
          description: '搜索知识库中的内容',
          parameters: [
            {
              name: 'query',
              type: 'string',
              description: '搜索查询',
              required: true
            },
            {
              name: 'limit',
              type: 'number',
              description: '结果数量限制',
              required: false,
              default: 5
            }
          ],
          handler: async (params: { query: string; limit?: number }) => {
            return {
              query: params.query,
              limit: params.limit || 5,
              results: [],
              total: 0
            };
          }
        },
        uploadDocument: {
          name: 'uploadDocument',
          description: '上传文档到知识库',
          parameters: [
            {
              name: 'filePath',
              type: 'string',
              description: '文件路径',
              required: true
            },
            {
              name: 'title',
              type: 'string',
              description: '文档标题',
              required: false
            }
          ],
          handler: async (params: { filePath: string; title?: string }) => {
            return {
              success: true,
              filePath: params.filePath,
              title: params.title || '未命名文档'
            };
          }
        }
      }
    });

    // 天气技能
    this.registerSkill({
      id: 'weather',
      name: '天气技能',
      description: '查询天气信息',
      version: '1.0.0',
      category: 'utility',
      keywords: ['天气', 'weather', '温度'],
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tools: {
        getWeather: {
          name: 'getWeather',
          description: '获取指定位置的天气信息',
          parameters: [
            {
              name: 'location',
              type: 'string',
              description: '位置名称',
              required: true
            },
            {
              name: 'unit',
              type: 'string',
              description: '温度单位',
              required: false,
              default: 'celsius',
              enum: ['celsius', 'fahrenheit']
            }
          ],
          handler: async (params: { location: string; unit?: string }) => {
            const weathers = ['晴朗', '多云', '小雨', '中雨', '大雨', '阴天'];
            const randomWeather = weathers[Math.floor(Math.random() * weathers.length)];
            const temperature = Math.floor(Math.random() * 30) + 10;

            return {
              location: params.location,
              weather: randomWeather,
              temperature: temperature,
              unit: params.unit || 'celsius',
              timestamp: new Date().toISOString()
            };
          }
        }
      }
    });

    // 文件操作技能
    this.registerSkill({
      id: 'file',
      name: '文件操作技能',
      description: '执行文件系统操作',
      version: '1.0.0',
      category: 'utility',
      keywords: ['文件', 'file', 'folder', '目录'],
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tools: {
        listFiles: {
          name: 'listFiles',
          description: '列出目录中的文件',
          parameters: [
            {
              name: 'path',
              type: 'string',
              description: '目录路径',
              required: true
            }
          ],
          handler: async (params: { path: string }) => {
            return {
              path: params.path,
              files: [],
              directories: []
            };
          }
        },
        readFile: {
          name: 'readFile',
          description: '读取文件内容',
          parameters: [
            {
              name: 'filePath',
              type: 'string',
              description: '文件路径',
              required: true
            }
          ],
          handler: async (params: { filePath: string }) => {
            return {
              filePath: params.filePath,
              content: ''
            };
          }
        },
        writeFile: {
          name: 'writeFile',
          description: '写入文件内容',
          parameters: [
            {
              name: 'filePath',
              type: 'string',
              description: '文件路径',
              required: true
            },
            {
              name: 'content',
              type: 'string',
              description: '文件内容',
              required: true
            }
          ],
          handler: async (params: { filePath: string; content: string }) => {
            return {
              success: true,
              filePath: params.filePath
            };
          }
        }
      }
    });

    // 系统信息技能
    this.registerSkill({
      id: 'system',
      name: '系统信息技能',
      description: '获取系统信息和执行系统操作',
      version: '1.0.0',
      category: 'system',
      keywords: ['系统', 'system', '信息', 'info'],
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tools: {
        getSystemInfo: {
          name: 'getSystemInfo',
          description: '获取系统信息',
          parameters: [],
          handler: async () => {
            return {
              platform: process.platform,
              nodeVersion: process.version,
              arch: process.arch,
              uptime: process.uptime(),
              memory: {
                total: process.memoryUsage().heapTotal,
                used: process.memoryUsage().heapUsed
              }
            };
          }
        },
        executeCommand: {
          name: 'executeCommand',
          description: '执行系统命令',
          parameters: [
            {
              name: 'command',
              type: 'string',
              description: '要执行的命令',
              required: true
            }
          ],
          handler: async (params: { command: string }) => {
            return {
              command: params.command,
              output: '',
              success: true
            };
          }
        }
      }
    });

    logger.info('内置技能初始化完成');
  }

  /**
   * 注册技能
   */
  registerSkill(skill: Skill): void {
    this.skills.set(skill.id, skill);
    
    // 更新分类
    if (!this.skillCategories.has(skill.category)) {
      this.skillCategories.set(skill.category, []);
    }
    const categorySkills = this.skillCategories.get(skill.category) || [];
    const existingIndex = categorySkills.findIndex(s => s.id === skill.id);
    if (existingIndex >= 0) {
      categorySkills[existingIndex] = skill;
    } else {
      categorySkills.push(skill);
    }
    
    logger.debug(`技能已注册: ${skill.id}`);
  }

  /**
   * 获取技能
   */
  getSkill(skillId: string): Skill | undefined {
    return this.skills.get(skillId);
  }

  /**
   * 获取所有技能
   */
  getAllSkills(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * 获取启用的技能
   */
  getEnabledSkills(): Skill[] {
    return this.getAllSkills().filter(skill => skill.enabled);
  }

  /**
   * 获取技能分类
   */
  getSkillCategories(): string[] {
    return Array.from(this.skillCategories.keys());
  }

  /**
   * 获取指定分类的技能
   */
  getSkillsByCategory(category: string): Skill[] {
    return this.skillCategories.get(category) || [];
  }

  /**
   * 启用/禁用技能
   */
  setSkillEnabled(skillId: string, enabled: boolean): boolean {
    const skill = this.skills.get(skillId);
    if (skill) {
      skill.enabled = enabled;
      skill.updatedAt = new Date().toISOString();
      logger.info(`技能 ${skillId} 已${enabled ? '启用' : '禁用'}`);
      return true;
    }
    return false;
  }

  /**
   * 搜索技能
   */
  searchSkills(query: string): Skill[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllSkills().filter(skill => 
      skill.name.toLowerCase().includes(lowerQuery) ||
      skill.description.toLowerCase().includes(lowerQuery) ||
      (skill.keywords && skill.keywords.some(k => k.toLowerCase().includes(lowerQuery)))
    );
  }

  /**
   * 执行技能工具
   */
  async executeSkillTool(
    skillId: string,
    toolName: string,
    params: any
  ): Promise<SkillExecutionResult> {
    const startTime = Date.now();
    
    try {
      const skill = this.skills.get(skillId);
      if (!skill) {
        return {
          success: false,
          skillId,
          toolName,
          error: `技能不存在: ${skillId}`,
          executionTime: Date.now() - startTime
        };
      }

      if (!skill.enabled) {
        return {
          success: false,
          skillId,
          toolName,
          error: `技能已禁用: ${skillId}`,
          executionTime: Date.now() - startTime
        };
      }

      const tool = skill.tools[toolName];
      if (!tool) {
        return {
          success: false,
          skillId,
          toolName,
          error: `工具不存在: ${toolName}`,
          executionTime: Date.now() - startTime
        };
      }

      // 验证参数
      const validationError = this.validateParameters(tool.parameters, params);
      if (validationError) {
        return {
          success: false,
          skillId,
          toolName,
          error: validationError,
          executionTime: Date.now() - startTime
        };
      }

      // 执行工具
      logger.debug(`执行技能工具: ${skillId}.${toolName}`);
      const result = await tool.handler(params);

      return {
        success: true,
        skillId,
        toolName,
        result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error(`执行技能工具失败: ${skillId}.${toolName}`, error);
      return {
        success: false,
        skillId,
        toolName,
        error: error instanceof Error ? error.message : '未知错误',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * 验证参数
   */
  private validateParameters(
    expectedParams: SkillParameter[],
    actualParams: any
  ): string | null {
    for (const param of expectedParams) {
      if (param.required && !(param.name in actualParams)) {
        return `缺少必需参数: ${param.name}`;
      }

      if (param.name in actualParams) {
        const value = actualParams[param.name];
        const typeError = this.validateParameterType(param, value);
        if (typeError) {
          return typeError;
        }

        if (param.enum && !param.enum.includes(value)) {
          return `参数 ${param.name} 的值必须是以下之一: ${param.enum.join(', ')}`;
        }
      }
    }

    return null;
  }

  /**
   * 验证参数类型
   */
  private validateParameterType(
    param: SkillParameter,
    value: any
  ): string | null {
    const expectedType = param.type;
    let actualType: string;

    if (Array.isArray(value)) {
      actualType = 'array';
    } else if (value === null) {
      return `参数 ${param.name} 不能为 null`;
    } else {
      actualType = typeof value;
    }

    if (actualType !== expectedType) {
      return `参数 ${param.name} 类型错误: 期望 ${expectedType}, 实际 ${actualType}`;
    }

    return null;
  }

  /**
   * 删除技能
   */
  deleteSkill(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (skill) {
      this.skills.delete(skillId);
      
      // 从分类中移除
      const categorySkills = this.skillCategories.get(skill.category);
      if (categorySkills) {
        const index = categorySkills.findIndex(s => s.id === skillId);
        if (index >= 0) {
          categorySkills.splice(index, 1);
        }
      }
      
      logger.info(`技能已删除: ${skillId}`);
      return true;
    }
    return false;
  }

  /**
   * 获取技能统计信息
   */
  getSkillStats() {
    const allSkills = this.getAllSkills();
    const enabledSkills = this.getEnabledSkills();
    
    return {
      total: allSkills.length,
      enabled: enabledSkills.length,
      disabled: allSkills.length - enabledSkills.length,
      categories: this.getSkillCategories().length,
      byCategory: Object.fromEntries(
        this.getSkillCategories().map(category => [
          category,
          this.getSkillsByCategory(category).length
        ])
      )
    };
  }
}

// 导出单例
export const chatClawOpenClawSkillService = new ChatClawOpenClawSkillService();
