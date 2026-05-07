/**
 * 技能管理器服务
 */
import { chatClawIntegrationService } from './chatclaw-integration-service';

export class SkillManagerService {
  private skills: Map<string, any> = new Map();
  private initialized: boolean = false;

  /**
   * 初始化技能管理器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // 加载内置技能
    await this.loadBuiltInSkills();
    
    // 加载用户自定义技能
    await this.loadCustomSkills();

    this.initialized = true;
  }

  /**
   * 加载内置技能
   */
  private async loadBuiltInSkills(): Promise<void> {
    try {
      // 尝试从 ChatClaw 加载技能
      const chatClawConnected = await chatClawIntegrationService.testConnection();
      
      if (chatClawConnected) {
        try {
          const chatClawSkills = await chatClawIntegrationService.getSkills();
          if (chatClawSkills && chatClawSkills.skills) {
            chatClawSkills.skills.forEach((skill: any) => {
              this.skills.set(`chatclaw-${skill.id}`, {
                id: `chatclaw-${skill.id}`,
                name: `ChatClaw - ${skill.name}`,
                description: skill.description,
                tools: skill.tools || {},
                version: skill.version || '1.0.0',
                category: 'chatclaw'
              });
            });
          }
        } catch (error) {
          // ChatClaw 技能加载失败，使用默认技能
          this.loadDefaultSkills();
        }
      } else {
        // ChatClaw 未连接，使用默认技能
        this.loadDefaultSkills();
      }
    } catch (error) {
      // 发生错误，使用默认技能
      this.loadDefaultSkills();
    }
  }

  /**
   * 加载默认技能
   */
  private loadDefaultSkills(): void {
    const defaultSkills = [
      {
        id: 'chatclaw-basic',
        name: 'ChatClaw 基础技能',
        description: '提供基本的聊天和查询功能',
        tools: {
          chat: {
            name: 'chat',
            description: '与 AI 聊天',
            parameters: {
              message: {
                type: 'string',
                description: '聊天消息'
              }
            }
          }
        },
        version: '1.0.0',
        category: 'chatclaw'
      },
      {
        id: 'chatclaw-knowledge',
        name: 'ChatClaw 知识库技能',
        description: '管理和查询知识库',
        tools: {
          searchKnowledge: {
            name: 'searchKnowledge',
            description: '搜索知识库',
            parameters: {
              query: {
                type: 'string',
                description: '搜索查询'
              }
            }
          }
        },
        version: '1.0.0',
        category: 'chatclaw'
      }
    ];

    for (const skill of defaultSkills) {
      this.skills.set(skill.id, skill);
    }
  }

  /**
   * 加载用户自定义技能
   */
  private async loadCustomSkills(): Promise<void> {
    try {
      // 从本地存储加载自定义技能
      const customSkills = localStorage.getItem('chatclaw-custom-skills');
      if (customSkills) {
        const skills = JSON.parse(customSkills);
        for (const skill of skills) {
          this.skills.set(skill.id, skill);
        }
      }
    } catch (error) {
      console.error('Failed to load custom skills:', error);
    }
  }

  /**
   * 获取所有技能
   */
  getSkills(): Map<string, any> {
    return this.skills;
  }

  /**
   * 根据 ID 获取技能
   * @param skillId 技能 ID
   */
  getSkill(skillId: string): any {
    return this.skills.get(skillId);
  }

  /**
   * 注册新技能
   * @param skill 技能对象
   */
  registerSkill(skill: any): void {
    this.skills.set(skill.id, skill);
    // 保存到本地存储
    this.saveCustomSkills();
  }

  /**
   * 移除技能
   * @param skillId 技能 ID
   */
  removeSkill(skillId: string): void {
    this.skills.delete(skillId);
    // 更新本地存储
    this.saveCustomSkills();
  }

  /**
   * 保存自定义技能到本地存储
   */
  private saveCustomSkills(): void {
    try {
      const customSkills = Array.from(this.skills.values()).filter(skill => skill.id.startsWith('custom-'));
      localStorage.setItem('chatclaw-custom-skills', JSON.stringify(customSkills));
    } catch (error) {
      console.error('Failed to save custom skills:', error);
    }
  }

  /**
   * 执行技能工具
   * @param skillId 技能 ID
   * @param toolName 工具名称
   * @param params 工具参数
   */
  async executeTool(skillId: string, toolName: string, params: any): Promise<any> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }

    const hasLocalExecutor = typeof skill.executeTool === 'function';
    if (!hasLocalExecutor && (!skill.tools || !skill.tools[toolName])) {
      throw new Error(`Tool ${toolName} not found in skill ${skillId}`);
    }

    // 检查是否是 ChatClaw 技能
    if (skillId.startsWith('chatclaw-')) {
      try {
        // 从技能 ID 中提取 ChatClaw 技能 ID
        const chatClawSkillId = skillId.replace('chatclaw-', '');
        // 使用 ChatClaw 集成服务执行技能
        return await chatClawIntegrationService.executeSkill(chatClawSkillId, toolName, params);
      } catch (error) {
        // 执行失败，返回错误信息
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to execute ChatClaw skill'
        };
      }
    }

    if (hasLocalExecutor) {
      return await skill.executeTool(toolName, params);
    }

    // 非 ChatClaw 技能，执行本地逻辑
    // 暂时返回模拟结果
    return {
      success: true,
      result: `Executed ${toolName} with params: ${JSON.stringify(params)}`
    };
  }

  /**
   * 获取技能数量
   */
  getSkillCount(): number {
    return this.skills.size;
  }
}

// 导出单例
export const skillManagerService = new SkillManagerService();
