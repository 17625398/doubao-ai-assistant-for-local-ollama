/**
 * PicoClaw 技能服务
 * 管理和执行 PicoClaw 技能，支持通过 Markdown 文件定义自定义技能
 */
import { logger } from '../utils/logger';
import { eventBus } from '../utils/event-bus';
import { readdirSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';

export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  handler: string;
  parameters?: SkillParameter[];
  enabled: boolean;
  category: string;
  version: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  default?: any;
}

export interface SkillExecutionResult {
  success: boolean;
  skillId: string;
  result?: any;
  error?: string;
  executionTime: number;
}

export class ChatClawPicoClawSkillService {
  private skills: Map<string, SkillConfig> = new Map();
  private skillsDirectory: string = './skills';
  private gatewayUrl: string = 'http://localhost:18800';

  constructor() {
    this.initialize();
  }

  /**
   * 初始化技能服务
   */
  private initialize(): void {
    logger.info('Initializing PicoClaw skill service');
    eventBus.on('chatclaw:picoclaw-config-updated', this.handleConfigUpdate.bind(this));
    
    // 确保技能目录存在
    this.ensureSkillsDirectoryExists();
    
    // 加载技能
    this.loadSkills();
  }

  /**
   * 处理配置更新
   */
  private handleConfigUpdate(config: any): void {
    if (config.skills?.directory) {
      this.skillsDirectory = config.skills.directory;
      // 重新加载技能
      this.loadSkills();
    }
    if (config.gatewayUrl) {
      this.gatewayUrl = config.gatewayUrl;
    }
  }

  /**
   * 确保技能目录存在
   */
  private ensureSkillsDirectoryExists(): void {
    if (!existsSync(this.skillsDirectory)) {
      mkdirSync(this.skillsDirectory, { recursive: true });
      logger.info(`Created skills directory: ${this.skillsDirectory}`);
    }
  }

  /**
   * 加载技能
   */
  loadSkills(): void {
    try {
      this.skills.clear();
      
      // 读取技能目录
      const skillDirs = readdirSync(this.skillsDirectory, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const skillDir of skillDirs) {
        const skillPath = join(this.skillsDirectory, skillDir);
        const skillFile = join(skillPath, 'SKILL.md');
        
        if (existsSync(skillFile)) {
          try {
            const skillConfig = this.parseSkillFile(skillFile, skillDir);
            if (skillConfig) {
              this.skills.set(skillConfig.id, skillConfig);
              logger.info(`Loaded skill: ${skillConfig.name} (${skillConfig.id})`);
            }
          } catch (error) {
            logger.error(`Failed to load skill ${skillDir}:`, error);
          }
        }
      }
      
      logger.info(`Loaded ${this.skills.size} skills`);
    } catch (error) {
      logger.error('Failed to load skills:', error);
    }
  }

  /**
   * 解析技能文件
   */
  private parseSkillFile(filePath: string, skillId: string): SkillConfig | null {
    try {
      const content = readFileSync(filePath, 'utf8');
      
      // 解析 Markdown 文件
      const lines = content.split('\n');
      const config: Partial<SkillConfig> = {
        id: skillId,
        keywords: [],
        parameters: [],
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      let currentSection = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // 检查章节标题
        if (trimmedLine.startsWith('# ')) {
          currentSection = trimmedLine.substring(2).toLowerCase();
          continue;
        }
        
        // 解析键值对
        if (trimmedLine.includes(':')) {
          const [key, value] = trimmedLine.split(':', 2).map(item => item.trim());
          const lowerKey = key.toLowerCase();
          
          switch (lowerKey) {
            case 'name':
              config.name = value;
              break;
            case 'description':
              config.description = value;
              break;
            case 'category':
              config.category = value;
              break;
            case 'version':
              config.version = value;
              break;
            case 'author':
              config.author = value;
              break;
            case 'handler':
              config.handler = value;
              break;
            case 'enabled':
              config.enabled = value.toLowerCase() === 'true';
              break;
          }
        }
        
        // 解析关键词
        if (currentSection === 'keywords') {
          if (trimmedLine && !trimmedLine.startsWith('#')) {
            config.keywords?.push(trimmedLine);
          }
        }
        
        // 解析参数
        if (currentSection === 'parameters') {
          if (trimmedLine && !trimmedLine.startsWith('#')) {
            const paramMatch = trimmedLine.match(/([^:]+):\s*(\w+)\s*\((.*?)\)/);
            if (paramMatch) {
              const [, name, type, desc] = paramMatch;
              config.parameters?.push({
                name: name.trim(),
                type: type as any,
                description: desc.trim(),
                required: true
              });
            }
          }
        }
      }
      
      // 验证必要字段
      if (!config.name || !config.description || !config.handler) {
        logger.warn(`Skill ${skillId} missing required fields`);
        return null;
      }
      
      return config as SkillConfig;
    } catch (error) {
      logger.error(`Failed to parse skill file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 执行技能
   */
  async executeSkill(skillId: string, params: any): Promise<SkillExecutionResult> {
    const startTime = Date.now();
    
    try {
      const skill = this.skills.get(skillId);
      if (!skill) {
        return {
          success: false,
          skillId,
          error: `Skill ${skillId} not found`,
          executionTime: Date.now() - startTime
        };
      }
      
      if (!skill.enabled) {
        return {
          success: false,
          skillId,
          error: `Skill ${skillId} is disabled`,
          executionTime: Date.now() - startTime
        };
      }
      
      // 验证参数
      const validationError = this.validateParameters(skill.parameters || [], params);
      if (validationError) {
        return {
          success: false,
          skillId,
          error: validationError,
          executionTime: Date.now() - startTime
        };
      }
      
      // 执行技能
      logger.info(`Executing skill: ${skill.name} (${skillId})`);
      
      // 调用 PicoClaw API 执行技能
      const response = await fetch(`${this.gatewayUrl}/api/skills/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ skillId, params })
      });
      
      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          skillId,
          result,
          executionTime: Date.now() - startTime
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Failed to execute skill ${skillId}`;
        return {
          success: false,
          skillId,
          error: errorMessage,
          executionTime: Date.now() - startTime
        };
      }
    } catch (error) {
      logger.error(`Failed to execute skill ${skillId}:`, error);
      return {
        success: false,
        skillId,
        error: error instanceof Error ? error.message : 'Unknown error',
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
        return `Missing required parameter: ${param.name}`;
      }
      
      if (param.name in actualParams) {
        const value = actualParams[param.name];
        const typeError = this.validateParameterType(param, value);
        if (typeError) {
          return typeError;
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
      return `Parameter ${param.name} cannot be null`;
    } else {
      actualType = typeof value;
    }

    if (actualType !== expectedType) {
      return `Parameter ${param.name} type error: expected ${expectedType}, got ${actualType}`;
    }

    return null;
  }

  /**
   * 获取所有技能
   */
  getAllSkills(): SkillConfig[] {
    return Array.from(this.skills.values());
  }

  /**
   * 获取启用的技能
   */
  getEnabledSkills(): SkillConfig[] {
    return this.getAllSkills().filter(skill => skill.enabled);
  }

  /**
   * 获取技能
   */
  getSkill(skillId: string): SkillConfig | undefined {
    return this.skills.get(skillId);
  }

  /**
   * 启用/禁用技能
   */
  setSkillEnabled(skillId: string, enabled: boolean): boolean {
    const skill = this.skills.get(skillId);
    if (skill) {
      skill.enabled = enabled;
      skill.updatedAt = new Date().toISOString();
      logger.info(`${enabled ? 'Enabled' : 'Disabled'} skill: ${skill.name} (${skillId})`);
      return true;
    }
    return false;
  }

  /**
   * 搜索技能
   */
  searchSkills(query: string): SkillConfig[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllSkills().filter(skill => 
      skill.name.toLowerCase().includes(lowerQuery) ||
      skill.description.toLowerCase().includes(lowerQuery) ||
      skill.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 按分类获取技能
   */
  getSkillsByCategory(category: string): SkillConfig[] {
    return this.getAllSkills().filter(skill => skill.category === category);
  }

  /**
   * 获取技能分类
   */
  getSkillCategories(): string[] {
    const categories = new Set<string>();
    this.getAllSkills().forEach(skill => categories.add(skill.category));
    return Array.from(categories);
  }

  /**
   * 创建技能
   */
  createSkill(skillConfig: Omit<SkillConfig, 'id' | 'createdAt' | 'updatedAt'>): SkillConfig {
    const skillId = `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const skill: SkillConfig = {
      ...skillConfig,
      id: skillId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.skills.set(skillId, skill);
    logger.info(`Created skill: ${skill.name} (${skillId})`);
    return skill;
  }

  /**
   * 更新技能
   */
  updateSkill(skillId: string, updates: Partial<SkillConfig>): SkillConfig | null {
    const skill = this.skills.get(skillId);
    if (skill) {
      const updatedSkill: SkillConfig = {
        ...skill,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.skills.set(skillId, updatedSkill);
      logger.info(`Updated skill: ${skill.name} (${skillId})`);
      return updatedSkill;
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
      logger.info(`Deleted skill: ${skill.name} (${skillId})`);
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
    const categories = this.getSkillCategories();
    
    return {
      total: allSkills.length,
      enabled: enabledSkills.length,
      disabled: allSkills.length - enabledSkills.length,
      categories: categories.length,
      byCategory: Object.fromEntries(
        categories.map(category => [
          category,
          this.getSkillsByCategory(category).length
        ])
      )
    };
  }

  /**
   * 设置技能目录
   */
  setSkillsDirectory(directory: string): void {
    this.skillsDirectory = directory;
    this.ensureSkillsDirectoryExists();
    this.loadSkills();
  }

  /**
   * 获取技能目录
   */
  getSkillsDirectory(): string {
    return this.skillsDirectory;
  }

  /**
   * 设置 Gateway URL
   */
  setGatewayUrl(url: string): void {
    this.gatewayUrl = url;
  }

  /**
   * 获取 Gateway URL
   */
  getGatewayUrl(): string {
    return this.gatewayUrl;
  }
}

// 导出单例
export const chatClawPicoClawSkillService = new ChatClawPicoClawSkillService();
