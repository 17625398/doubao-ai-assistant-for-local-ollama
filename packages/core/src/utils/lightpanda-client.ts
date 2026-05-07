/**
 * Lightpanda 浏览器客户端
 * 支持 CLI、CDP 服务器和 Docker 三种模式
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import WebSocket from 'ws';

const execAsync = promisify(exec);

export type LightpandaMode = 'cli' | 'cdp' | 'docker';

export interface LightpandaConfig {
  mode: LightpandaMode;
  binaryPath?: string;
  cdpHost?: string;
  cdpPort?: number;
  dockerContainerName?: string;
  timeout?: number;
  obeyRobots?: boolean;
  maxConcurrency?: number;
}

export interface FetchOptions {
  url: string;
  headers?: Record<string, string>;
  cookies?: string;
  waitForSelector?: string;
  waitForNetworkIdle?: boolean;
  scrollToBottom?: boolean;
  timeout?: number;
}

export interface FetchResult {
  success: boolean;
  content: string;
  title?: string;
  url: string;
  engine: 'lightpanda';
  mode: LightpandaMode;
  error?: string;
  metadata?: {
    contentType?: string;
    statusCode?: number;
    loadTime?: number;
    iframeCount?: number;
    formCount?: number;
    shadowCount?: number;
    standaloneFieldCount?: number;
    isLoginPage?: boolean;
    spaFrameworks?: string[];
  };
}

export interface CDPSession {
  id: string;
  ws: WebSocket;
  connected: boolean;
}

const DEFAULT_CONFIG: LightpandaConfig = {
  mode: 'cli',
  binaryPath: 'lightpanda',
  cdpHost: '127.0.0.1',
  cdpPort: 9222,
  dockerContainerName: 'lightpanda-browser',
  timeout: 30000,
  obeyRobots: true,
  maxConcurrency: 5,
};

export class LightpandaClient {
  private config: LightpandaConfig;
  private cdpSession: CDPSession | null = null;
  private activeRequests = 0;
  private requestQueue: Array<() => void> = [];

  constructor(config: Partial<LightpandaConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 检测 Lightpanda 是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      switch (this.config.mode) {
        case 'cli':
          return await this.checkCliAvailable();
        case 'cdp':
          return await this.checkCdpAvailable();
        case 'docker':
          return await this.checkDockerAvailable();
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * 抓取网页内容
   */
  async fetch(options: FetchOptions): Promise<FetchResult> {
    // 并发控制
    await this.acquireSlot();

    try {
      switch (this.config.mode) {
        case 'cli':
          return await this.fetchWithCli(options);
        case 'cdp':
          return await this.fetchWithCdp(options);
        case 'docker':
          return await this.fetchWithDocker(options);
        default:
          throw new Error(`Unknown mode: ${this.config.mode}`);
      }
    } finally {
      this.releaseSlot();
    }
  }

  /**
   * 启动 CDP 服务器（仅 CDP 模式）
   */
  async startCdpServer(): Promise<void> {
    if (this.config.mode !== 'cdp') {
      throw new Error('CDP server can only be started in CDP mode');
    }

    const isRunning = await this.checkCdpAvailable();
    if (isRunning) {
      console.log('[Lightpanda] CDP server is already running');
      return;
    }

    const args = [
      'serve',
      '--host', this.config.cdpHost!,
      '--port', String(this.config.cdpPort),
      '--log-level', 'error',
    ];

    if (this.config.obeyRobots) {
      args.push('--obey-robots');
    }

    const process = spawn(this.config.binaryPath!, args, {
      detached: true,
      stdio: 'ignore',
    });

    process.unref();

    // 等待服务器启动
    await this.waitForCdpServer(10000);
    console.log('[Lightpanda] CDP server started successfully');
  }

  /**
   * 停止 CDP 服务器
   */
  async stopCdpServer(): Promise<void> {
    if (this.cdpSession) {
      this.cdpSession.ws.close();
      this.cdpSession = null;
    }

    try {
      await execAsync(`pkill -f "lightpanda serve"`);
      console.log('[Lightpanda] CDP server stopped');
    } catch {
      // 进程可能不存在
    }
  }

  /**
   * 启动 Docker 容器（仅 Docker 模式）
   */
  async startDockerContainer(): Promise<void> {
    if (this.config.mode !== 'docker') {
      throw new Error('Docker container can only be started in Docker mode');
    }

    const isRunning = await this.checkDockerAvailable();
    if (isRunning) {
      console.log('[Lightpanda] Docker container is already running');
      return;
    }

    try {
      await execAsync(
        `docker run -d --name ${this.config.dockerContainerName} ` +
        `-p ${this.config.cdpPort}:9222 ` +
        `-e LIGHTPANDA_DISABLE_TELEMETRY=true ` +
        `lightpanda/browser:nightly`
      );
      console.log('[Lightpanda] Docker container started');

      // 等待服务就绪
      await this.waitForCdpServer(30000);
    } catch (error) {
      throw new Error(`Failed to start Docker container: ${error}`);
    }
  }

  /**
   * 停止 Docker 容器
   */
  async stopDockerContainer(): Promise<void> {
    try {
      await execAsync(`docker stop ${this.config.dockerContainerName}`);
      await execAsync(`docker rm ${this.config.dockerContainerName}`);
      console.log('[Lightpanda] Docker container stopped');
    } catch (error) {
      console.error('[Lightpanda] Failed to stop Docker container:', error);
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LightpandaConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): LightpandaConfig {
    return { ...this.config };
  }

  // ==================== 私有方法 ====================

  private async checkCliAvailable(): Promise<boolean> {
    try {
      await execAsync(`${this.config.binaryPath} --version`);
      return true;
    } catch {
      return false;
    }
  }

  private async checkCdpAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const ws = new WebSocket(`ws://${this.config.cdpHost}:${this.config.cdpPort}`);
      
      ws.on('open', () => {
        ws.close();
        resolve(true);
      });
      
      ws.on('error', () => {
        resolve(false);
      });

      setTimeout(() => {
        ws.close();
        resolve(false);
      }, 3000);
    });
  }

  private async checkDockerAvailable(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        `docker ps --filter "name=${this.config.dockerContainerName}" --format "{{.Names}}"`
      );
      return stdout.trim() === this.config.dockerContainerName;
    } catch {
      return false;
    }
  }

  private async fetchWithCli(options: FetchOptions): Promise<FetchResult> {
    const startTime = Date.now();
    
    const args = [
      'fetch',
      '--log-level', 'error',
    ];

    if (this.config.obeyRobots) {
      args.push('--obey-robots');
    }

    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        args.push('--header', `${key}: ${value}`);
      }
    }

    args.push(options.url);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        lightpanda.kill();
        reject(new Error('Request timeout'));
      }, options.timeout || this.config.timeout);

      const lightpanda = spawn(this.config.binaryPath!, args);
      let output = '';
      let errorOutput = '';

      lightpanda.stdout.on('data', (data) => {
        output += data.toString();
      });

      lightpanda.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      lightpanda.on('close', (code) => {
        clearTimeout(timeout);

        if (code === 0) {
          resolve({
            success: true,
            content: output,
            url: options.url,
            engine: 'lightpanda',
            mode: 'cli',
            metadata: {
              loadTime: Date.now() - startTime,
            },
          });
        } else {
          resolve({
            success: false,
            content: '',
            url: options.url,
            engine: 'lightpanda',
            mode: 'cli',
            error: errorOutput || `Process exited with code ${code}`,
          });
        }
      });

      lightpanda.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private async fetchWithCdp(options: FetchOptions): Promise<FetchResult> {
    const startTime = Date.now();

    try {
      // 确保 CDP 会话已连接
      if (!this.cdpSession || !this.cdpSession.connected) {
        await this.connectCdpSession();
      }

      // 创建新页面
      const { targetId } = await this.sendCdpCommand('Target.createTarget', {
        url: 'about:blank',
      });

      // 附加到目标
      const { sessionId } = await this.sendCdpCommand('Target.attachToTarget', {
        targetId,
        flatten: true,
      });

      // 启用网络域
      await this.sendCdpCommand('Network.enable', {}, sessionId);

      // 设置请求头
      if (options.headers || options.cookies) {
        const headers = { ...options.headers };
        if (options.cookies) {
          headers['Cookie'] = options.cookies;
        }
        await this.sendCdpCommand('Network.setExtraHTTPHeaders', {
          headers,
        }, sessionId);
      }

      // 导航到页面
      await this.sendCdpCommand('Page.enable', {}, sessionId);
      await this.sendCdpCommand('Page.navigate', {
        url: options.url,
      }, sessionId);

      // 等待页面加载
      await this.waitForPageLoad(sessionId, options);

      // 如果需要滚动到底部
      if (options.scrollToBottom) {
        await this.scrollToBottom(sessionId);
      }

      // 等待特定选择器
      if (options.waitForSelector) {
        await this.waitForSelector(sessionId, options.waitForSelector);
      }

      // 等待 SPA 路由加载完成
      await this.waitForSpaLoad(sessionId);

      // 获取页面内容（包括 iframe 内容）
      const { result } = await this.sendCdpCommand('Runtime.evaluate', {
        expression: `
          (() => {
            const title = document.title;
            
            // 提取主文档内容
            let content = document.body ? document.body.innerText : '';
            
            // 检测登录状态
            const isLoginPage = (
              document.querySelector('input[type="password"]') !== null &&
              (document.body.innerText.toLowerCase().includes('登录') ||
               document.body.innerText.toLowerCase().includes('login') ||
               document.title.toLowerCase().includes('登录') ||
               document.title.toLowerCase().includes('login'))
            );
            
            // 检测 SPA 框架
            const spaFrameworks = [];
            if (window.Vue) spaFrameworks.push('Vue');
            if (window.React) spaFrameworks.push('React');
            if (window.angular) spaFrameworks.push('Angular');
            if (window.next) spaFrameworks.push('Next.js');
            if (window.nuxt) spaFrameworks.push('Nuxt.js');
            if (document.querySelector('[data-v-app]')) spaFrameworks.push('Vue 3');
            
            // 提取路由信息
            const routeInfo = {
              href: window.location.href,
              pathname: window.location.pathname,
              hash: window.location.hash,
              search: window.location.search
            };
            
            // 尝试提取 iframe 内容
            const iframes = document.querySelectorAll('iframe');
            const iframeContents = [];
            
            for (let i = 0; i < iframes.length; i++) {
              try {
                const iframe = iframes[i];
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (iframeDoc && iframeDoc.body) {
                  const iframeText = iframeDoc.body.innerText;
                  if (iframeText && iframeText.trim().length > 0) {
                    iframeContents.push({
                      index: i,
                      src: iframe.src || 'inline',
                      content: iframeText
                    });
                  }
                }
              } catch (e) {
                // 跨域 iframe 无法访问，忽略错误
              }
            }
            
            // 提取表单内容（包括非 form 标签包裹的输入框）
            const forms = document.querySelectorAll('form');
            const formData = [];
            
            for (let i = 0; i < forms.length; i++) {
              const form = forms[i];
              const formInfo = {
                index: i,
                action: form.action || '',
                method: form.method || 'GET',
                fields: []
              };
              
              const inputs = form.querySelectorAll('input, textarea, select');
              inputs.forEach(input => {
                formInfo.fields.push({
                  type: input.type || input.tagName.toLowerCase(),
                  name: input.name || '',
                  id: input.id || '',
                  placeholder: input.placeholder || '',
                  value: input.value || '',
                  label: input.labels?.[0]?.textContent || ''
                });
              });
              
              if (formInfo.fields.length > 0) {
                formData.push(formInfo);
              }
            }
            
            // 提取独立的输入框（不在 form 中）
            const standaloneInputs = document.querySelectorAll('input:not(form input), textarea:not(form textarea), select:not(form select)');
            const standaloneFields = [];
            standaloneInputs.forEach((input, index) => {
              standaloneFields.push({
                index: index,
                type: input.type || input.tagName.toLowerCase(),
                name: input.name || '',
                id: input.id || '',
                placeholder: input.placeholder || '',
                value: input.value || '',
                label: input.labels?.[0]?.textContent || ''
              });
            });
            
            // 提取 Shadow DOM 内容
            const shadowContents = [];
            const allElements = document.querySelectorAll('*');
            allElements.forEach((el, index) => {
              if (el.shadowRoot) {
                try {
                  const shadowText = el.shadowRoot.textContent;
                  if (shadowText && shadowText.trim().length > 0) {
                    shadowContents.push({
                      index: index,
                      tagName: el.tagName,
                      content: shadowText
                    });
                  }
                } catch (e) {
                  // 忽略错误
                }
              }
            });
            
            // 提取所有可见文本元素
            const textElements = [];
            const visibleSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span', 'label', 'button', 'a'];
            visibleSelectors.forEach(selector => {
              const elements = document.querySelectorAll(selector);
              elements.forEach((el, index) => {
                const text = el.textContent?.trim();
                if (text && text.length > 0 && text.length < 500) {
                  textElements.push({
                    tag: selector,
                    index: index,
                    text: text,
                    id: el.id || '',
                    class: el.className || ''
                  });
                }
              });
            });
            
            return JSON.stringify({ 
              title, 
              content,
              isLoginPage,
              routeInfo,
              spaFrameworks: spaFrameworks.length > 0 ? spaFrameworks : undefined,
              iframeContents: iframeContents.length > 0 ? iframeContents : undefined,
              formData: formData.length > 0 ? formData : undefined,
              standaloneFields: standaloneFields.length > 0 ? standaloneFields : undefined,
              shadowContents: shadowContents.length > 0 ? shadowContents : undefined,
              textElements: textElements.length > 0 ? textElements.slice(0, 50) : undefined
            });
          })()
        `,
        returnByValue: true,
      }, sessionId);

      const pageData = JSON.parse(result.value);
      
      // 合并所有内容
      let fullContent = pageData.content || '';
      
      // 添加 iframe 内容
      if (pageData.iframeContents && pageData.iframeContents.length > 0) {
        fullContent += '\n\n=== iframe 内容 ===\n';
        pageData.iframeContents.forEach((iframe: { index: number; src: string; content: string }) => {
          fullContent += `\n[iframe ${iframe.index}]\n${iframe.content}\n`;
        });
      }
      
      // 添加表单信息
      if (pageData.formData && pageData.formData.length > 0) {
        fullContent += '\n\n=== 表单信息 ===\n';
        pageData.formData.forEach((form: { index: number; action: string; method: string; fields: Array<{ type: string; name: string; id: string; placeholder: string; value: string }> }) => {
          fullContent += `\n[表单 ${form.index}]\n`;
          fullContent += `Action: ${form.action}\n`;
          fullContent += `Method: ${form.method}\n`;
          fullContent += '字段:\n';
          form.fields.forEach(field => {
            fullContent += `  - ${field.name || field.id} (${field.type})`;
            if (field.placeholder) {
              fullContent += ` [${field.placeholder}]`;
            }
            fullContent += '\n';
          });
        });
      }
      
      // 添加 Shadow DOM 内容
      if (pageData.shadowContents && pageData.shadowContents.length > 0) {
        fullContent += '\n\n=== Shadow DOM 内容 ===\n';
        pageData.shadowContents.forEach((shadow: { index: number; tagName: string; content: string }) => {
          fullContent += `\n[${shadow.tagName}]\n${shadow.content}\n`;
        });
      }
      
      // 添加独立字段
      if (pageData.standaloneFields && pageData.standaloneFields.length > 0) {
        fullContent += '\n\n=== 独立输入框 ===\n';
        pageData.standaloneFields.forEach((field: { index: number; type: string; name: string; id: string; placeholder: string; value: string; label: string }) => {
          fullContent += `\n[字段 ${field.index}]\n`;
          fullContent += `  - ${field.name || field.id} (${field.type})`;
          if (field.placeholder) {
            fullContent += ` [${field.placeholder}]`;
          }
          if (field.label) {
            fullContent += ` 标签: ${field.label}`;
          }
          fullContent += '\n';
        });
      }
      
      // 添加页面分析信息
      fullContent += '\n\n=== 页面分析 ===\n';
      if (pageData.isLoginPage) {
        fullContent += '⚠️ 检测到登录页面，需要登录后才能访问完整内容\n';
      }
      if (pageData.spaFrameworks && pageData.spaFrameworks.length > 0) {
        fullContent += `SPA 框架: ${pageData.spaFrameworks.join(', ')}\n`;
      }
      if (pageData.routeInfo) {
        fullContent += `路由: ${pageData.routeInfo.hash || pageData.routeInfo.pathname}\n`;
      }

      // 关闭目标
      await this.sendCdpCommand('Target.closeTarget', { targetId });

      return {
        success: true,
        content: fullContent,
        title: pageData.title,
        url: options.url,
        engine: 'lightpanda',
        mode: 'cdp',
        metadata: {
          loadTime: Date.now() - startTime,
          iframeCount: pageData.iframeContents?.length || 0,
          formCount: pageData.formData?.length || 0,
          shadowCount: pageData.shadowContents?.length || 0,
          standaloneFieldCount: pageData.standaloneFields?.length || 0,
          isLoginPage: pageData.isLoginPage,
          spaFrameworks: pageData.spaFrameworks,
        },
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        url: options.url,
        engine: 'lightpanda',
        mode: 'cdp',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async fetchWithDocker(options: FetchOptions): Promise<FetchResult> {
    // Docker 模式实际上也是通过 CDP 协议
    // 确保容器正在运行
    const isRunning = await this.checkDockerAvailable();
    if (!isRunning) {
      await this.startDockerContainer();
    }

    // 使用 CDP 模式抓取
    return this.fetchWithCdp(options);
  }

  private async connectCdpSession(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://${this.config.cdpHost}:${this.config.cdpPort}`;
      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        this.cdpSession = {
          id: Math.random().toString(36).substring(7),
          ws,
          connected: true,
        };
        resolve();
      });

      ws.on('error', (error: Error) => {
        reject(error);
      });

      ws.on('close', () => {
        if (this.cdpSession) {
          this.cdpSession.connected = false;
        }
      });

      setTimeout(() => {
        reject(new Error('CDP connection timeout'));
      }, 10000);
    });
  }

  private async sendCdpCommand(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string
  ): Promise<any> {
    if (!this.cdpSession || !this.cdpSession.connected) {
      throw new Error('CDP session not connected');
    }

    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).substring(7);
      const message = {
        id,
        method,
        params,
        sessionId,
      };

      const timeout = setTimeout(() => {
        reject(new Error(`CDP command timeout: ${method}`));
      }, 30000);

      const handler = (data: WebSocket.Data) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.id === id) {
            clearTimeout(timeout);
            this.cdpSession!.ws.off('message', handler);
            
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
          }
        } catch {
          // 忽略非 JSON 消息
        }
      };

      if (this.cdpSession?.ws) {
        this.cdpSession.ws.on('message', handler);
        this.cdpSession.ws.send(JSON.stringify(message));
      } else {
        reject(new Error('CDP session not available'));
      }
    });
  }

  private async waitForPageLoad(sessionId: string, options: FetchOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Page load timeout'));
      }, options.timeout || this.config.timeout);

      const checkLoaded = async () => {
        try {
          const { result } = await this.sendCdpCommand('Runtime.evaluate', {
            expression: 'document.readyState',
            returnByValue: true,
          }, sessionId);

          if (result.value === 'complete') {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };

      checkLoaded();
    });
  }

  private async waitForSpaLoad(sessionId: string): Promise<void> {
    // 等待 SPA 应用完成初始渲染
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(); // SPA 检测超时，继续执行
      }, 5000);

      const checkSpaLoaded = async () => {
        try {
          const { result } = await this.sendCdpCommand('Runtime.evaluate', {
            expression: `
              (() => {
                // 检测常见的 SPA 加载完成标志
                const checks = {
                  // Vue
                  vue: !!window.Vue || !!document.querySelector('[data-v-app]'),
                  // React
                  react: !!window.React || !!document.querySelector('[data-reactroot]'),
                  // Angular
                  angular: !!window.angular || !!document.querySelector('[ng-app]'),
                  // 检查 DOM 是否有内容
                  hasContent: document.body && document.body.innerText.length > 100,
                  // 检查是否还在加载中
                  notLoading: document.readyState === 'complete',
                  // 检查是否有加载动画
                  noLoadingSpinner: document.querySelector('.loading, .spinner, [class*="loading"]') === null
                };
                return checks;
              })()
            `,
            returnByValue: true,
          }, sessionId);

          const checks = result.value;
          // 如果 DOM 有内容且页面加载完成，认为 SPA 已加载
          if (checks.hasContent && checks.notLoading) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkSpaLoaded, 500);
          }
        } catch {
          clearTimeout(timeout);
          resolve();
        }
      };

      checkSpaLoaded();
    });
  }

  private async waitForSelector(sessionId: string, selector: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Selector timeout: ${selector}`));
      }, 10000);

      const checkSelector = async () => {
        try {
          const { result } = await this.sendCdpCommand('Runtime.evaluate', {
            expression: `document.querySelector('${selector}') !== null`,
            returnByValue: true,
          }, sessionId);

          if (result.value) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkSelector, 100);
          }
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };

      checkSelector();
    });
  }

  private async scrollToBottom(sessionId: string): Promise<void> {
    await this.sendCdpCommand('Runtime.evaluate', {
      expression: `
        new Promise((resolve) => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollTo(0, scrollHeight);
          setTimeout(resolve, 1000);
        })
      `,
      awaitPromise: true,
    }, sessionId);
  }

  private async waitForCdpServer(timeout: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const isAvailable = await this.checkCdpAvailable();
      if (isAvailable) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error('CDP server failed to start within timeout');
  }

  private async acquireSlot(): Promise<void> {
    if (this.activeRequests < this.config.maxConcurrency!) {
      this.activeRequests++;
      return;
    }

    return new Promise((resolve) => {
      this.requestQueue.push(() => {
        this.activeRequests++;
        resolve();
      });
    });
  }

  private releaseSlot(): void {
    this.activeRequests--;
    
    if (this.requestQueue.length > 0) {
      const next = this.requestQueue.shift();
      next?.();
    }
  }
}

// 导出单例实例
export const lightpandaClient = new LightpandaClient();
