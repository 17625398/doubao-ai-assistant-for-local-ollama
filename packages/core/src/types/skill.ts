/**
 * 技能接口
 */
export interface Skill {
  /**
   * 初始化技能
   */
  initialize(): Promise<void>;

  /**
   * 销毁技能
   */
  destroy(): void;

  /**
   * 获取技能名称
   */
  getName(): string;

  /**
   * 获取技能描述
   */
  getDescription(): string;

  /**
   * 获取技能工具
   */
  getTools(): any;

  /**
   * 执行工具
   * @param toolName 工具名称
   * @param params 工具参数
   * @returns 工具执行结果
   */
  executeTool(toolName: string, params: any): Promise<any>;

  /**
   * 检查技能是否可用
   */
  isAvailable(): Promise<boolean>;

  /**
   * 获取技能配置
   */
  getConfig(): any;

  /**
   * 更新技能配置
   * @param config 新的配置参数
   */
  updateConfig(config: any): void;
}
