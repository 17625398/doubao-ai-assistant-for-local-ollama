import { BrowserBridge, CDPBridge } from './browser/index.js';
import type { IPage } from './types.js';
import { TimeoutError } from './errors.js';
import { isElectronApp } from './electron-apps.js';

/**
 * Returns the appropriate browser factory based on site type.
 * Uses CDPBridge for registered Electron apps, otherwise BrowserBridge.
 */
export function getBrowserFactory(site?: string): new () => IBrowserFactory {
  if (site && isElectronApp(site)) return CDPBridge;
  return BrowserBridge;
}

function parseEnvTimeout(envVar: string, fallback: number): number {
  const raw = process.env[envVar];
  if (raw === undefined) return fallback;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    console.error(`[runtime] Invalid ${envVar}="${raw}", using default ${fallback}s`);
    return fallback;
  }
  return parsed;
}

export const DEFAULT_BROWSER_CONNECT_TIMEOUT = parseEnvTimeout('OPENCLI_BROWSER_CONNECT_TIMEOUT', 15); // Reduced from 30s
export const DEFAULT_BROWSER_COMMAND_TIMEOUT = parseEnvTimeout('OPENCLI_BROWSER_COMMAND_TIMEOUT', 30); // Reduced from 60s
export const DEFAULT_BROWSER_EXPLORE_TIMEOUT = parseEnvTimeout('OPENCLI_BROWSER_EXPLORE_TIMEOUT', 60); // Reduced from 120s
export const DEFAULT_SESSION_IDLE_TIMEOUT = parseEnvTimeout('OPENCLI_SESSION_IDLE_TIMEOUT', 300); // 5 minutes

/**
 * Timeout with seconds unit. Used for high-level command timeouts.
 */
export async function runWithTimeout<T>(
  promise: Promise<T>,
  opts: { timeout: number; label?: string; hint?: string },
): Promise<T> {
  const label = opts.label ?? 'Operation';
  return withTimeoutMs(promise, opts.timeout * 1000,
    () => new TimeoutError(label, opts.timeout, opts.hint));
}

/**
 * Timeout with milliseconds unit. Used for low-level internal timeouts.
 * Accepts a factory function to create the rejection error, keeping this
 * utility decoupled from specific error types.
 */
export function withTimeoutMs<T>(
  promise: Promise<T>,
  timeoutMs: number,
  makeError: string | (() => Error) = 'Operation timed out',
): Promise<T> {
  const reject_ = typeof makeError === 'string'
    ? () => new Error(makeError)
    : makeError;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(reject_()), timeoutMs);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

/** Interface for browser factory (BrowserBridge or test mocks) */
export interface IBrowserFactory {
  connect(opts?: { timeout?: number; workspace?: string; cdpEndpoint?: string }): Promise<IPage>;
  close(): Promise<void>;
  state: any;
}

interface Session {
  browser: IBrowserFactory;
  page: IPage;
  lastUsed: number;
  workspace: string;
  cdpEndpoint?: string;
}

const sessionPool = new Map<string, Session>();
let sessionCleanupInterval: NodeJS.Timeout | null = null;

function getSessionKey(workspace: string, cdpEndpoint?: string): string {
  return `${workspace}:${cdpEndpoint || 'default'}`;
}

function startSessionCleanup() {
  if (sessionCleanupInterval) return;
  
  sessionCleanupInterval = setInterval(() => {
    const now = Date.now();
    const idleTimeoutMs = DEFAULT_SESSION_IDLE_TIMEOUT * 1000;
    
    for (const [key, session] of sessionPool.entries()) {
      if (now - session.lastUsed > idleTimeoutMs) {
        sessionPool.delete(key);
        session.browser.close().catch(() => {});
      }
    }
  }, 60000); // Check every minute
}

function getSession(
  BrowserFactory: new () => IBrowserFactory,
  opts: { workspace?: string; cdpEndpoint?: string } = {},
): Session | null {
  const workspace = opts.workspace || 'default';
  const key = getSessionKey(workspace, opts.cdpEndpoint);
  const session = sessionPool.get(key);
  
  if (session && session.browser.state === 'connected') {
    session.lastUsed = Date.now();
    return session;
  }
  
  return null;
}

function addSession(
  browser: IBrowserFactory,
  page: IPage,
  opts: { workspace?: string; cdpEndpoint?: string } = {},
): void {
  const workspace = opts.workspace || 'default';
  const key = getSessionKey(workspace, opts.cdpEndpoint);
  
  sessionPool.set(key, {
    browser,
    page,
    lastUsed: Date.now(),
    workspace,
    cdpEndpoint: opts.cdpEndpoint,
  });
  
  startSessionCleanup();
}

export async function browserSession<T>(
  BrowserFactory: new () => IBrowserFactory,
  fn: (page: IPage) => Promise<T>,
  opts: { workspace?: string; cdpEndpoint?: string } = {},
): Promise<T> {
  // Try to get an existing session
  let session = getSession(BrowserFactory, opts);
  
  if (session) {
    try {
      return await fn(session.page);
    } catch (err) {
      // If session is broken, remove it and create a new one
      const key = getSessionKey(session.workspace, session.cdpEndpoint);
      sessionPool.delete(key);
      await session.browser.close().catch(() => {});
      session = null;
    }
  }
  
  // Create a new session
  const browser = new BrowserFactory();
  try {
    const page = await browser.connect({
      timeout: DEFAULT_BROWSER_CONNECT_TIMEOUT,
      workspace: opts.workspace,
      cdpEndpoint: opts.cdpEndpoint,
    });
    
    // Add to session pool
    addSession(browser, page, opts);
    
    return await fn(page);
  } catch (err) {
    await browser.close().catch(() => {});
    throw err;
  }
}
