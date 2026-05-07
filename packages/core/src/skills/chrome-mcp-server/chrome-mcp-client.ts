import { ChildProcess, spawn } from 'child_process';
import { Readable, Writable } from 'stream';

/**
 * Chrome MCP Server 客户端
 * 用于与 Chrome MCP Server 进行通信
 */
export class ChromeMCPClient {
  private httpUrl!: string;
  private stdioCommand!: string[];
  private connectionType: 'http' | 'stdio';
  private stdioProcess: ChildProcess | null = null;
  private stdioStdin: Writable | null = null;
  private stdioStdout: Readable | null = null;

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
    if (config.type === 'http') {
      this.connectionType = 'http';
      this.httpUrl = config.url || 'http://127.0.0.1:12306/mcp';
    } else {
      this.connectionType = 'stdio';
      this.stdioCommand = [config.command || 'npx', ...(config.args || [])];
    }
  }

  /**
   * 连接到 Chrome MCP Server
   */
  async connect(): Promise<void> {
    if (this.connectionType === 'stdio') {
      await this.connectStdio();
    }
    // HTTP 连接不需要提前建立
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.stdioProcess) {
      this.stdioProcess.kill();
      this.stdioProcess = null;
      this.stdioStdin = null;
      this.stdioStdout = null;
    }
  }

  /**
   * 执行工具
   * @param toolName 工具名称
   * @param params 工具参数
   * @returns 工具执行结果
   */
  async executeTool(toolName: string, params: any): Promise<any> {
    if (this.connectionType === 'http') {
      return this.executeToolHttp(toolName, params);
    } else {
      return this.executeToolStdio(toolName, params);
    }
  }

  /**
   * 获取工具列表
   * @returns 工具列表
   */
  async getTools(): Promise<any[]> {
    return this.executeTool('list_tools', {});
  }

  /**
   * 通过 HTTP 执行工具
   * @param toolName 工具名称
   * @param params 工具参数
   * @returns 工具执行结果
   */
  private async executeToolHttp(toolName: string, params: any): Promise<any> {
    const requestData = {
      toolcall: {
        name: toolName,
        params: params
      }
    };

    try {
      const response = await fetch(this.httpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error executing tool via HTTP:', error);
      throw error;
    }
  }

  /**
   * 连接到 STDIO
   */
  private async connectStdio(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.stdioProcess = spawn(this.stdioCommand[0], this.stdioCommand.slice(1));
        this.stdioStdin = this.stdioProcess.stdin;
        this.stdioStdout = this.stdioProcess.stdout;

        if (!this.stdioStdin || !this.stdioStdout) {
          throw new Error('Failed to create stdio streams');
        }

        // 设置编码
        if (typeof (this.stdioStdin as any).setEncoding === 'function') {
          (this.stdioStdin as any).setEncoding('utf8');
        }
        if (typeof (this.stdioStdout as any).setEncoding === 'function') {
          (this.stdioStdout as any).setEncoding('utf8');
        }

        // 监听错误
        this.stdioProcess.on('error', (error) => {
          console.error('Stdio process error:', error);
          reject(error);
        });

        // 监听退出
        this.stdioProcess.on('exit', (code) => {
          console.log(`Stdio process exited with code ${code}`);
        });

        // 等待初始化完成
        let initData = '';
        const initListener = (data: string) => {
          initData += data;
          if (initData.includes('MCP server ready')) {
            this.stdioStdout?.removeListener('data', initListener);
            resolve();
          }
        };

        this.stdioStdout.on('data', initListener);

        // 超时处理
        setTimeout(() => {
          this.stdioStdout?.removeListener('data', initListener);
          reject(new Error('Stdio connection timeout'));
        }, 5000);

      } catch (error) {
        console.error('Error connecting to stdio:', error);
        reject(error);
      }
    });
  }

  /**
   * 通过 STDIO 执行工具
   * @param toolName 工具名称
   * @param params 工具参数
   * @returns 工具执行结果
   */
  private async executeToolStdio(toolName: string, params: any): Promise<any> {
    if (!this.stdioStdin || !this.stdioStdout) {
      throw new Error('Stdio connection not established');
    }

    const stdin = this.stdioStdin;
    const stdout = this.stdioStdout;

    return new Promise((resolve, reject) => {
      const requestData = {
        toolcall: {
          name: toolName,
          params: params
        }
      };

      const requestString = JSON.stringify(requestData) + '\n';
      let responseData = '';

      const dataListener = (data: string) => {
        responseData += data;
        try {
          // 尝试解析 JSON
          const result = JSON.parse(responseData);
          stdout.removeListener('data', dataListener);
          resolve(result);
        } catch {
          // 继续收集数据
        }
      };

      stdout.on('data', dataListener);

      stdin.write(requestString, (error) => {
        if (error) {
          stdout.removeListener('data', dataListener);
          reject(error);
        }
      });

      // 超时处理
      setTimeout(() => {
        stdout.removeListener('data', dataListener);
        reject(new Error('Stdio execution timeout'));
      }, 30000);
    });
  }
}

/**
 * 创建 Chrome MCP Server 客户端
 * @param config 配置参数
 * @returns Chrome MCP Server 客户端
 */
export function createChromeMCPClient(config: {
  type: 'http' | 'stdio';
  url?: string;
  command?: string;
  args?: string[];
}): ChromeMCPClient {
  return new ChromeMCPClient(config);
}
