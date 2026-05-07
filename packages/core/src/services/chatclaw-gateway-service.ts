/**
 * OpenClaw Gateway 服务
 * 管理 Gateway 生命周期、运行时探测、会话、渠道和事件。
 */

import { eventBus } from '../utils/event-bus';
import { logger } from '../utils/logger';
import { chatClawCommunicationService } from './chatclaw-communication-service';
import { chatClawAgentService } from './chatclaw-multi-agent-service';
import { chatClawMemoryService } from './chatclaw-memory-service';
import { chatClawChannelConnectorService } from './chatclaw-channel-connector-service';
import { linkMindService } from './linkmind-service';

// 只在 Node.js 环境中导入 Node.js 特定模块
let execFileAsync: any;
let spawn: any;
let homedir: any;
let release: any;
let join: any;

if (typeof window === 'undefined') {
  // Node.js 环境
  const { execFile, spawn: spawnFn } = require('child_process');
  const { homedir: homedirFn, release: releaseFn } = require('os');
  const { join: joinFn } = require('path');
  const { promisify } = require('util');
  
  execFileAsync = promisify(execFile);
  spawn = spawnFn;
  homedir = homedirFn;
  release = releaseFn;
  join = joinFn;
} else {
  // 浏览器环境 - 使用浏览器原生 API
  execFileAsync = async () => {
    throw new Error('execFile is not available in browser environment');
  };
  spawn = () => {
    throw new Error('spawn is not available in browser environment');
  };
  homedir = () => {
    throw new Error('homedir is not available in browser environment');
  };
  release = () => {
    throw new Error('release is not available in browser environment');
  };
  join = (...args: string[]) => args.join('/');
}

type ChildProcess = {
  pid: number;
  kill: (signal?: string) => boolean;
  on: (event: string, listener: (data: any) => void) => void;
  once: (event: string, listener: () => void) => void;
};

export type GatewayLifecycleState = 'running' | 'stopped' | 'starting' | 'stopping' | 'error';
export type OpenClawCommandTarget = 'native' | 'wsl' | 'unavailable';

export interface GatewayConfig {
  port: number;
  host: string;
  enabled: boolean;
  debug: boolean;
  maxSessions: number;
  sessionTimeout: number;
  command: string;
  healthCheckIntervalMs: number;
  startTimeoutMs: number;
  autoReconnect: boolean;
  allowUnconfiguredStart: boolean;
}

export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  channels: string[];
  agentId?: string;
  metadata: Record<string, any>;
}

export interface Channel {
  id: string;
  type: string;
  name: string;
  config: Record<string, any>;
  enabled: boolean;
  lastConnected: Date | null;
}

export interface Event {
  id: string;
  type: string;
  source: string;
  data: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
  channelId?: string;
}

export interface OpenClawCommandResult {
  success: boolean;
  command: string;
  args: string[];
  code: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  target: OpenClawCommandTarget;
}

export interface OpenClawRuntimeInfo {
  cliAvailable: boolean;
  nativeCliAvailable: boolean;
  wslCliAvailable: boolean;
  preferredTarget: OpenClawCommandTarget;
  cliPath?: string;
  cliVersion?: string;
  nativeCliPath?: string;
  wslCliPath?: string;
  nativeCliError?: string;
  wslCliError?: string;
  nodeVersion: string;
  nodeMajor: number | null;
  nodeVersionSupported: boolean;
  isWindows: boolean;
  isWsl: boolean;
  wslRecommended: boolean;
  configPath: string;
  stateDir: string;
  workspaceDir: string;
  logDir: string;
}

export interface GatewayHealthReport {
  reachable: boolean;
  url: string;
  checkedAt: string;
  latencyMs?: number;
  mode: 'rpc' | 'http' | 'unknown';
  serviceState?: string;
  version?: string | null;
  raw?: unknown;
}

export interface GatewayStructuredError {
  code:
    | 'cli-not-found'
    | 'gateway-start-failed'
    | 'gateway-stop-failed'
    | 'gateway-unreachable'
    | 'gateway-healthcheck-failed'
    | 'gateway-runtime-error';
  message: string;
  recoveryHints: string[];
  details?: string;
}

export interface GatewayServiceStatus {
  enabled: boolean;
  port: number;
  host: string;
  sessionCount: number;
  channelCount: number;
  enabledChannelCount: number;
  lifecycleState: GatewayLifecycleState;
  gatewayUrl: string;
  runtime: OpenClawRuntimeInfo | null;
  health: GatewayHealthReport | null;
  version: string | null;
  lastError: GatewayStructuredError | null;
}

export interface GatewayStatusRefreshOptions {
  forceRuntimeRefresh?: boolean;
  includeHealthCheck?: boolean;
}

export interface GatewayDiagnosisOptions extends GatewayStatusRefreshOptions {
  includeDoctor?: boolean;
}

export interface GatewayDiagnosticReport {
  checkedAt: string;
  status: GatewayServiceStatus;
  doctor: OpenClawCommandResult | null;
  issues: string[];
}

export interface AgentRuntimeSyncReport {
  checkedAt: string;
  linkMindConnected: boolean;
  linkMindMessage: string;
}

interface CliProbeResult {
  available: boolean;
  path?: string;
  error?: string;
}

export class ChatClawGatewayService {
  private config: GatewayConfig = {
    port: 18789,
    host: 'localhost',
    enabled: false,
    debug: false,
    maxSessions: 100,
    sessionTimeout: 3600000,
    command: 'openclaw',
    healthCheckIntervalMs: 15000,
    startTimeoutMs: 20000,
    autoReconnect: true,
    allowUnconfiguredStart: false
  };

  private sessions: Map<string, Session> = new Map();
  private channels: Map<string, Channel> = new Map();
  private events: Event[] = [];
  private eventListeners: Map<string, Set<(event: Event) => void>> = new Map();
  private server: Record<string, unknown> | null = null;
  private lifecycleState: GatewayLifecycleState = 'stopped';
  private runtimeInfo: OpenClawRuntimeInfo | null = null;
  private lastHealth: GatewayHealthReport | null = null;
  private lastError: GatewayStructuredError | null = null;
  private gatewayProcess: ChildProcess | null = null;
  private monitorInterval: NodeJS.Timeout | null = null;
  private restartInFlight: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * 初始化服务
   */
  private initialize(): void {
    logger.info('ChatClaw Gateway Service initialized');
    this.loadChannels();
    this.startSessionCleanup();
    this.startMonitoring();
  }

  /**
   * 加载渠道配置
   */
  private loadChannels(): void {
    try {
      const allChannels = chatClawCommunicationService.getAllChannels();
      allChannels.forEach(channel => {
        this.channels.set(channel.id, {
        id: channel.id,
        type: channel.type,
        name: channel.name,
        config: channel.config || {},
        enabled: channel.enabled || false,
        lastConnected: null
      });
      });
      logger.info(`Loaded ${this.channels.size} channels`);
    } catch (error) {
      logger.error('Failed to load channels:', error);
    }
  }

  /**
   * 启动会话清理任务
   */
  private startSessionCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 启动 Gateway 健康监控。
   */
  private startMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    this.monitorInterval = setInterval(async () => {
      if (this.lifecycleState !== 'running') {
        return;
      }

      const health = await this.getHealthReport();
      if (health.reachable) {
        return;
      }

      logger.warn('OpenClaw Gateway health check failed');
      this.setLifecycleState('error');
      this.lastError = this.createStructuredError(
        'gateway-healthcheck-failed',
        'OpenClaw Gateway 已不可达。',
        [
          '执行 `openclaw gateway status` 查看服务状态',
          '执行 `openclaw doctor` 获取修复建议',
          '确认当前绑定地址和端口配置仍然可用'
        ],
        '后台健康检查未通过。'
      );

      if (this.config.autoReconnect && !this.restartInFlight) {
        void this.restart();
      }
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * 清理过期会话
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    this.sessions.forEach((session, sessionId) => {
      if (now - session.lastActivity.getTime() > this.config.sessionTimeout) {
        expiredSessions.push(sessionId);
      }
    });

    expiredSessions.forEach(sessionId => {
      this.endSession(sessionId);
    });

    if (expiredSessions.length > 0) {
      logger.info(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * 检查本机 OpenClaw 运行时信息。
   */
  async detectRuntime(forceRefresh: boolean = false): Promise<OpenClawRuntimeInfo> {
    if (this.runtimeInfo && !forceRefresh) {
      return { ...this.runtimeInfo };
    }

    // 检查是否在浏览器环境中
    if (typeof window !== 'undefined') {
      // 浏览器环境 - 返回浏览器相关的运行时信息
      return {
        cliAvailable: false,
        nativeCliAvailable: false,
        wslCliAvailable: false,
        preferredTarget: 'unavailable',
        cliPath: undefined,
        cliVersion: undefined,
        nativeCliPath: undefined,
        wslCliPath: undefined,
        nativeCliError: 'OpenClaw CLI is not available in browser environment',
        wslCliError: 'OpenClaw CLI is not available in browser environment',
        nodeVersion: 'browser',
        nodeMajor: null,
        nodeVersionSupported: false,
        isWindows: false,
        isWsl: false,
        wslRecommended: false,
        configPath: '~/.openclaw/openclaw.json',
        stateDir: '~/.openclaw',
        workspaceDir: '~/.openclaw/workspace',
        logDir: '~/.openclaw/logs'
      };
    }

    // Node.js 环境
    const isWindows = process.platform === 'win32';
    const isWsl = !!process.env.WSL_DISTRO_NAME || /microsoft/i.test(release());
    const stateDir = isWindows ? join(homedir(), '.openclaw') : '~/.openclaw';
    const configPath = isWindows ? join(stateDir, 'openclaw.json') : '~/.openclaw/openclaw.json';
    const workspaceDir = isWindows ? join(stateDir, 'workspace') : '~/.openclaw/workspace';
    const logDir = isWindows ? join(stateDir, 'logs') : '~/.openclaw/logs';
    const nodeMajor = this.parseNodeMajor(process.version);

    const nativeProbe = await this.findNativeCli();
    const wslProbe = isWindows ? await this.findWslCli() : { available: false };

    const preferredTarget: OpenClawCommandTarget = nativeProbe.available
      ? 'native'
      : wslProbe.available
        ? 'wsl'
        : 'unavailable';

    const versionProbe = preferredTarget === 'unavailable'
      ? null
      : await this.executeInvocation(
          this.buildCliInvocation(['--version'], preferredTarget),
          preferredTarget,
          5000
        );

    this.runtimeInfo = {
      cliAvailable: preferredTarget !== 'unavailable',
      nativeCliAvailable: !!nativeProbe.available,
      wslCliAvailable: !!wslProbe.available,
      preferredTarget,
      cliPath: preferredTarget === 'native' ? nativeProbe.path : preferredTarget === 'wsl' ? wslProbe.path : undefined,
      cliVersion: versionProbe?.success ? this.firstNonEmptyLine(versionProbe.stdout) : undefined,
      nativeCliPath: nativeProbe.path,
      wslCliPath: wslProbe.path,
      nativeCliError: nativeProbe.error,
      wslCliError: wslProbe.error,
      nodeVersion: process.version,
      nodeMajor,
      nodeVersionSupported: nodeMajor !== null && nodeMajor >= 22,
      isWindows,
      isWsl,
      wslRecommended: isWindows,
      configPath,
      stateDir,
      workspaceDir,
      logDir
    };

    return { ...this.runtimeInfo };
  }

  /**
   * 执行 OpenClaw doctor 诊断。
   */
  async runDoctor(): Promise<OpenClawCommandResult> {
    return this.runCli(['doctor', '--non-interactive'], { timeoutMs: 20000 });
  }

  /**
   * 获取 Gateway 健康报告。
   */
  async getHealthReport(): Promise<GatewayHealthReport> {
    const checkedAt = new Date().toISOString();
    const url = this.getGatewayUrl();

    const rpcStartedAt = Date.now();
    const rpcStatus = await this.runCli(
      ['gateway', 'status', '--json', '--url', url, '--timeout', '3000'],
      { timeoutMs: 5000 }
    );

    if (rpcStatus.success) {
      const raw = this.tryParseJson(rpcStatus.stdout);
      const reachable = this.extractReachableState(raw, rpcStatus.stdout);
      const serviceState = this.extractServiceState(raw, rpcStatus.stdout);
      const version = this.extractVersion(raw);

      this.lastHealth = {
        reachable,
        url,
        checkedAt,
        latencyMs: Date.now() - rpcStartedAt,
        mode: 'rpc',
        serviceState,
        version,
        raw
      };

      return this.lastHealth;
    }

    const httpStartedAt = Date.now();

    try {
      const response = await fetch(this.getGatewayHttpUrl(), { method: 'GET' });
      this.lastHealth = {
        reachable: response.ok,
        url: this.getGatewayHttpUrl(),
        checkedAt,
        latencyMs: Date.now() - httpStartedAt,
        mode: 'http'
      };
      return this.lastHealth;
    } catch (error) {
      this.lastHealth = {
        reachable: false,
        url,
        checkedAt,
        latencyMs: Date.now() - httpStartedAt,
        mode: 'unknown',
        raw: this.getErrorMessage(error)
      };
      return this.lastHealth;
    }
  }

  /**
   * 检查 Gateway 是否健康。
   */
  async checkHealth(): Promise<boolean> {
    const report = await this.getHealthReport();
    return report.reachable;
  }

  /**
   * 获取 OpenClaw 版本。
   */
  async getVersion(): Promise<string | null> {
    const runtime = await this.detectRuntime();
    return runtime.cliVersion ?? null;
  }

  /**
   * 启动 Gateway 服务
   */
  async start(): Promise<boolean> {
    try {
      if (this.lifecycleState === 'starting' || this.lifecycleState === 'running') {
        const reachable = await this.checkHealth();
        if (reachable) {
          logger.warn('Gateway service is already running');
          this.config.enabled = true;
          this.server = { mode: 'existing' };
          return true;
        }
      }

      this.setLifecycleState('starting');
      this.lastError = null;

      const runtime = await this.detectRuntime(true);
      if (!runtime.cliAvailable) {
        // 检查是否在浏览器环境中
        if (typeof window !== 'undefined') {
          // 浏览器环境 - 优雅处理，不抛出错误
          logger.info('OpenClaw CLI is not available in browser environment, using fallback mode');
          this.setLifecycleState('stopped');
          return false;
        }
        
        // Node.js 环境 - 抛出错误
        this.lastError = this.createStructuredError(
          'cli-not-found',
          '当前环境未检测到 `openclaw` CLI。',
          [
            '优先在 WSL2 中安装 OpenClaw 并通过 `openclaw onboard --install-daemon` 完成初始化',
            '或在当前系统中执行 `npm install -g openclaw@latest`',
            '安装后重新运行 `openclaw doctor` 检查环境'
          ],
          this.describeCliUnavailable(runtime)
        );
        logger.error(this.lastError.message);
        this.setLifecycleState('error');
        return false;
      }

      const existingHealth = await this.getHealthReport();
      if (existingHealth.reachable) {
        this.config.enabled = true;
        this.server = { mode: 'existing' };
        this.setLifecycleState('running');
        return true;
      }

      const serviceStart = await this.runCli(['gateway', 'start', '--json'], { timeoutMs: 15000 });
      if (serviceStart.success && await this.waitForGatewayHealth(true)) {
        this.config.enabled = true;
        this.server = { mode: 'service' };
        this.setLifecycleState('running');
        this.emitEvent('gateway.started', {
          host: this.config.host,
          port: this.config.port,
          mode: 'service'
        });
        return true;
      }

      const spawned = await this.spawnGatewayProcess();
      if (spawned && await this.waitForGatewayHealth(true)) {
        this.config.enabled = true;
        this.server = { mode: 'foreground' };
        this.setLifecycleState('running');
        this.emitEvent('gateway.started', {
          host: this.config.host,
          port: this.config.port,
          mode: 'foreground'
        });
        return true;
      }

      this.lastError = this.createStructuredError(
        'gateway-start-failed',
        'OpenClaw Gateway 启动失败。',
        [
          '执行 `openclaw gateway status` 查看服务管理器状态',
          '执行 `openclaw doctor` 获取修复建议',
          '检查 `gateway.mode`、端口占用和本地配置文件是否损坏'
        ],
        [serviceStart.stderr, this.gatewayProcess ? 'foreground gateway spawned but never became healthy' : '']
          .filter(Boolean)
          .join('\n')
      );
      this.config.enabled = false;
      this.server = null;
      this.setLifecycleState('error');
      logger.error(this.lastError.message);
      return false;
    } catch (error) {
      logger.error('Failed to start gateway service:', error);
      this.lastError = this.createStructuredError(
        'gateway-runtime-error',
        'OpenClaw Gateway 启动时发生异常。',
        [
          '执行 `openclaw doctor` 检查环境',
          '查看 Gateway 日志确认失败原因',
          '确认当前端口和认证配置没有冲突'
        ],
        this.getErrorMessage(error)
      );
      this.config.enabled = false;
      this.server = null;
      this.setLifecycleState('error');
      return false;
    }
  }

  /**
   * 停止 Gateway 服务
   */
  async stop(): Promise<boolean> {
    try {
      if (this.lifecycleState === 'stopped') {
        logger.warn('Gateway service is not running');
        return true;
      }

      this.setLifecycleState('stopping');

      const stopResults: OpenClawCommandResult[] = [];
      stopResults.push(await this.runCli(['gateway', 'stop', '--json'], { timeoutMs: 15000 }));

      if (this.gatewayProcess) {
        await this.killGatewayProcess();
      }

      const stopped = await this.waitForGatewayHealth(false);
      if (!stopped) {
        this.lastError = this.createStructuredError(
          'gateway-stop-failed',
          'OpenClaw Gateway 停止失败。',
          [
            '执行 `openclaw gateway status` 查看仍在运行的服务',
            '检查是否有残留前台进程或系统服务未结束',
            '必要时手动执行 `openclaw gateway stop` 或终止占用端口的进程'
          ],
          stopResults.map(result => result.stderr).filter(Boolean).join('\n')
        );
        this.setLifecycleState('error');
        return false;
      }

      this.server = null;
      this.config.enabled = false;
      this.lastHealth = {
        reachable: false,
        url: this.getGatewayUrl(),
        checkedAt: new Date().toISOString(),
        mode: 'unknown'
      };

      // 清理所有会话
      this.sessions.forEach((_, sessionId) => {
        this.endSession(sessionId);
      });

      logger.info('Gateway service stopped');

      // 触发停止事件
      this.emitEvent('gateway.stopped', {});
      this.setLifecycleState('stopped');

      return true;
    } catch (error) {
      logger.error('Failed to stop gateway service:', error);
      this.lastError = this.createStructuredError(
        'gateway-stop-failed',
        'OpenClaw Gateway 停止时发生异常。',
        [
          '执行 `openclaw gateway status` 确认是否仍有守护进程存活',
          '检查当前进程是否有权限终止 Gateway',
          '必要时手动重启系统服务后重试'
        ],
        this.getErrorMessage(error)
      );
      this.setLifecycleState('error');
      return false;
    }
  }

  /**
   * 重启 Gateway 服务。
   */
  async restart(): Promise<boolean> {
    if (this.restartInFlight) {
      return false;
    }

    this.restartInFlight = true;

    try {
      const restartResult = await this.runCli(['gateway', 'restart', '--json'], { timeoutMs: 20000 });
      if (restartResult.success && await this.waitForGatewayHealth(true)) {
        this.config.enabled = true;
        this.server = { mode: 'service' };
        this.setLifecycleState('running');
        this.emitEvent('gateway.restarted', {
          host: this.config.host,
          port: this.config.port
        });
        return true;
      }

      const stopped = await this.stop();
      if (!stopped) {
        return false;
      }

      return this.start();
    } finally {
      this.restartInFlight = false;
    }
  }

  /**
   * 创建新会话
   */
  createSession(userId: string, metadata?: Record<string, any>): Session {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: Session = {
      id: sessionId,
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      channels: [],
      metadata: metadata || {}
    };

    this.sessions.set(sessionId, session);
    logger.info(`Created new session: ${sessionId} for user: ${userId}`);

    // 触发会话创建事件
    this.emitEvent('session.created', {
      sessionId,
      userId
    });

    return session;
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      // 更新最后活动时间
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);
    }
    return session;
  }

  /**
   * 结束会话
   */
  endSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    this.sessions.delete(sessionId);
    logger.info(`Ended session: ${sessionId}`);

    // 触发会话结束事件
    this.emitEvent('session.ended', {
      sessionId
    });

    return true;
  }

  /**
   * 获取所有会话
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 获取渠道
   */
  getChannel(channelId: string): Channel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * 获取所有渠道
   */
  getAllChannels(): Channel[] {
    return Array.from(this.channels.values());
  }

  /**
   * 启用渠道
   */
  enableChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return false;
    }

    channel.enabled = true;
    channel.lastConnected = new Date();
    this.channels.set(channelId, channel);
    logger.info(`Enabled channel: ${channelId}`);

    // 触发渠道启用事件
    this.emitEvent('channel.enabled', {
      channelId
    });

    return true;
  }

  /**
   * 禁用渠道
   */
  disableChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return false;
    }

    channel.enabled = false;
    this.channels.set(channelId, channel);
    logger.info(`Disabled channel: ${channelId}`);

    // 触发渠道禁用事件
    this.emitEvent('channel.disabled', {
      channelId
    });

    return true;
  }

  /**
   * 路由消息
   */
  async routeMessage(sessionId: string, channelId: string, message: any): Promise<boolean> {
    try {
      const session = this.getSession(sessionId);
      if (!session) {
        logger.error(`Session not found: ${sessionId}`);
        return false;
      }

      const channel = this.getChannel(channelId);
      if (!channel || !channel.enabled) {
        logger.error(`Channel not found or disabled: ${channelId}`);
        return false;
      }

      // 处理消息路由逻辑
      // 1. 保存消息到记忆
      await chatClawMemoryService.addMemory({
        type: 'short-term',
        content: `Message from ${channel.name}: ${message.content}`,
        importance: 0.6,
        tags: ['message', channel.type]
      });

      // 2. 路由到相应的 agent
      if (session.agentId) {
        const agents = chatClawAgentService.getAllAgents();
        const agent = agents.find((a: { id: string }) => a.id === session.agentId);
        if (agent) {
          // 这里可以实现 agent 处理逻辑
          logger.info(`Routing message to agent: ${session.agentId}`);
        }
      }

      // 3. 触发消息路由事件
      this.emitEvent('message.routed', {
        sessionId,
        channelId,
        message
      });

      logger.info(`Routed message from channel ${channelId} to session ${sessionId}`);
      return true;
    } catch (error) {
      logger.error('Failed to route message:', error);
      return false;
    }
  }

  /**
   * 发送消息到渠道
   */
  async sendMessageToChannel(channelId: string, message: any): Promise<boolean> {
    try {
      const channel = this.getChannel(channelId);
      if (!channel || !channel.enabled) {
        logger.error(`Channel not found or disabled: ${channelId}`);
        return false;
      }

      // 使用渠道连接器发送消息
      const sent = await chatClawChannelConnectorService.sendMessageToChannel(
        channelId,
        message.content,
        message.attachments
      );

      if (sent) {
        // 触发消息发送事件
        this.emitEvent('message.sent', {
          channelId,
          message
        });

        logger.info(`Sent message to channel: ${channelId}`);
        return true;
      } else {
        logger.error(`Failed to send message to channel: ${channelId}`);
        return false;
      }
    } catch (error) {
      logger.error('Failed to send message to channel:', error);
      return false;
    }
  }

  /**
   * 注册事件监听器
   */
  onEvent(eventType: string, handler: (event: Event) => void): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(handler);

    return () => {
      this.eventListeners.get(eventType)?.delete(handler);
    };
  }

  /**
   * 触发事件
   */
  private emitEvent(eventType: string, data: Record<string, any>): void {
    const event: Event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: eventType,
      source: 'gateway',
      data,
      timestamp: new Date()
    };

    this.events.push(event);
    
    // 限制事件存储数量
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }

    // 通知监听器
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          logger.error('Event handler error:', error);
        }
      });
    }

    eventBus.emit(`chatclaw:${eventType}`, event);
  }

  /**
   * 获取服务状态
   */
  getStatus(): GatewayServiceStatus {
    const enabledChannelCount = Array.from(this.channels.values()).filter(c => c.enabled).length;

    return {
      enabled: this.config.enabled,
      port: this.config.port,
      host: this.config.host,
      sessionCount: this.sessions.size,
      channelCount: this.channels.size,
      enabledChannelCount,
      lifecycleState: this.lifecycleState,
      gatewayUrl: this.getGatewayUrl(),
      runtime: this.runtimeInfo ? { ...this.runtimeInfo } : null,
      health: this.lastHealth ? { ...this.lastHealth } : null,
      version: this.runtimeInfo?.cliVersion ?? null,
      lastError: this.lastError ? { ...this.lastError } : null
    };
  }

  async refreshStatus(
    options: GatewayStatusRefreshOptions = {}
  ): Promise<GatewayServiceStatus> {
    const {
      forceRuntimeRefresh = true,
      includeHealthCheck = true
    } = options;

    try {
      const runtime = await this.detectRuntime(forceRuntimeRefresh);

      if (includeHealthCheck) {
        this.lastHealth = await this.getHealthReport();

        if (this.lastHealth.reachable) {
          this.config.enabled = true;
          if (this.lifecycleState !== 'starting' && this.lifecycleState !== 'stopping') {
            this.setLifecycleState('running');
          }
        } else if (this.lifecycleState === 'running' && !this.gatewayProcess) {
          this.config.enabled = false;
          this.setLifecycleState('stopped');
        }
      }

      if (!runtime.cliAvailable && !this.lastError) {
        this.lastError = this.createStructuredError(
          'cli-not-found',
          '当前环境未检测到 `openclaw` CLI。',
          [
            '优先在 WSL2 中安装 OpenClaw 并通过 `openclaw onboard --install-daemon` 完成初始化',
            '或在当前系统中执行 `npm install -g openclaw@latest`',
            '安装后重新运行 `openclaw doctor` 检查环境'
          ],
          this.describeCliUnavailable(runtime)
        );
      }

      return this.getStatus();
    } catch (error) {
      this.lastError = this.createStructuredError(
        'gateway-runtime-error',
        '刷新 OpenClaw Gateway 状态时发生异常。',
        [
          '重新执行运行时探测或健康检查',
          '确认当前系统的 OpenClaw/WSL 环境是否可用',
          '查看本地日志以定位状态刷新失败原因'
        ],
        this.getErrorMessage(error)
      );
      return this.getStatus();
    }
  }

  async diagnoseGateway(
    options: GatewayDiagnosisOptions = {}
  ): Promise<GatewayDiagnosticReport> {
    const {
      includeDoctor = true,
      forceRuntimeRefresh = true,
      includeHealthCheck = true
    } = options;

    const status = await this.refreshStatus({
      forceRuntimeRefresh,
      includeHealthCheck
    });
    const doctor = includeDoctor ? await this.runDoctor() : null;
    const issues: string[] = [];

    if (!status.runtime?.cliAvailable) {
      issues.push(status.lastError?.details || 'OpenClaw CLI 不可用。');
    }

    if (includeHealthCheck && !status.health?.reachable) {
      issues.push('Gateway 健康检查未通过。');
    }

    if (doctor && !doctor.success) {
      issues.push(doctor.stderr || 'OpenClaw doctor 执行失败。');
    }

    if (status.lastError?.message && !issues.includes(status.lastError.message)) {
      issues.push(status.lastError.message);
    }

    return {
      checkedAt: new Date().toISOString(),
      status,
      doctor,
      issues
    };
  }

  async syncAgentRuntimeWithLinkMind(): Promise<AgentRuntimeSyncReport> {
    const checkedAt = new Date().toISOString();
    const result = await linkMindService.testConnection();
    const report: AgentRuntimeSyncReport = {
      checkedAt,
      linkMindConnected: result.success,
      linkMindMessage: result.message,
    };
    eventBus.emit('chatclaw:agent-runtime.linkmind-sync', report);
    return report;
  }

  /**
   * 获取配置
   */
  getConfig(): GatewayConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<GatewayConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Gateway config updated:', this.config);

    if (newConfig.healthCheckIntervalMs) {
      this.startMonitoring();
    }
  }

  /**
   * 获取事件历史
   */
  getEvents(limit: number = 50): Event[] {
    return this.events.slice(-limit);
  }

  private async waitForGatewayHealth(expectedReachable: boolean): Promise<boolean> {
    const maxWait = this.config.startTimeoutMs;
    const startedAt = Date.now();

    while (Date.now() - startedAt < maxWait) {
      const health = await this.getHealthReport();
      if (health.reachable === expectedReachable) {
        return true;
      }
      await this.sleep(1000);
    }

    return false;
  }

  private async spawnGatewayProcess(): Promise<boolean> {
    const runtime = await this.detectRuntime();
    const target = runtime.preferredTarget;
    if (target === 'unavailable') {
      return false;
    }

    const args = ['gateway', '--port', String(this.config.port)];
    if (this.config.allowUnconfiguredStart) {
      args.push('--allow-unconfigured');
    }

    const invocation = this.buildCliInvocation(args, target);
    const processRef = spawn(invocation.command, invocation.args, {
      env: {
        ...process.env,
        OPENCLAW_GATEWAY_PORT: String(this.config.port)
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    this.gatewayProcess = processRef;

    processRef.stdout?.on('data', (chunk: Buffer | string) => {
      const text = String(chunk).trim();
      if (text) {
        logger.debug('[OpenClaw Gateway stdout]', text);
      }
    });

    processRef.stderr?.on('data', (chunk: Buffer | string) => {
      const text = String(chunk).trim();
      if (text) {
        logger.warn('[OpenClaw Gateway stderr]', text);
      }
    });

    processRef.on('error', (error: any) => {
      this.lastError = this.createStructuredError(
        'gateway-runtime-error',
        'OpenClaw Gateway 前台进程异常退出。',
        [
          '执行 `openclaw doctor` 检查运行环境',
          '检查网关端口是否被占用',
          '查看 Gateway 错误日志'
        ],
        this.getErrorMessage(error)
      );
      this.setLifecycleState('error');
    });

    processRef.on('exit', (code: number) => {
      logger.info(`OpenClaw Gateway process exited with code: ${code ?? 'unknown'}`);
      if (this.gatewayProcess === processRef) {
        this.gatewayProcess = null;
      }
      if (this.lifecycleState !== 'stopping') {
        this.config.enabled = false;
        this.server = null;
        this.setLifecycleState('stopped');
      }
    });

    return true;
  }

  private async killGatewayProcess(): Promise<void> {
    if (!this.gatewayProcess) {
      return;
    }

    const currentProcess = this.gatewayProcess;

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        try {
          currentProcess.kill('SIGKILL');
        } catch (error) {
          logger.debug('Failed to hard-kill gateway process:', error);
        }
        resolve();
      }, 3000);

      currentProcess.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      try {
        currentProcess.kill('SIGTERM');
      } catch (error) {
        clearTimeout(timeout);
        logger.debug('Failed to stop gateway process gracefully:', error);
        resolve();
      }
    });

    this.gatewayProcess = null;
  }

  private buildCliInvocation(
    args: string[],
    target: OpenClawCommandTarget
  ): { command: string; args: string[] } {
    if (target === 'wsl') {
      return {
        command: 'wsl.exe',
        args: ['-e', 'bash', '-lc', this.toShellCommand([this.config.command, ...args])]
      };
    }

    return {
      command: this.config.command,
      args
    };
  }

  private async executeInvocation(
    invocation: { command: string; args: string[] },
    target: OpenClawCommandTarget,
    timeoutMs: number
  ): Promise<OpenClawCommandResult> {
    const startedAt = Date.now();

    try {
      const result = await execFileAsync(invocation.command, invocation.args, {
        timeout: timeoutMs,
        windowsHide: true,
        maxBuffer: 1024 * 1024
      });

      return {
        success: true,
        command: invocation.command,
        args: invocation.args,
        code: 0,
        stdout: result.stdout,
        stderr: result.stderr,
        durationMs: Date.now() - startedAt,
        target
      };
    } catch (error) {
      const errorWithResult = error as Error & {
        code?: number | string;
        stdout?: string;
        stderr?: string;
      };

      return {
        success: false,
        command: invocation.command,
        args: invocation.args,
        code: typeof errorWithResult.code === 'number' ? errorWithResult.code : null,
        stdout: errorWithResult.stdout ?? '',
        stderr: errorWithResult.stderr ?? errorWithResult.message,
        durationMs: Date.now() - startedAt,
        target
      };
    }
  }

  private async runCli(
    args: string[],
    options: {
      timeoutMs?: number;
      targetOverride?: OpenClawCommandTarget;
    } = {}
  ): Promise<OpenClawCommandResult> {
    const runtime = await this.detectRuntime();
    const target = options.targetOverride ?? runtime.preferredTarget;
    if (target === 'unavailable') {
      return {
        success: false,
        command: this.config.command,
        args,
        code: null,
        stdout: '',
        stderr: this.describeCliUnavailable(runtime),
        durationMs: 0,
        target
      };
    }

    const invocation = this.buildCliInvocation(args, target);
    return this.executeInvocation(invocation, target, options.timeoutMs ?? 10000);
  }

  private async findNativeCli(): Promise<CliProbeResult> {
    const command = process.platform === 'win32' ? 'where.exe' : 'which';

    try {
      const result = await execFileAsync(command, [this.config.command], {
        timeout: 5000,
        windowsHide: true
      });
      const cliPath = this.firstNonEmptyLine(result.stdout);
      return { available: !!cliPath, path: cliPath };
    } catch (error) {
      return {
        available: false,
        error: this.extractProbeErrorMessage(error)
      };
    }
  }

  private async findWslCli(): Promise<CliProbeResult> {
    try {
      const result = await execFileAsync(
        'wsl.exe',
        ['-e', 'bash', '-lc', `command -v ${this.escapeShellArg(this.config.command)}`],
        {
          timeout: 5000,
          windowsHide: true
        }
      );
      const cliPath = this.firstNonEmptyLine(result.stdout);
      return { available: !!cliPath, path: cliPath };
    } catch (error) {
      return {
        available: false,
        error: this.extractProbeErrorMessage(error)
      };
    }
  }

  private getGatewayUrl(): string {
    return `ws://${this.config.host}:${this.config.port}`;
  }

  private getGatewayHttpUrl(): string {
    return `http://${this.config.host}:${this.config.port}/`;
  }

  private setLifecycleState(nextState: GatewayLifecycleState): void {
    this.lifecycleState = nextState;
    eventBus.emit('chatclaw:gateway.lifecycle', {
      state: nextState,
      at: new Date().toISOString(),
      host: this.config.host,
      port: this.config.port
    });
  }

  private createStructuredError(
    code: GatewayStructuredError['code'],
    message: string,
    recoveryHints: string[],
    details?: string
  ): GatewayStructuredError {
    return {
      code,
      message,
      recoveryHints,
      details
    };
  }

  private parseNodeMajor(version: string): number | null {
    const match = /^v(\d+)/.exec(version);
    return match ? Number(match[1]) : null;
  }

  private firstNonEmptyLine(value: string): string | undefined {
    return value
      .split(/\r?\n/)
      .map(line => line.trim())
      .find(Boolean);
  }

  private tryParseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private extractReachableState(raw: unknown, stdout: string): boolean {
    if (!raw || typeof raw !== 'object') {
      return /reachable|healthy|running|connected/i.test(stdout);
    }

    const candidate = raw as Record<string, unknown>;
    const directBooleanKeys = ['reachable', 'healthy', 'ok'];
    for (const key of directBooleanKeys) {
      if (typeof candidate[key] === 'boolean') {
        return candidate[key] as boolean;
      }
    }

    const probe = candidate.probe;
    if (probe && typeof probe === 'object') {
      const probeRecord = probe as Record<string, unknown>;
      if (typeof probeRecord.reachable === 'boolean') {
        return probeRecord.reachable;
      }
      if (typeof probeRecord.ok === 'boolean') {
        return probeRecord.ok;
      }
    }

    return /reachable|healthy|running|connected/i.test(stdout);
  }

  private extractServiceState(raw: unknown, stdout: string): string | undefined {
    if (raw && typeof raw === 'object') {
      const candidate = raw as Record<string, unknown>;
      if (typeof candidate.status === 'string') {
        return candidate.status;
      }
      if (candidate.service && typeof candidate.service === 'object') {
        const service = candidate.service as Record<string, unknown>;
        if (typeof service.status === 'string') {
          return service.status;
        }
      }
    }

    const match = stdout.match(/\b(running|stopped|starting|stopping|failed|error)\b/i);
    return match?.[1]?.toLowerCase();
  }

  private extractVersion(raw: unknown): string | null {
    if (!raw || typeof raw !== 'object') {
      return this.runtimeInfo?.cliVersion ?? null;
    }

    const candidate = raw as Record<string, unknown>;
    if (typeof candidate.version === 'string') {
      return candidate.version;
    }

    const probe = candidate.probe;
    if (probe && typeof probe === 'object') {
      const probeRecord = probe as Record<string, unknown>;
      if (typeof probeRecord.version === 'string') {
        return probeRecord.version;
      }
    }

    return this.runtimeInfo?.cliVersion ?? null;
  }

  private toShellCommand(parts: string[]): string {
    return parts.map(part => this.escapeShellArg(part)).join(' ');
  }

  private escapeShellArg(value: string): string {
    if (/^[a-zA-Z0-9_./:=+-]+$/.test(value)) {
      return value;
    }
    return `'${value.replace(/'/g, `'\\''`)}'`;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error ?? '');
  }

  private extractProbeErrorMessage(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }

    const candidate = error as Error & {
      stdout?: string;
      stderr?: string;
    };

    const detail = [candidate.stderr, candidate.stdout, candidate.message]
      .map(value => value?.trim())
      .find(Boolean);

    return detail || undefined;
  }

  private describeCliUnavailable(runtime: OpenClawRuntimeInfo): string {
    const details: string[] = [];

    if (runtime.isWindows) {
      details.push('Windows 环境未检测到可用的 `openclaw` CLI。');
    } else {
      details.push('当前环境未找到可执行的 `openclaw` 命令。');
    }

    if (runtime.nativeCliError) {
      details.push(`native probe: ${runtime.nativeCliError}`);
    }

    if (runtime.wslCliError) {
      details.push(`wsl probe: ${runtime.wslCliError}`);
    }

    return details.join('\n');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 导出单例
export const chatClawGatewayService = new ChatClawGatewayService();
