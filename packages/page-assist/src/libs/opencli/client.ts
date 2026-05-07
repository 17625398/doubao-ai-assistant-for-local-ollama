// Define constants locally since we can't import from opencli directly
const DEFAULT_DAEMON_PORT = 19825;

// Define types locally since we can't import from opencli directly
export interface DaemonCommand {
  id: string;
  action: 'exec' | 'navigate' | 'tabs' | 'cookies' | 'screenshot' | 'close-window' | 'sessions' | 'set-file-input' | 'insert-text' | 'bind-current' | 'network-capture-start' | 'network-capture-read' | 'cdp';
  tabId?: number;
  code?: string;
  workspace?: string;
  url?: string;
  op?: string;
  index?: number;
  domain?: string;
  matchDomain?: string;
  matchPathPrefix?: string;
  format?: 'png' | 'jpeg';
  quality?: number;
  fullPage?: boolean;
  files?: string[];
  selector?: string;
  text?: string;
  pattern?: string;
  cdpMethod?: string;
  cdpParams?: Record<string, unknown>;
}

export interface DaemonResult {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface DaemonStatus {
  ok: boolean;
  pid: number;
  uptime: number;
  extensionConnected: boolean;
  extensionVersion?: string;
  pending: number;
  lastCliRequestTime: number;
  memoryMB: number;
  port: number;
}

const DAEMON_PORT = parseInt(process.env.OPENCLI_DAEMON_PORT ?? String(DEFAULT_DAEMON_PORT), 10);
const DAEMON_URL = `http://127.0.0.1:${DAEMON_PORT}`;
const OPENCLI_HEADERS = { 'X-OpenCLI': '1' };

let _idCounter = 0;

function generateId(): string {
  return `cmd_${Date.now()}_${++_idCounter}`;
}

async function requestDaemon(pathname: string, init?: RequestInit & { timeout?: number }): Promise<Response> {
  const { timeout = 2000, headers, ...rest } = init ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(`${DAEMON_URL}${pathname}`, {
      ...rest,
      headers: { ...OPENCLI_HEADERS, ...headers },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchDaemonStatus(opts?: { timeout?: number }): Promise<DaemonStatus | null> {
  try {
    const res = await requestDaemon('/status', { timeout: opts?.timeout ?? 2000 });
    if (!res.ok) return null;
    return await res.json() as DaemonStatus;
  } catch {
    return null;
  }
}

export async function isDaemonRunning(): Promise<boolean> {
  return (await fetchDaemonStatus()) !== null;
}

export async function isExtensionConnected(): Promise<boolean> {
  const status = await fetchDaemonStatus();
  return !!status?.extensionConnected;
}

interface OpenCLIClientOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

export class OpenCLIClient {
  private maxRetries: number;
  private retryDelay: number;
  private timeout: number;

  constructor(options: OpenCLIClientOptions = {}) {
    this.maxRetries = options.maxRetries ?? 4;
    this.retryDelay = options.retryDelay ?? 500;
    this.timeout = options.timeout ?? 30000;
  }

  async sendCommand(
    action: DaemonCommand['action'],
    params: Omit<DaemonCommand, 'id' | 'action'> = {},
  ): Promise<unknown> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const id = generateId();
      const command: DaemonCommand = { id, action, ...params };
      
      try {
        const res = await requestDaemon('/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(command),
          timeout: this.timeout,
        });

        const result = (await res.json()) as DaemonResult;

        if (!result.ok) {
          throw new Error(result.error ?? 'Daemon command failed');
        }

        return result.data;
      } catch (err) {
        const isRetryable = err instanceof TypeError || 
          (err instanceof Error && err.name === 'AbortError');
        
        if (isRetryable && attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
          continue;
        }
        
        throw err;
      }
    }
    
    throw new Error('sendCommand: max retries exhausted');
  }

  async getStatus(): Promise<DaemonStatus | null> {
    return fetchDaemonStatus({ timeout: this.timeout });
  }

  async ensureConnection(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return !!status?.extensionConnected;
    } catch {
      return false;
    }
  }

  async exec(code: string, workspace?: string): Promise<unknown> {
    return this.sendCommand('exec', { code, workspace });
  }

  async navigate(url: string, workspace?: string): Promise<{ tabId?: number; windowId?: number }> {
    return this.sendCommand('navigate', { url, workspace }) as Promise<{ tabId?: number; windowId?: number }>;
  }

  async screenshot(options?: {
    format?: 'png' | 'jpeg';
    quality?: number;
    fullPage?: boolean;
    workspace?: string;
    tabId?: number;
  }): Promise<string> {
    return this.sendCommand('screenshot', options) as Promise<string>;
  }

  async getCookies(opts: { domain?: string; url?: string; workspace?: string } = {}): Promise<any[]> {
    return this.sendCommand('cookies', opts) as Promise<any[]>;
  }

  async closeWindow(workspace?: string): Promise<void> {
    await this.sendCommand('close-window', { workspace });
  }

  async tabs(op: 'list' | 'new' | 'close' | 'select', options?: {
    index?: number;
    urlForNew?: string;
    tabId?: number;
    workspace?: string;
  }): Promise<unknown> {
    return this.sendCommand('tabs', { op, ...options });
  }

  async networkCaptureStart(pattern: string = '', workspace?: string, tabId?: number): Promise<void> {
    await this.sendCommand('network-capture-start', { pattern, workspace, tabId });
  }

  async networkCaptureRead(workspace?: string, tabId?: number): Promise<unknown[]> {
    return this.sendCommand('network-capture-read', { workspace, tabId }) as Promise<unknown[]>;
  }

  async cdp(method: string, params: Record<string, unknown> = {}, workspace?: string, tabId?: number): Promise<unknown> {
    return this.sendCommand('cdp', { cdpMethod: method, cdpParams: params, workspace, tabId });
  }
}

let defaultClient: OpenCLIClient | null = null;

export function getOpenCLIClient(options?: OpenCLIClientOptions): OpenCLIClient {
  if (!defaultClient) {
    defaultClient = new OpenCLIClient(options);
  }
  return defaultClient;
}

export async function executeOpenCLICommand(action: DaemonCommand['action'], params: Omit<DaemonCommand, 'id' | 'action'> = {}): Promise<unknown> {
  const client = getOpenCLIClient();
  return client.sendCommand(action, params);
}
