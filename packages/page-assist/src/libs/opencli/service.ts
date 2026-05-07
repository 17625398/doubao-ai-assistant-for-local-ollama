import { OpenCLIClient, getOpenCLIClient } from './client';
import { OpenCLIError, OpenCLIDaemonError, OpenCLIExtensionError, parseOpenCLIError, formatOpenCLIError, isTransientError } from './errors';

export interface OpenCLIServiceOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  autoInitialize?: boolean;
}

export class OpenCLIService {
  private client: OpenCLIClient;
  private isInitialized: boolean = false;

  constructor(options: OpenCLIServiceOptions = {}) {
    this.client = getOpenCLIClient({
      maxRetries: options.maxRetries,
      retryDelay: options.retryDelay,
      timeout: options.timeout,
    });

    if (options.autoInitialize) {
      this.initialize().catch(() => {
        // Silent initialization failure
      });
    }
  }

  async initialize(): Promise<boolean> {
    try {
      const connected = await this.client.ensureConnection();
      this.isInitialized = connected;
      return connected;
    } catch (error) {
      this.isInitialized = false;
      return false;
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      return await this.client.ensureConnection();
    } catch {
      return false;
    }
  }

  async executeCommand<T = unknown>(action: string, params: Record<string, any> = {}): Promise<T> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const result = await this.client.sendCommand(action as any, params);
      return result as T;
    } catch (error) {
      const parsedError = parseOpenCLIError(error);
      
      if (isTransientError(parsedError) && !this.isInitialized) {
        // Try to reinitialize and retry once
        await this.initialize();
        try {
          const result = await this.client.sendCommand(action as any, params);
          return result as T;
        } catch (retryError) {
          throw parseOpenCLIError(retryError);
        }
      }

      throw parsedError;
    }
  }

  async navigate(url: string, workspace?: string): Promise<{ tabId?: number; windowId?: number }> {
    return this.executeCommand('navigate', { url, workspace });
  }

  async exec(code: string, workspace?: string): Promise<any> {
    return this.executeCommand('exec', { code, workspace });
  }

  async screenshot(options?: {
    format?: 'png' | 'jpeg';
    quality?: number;
    fullPage?: boolean;
    workspace?: string;
    tabId?: number;
  }): Promise<string> {
    return this.executeCommand('screenshot', options);
  }

  async getCookies(opts: { domain?: string; url?: string; workspace?: string } = {}): Promise<any[]> {
    return this.executeCommand('cookies', opts);
  }

  async closeWindow(workspace?: string): Promise<void> {
    return this.executeCommand('close-window', { workspace });
  }

  async tabs(op: 'list' | 'new' | 'close' | 'select', options?: {
    index?: number;
    urlForNew?: string;
    tabId?: number;
    workspace?: string;
  }): Promise<any> {
    return this.executeCommand('tabs', { op, ...options });
  }

  async networkCaptureStart(pattern: string = '', workspace?: string, tabId?: number): Promise<void> {
    return this.executeCommand('network-capture-start', { pattern, workspace, tabId });
  }

  async networkCaptureRead(workspace?: string, tabId?: number): Promise<any[]> {
    return this.executeCommand('network-capture-read', { workspace, tabId });
  }

  async cdp(method: string, params: Record<string, unknown> = {}, workspace?: string, tabId?: number): Promise<any> {
    return this.executeCommand('cdp', { cdpMethod: method, cdpParams: params, workspace, tabId });
  }

  async getStatus(): Promise<any> {
    try {
      return await this.client.getStatus();
    } catch (error) {
      throw parseOpenCLIError(error);
    }
  }

  async diagnose(): Promise<{
    daemonRunning: boolean;
    extensionConnected: boolean;
    status?: any;
    error?: string;
  }> {
    try {
      const status = await this.client.getStatus();
      return {
        daemonRunning: status !== null,
        extensionConnected: !!status?.extensionConnected,
        status,
      };
    } catch (error) {
      return {
        daemonRunning: false,
        extensionConnected: false,
        error: formatOpenCLIError(error),
      };
    }
  }
}

let defaultService: OpenCLIService | null = null;

export function getOpenCLIService(options?: OpenCLIServiceOptions): OpenCLIService {
  if (!defaultService) {
    defaultService = new OpenCLIService(options);
  }
  return defaultService;
}

export async function executeOpenCLIAction<T = unknown>(action: string, params: Record<string, any> = {}): Promise<T> {
  const service = getOpenCLIService();
  return service.executeCommand<T>(action, params);
}

export async function checkOpenCLIStatus(): Promise<{
  connected: boolean;
  status?: any;
  error?: string;
}> {
  const service = getOpenCLIService();
  try {
    const status = await service.getStatus();
    return {
      connected: !!status?.extensionConnected,
      status,
    };
  } catch (error) {
    return {
      connected: false,
      error: formatOpenCLIError(error),
    };
  }
}
