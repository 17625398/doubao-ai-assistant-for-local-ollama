/**
 * ChatClaw 性能测试
 * 测试消息处理延迟、并发渠道处理和渠道断开连接的优雅处理
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chatClawCommunicationService } from '../services/chatclaw-communication-service';
import { IncomingMessage, MessageRequest } from '../services/chatclaw-communication-service';
import { OllamaClient } from '../utils/ollama-client';

// 模拟 OllamaClient
vi.mock('../utils/ollama-client', () => {
  const mockChat = vi.fn().mockResolvedValue({
    message: {
      content: 'Test response'
    }
  });
  
  const mockUpdateConfig = vi.fn();
  
  const MockOllamaClient = function() {
    this.chat = mockChat;
    this.updateConfig = mockUpdateConfig;
    return this;
  };
  
  const mockOllamaClient = new MockOllamaClient();
  
  return {
    OllamaClient: MockOllamaClient,
    ollamaClient: mockOllamaClient
  };
});

// 模拟 ChatClawChannelAuthService
vi.mock('../services/chatclaw-channel-auth-service', () => {
  const originalModule = vi.importActual('../services/chatclaw-channel-auth-service');
  
  return {
    ...originalModule,
    chatClawChannelAuthService: {
      ...originalModule.chatClawChannelAuthService,
      validateChannelAuth: vi.fn().mockResolvedValue({ authenticated: true }),
      validateSenderPermission: vi.fn().mockReturnValue({ allowed: true })
    }
  };
});

describe('ChatClaw Performance Tests', () => {
  beforeEach(() => {
    // 启用测试通道并设置配置
    chatClawCommunicationService.updateChannel('channel-webhook', {
      config: {
        url: 'https://example.com/webhook',
        method: 'POST',
        headers: {}
      }
    });
    chatClawCommunicationService.enableChannel('channel-webhook');
  });

  afterEach(() => {
    // 禁用测试通道
    chatClawCommunicationService.disableChannel('channel-webhook');
  });

  describe('Message Processing Latency', () => {
    it('should process messages within 1 second', async () => {
      const startTime = Date.now();
      
      const message: IncomingMessage = {
        id: 'test-msg-1',
        channel: 'webhook',
        channelId: 'channel-webhook',
        sender: {
          id: 'user1',
          name: 'Test User'
        },
        content: 'Hello, test message',
        timestamp: new Date().toISOString(),
        type: 'text'
      };
      
      await chatClawCommunicationService.handleIncomingMessage(message);
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      console.log(`Message processing latency: ${latency}ms`);
      expect(latency).toBeLessThan(1000); // 小于 1 秒
    });

    it('should send messages within 1 second', async () => {
      const startTime = Date.now();
      
      const messageRequest: MessageRequest = {
        channelId: 'channel-webhook',
        content: 'Test message',
        attachments: []
      };
      
      const response = await chatClawCommunicationService.sendMessage(messageRequest);
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      console.log(`Message sending latency: ${latency}ms`);
      expect(latency).toBeLessThan(1000); // 小于 1 秒
      expect(response.success).toBe(true);
    });
  });

  describe('Concurrent Channel Handling', () => {
    it('should handle multiple concurrent channels', async () => {
      // 启用多个通道并设置配置
      chatClawCommunicationService.updateChannel('channel-wechat', {
        config: {
          appId: 'test-app-id',
          appSecret: 'test-app-secret',
          token: 'test-token',
          encodingAESKey: 'test-encoding-aes-key'
        }
      });
      chatClawCommunicationService.enableChannel('channel-wechat');
      
      chatClawCommunicationService.updateChannel('channel-dingtalk', {
        config: {
          webhook: 'https://example.com/dingtalk/webhook',
          secret: 'test-secret',
          accessToken: 'test-access-token'
        }
      });
      chatClawCommunicationService.enableChannel('channel-dingtalk');
      
      chatClawCommunicationService.updateChannel('channel-wecom', {
        config: {
          corpId: 'test-corp-id',
          corpSecret: 'test-corp-secret',
          agentId: 'test-agent-id',
          webhook: 'https://example.com/wecom/webhook'
        }
      });
      chatClawCommunicationService.enableChannel('channel-wecom');

      // 同时处理多个消息
      const messages: IncomingMessage[] = [
        {
          id: 'test-msg-1',
          channel: 'webhook',
          channelId: 'channel-webhook',
          sender: {
            id: 'user1',
            name: 'Test User 1'
          },
          content: 'Hello from webhook',
          timestamp: new Date().toISOString(),
          type: 'text'
        },
        {
          id: 'test-msg-2',
          channel: 'wechat',
          channelId: 'channel-wechat',
          sender: {
            id: 'user2',
            name: 'Test User 2'
          },
          content: 'Hello from wechat',
          timestamp: new Date().toISOString(),
          type: 'text'
        },
        {
          id: 'test-msg-3',
          channel: 'dingtalk',
          channelId: 'channel-dingtalk',
          sender: {
            id: 'user3',
            name: 'Test User 3'
          },
          content: 'Hello from dingtalk',
          timestamp: new Date().toISOString(),
          type: 'text'
        },
        {
          id: 'test-msg-4',
          channel: 'wecom',
          channelId: 'channel-wecom',
          sender: {
            id: 'user4',
            name: 'Test User 4'
          },
          content: 'Hello from wecom',
          timestamp: new Date().toISOString(),
          type: 'text'
        }
      ];

      const startTime = Date.now();
      
      // 并行处理所有消息
      const promises = messages.map(msg => 
        chatClawCommunicationService.handleIncomingMessage(msg)
      );
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const totalLatency = endTime - startTime;
      
      console.log(`Concurrent message processing latency: ${totalLatency}ms`);
      // 即使处理多个消息，总延迟也应该在合理范围内
      expect(totalLatency).toBeLessThan(2000); // 小于 2 秒

      // 禁用通道
      chatClawCommunicationService.disableChannel('channel-wechat');
      chatClawCommunicationService.disableChannel('channel-dingtalk');
      chatClawCommunicationService.disableChannel('channel-wecom');
    });

    it('should handle multiple concurrent message sends', async () => {
      // 启用多个通道并设置配置
      chatClawCommunicationService.updateChannel('channel-wechat', {
        config: {
          appId: 'test-app-id',
          appSecret: 'test-app-secret',
          token: 'test-token',
          encodingAESKey: 'test-encoding-aes-key'
        }
      });
      chatClawCommunicationService.enableChannel('channel-wechat');
      
      chatClawCommunicationService.updateChannel('channel-dingtalk', {
        config: {
          webhook: 'https://example.com/dingtalk/webhook',
          secret: 'test-secret',
          accessToken: 'test-access-token'
        }
      });
      chatClawCommunicationService.enableChannel('channel-dingtalk');

      // 同时发送多个消息
      const messageRequests: MessageRequest[] = [
        {
          channelId: 'channel-webhook',
          content: 'Test message 1',
          attachments: []
        },
        {
          channelId: 'channel-wechat',
          content: 'Test message 2',
          attachments: []
        },
        {
          channelId: 'channel-dingtalk',
          content: 'Test message 3',
          attachments: []
        }
      ];

      const startTime = Date.now();
      
      // 并行发送所有消息
      const promises = messageRequests.map(req => 
        chatClawCommunicationService.sendMessage(req)
      );
      
      const responses = await Promise.all(promises);
      
      const endTime = Date.now();
      const totalLatency = endTime - startTime;
      
      console.log(`Concurrent message sending latency: ${totalLatency}ms`);
      // 即使发送多个消息，总延迟也应该在合理范围内
      expect(totalLatency).toBeLessThan(2000); // 小于 2 秒
      
      // 所有消息都应该发送成功
      responses.forEach(response => {
        expect(response.success).toBe(true);
      });

      // 禁用通道
      chatClawCommunicationService.disableChannel('channel-wechat');
      chatClawCommunicationService.disableChannel('channel-dingtalk');
    });
  });

  describe('Channel Disconnection Handling', () => {
    it('should handle disabled channel gracefully', async () => {
      // 确保通道被禁用
      chatClawCommunicationService.disableChannel('channel-webhook');

      const messageRequest: MessageRequest = {
        channelId: 'channel-webhook',
        content: 'Test message',
        attachments: []
      };

      const response = await chatClawCommunicationService.sendMessage(messageRequest);
      
      // 应该返回失败，但不应该抛出异常
      expect(response.success).toBe(false);
      expect(response.error).toBe('Channel is disabled');
    });

    it('should handle non-existent channel gracefully', async () => {
      const messageRequest: MessageRequest = {
        channelId: 'non-existent-channel',
        content: 'Test message',
        attachments: []
      };

      const response = await chatClawCommunicationService.sendMessage(messageRequest);
      
      // 应该返回失败，但不应该抛出异常
      expect(response.success).toBe(false);
      expect(response.error).toBe('Channel not found');
    });

    it('should handle channel test failure gracefully', async () => {
      // 测试不存在的通道
      const result = await chatClawCommunicationService.testChannel('non-existent-channel');
      
      // 应该返回失败，但不应该抛出异常
      expect(result.success).toBe(false);
      expect(result.error).toBe('Channel not found');
    });
  });

  describe('Load Testing', () => {
    it('should handle high load gracefully', async () => {
      const messageCount = 10;
      const messages: IncomingMessage[] = [];

      // 创建多个测试消息
      for (let i = 0; i < messageCount; i++) {
        messages.push({
          id: `test-msg-${i}`,
          channel: 'webhook',
          channelId: 'channel-webhook',
          sender: {
            id: `user${i}`,
            name: `Test User ${i}`
          },
          content: `Hello, test message ${i}`,
          timestamp: new Date().toISOString(),
          type: 'text'
        });
      }

      const startTime = Date.now();
      
      // 并行处理所有消息
      const promises = messages.map(msg => 
        chatClawCommunicationService.handleIncomingMessage(msg)
      );
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const totalLatency = endTime - startTime;
      const averageLatency = totalLatency / messageCount;
      
      console.log(`Load test - Total latency: ${totalLatency}ms`);
      console.log(`Load test - Average latency per message: ${averageLatency}ms`);
      
      // 平均延迟应该小于 500ms
      expect(averageLatency).toBeLessThan(500);
    });
  });
});
