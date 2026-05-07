/**
 * 多模型适配层 - WebSocket 支持
 * 实时流式交互、多路复用、自动重连
 */

import type {
  ChatRequest,
  ChatChunk,
  ChatResponse,
  ModelInfo,
} from './types/multi-model';

/** WebSocket 事件 */
export interface WebSocketEvents {
  open: () => void;
  close: (code: number, reason: string) => void;
  error: (error: Error) => void;
  message: (data: ChatChunk | ChatResponse) => void;
  streamStart: (streamId: string) => void;
  streamEnd: (streamId: string, response: ChatResponse) => void;
}

/** WebSocket 配置 */
export interface WebSocketConfig {
  /** WebSocket 服务地址 */
  url: string;
  /** 协议 (ws/wss) */
  protocol?: 'ws' | 'wss';
  /** 认证令牌 */
  token?: string;
  /** 重新连接次数 */
  maxReconnectAttempts?: number;
  /** 重新连接延迟 (ms) */
  reconnectDelay?: number;
  /** 心跳间隔 (ms) */
  heartbeatInterval?: number;
  /** 消息超时 (ms) */
  messageTimeout?: number;
  /** 代理服务器地址 (可选) */
  proxyUrl?: string;
}

/** 流会话 */
interface StreamSession {
  id: string;
  request: ChatRequest;
  modelId: string;
  abortController: AbortController;
  startTime: number;
  chunks: ChatChunk[];
  status: 'pending' | 'active' | 'completed' | 'error';
}

/** WebSocket 消息类型 */
type WSMessageType =
  | 'chat.request'
  | 'chat.stream_start'
  | 'chat.chunk'
  | 'chat.complete'
  | 'chat.error'
  | 'chat.abort'
  | 'session.list'
  | 'session.kill'
  | 'ping'
  | 'pong';

/** WebSocket 消息 */
interface WSMessage {
  type: WSMessageType;
  streamId?: string;
  modelId?: string;
  data?: unknown;
  timestamp?: number;
}

export class ModelWebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private sessions: Map<string, StreamSession> = new Map();
  private listeners: Partial<WebSocketEvents> = {};
  private reconnectAttempts = 0;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private messageTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private isManualClose = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      protocol: config.protocol ?? 'wss',
      token: config.token ?? '',
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      reconnectDelay: config.reconnectDelay ?? 1000,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      messageTimeout: config.messageTimeout ?? 120000,
      proxyUrl: config.proxyUrl ?? '',
      ...config,
    };
  }

  /** 连接 */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isManualClose = false;

      const url = this.buildUrl();
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.listeners.open?.();
        resolve();
      };

      this.ws.onclose = (event) => {
        this.stopHeartbeat();
        this.listeners.close?.(event.code, event.reason);

        if (!this.isManualClose && this.shouldReconnect()) {
          this.reconnect();
        }
      };

      this.ws.onerror = (event) => {
        const error = new Error('WebSocket error');
        this.listeners.error?.(error);
        reject(error);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    });
  }

  /** 断开连接 */
  disconnect(): void {
    this.isManualClose = true;
    this.stopHeartbeat();
    this.clearMessageTimers();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    // 中止所有会话
    for (const session of this.sessions.values()) {
      session.abortController.abort();
    }
    this.sessions.clear();
  }

  /** 添加事件监听 */
  on<K extends keyof WebSocketEvents>(
    event: K,
    listener: WebSocketEvents[K]
  ): void {
    this.listeners[event] = listener;
  }

  /** 移除事件监听 */
  off<K extends keyof WebSocketEvents>(event: K): void {
    delete this.listeners[event];
  }

  /** 发送聊天请求 */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const streamId = this.generateStreamId();
    const modelId = request.model ?? 'default';

    const session: StreamSession = {
      id: streamId,
      request,
      modelId,
      abortController: new AbortController(),
      startTime: Date.now(),
      chunks: [],
      status: 'pending',
    };

    this.sessions.set(streamId, session);

    return new Promise((resolve, reject) => {
      // 设置超时
      const timeout = setTimeout(() => {
        session.status = 'error';
        this.sessions.delete(streamId);
        reject(new Error('Request timeout'));
      }, this.config.messageTimeout);

      this.messageTimers.set(streamId, timeout);

      // 监听完成
      const originalListener = this.listeners.message;
      this.listeners.message = (data) => {
        if (
          data &&
          typeof data === 'object' &&
          'done' in data &&
          (data as ChatChunk).done &&
          (data as ChatChunk).streamId === streamId
        ) {
          clearTimeout(timeout);
          this.messageTimers.delete(streamId);
          this.listeners.message = originalListener;

          const response: ChatResponse = {
            id: streamId,
            model: modelId,
            content: (data as ChatChunk).fullContent ?? '',
            role: 'assistant',
            finishReason: (data as ChatChunk).finishReason,
            done: true,
          };

          resolve(response);
        } else {
          originalListener?.(data);
        }
      };

      // 发送请求
      this.send({
        type: 'chat.request',
        streamId,
        modelId,
        data: request,
      });

      session.status = 'active';
      this.listeners.streamStart?.(streamId);
    });
  }

  /** 流式聊天 */
  async *chatStream(
    request: ChatRequest
  ): AsyncGenerator<ChatChunk, void, unknown> {
    const streamId = this.generateStreamId();
    const modelId = request.model ?? 'default';

    const session: StreamSession = {
      id: streamId,
      request,
      modelId,
      abortController: new AbortController(),
      startTime: Date.now(),
      chunks: [],
      status: 'active',
    };

    this.sessions.set(streamId, session);
    this.listeners.streamStart?.(streamId);

    // 发送请求
    this.send({
      type: 'chat.stream_start',
      streamId,
      modelId,
      data: request,
    });

    // 设置完成解析器
    const result = new Promise<ChatResponse>((resolve) => {
      session.abortController.signal.addEventListener('abort', () => {
        resolve({
          id: streamId,
          model: modelId,
          content: session.chunks.map((c) => c.delta).join(''),
          role: 'assistant',
          done: true,
        });
      });
    });

    try {
      while (session.status === 'active') {
        // 等待下一个 chunk
        const chunk = await this.waitForChunk(streamId);
        if (chunk) {
          yield chunk;

          if (chunk.done) {
            session.status = 'completed';
            break;
          }
        }
      }
    } finally {
      this.sessions.delete(streamId);
    }
  }

  /** 取消流 */
  abort(streamId?: string): void {
    if (streamId) {
      const session = this.sessions.get(streamId);
      if (session) {
        session.abortController.abort();
        this.send({
          type: 'chat.abort',
          streamId,
        });
      }
    } else {
      // 取消所有流
      for (const [id, session] of this.sessions) {
        session.abortController.abort();
        this.send({
          type: 'chat.abort',
          streamId: id,
        });
      }
    }
  }

  /** 获取活跃会话 */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /** 列出所有模型 */
  async listModels(): Promise<ModelInfo[]> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout listing models'));
      }, 5000);

      const originalListener = this.listeners.message;
      this.listeners.message = (data) => {
        if (
          data &&
          typeof data === 'object' &&
          'type' in data &&
          (data as WSMessage).type === 'session.list'
        ) {
          clearTimeout(timeout);
          this.listeners.message = originalListener;
          resolve((data as WSMessage).data as ModelInfo[]);
        } else {
          originalListener?.(data);
        }
      };

      this.send({
        type: 'session.list',
      });
    });
  }

  /** 发送消息 */
  private send(message: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        ...message,
        timestamp: Date.now(),
      }));
    }
  }

  /** 处理消息 */
  private handleMessage(data: string): void {
    try {
      const message: WSMessage = JSON.parse(data);

      switch (message.type) {
        case 'chat.chunk':
          this.handleChunk(message);
          break;

        case 'chat.complete':
          this.handleComplete(message);
          break;

        case 'chat.error':
          this.handleError(message);
          break;

        case 'pong':
          // 心跳响应
          break;

        default:
          // 透传其他消息
          this.listeners.message?.(message.data as ChatChunk | ChatResponse);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /** 处理 chunk */
  private handleChunk(message: WSMessage): void {
    const { streamId, data } = message;
    if (!streamId) return;

    const session = this.sessions.get(streamId);
    if (session) {
      const chunk = data as ChatChunk;
      chunk.streamId = streamId;
      session.chunks.push(chunk);
      this.listeners.message?.(chunk);
    }
  }

  /** 处理完成 */
  private handleComplete(message: WSMessage): void {
    const { streamId, data } = message;
    if (!streamId) return;

    const session = this.sessions.get(streamId);
    if (session) {
      session.status = 'completed';
      const response = data as ChatResponse;
      this.listeners.streamEnd?.(streamId, response);
    }
  }

  /** 处理错误 */
  private handleError(message: WSMessage): void {
    const { streamId, data } = message;
    const session = streamId ? this.sessions.get(streamId) : null;

    if (session) {
      session.status = 'error';
      session.abortController.abort();
    }

    const error = new Error((data as { error?: string })?.error ?? 'Unknown error');
    this.listeners.error?.(error);
  }

  /** 等待 chunk */
  private waitForChunk(streamId: string): Promise<ChatChunk | null> {
    return new Promise((resolve) => {
      const check = () => {
        const session = this.sessions.get(streamId);
        if (!session) {
          resolve(null);
          return;
        }

        if (session.chunks.length > 0) {
          resolve(session.chunks.shift()!);
          return;
        }

        if (session.status !== 'active') {
          resolve(null);
          return;
        }

        // 继续等待
        setTimeout(check, 10);
      };

      check();
    });
  }

  /** 生成流 ID */
  private generateStreamId(): string {
    return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /** 构建 URL */
  private buildUrl(): string {
    let url = this.config.url;

    // 添加协议
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      url = `${this.config.protocol}://${url}`;
    }

    // 添加认证
    if (this.config.token) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}token=${encodeURIComponent(this.config.token)}`;
    }

    return url;
  }

  /** 是否应该重连 */
  private shouldReconnect(): boolean {
    return (
      this.reconnectAttempts < this.config.maxReconnectAttempts &&
      !this.isManualClose
    );
  }

  /** 重连 */
  private reconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  /** 开始心跳 */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, this.config.heartbeatInterval);
  }

  /** 停止心跳 */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /** 清除消息定时器 */
  private clearMessageTimers(): void {
    for (const timer of this.messageTimers.values()) {
      clearTimeout(timer);
    }
    this.messageTimers.clear();
  }
}

/** WebSocket 服务端 (Node.js) */
export class ModelWebSocketServer {
  private clients: Map<string, Set<WebSocket>> = new Map();
  private sessions: Map<string, ChatRequest> = new Map();

  /** 添加客户端 */
  addClient(clientId: string, ws: WebSocket): void {
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, new Set());
    }
    this.clients.get(clientId)!.add(ws);
  }

  /** 移除客户端 */
  removeClient(clientId: string, ws: WebSocket): void {
    const clientSet = this.clients.get(clientId);
    if (clientSet) {
      clientSet.delete(ws);
      if (clientSet.size === 0) {
        this.clients.delete(clientId);
      }
    }
  }

  /** 广播消息 */
  broadcast(clientId: string, message: WSMessage): void {
    const clientSet = this.clients.get(clientId);
    if (clientSet) {
      const data = JSON.stringify({
        ...message,
        timestamp: Date.now(),
      });

      for (const ws of clientSet) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      }
    }
  }

  /** 保存会话 */
  saveSession(streamId: string, request: ChatRequest): void {
    this.sessions.set(streamId, request);
  }

  /** 获取会话 */
  getSession(streamId: string): ChatRequest | undefined {
    return this.sessions.get(streamId);
  }

  /** 删除会话 */
  deleteSession(streamId: string): void {
    this.sessions.delete(streamId);
  }
}

export default ModelWebSocketClient;
