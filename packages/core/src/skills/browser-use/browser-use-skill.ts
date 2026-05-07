import { Skill } from '../../types/skill';
import { skillManagerService } from '../../services/skill-manager-service';
import { BrowserUseClient, BrowserUseConfig, createBrowserUseClient } from './browser-use-client';

/**
 * Browser Use 技能
 * 通过 browser-use CLI 暴露常用浏览器自动化能力。
 */
export class BrowserUseSkill implements Skill {
  private client: BrowserUseClient | null = null;
  private isInitialized = false;
  private config: BrowserUseConfig;

  constructor(config: BrowserUseConfig = {}) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.client = createBrowserUseClient(this.config);
    this.isInitialized = true;
  }

  destroy(): void {
    this.client = null;
    this.isInitialized = false;
  }

  getName(): string {
    return 'Browser Use';
  }

  getDescription(): string {
    return 'Browser Use 是一个基于 CLI 的持久化浏览器自动化技能，可执行打开页面、读取状态、点击、输入、截图和文本提取等操作。';
  }

  getTools(): Record<string, string> {
    return {
      browser_use_open: '打开指定 URL',
      browser_use_state: '读取当前页面状态和可点击元素',
      browser_use_click: '点击指定索引元素',
      browser_use_input: '向指定输入框写入文本',
      browser_use_type: '向当前焦点输入文本',
      browser_use_screenshot: '对当前页面截图',
      browser_use_get_text: '读取指定元素的文本',
      browser_use_eval: '执行页面 JavaScript',
      browser_use_close: '关闭当前 browser-use 会话',
      browser_use_command: '执行自定义 browser-use 子命令',
    };
  }

  async executeTool(toolName: string, params: any): Promise<any> {
    await this.ensureClient();
    const client = this.client as BrowserUseClient;

    switch (toolName) {
      case 'browser_use_open':
        if (!params?.url) {
          throw new Error('缺少 url 参数');
        }
        return client.open(String(params.url));
      case 'browser_use_state':
        return client.state();
      case 'browser_use_click':
        return client.click(Number(params?.index));
      case 'browser_use_input':
        return client.input(Number(params?.index), String(params?.text ?? ''));
      case 'browser_use_type':
        return client.type(String(params?.text ?? ''));
      case 'browser_use_screenshot':
        return client.screenshot(
          typeof params?.path === 'string' ? params.path : undefined,
          Boolean(params?.fullPage),
        );
      case 'browser_use_get_text':
        return client.getText(Number(params?.index));
      case 'browser_use_eval':
        return client.evaluate(String(params?.script ?? ''));
      case 'browser_use_close':
        return client.close();
      case 'browser_use_command':
        if (!Array.isArray(params?.args)) {
          throw new Error('browser_use_command 需要 args 数组参数');
        }
        return client.execute(params.args.map((arg: unknown) => String(arg)));
      default:
        throw new Error(`未知的 Browser Use 工具：${toolName}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.ensureClient();
      const result = await (this.client as BrowserUseClient).testConnection();
      return result.success;
    } catch {
      return false;
    }
  }

  getConfig(): BrowserUseConfig {
    return { ...this.config, args: [...(this.config.args || [])] };
  }

  updateConfig(config: BrowserUseConfig): void {
    this.config = config;
    this.destroy();
  }

  private async ensureClient(): Promise<void> {
    if (!this.client) {
      await this.initialize();
    }
  }
}

let registeredBrowserUseSkill: BrowserUseSkill | null = null;

export function createBrowserUseSkill(config: BrowserUseConfig = {}): BrowserUseSkill {
  return new BrowserUseSkill(config);
}

export function registerBrowserUseSkill(config: BrowserUseConfig = {}): BrowserUseSkill {
  registeredBrowserUseSkill?.destroy();

  const skill = createBrowserUseSkill(config);
  registeredBrowserUseSkill = skill;

  skillManagerService.registerSkill({
    id: 'browser-use',
    name: skill.getName(),
    description: skill.getDescription(),
    version: '1.0.0',
    category: 'browser',
    tools: skill.getTools(),
    initialize: () => skill.initialize(),
    destroy: () => skill.destroy(),
    getName: () => skill.getName(),
    getDescription: () => skill.getDescription(),
    getTools: () => skill.getTools(),
    executeTool: (toolName: string, params: any) => skill.executeTool(toolName, params),
    isAvailable: () => skill.isAvailable(),
    getConfig: () => skill.getConfig(),
    updateConfig: (nextConfig: BrowserUseConfig) => skill.updateConfig(nextConfig),
  });

  return skill;
}
