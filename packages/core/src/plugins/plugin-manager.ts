// 插件管理器核心实现

import { 
  ChatPlugin, 
  PluginContext, 
  PluginRegistration, 
  PluginManagerOptions,
  ChatMessage,
  ChatResponse,
  ChatFooterProps,
  ChatInputProps,
  SkillDefinition,
  SkillContext,
  SkillResult
} from './types';
import { logger } from '../utils/logger';

/**
 * 插件管理器
 * 负责插件的注册、生命周期管理和调用
 */
export class PluginManager {
  private plugins: Map<string, PluginRegistration> = new Map();
  private context: PluginContext | null = null;
  private options: Required<PluginManagerOptions>;

  constructor(options?: PluginManagerOptions) {
    this.options = {
      debug: false,
      autoInitialize: true,
      ...options
    };
  }

  /**
   * 注册插件
   */
  async register(plugin: ChatPlugin): Promise<void> {
    const existingRegistration = this.plugins.get(plugin.id);
    if (existingRegistration?.plugin === plugin) {
      if (this.options.debug) {
        logger.info(`Plugin ${plugin.id} is already registered, skipping duplicate registration`);
      }
      return;
    }

    if (existingRegistration) {
      logger.warn(`Plugin ${plugin.id} is already registered, unregistering first`);
      await this.unregister(plugin.id);
    }

    const registration: PluginRegistration = {
      plugin,
      context: this.context || undefined,
      enabled: true,
      registeredAt: Date.now()
    };

    this.plugins.set(plugin.id, registration);

    if (this.options.autoInitialize) {
      await this.initializePlugin(plugin);
    }

    if (this.options.debug) {
      logger.info(`Plugin ${plugin.id} v${plugin.version} registered`);
    }
  }

  /**
   * 注销插件
   */
  async unregister(pluginId: string): Promise<void> {
    const registration = this.plugins.get(pluginId);
    if (!registration) {
      logger.warn(`Plugin ${pluginId} is not registered`);
      return;
    }

    try {
      await this.destroyPlugin(registration.plugin);
      this.plugins.delete(pluginId);
      
      if (this.options.debug) {
        logger.info(`Plugin ${pluginId} unregistered`);
      }
    } catch (error) {
      logger.error(`Failed to unregister plugin ${pluginId}:`, error);
    }
  }

  /**
   * 启用/禁用插件
   */
  async togglePlugin(pluginId: string, enabled: boolean): Promise<void> {
    const registration = this.plugins.get(pluginId);
    if (!registration) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (enabled && !registration.enabled) {
      registration.enabled = true;
      if (registration.plugin.initialize && this.context) {
        await registration.plugin.initialize(this.context);
      }
    } else if (!enabled && registration.enabled) {
      if (registration.plugin.destroy) {
        await registration.plugin.destroy();
      }
      registration.enabled = false;
    }
  }

  /**
   * 获取已注册的插件
   */
  getPlugin(pluginId: string): ChatPlugin | undefined {
    return this.plugins.get(pluginId)?.plugin;
  }

  /**
   * 获取所有已注册的插件
   */
  getAllPlugins(): ChatPlugin[] {
    return Array.from(this.plugins.values())
      .filter(reg => reg.enabled)
      .map(reg => reg.plugin);
  }

  /**
   * 获取所有技能
   */
  getAllSkills(): SkillDefinition[] {
    const skills: SkillDefinition[] = [];
    
    for (const reg of this.plugins.values()) {
      if (reg.enabled && reg.plugin.skills) {
        skills.push(...reg.plugin.skills);
      }
    }
    
    return skills;
  }

  /**
   * 根据类别获取技能
   */
  getSkillsByCategory(category: string): SkillDefinition[] {
    return this.getAllSkills().filter(s => s.category === category);
  }

  /**
   * 执行技能
   */
  async executeSkill(
    skillId: string, 
    input: string, 
    context: SkillContext
  ): Promise<SkillResult> {
    const allSkills = this.getAllSkills();
    const skill = allSkills.find(s => s.id === skillId);
    
    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }

    try {
      return await skill.handler(input, context);
    } catch (error) {
      logger.error(`Skill ${skillId} execution failed:`, error);
      throw error;
    }
  }

  /**
   * 检测适用的技能
   */
  detectSkills(input: string): SkillDefinition[] {
    const applicable: SkillDefinition[] = [];
    
    for (const skill of this.getAllSkills()) {
      if (!skill.trigger) continue;
      
      // 关键词匹配
      if (skill.trigger.keywords?.some(kw => 
        input.toLowerCase().includes(kw.toLowerCase())
      )) {
        applicable.push(skill);
        continue;
      }
      
      // 正则匹配
      if (skill.trigger.patterns?.some(p => p.test(input))) {
        applicable.push(skill);
        continue;
      }
    }
    
    return applicable;
  }

  /**
   * 预处理消息
   */
  async preprocessMessage(message: ChatMessage): Promise<ChatMessage> {
    let processed = message;
    
    for (const reg of this.plugins.values()) {
      if (!reg.enabled || !reg.plugin.preprocessMessage) continue;
      
      try {
        processed = await reg.plugin.preprocessMessage(processed);
      } catch (error) {
        logger.error(`Plugin ${reg.plugin.id} preprocessMessage failed:`, error);
      }
    }
    
    return processed;
  }

  /**
   * 后处理响应
   */
  async postprocessResponse(response: ChatResponse): Promise<ChatResponse> {
    let processed = response;
    
    for (const reg of this.plugins.values()) {
      if (!reg.enabled || !reg.plugin.postprocessResponse) continue;
      
      try {
        processed = await reg.plugin.postprocessResponse(processed);
      } catch (error) {
        logger.error(`Plugin ${reg.plugin.id} postprocessResponse failed:`, error);
      }
    }
    
    return processed;
  }

  /**
   * 渲染聊天底部
   */
  renderFooters(props: ChatFooterProps): React.ReactNode[] {
    const results: React.ReactNode[] = [];
    
    for (const reg of this.plugins.values()) {
      if (!reg.enabled || !reg.plugin.renderFooter) continue;
      
      try {
        const node = reg.plugin.renderFooter(props);
        if (node) {
          results.push(node);
        }
      } catch (error) {
        logger.error(`Plugin ${reg.plugin.id} renderFooter failed:`, error);
      }
    }
    
    return results;
  }

  /**
   * 渲染聊天输入框
   */
  renderInputs(props: ChatInputProps): React.ReactNode[] {
    const results: React.ReactNode[] = [];
    
    for (const reg of this.plugins.values()) {
      if (!reg.enabled || !reg.plugin.renderInput) continue;
      
      try {
        const node = reg.plugin.renderInput(props);
        if (node) {
          results.push(node);
        }
      } catch (error) {
        logger.error(`Plugin ${reg.plugin.id} renderInput failed:`, error);
      }
    }
    
    return results;
  }

  /**
   * 渲染工具栏
   */
  renderToolbars(): React.ReactNode[] {
    const results: React.ReactNode[] = [];
    
    for (const reg of this.plugins.values()) {
      if (!reg.enabled || !reg.plugin.renderToolbar) continue;
      
      try {
        const node = reg.plugin.renderToolbar();
        if (node) {
          results.push(node);
        }
      } catch (error) {
        logger.error(`Plugin ${reg.plugin.id} renderToolbar failed:`, error);
      }
    }
    
    return results;
  }

  /**
   * 设置插件上下文
   */
  setContext(context: PluginContext): void {
    this.context = context;
    
    // 更新所有已注册插件的上下文
    for (const reg of this.plugins.values()) {
      reg.context = context;
    }
  }

  /**
   * 获取插件上下文
   */
  getContext(): PluginContext | null {
    return this.context;
  }

  /**
   * 初始化插件
   */
  private async initializePlugin(plugin: ChatPlugin): Promise<void> {
    if (!plugin.initialize) return;
    
    try {
      await plugin.initialize(this.context || this.createDefaultContext());
      if (this.options.debug) {
        logger.info(`Plugin ${plugin.id} initialized`);
      }
    } catch (error) {
      logger.error(`Failed to initialize plugin ${plugin.id}:`, error);
      throw error;
    }
  }

  /**
   * 销毁插件
   */
  private async destroyPlugin(plugin: ChatPlugin): Promise<void> {
    if (!plugin.destroy) return;
    
    try {
      await plugin.destroy();
      if (this.options.debug) {
        logger.info(`Plugin ${plugin.id} destroyed`);
      }
    } catch (error) {
      logger.error(`Failed to destroy plugin ${plugin.id}:`, error);
    }
  }

  /**
   * 创建默认上下文
   */
  private createDefaultContext(): PluginContext {
    return {
      messages: [],
      config: {
        model: 'default',
        temperature: 0.7,
        maxTokens: 2000
      },
      apiEndpoint: '',
      utils: {
        sendMessage: () => logger.warn('sendMessage not implemented'),
        clearHistory: () => logger.warn('clearHistory not implemented'),
        updateConfig: () => logger.warn('updateConfig not implemented')
      }
    };
  }

  /**
   * 销毁所有插件
   */
  async destroyAll(): Promise<void> {
    const promises = Array.from(this.plugins.values()).map(async (reg) => {
      if (reg.plugin.destroy) {
        try {
          await reg.plugin.destroy();
        } catch (error) {
          logger.error(`Failed to destroy plugin ${reg.plugin.id}:`, error);
        }
      }
    });
    
    await Promise.all(promises);
    this.plugins.clear();
    this.context = null;
    
    if (this.options.debug) {
      logger.info('All plugins destroyed');
    }
  }

  /**
   * 获取插件统计信息
   */
  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    totalSkills: number;
  } {
    const all = Array.from(this.plugins.values());
    const enabled = all.filter(r => r.enabled);
    const disabled = all.filter(r => !r.enabled);
    const totalSkills = enabled.reduce((sum, reg) => 
      sum + (reg.plugin.skills?.length || 0), 0
    );
    
    return {
      total: all.length,
      enabled: enabled.length,
      disabled: disabled.length,
      totalSkills
    };
  }
}

// 导出单例
export const pluginManager = new PluginManager({ debug: process.env.NODE_ENV === 'development' });
