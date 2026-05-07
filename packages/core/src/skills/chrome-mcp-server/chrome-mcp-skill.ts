import { Skill } from '../../types/skill';
import { skillManagerService } from '../../services/skill-manager-service';
import { ChromeMCPClient, createChromeMCPClient } from './chrome-mcp-client';
import { ChromeMCPTools, createChromeMCPTools } from './chrome-mcp-tools';

/**
 * Chrome MCP Server 技能
 * 深度集成到 Doubao 技能系统中
 */
export class ChromeMCPSkill implements Skill {
  private client: ChromeMCPClient | null = null;
  private tools: ChromeMCPTools | null = null;
  private isInitialized: boolean = false;
  private config: {
    type: 'http' | 'stdio';
    url?: string;
    command?: string;
    args?: string[];
  };

  /**
   * 构造函数
   * @param config 配置参数
   */
  constructor(config: {
    type: 'http' | 'stdio';
    url?: string;
    command?: string;
    args?: string[];
  }) {
    this.config = config;
  }

  /**
   * 初始化技能
   */
  async initialize(): Promise<void> {
    if (!this.isInitialized) {
      try {
        this.client = createChromeMCPClient(this.config);
        await this.client.connect();
        this.tools = createChromeMCPTools(this.client);
        this.isInitialized = true;
        console.log('Chrome MCP Server skill initialized successfully');
      } catch (error) {
        console.error('Error initializing Chrome MCP Server skill:', error);
        throw error;
      }
    }
  }

  /**
   * 销毁技能
   */
  destroy(): void {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
      this.tools = null;
      this.isInitialized = false;
    }
  }

  /**
   * 获取技能名称
   */
  getName(): string {
    return 'Chrome MCP Server';
  }

  /**
   * 获取技能描述
   */
  getDescription(): string {
    return 'Chrome MCP Server 是一个基于 Chrome 扩展的 Model Context Protocol (MCP) 服务器，允许 AI 助手控制浏览器，实现复杂的浏览器自动化、内容分析和语义搜索等功能。';
  }

  /**
   * 获取技能工具
   */
  getTools(): any {
    if (!this.tools) {
      throw new Error('Chrome MCP Server skill not initialized');
    }
    return this.tools;
  }

  /**
   * 执行工具
   * @param toolName 工具名称
   * @param params 工具参数
   * @returns 工具执行结果
   */
  async executeTool(toolName: string, params: any): Promise<any> {
    if (!this.client) {
      throw new Error('Chrome MCP Server skill not initialized');
    }
    return this.client.executeTool(toolName, params);
  }

  /**
   * 检查技能是否可用
   */
  async isAvailable(): Promise<boolean> {
    if (!this.isInitialized) {
      try {
        await this.initialize();
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }

  /**
   * 获取技能配置
   */
  getConfig(): any {
    return this.config;
  }

  /**
   * 更新技能配置
   * @param config 新的配置参数
   */
  updateConfig(config: {
    type: 'http' | 'stdio';
    url?: string;
    command?: string;
    args?: string[];
  }): void {
    this.config = config;
    this.destroy();
    // 下次使用时会重新初始化
  }
}

let registeredChromeMCPSkill: ChromeMCPSkill | null = null;

/**
 * 创建 Chrome MCP Server 技能实例
 * @param config 配置参数
 * @returns Chrome MCP Server 技能实例
 */
export function createChromeMCPSkill(config: {
  type: 'http' | 'stdio';
  url?: string;
  command?: string;
  args?: string[];
}): ChromeMCPSkill {
  return new ChromeMCPSkill(config);
}

/**
 * 注册 Chrome MCP Server 技能
 * @param config 配置参数
 * @returns 技能注册结果
 */
export function registerChromeMCPSkill(config: {
  type: 'http' | 'stdio';
  url?: string;
  command?: string;
  args?: string[];
}): ChromeMCPSkill {
  registeredChromeMCPSkill?.destroy();

  const skill = createChromeMCPSkill(config);
  registeredChromeMCPSkill = skill;

  skillManagerService.registerSkill({
    id: 'chrome-mcp-server',
    name: skill.getName(),
    description: skill.getDescription(),
    version: '1.0.0',
    category: 'browser',
    tools: {},
    initialize: () => skill.initialize(),
    destroy: () => skill.destroy(),
    getName: () => skill.getName(),
    getDescription: () => skill.getDescription(),
    getTools: () => skill.getTools(),
    executeTool: (toolName: string, params: any) => skill.executeTool(toolName, params),
    isAvailable: () => skill.isAvailable(),
    getConfig: () => skill.getConfig(),
    updateConfig: (nextConfig: typeof config) => skill.updateConfig(nextConfig),
  });

  return skill;
}
