import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaClient } from '../../utils/ollama-client';
import { OpenAICompatibleClient } from '../../utils/openai-compatible-client';
import { LinkMindService } from '../../services/linkmind-service';
import type {
  OllamaConfig,
  OllamaChatRequest,
  OllamaGenerateRequest,
} from '../../types';

/**
 * 模型 API 兼容性测试套件
 * 覆盖 Ollama、OpenAI、LinkMind 接口一致性验证
 */
describe('Model API Compatibility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Ollama API Compatibility', () => {
    it('should have OllamaClient constructor available', () => {
      expect(typeof OllamaClient).toBe('function');
    });

    it('should verify OllamaClient instance methods exist', () => {
      const client = new OllamaClient();
      expect(typeof client.isAvailable).toBe('function');
      expect(typeof client.listModels).toBe('function');
      expect(typeof client.generate).toBe('function');
      expect(typeof client.generateStream).toBe('function');
      expect(typeof client.chat).toBe('function');
      expect(typeof client.chatStream).toBe('function');
      expect(typeof client.pullModel).toBe('function');
      expect(typeof client.deleteModel).toBe('function');
      expect(typeof client.getModelInfo).toBe('function');
      expect(typeof client.updateConfig).toBe('function');
      expect(typeof client.getConfig).toBe('function');
    });

    it('should verify OllamaClient constructor accepts partial config', () => {
      const config: Partial<OllamaConfig> = {
        baseUrl: 'http://localhost:11434',
        defaultModel: 'llama2',
        timeout: 30000,
      };
      const client = new OllamaClient(config);
      const currentConfig = client.getConfig();
      expect(currentConfig.defaultModel).toBe('llama2');
      expect(currentConfig.timeout).toBe(30000);
    });

    it('should verify OllamaClient.getConfig returns OllamaConfig type', () => {
      const client = new OllamaClient();
      const config = client.getConfig();
      expect(config).toHaveProperty('baseUrl');
      expect(config).toHaveProperty('defaultModel');
      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('streamEnabled');
      expect(typeof config.baseUrl).toBe('string');
      expect(typeof config.defaultModel).toBe('string');
      expect(typeof config.timeout).toBe('number');
      expect(typeof config.streamEnabled).toBe('boolean');
    });

    it('should verify OllamaClient.updateConfig merges config correctly', () => {
      const client = new OllamaClient();
      client.updateConfig({ defaultModel: 'mistral' });
      const config = client.getConfig();
      expect(config.defaultModel).toBe('mistral');
    });

    it('should verify generate method signature and return type', async () => {
      const client = new OllamaClient();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          model: 'test-model',
          response: 'test response',
          done: true,
          created_at: new Date().toISOString(),
        }),
      } as Response);

      const result = await client.generate('test prompt');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('done');
      expect(typeof result.response).toBe('string');
      expect(typeof result.done).toBe('boolean');
    });

    it('should verify chat method signature and return type', async () => {
      const client = new OllamaClient();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          model: 'test-model',
          message: { role: 'assistant', content: 'hello' },
          done: true,
          created_at: new Date().toISOString(),
        }),
      } as Response);

      const request: OllamaChatRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'hello' }],
      };
      const result = await client.chat(request);
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('done');
      expect(result.message).toHaveProperty('role');
      expect(result.message).toHaveProperty('content');
    });

    it('should verify listModels return type', async () => {
      const client = new OllamaClient();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          models: [
            { name: 'model1', model: 'model1', size: 1000 },
            { name: 'model2', model: 'model2', size: 2000 },
          ],
        }),
      } as Response);

      const models = await client.listModels();
      expect(Array.isArray(models)).toBe(true);
      if (models.length > 0) {
        expect(models[0]).toHaveProperty('name');
        expect(typeof models[0].name).toBe('string');
      }
    });

    it('should verify generateStream returns AsyncGenerator', async () => {
      const client = new OllamaClient();
      const stream = client.generateStream('test');
      expect(stream).toBeDefined();
      expect(typeof stream[Symbol.asyncIterator]).toBe('function');
    });

    it('should verify chatStream returns AsyncGenerator', async () => {
      const client = new OllamaClient();
      const request: OllamaChatRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'hello' }],
      };
      const stream = client.chatStream(request);
      expect(stream).toBeDefined();
      expect(typeof stream[Symbol.asyncIterator]).toBe('function');
    });

    it('should handle Ollama 403 errors with custom error messages', async () => {
      const client = new OllamaClient({ baseUrl: 'http://localhost:11434' });
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: { get: () => null },
        text: async () => 'Forbidden',
      } as unknown as Response);

      const result = await client.isAvailable();
      expect(result).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      const client = new OllamaClient();
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const available = await client.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('OpenAI Compatible API Compatibility', () => {
    it('should have OpenAICompatibleClient constructor available', () => {
      expect(typeof OpenAICompatibleClient).toBe('function');
    });

    it('should verify OpenAICompatibleClient instance methods exist', () => {
      const client = new OpenAICompatibleClient({
        baseUrl: 'https://api.openai.com',
        apiKey: 'test-key',
        defaultModel: 'gpt-4',
        timeout: 30000,
        streamEnabled: true,
      });
      expect(typeof client.isAvailable).toBe('function');
      expect(typeof client.listModels).toBe('function');
      expect(typeof client.chat).toBe('function');
      expect(typeof client.chatStream).toBe('function');
      expect(typeof client.generate).toBe('function');
      expect(typeof client.updateConfig).toBe('function');
      expect(typeof client.getConfig).toBe('function');
    });

    it('should verify OpenAICompatibleClient.getConfig return type', () => {
      const client = new OpenAICompatibleClient({
        baseUrl: 'https://api.openai.com',
        apiKey: 'test-key',
        defaultModel: 'gpt-4',
        timeout: 30000,
        streamEnabled: true,
      });
      const config = client.getConfig();
      expect(config).toHaveProperty('baseUrl');
      expect(config).toHaveProperty('apiKey');
      expect(config).toHaveProperty('defaultModel');
      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('streamEnabled');
      expect(typeof config.baseUrl).toBe('string');
      expect(typeof config.apiKey).toBe('string');
      expect(typeof config.defaultModel).toBe('string');
      expect(typeof config.timeout).toBe('number');
      expect(typeof config.streamEnabled).toBe('boolean');
    });

    it('should verify chat method signature and return type', async () => {
      const client = new OpenAICompatibleClient({
        baseUrl: 'https://api.openai.com',
        apiKey: 'test-key',
        defaultModel: 'gpt-4',
        timeout: 30000,
        streamEnabled: true,
      });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'test response' } }],
        }),
      } as Response);

      const result = await client.chat({
        messages: [{ role: 'user', content: 'hello' }],
      });
      expect(result).toHaveProperty('content');
      expect(typeof result.content).toBe('string');
    });

    it('should verify generate method signature and return type', async () => {
      const client = new OpenAICompatibleClient({
        baseUrl: 'https://api.openai.com',
        apiKey: 'test-key',
        defaultModel: 'gpt-4',
        timeout: 30000,
        streamEnabled: true,
      });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'generated text' } }],
        }),
      } as Response);

      const result = await client.generate({ prompt: 'test' });
      expect(result).toHaveProperty('content');
      expect(typeof result.content).toBe('string');
    });

    it('should verify listModels return type', async () => {
      const client = new OpenAICompatibleClient({
        baseUrl: 'https://api.openai.com',
        apiKey: 'test-key',
        defaultModel: 'gpt-4',
        timeout: 30000,
        streamEnabled: true,
      });
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ id: 'gpt-4' }, { id: 'gpt-3.5-turbo' }],
        }),
      } as Response);

      const models = await client.listModels();
      expect(Array.isArray(models)).toBe(true);
      if (models.length > 0) {
        expect(models[0]).toHaveProperty('id');
        expect(typeof models[0].id).toBe('string');
      }
    });

    it('should verify chatStream returns AsyncGenerator', async () => {
      const client = new OpenAICompatibleClient({
        baseUrl: 'https://api.openai.com',
        apiKey: 'test-key',
        defaultModel: 'gpt-4',
        timeout: 30000,
        streamEnabled: true,
      });
      const stream = client.chatStream({ messages: [{ role: 'user', content: 'hello' }] });
      expect(stream).toBeDefined();
      expect(typeof stream[Symbol.asyncIterator]).toBe('function');
    });

    it('should handle API errors with proper error messages', async () => {
      const client = new OpenAICompatibleClient({
        baseUrl: 'https://api.openai.com',
        apiKey: 'test-key',
        defaultModel: 'gpt-4',
        timeout: 30000,
        streamEnabled: true,
      });
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key',
      } as Response);

      await expect(client.chat({ messages: [{ role: 'user', content: 'hello' }] })).rejects.toThrow();
    });

    it('should handle network errors in isAvailable', async () => {
      const client = new OpenAICompatibleClient({
        baseUrl: 'https://api.openai.com',
        apiKey: 'test-key',
        defaultModel: 'gpt-4',
        timeout: 30000,
        streamEnabled: true,
      });
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const available = await client.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('LinkMind API Compatibility', () => {
    beforeEach(() => {
      LinkMindService.resetInstance();
    });

    it('should have LinkMindService constructor available', () => {
      expect(typeof LinkMindService).toBe('function');
    });

    it('should verify LinkMindService instance methods exist', () => {
      const service = new LinkMindService();
      expect(typeof service.testConnection).toBe('function');
      expect(typeof service.listModels).toBe('function');
      expect(typeof service.chat).toBe('function');
      expect(typeof service.chatStream).toBe('function');
      expect(typeof service.extractDocument).toBe('function');
      expect(typeof service.performOCR).toBe('function');
      expect(typeof service.textToSQL).toBe('function');
      expect(typeof service.embed).toBe('function');
      expect(typeof service.rerank).toBe('function');
      expect(typeof service.generateInstruction).toBe('function');
      expect(typeof service.getStats).toBe('function');
      expect(typeof service.cacheGet).toBe('function');
      expect(typeof service.cacheSet).toBe('function');
      expect(typeof service.checkContent).toBe('function');
      expect(typeof service.updateConfig).toBe('function');
      expect(typeof service.getConfig).toBe('function');
      expect(typeof service.request).toBe('function');
    });

    it('should verify LinkMindService.getConfig return type', () => {
      const service = new LinkMindService();
      const config = service.getConfig();
      expect(config).toHaveProperty('baseUrl');
      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('transportMode');
      expect(config).toHaveProperty('gatewayPath');
      expect(config).toHaveProperty('defaultModel');
      expect(typeof config.baseUrl).toBe('string');
      expect(typeof config.timeout).toBe('number');
      expect(['direct', 'backend-relay', 'proxy']).toContain(config.transportMode);
    });

    it('should verify LinkMindService.updateConfig merges config', () => {
      const service = new LinkMindService();
      service.updateConfig({ defaultModel: 'qwen-max' });
      const config = service.getConfig();
      expect(config.defaultModel).toBe('qwen-max');
    });

    it('should verify testConnection return type', async () => {
      const service = new LinkMindService();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'list',
          data: [{ id: 'model1' }],
        }),
      } as Response);

      const result = await service.testConnection();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });

    it('should verify listModels return type', async () => {
      const service = new LinkMindService();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          object: 'list',
          data: [
            { id: 'qwen-plus', owned_by: 'alibaba' },
            { id: 'qwen-max', owned_by: 'alibaba' },
          ],
        }),
      } as Response);

      const models = await service.listModels();
      expect(Array.isArray(models)).toBe(true);
      if (models.length > 0) {
        expect(models[0]).toHaveProperty('id');
        expect(models[0]).toHaveProperty('name');
        expect(models[0]).toHaveProperty('provider');
        expect(typeof models[0].id).toBe('string');
        expect(typeof models[0].name).toBe('string');
      }
    });

    it('should verify chat return type', async () => {
      const service = new LinkMindService();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'chat-1',
          model: 'qwen-plus',
          choices: [
            {
              message: { role: 'assistant', content: 'hello' },
              finish_reason: 'stop',
            },
          ],
        }),
      } as Response);

      const result = await service.chat({
        model: 'qwen-plus',
        messages: [{ role: 'user', content: 'hello' }],
      });
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('choices');
      expect(Array.isArray(result.choices)).toBe(true);
    });

    it('should verify extractDocument return type', async () => {
      const service = new LinkMindService();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          text: 'extracted text',
          tables: [],
          images: [],
        }),
      } as Response);

      const result = await service.extractDocument({
        file: new File(['test'], 'test.txt'),
      });
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should verify performOCR return type', async () => {
      const service = new LinkMindService();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          text: 'OCR result',
        }),
      } as Response);

      const result = await service.performOCR({ image: 'data:image/png;base64,abc' });
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should verify embed return type', async () => {
      const service = new LinkMindService();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ index: 0, embedding: [0.1, 0.2, 0.3] }],
          model: 'bge-large',
        }),
      } as Response);

      const result = await service.embed({
        input: ['test text'],
      });
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should verify rerank return type', async () => {
      const service = new LinkMindService();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          results: [{ index: 0, relevance_score: 0.95 }],
        }),
      } as Response);

      const result = await service.rerank({
        query: 'test query',
        documents: ['doc1', 'doc2'],
      });
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should verify textToSQL return type', async () => {
      const service = new LinkMindService();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          sql: 'SELECT * FROM users',
        }),
      } as Response);

      const result = await service.textToSQL('get all users');
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should verify generateInstruction return type', async () => {
      const service = new LinkMindService();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          instruction: 'Generated instruction',
        }),
      } as Response);

      const result = await service.generateInstruction('test prompt');
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should verify cacheGet return type', async () => {
      const service = new LinkMindService();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          value: 'cached value',
          exists: true,
          ttl: 3600,
        }),
      } as Response);

      const result = await service.cacheGet('key');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('exists');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.exists).toBe('boolean');
    });

    it('should verify cacheSet return type', async () => {
      const service = new LinkMindService();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      const result = await service.cacheSet('key', 'value');
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should verify checkContent return type', async () => {
      const service = new LinkMindService();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          passed: true,
          matched_rules: [],
          action: 'none',
        }),
      } as Response);

      const result = await service.checkContent('test content');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('matchedRules');
      expect(result).toHaveProperty('action');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.passed).toBe('boolean');
      expect(Array.isArray(result.matchedRules)).toBe(true);
    });

    it('should handle LinkMind API errors with proper messages', async () => {
      const service = new LinkMindService();
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      } as Response);

      await expect(service.listModels()).rejects.toThrow();
    });

    it('should handle timeout errors gracefully', async () => {
      const service = new LinkMindService({ timeout: 1 });
      global.fetch = vi.fn().mockImplementation(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 10);
      }));

      const result = await service.testConnection();
      expect(result.success).toBe(false);
      expect(typeof result.message).toBe('string');
    });

    it('should verify singleton pattern with getInstance', () => {
      const instance1 = LinkMindService.getInstance();
      const instance2 = LinkMindService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should verify resetInstance creates new instance', () => {
      const instance1 = LinkMindService.getInstance();
      LinkMindService.resetInstance();
      const instance2 = LinkMindService.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Cross-Model API Interface Consistency', () => {
    it('should have consistent config getter/setter pattern across clients', () => {
      const ollama = new OllamaClient();
      const openai = new OpenAICompatibleClient({
        baseUrl: 'https://api.openai.com',
        apiKey: 'test',
        defaultModel: 'gpt-4',
        timeout: 30000,
        streamEnabled: true,
      });
      const linkmind = new LinkMindService();

      expect(typeof ollama.getConfig).toBe('function');
      expect(typeof ollama.updateConfig).toBe('function');
      expect(typeof openai.getConfig).toBe('function');
      expect(typeof openai.updateConfig).toBe('function');
      expect(typeof linkmind.getConfig).toBe('function');
      expect(typeof linkmind.updateConfig).toBe('function');
    });

    it('should have consistent isAvailable/testConnection pattern', () => {
      const ollama = new OllamaClient();
      const openai = new OpenAICompatibleClient({
        baseUrl: 'https://api.openai.com',
        apiKey: 'test',
        defaultModel: 'gpt-4',
        timeout: 30000,
        streamEnabled: true,
      });
      const linkmind = new LinkMindService();

      expect(typeof ollama.isAvailable).toBe('function');
      expect(typeof openai.isAvailable).toBe('function');
      expect(typeof linkmind.testConnection).toBe('function');
    });

    it('should have consistent listModels pattern', () => {
      const ollama = new OllamaClient();
      const openai = new OpenAICompatibleClient({
        baseUrl: 'https://api.openai.com',
        apiKey: 'test',
        defaultModel: 'gpt-4',
        timeout: 30000,
        streamEnabled: true,
      });
      const linkmind = new LinkMindService();

      expect(typeof ollama.listModels).toBe('function');
      expect(typeof openai.listModels).toBe('function');
      expect(typeof linkmind.listModels).toBe('function');
    });

    it('should have consistent chat pattern', () => {
      const ollama = new OllamaClient();
      const openai = new OpenAICompatibleClient({
        baseUrl: 'https://api.openai.com',
        apiKey: 'test',
        defaultModel: 'gpt-4',
        timeout: 30000,
        streamEnabled: true,
      });
      const linkmind = new LinkMindService();

      expect(typeof ollama.chat).toBe('function');
      expect(typeof openai.chat).toBe('function');
      expect(typeof linkmind.chat).toBe('function');
    });

    it('should have consistent stream chat pattern', () => {
      const ollama = new OllamaClient();
      const openai = new OpenAICompatibleClient({
        baseUrl: 'https://api.openai.com',
        apiKey: 'test',
        defaultModel: 'gpt-4',
        timeout: 30000,
        streamEnabled: true,
      });
      const linkmind = new LinkMindService();

      expect(typeof ollama.chatStream).toBe('function');
      expect(typeof openai.chatStream).toBe('function');
      expect(typeof linkmind.chatStream).toBe('function');
    });

    it('should return Promise from async methods across all clients', () => {
      const ollama = new OllamaClient();
      const openai = new OpenAICompatibleClient({
        baseUrl: 'https://api.openai.com',
        apiKey: 'test',
        defaultModel: 'gpt-4',
        timeout: 30000,
        streamEnabled: true,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      expect(ollama.isAvailable()).toBeInstanceOf(Promise);
      expect(ollama.listModels()).toBeInstanceOf(Promise);
      expect(openai.isAvailable()).toBeInstanceOf(Promise);
      expect(openai.listModels()).toBeInstanceOf(Promise);
    });
  });

  describe('Error Handling Consistency', () => {
    it('should throw Error instances on API failures for Ollama', async () => {
      const client = new OllamaClient();
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Model not found',
      } as Response);

      try {
        await client.generate('test');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(typeof (error as Error).message).toBe('string');
      }
    });

    it('should throw Error instances on API failures for OpenAI', async () => {
      const client = new OpenAICompatibleClient({
        baseUrl: 'https://api.openai.com',
        apiKey: 'test',
        defaultModel: 'gpt-4',
        timeout: 30000,
        streamEnabled: true,
      });
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid key',
      } as Response);

      try {
        await client.chat({ messages: [{ role: 'user', content: 'hello' }] });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(typeof (error as Error).message).toBe('string');
      }
    });

    it('should handle invalid constructor arguments gracefully', () => {
      expect(() => new OllamaClient({})).not.toThrow();
      expect(() =>
        new OpenAICompatibleClient({
          baseUrl: '',
          apiKey: '',
          defaultModel: '',
          timeout: 0,
          streamEnabled: false,
        })
      ).not.toThrow();
      expect(() => new LinkMindService({})).not.toThrow();
    });

    it('should handle null/undefined config gracefully', () => {
      expect(() => new OllamaClient(undefined)).not.toThrow();
      expect(() => new LinkMindService(undefined)).not.toThrow();
    });
  });
});
