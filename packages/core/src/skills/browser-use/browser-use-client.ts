import { spawn } from 'child_process';

export interface BrowserUseConfig {
  command?: string;
  args?: string[];
  timeoutMs?: number;
  workingDirectory?: string;
}

export interface BrowserUseCommandResult {
  success: boolean;
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

/**
 * browser-use CLI 客户端
 * 通过本地命令行调用 browser-use，实现真实浏览器自动化接入。
 */
export class BrowserUseClient {
  private readonly config: Required<BrowserUseConfig>;

  constructor(config: BrowserUseConfig = {}) {
    this.config = {
      command: config.command?.trim() || 'browser-use',
      args: Array.isArray(config.args) ? config.args : [],
      timeoutMs: typeof config.timeoutMs === 'number' ? config.timeoutMs : 30000,
      workingDirectory: config.workingDirectory?.trim() || '',
    };
  }

  getConfig(): Required<BrowserUseConfig> {
    return { ...this.config, args: [...this.config.args] };
  }

  static getSupportedCommands(): string[] {
    return [
      'doctor',
      'open',
      'state',
      'click',
      'input',
      'type',
      'screenshot',
      'get text',
      'eval',
      'close',
    ];
  }

  async testConnection(): Promise<BrowserUseCommandResult> {
    const doctorResult = await this.run(['doctor']);
    if (doctorResult.success) {
      return doctorResult;
    }

    return this.run(['--help']);
  }

  async open(url: string): Promise<BrowserUseCommandResult> {
    return this.run(['open', url]);
  }

  async state(): Promise<BrowserUseCommandResult> {
    return this.run(['state']);
  }

  async click(index: number): Promise<BrowserUseCommandResult> {
    return this.run(['click', String(index)]);
  }

  async input(index: number, text: string): Promise<BrowserUseCommandResult> {
    return this.run(['input', String(index), text]);
  }

  async type(text: string): Promise<BrowserUseCommandResult> {
    return this.run(['type', text]);
  }

  async screenshot(path?: string, fullPage?: boolean): Promise<BrowserUseCommandResult> {
    const args = ['screenshot'];
    if (path?.trim()) {
      args.push(path.trim());
    }
    if (fullPage) {
      args.push('--full');
    }
    return this.run(args);
  }

  async getText(index: number): Promise<BrowserUseCommandResult> {
    return this.run(['get', 'text', String(index)]);
  }

  async evaluate(script: string): Promise<BrowserUseCommandResult> {
    return this.run(['eval', script]);
  }

  async close(): Promise<BrowserUseCommandResult> {
    return this.run(['close']);
  }

  async execute(args: string[]): Promise<BrowserUseCommandResult> {
    return this.run(args);
  }

  private async run(extraArgs: string[]): Promise<BrowserUseCommandResult> {
    const command = this.config.command;
    const args = [...this.config.args, ...extraArgs];

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const child = spawn(command, args, {
        cwd: this.config.workingDirectory || undefined,
        shell: process.platform === 'win32',
        windowsHide: true,
      });

      const timeout = setTimeout(() => {
        child.kill();
        reject(new Error(`browser-use 命令执行超时（>${this.config.timeoutMs}ms）`));
      }, this.config.timeoutMs);

      child.stdout?.on('data', (data: Buffer | string) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data: Buffer | string) => {
        stderr += data.toString();
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        resolve({
          success: code === 0,
          command,
          args,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code,
        });
      });
    });
  }
}

export function createBrowserUseClient(config: BrowserUseConfig = {}): BrowserUseClient {
  return new BrowserUseClient(config);
}
