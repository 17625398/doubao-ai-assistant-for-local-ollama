import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatService } from '../../services/chat-service';
import { RAGService, type CollectionConfig } from '../../services/rag-service';
import { EmbeddingService } from '../../services/embedding-service';
import { eventBus } from '../../utils/event-bus';

// 模拟 logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    setPrefix: vi.fn(),
  },
}));

// 模拟 ollama-client
vi.mock('../../utils/ollama-client', () => ({
  OllamaClient: vi.fn().mockImplementation(function () {
    return {
      generate: vi.fn(),
      chatStream: vi.fn().mockReturnValue(
        (async function* () {
          yield { message: { content: 'Hello' } };
          yield { message: { content: ' world' } };
          yield { message: { content: '!' } };
        })()
      ),
    };
  }),
  ollamaClient: {
    generate: vi.fn(),
    chatStream: vi.fn().mockReturnValue(
      (async function* () {
        yield { message: { content: 'Hello' } };
        yield { message: { content: ' world' } };
        yield { message: { content: '!' } };
      })()
    ),
    updateConfig: vi.fn(),
  },
}));

// 模拟 theme-manager
vi.mock('../../utils/theme-manager', () => ({
  themeManager: {
    getTheme: vi.fn().mockReturnValue('light'),
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
    onThemeChange: vi.fn().mockReturnValue(vi.fn()),
  },
}));

// 模拟 promptTemplateLibrary
vi.mock('../../utils/prompt-template-library', () => ({
  promptTemplateLibrary: {
    generatePrompt: vi.fn().mockReturnValue('Generated prompt from template'),
  },
}));

// 模拟 linkMindService
vi.mock('../../services/linkmind-service', () => ({
  linkMindService: {
    embed: vi.fn().mockImplementation(async ({ input }: { input: string[] | string }) => {
      const texts = Array.isArray(input) ? input : [input];
      return {
        success: true,
        embeddings: texts.map((_, i) => new Array(1024).fill(0.1 + i * 0.01)),
      };
    }),
    rerank: vi.fn().mockResolvedValue({
      success: true,
      results: [{ index: 0, score: 0.95 }],
    }),
  },
}));

// 模拟 cacheManager
vi.mock('../../utils/cache-manager', () => ({
  cacheManager: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    generateKey: vi.fn().mockReturnValue('test-cache-key'),
  },
}));

describe('AI Service Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventBus.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ChatService', () => {
    it('should send message and return stream', async () => {
      const chatService = new ChatService({
        defaultModel: 'test-model',
        maxContextLength: 5,
      });

      const result = await chatService.sendMessage('Hello AI');

      expect(result.message).toBeDefined();
      expect(result.message.role).toBe('assistant');
      expect(result.message.status).toBe('generating');
      expect(result.stream).toBeDefined();
    });

    it('should process stream chunks', async () => {
      const chatService = new ChatService({
        defaultModel: 'test-model',
        streamingTimeout: 5000,
      });

      const { stream } = await chatService.sendMessage('Test message');
      const chunks: string[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toBe('Hello world!');
    });

    it('should use template when specified', async () => {
      const chatService = new ChatService();
      const { promptTemplateLibrary } = await import('../../utils/prompt-template-library');

      await chatService.sendMessage('Hello', {
        useTemplate: 'greeting',
        templateVariables: { name: 'User' },
      });

      expect(promptTemplateLibrary.generatePrompt).toHaveBeenCalledWith('greeting', { name: 'User' });
    });

    it('should maintain message history', async () => {
      const chatService = new ChatService();

      await chatService.sendMessage('First message');
      await chatService.sendMessage('Second message');

      const history = chatService.getMessageHistory();
      expect(history.length).toBe(4); // 2 user + 2 assistant messages
    });

    it('should clear message history', () => {
      const chatService = new ChatService();

      chatService.clearMessageHistory();
      const history = chatService.getMessageHistory();
      expect(history.length).toBe(0);
    });

    it('should search messages', async () => {
      const chatService = new ChatService();

      await chatService.sendMessage('Hello world');
      await chatService.sendMessage('Test message');

      const results = chatService.searchMessages('Hello');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should delete message', async () => {
      const chatService = new ChatService();

      const { message } = await chatService.sendMessage('To be deleted');
      const initialLength = chatService.getMessageHistory().length;

      chatService.deleteMessage(message.id);
      expect(chatService.getMessageHistory().length).toBe(initialLength - 1);
    });

    it('should edit user message', async () => {
      const chatService = new ChatService();

      const { message: userMessage } = await chatService.sendMessage('Original');
      // Find user message
      const history = chatService.getMessageHistory();
      const userMsg = history.find(m => m.role === 'user');

      if (userMsg) {
        chatService.editMessage(userMsg.id, 'Edited content');
        const updatedHistory = chatService.getMessageHistory();
        const updatedMsg = updatedHistory.find(m => m.id === userMsg.id);
        expect(updatedMsg?.content).toBe('Edited content');
      }
    });

    it('should generate reply suggestions', async () => {
      const { ollamaClient } = await import('../../utils/ollama-client');
      (ollamaClient.generate as any).mockResolvedValue({
        response: '1. Suggestion one\n2. Suggestion two\n3. Suggestion three',
      });

      const chatService = new ChatService();
      const suggestions = await chatService.generateReplySuggestions('How are you?');

      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should analyze message', async () => {
      const { ollamaClient } = await import('../../utils/ollama-client');
      (ollamaClient.generate as any).mockResolvedValue({
        response: 'This is an analysis of the message',
      });

      const chatService = new ChatService();
      const analysis = await chatService.analyzeMessage('Test message');

      expect(analysis).toBe('This is an analysis of the message');
    });
  });

  describe('RAGService', () => {
    beforeEach(() => {
      RAGService.resetInstance();
    });

    it('should create collection', async () => {
      const ragService = RAGService.getInstance();

      await ragService.createCollection('test-collection', {
        name: 'test-collection',
        description: 'Test collection',
      });

      const collections = ragService.listCollections();
      expect(collections.some(c => c.name === 'test-collection')).toBe(true);
    });

    it('should add documents to collection', async () => {
      const ragService = RAGService.getInstance();

      await ragService.createCollection('docs-collection');
      const result = await ragService.addDocuments(
        [
          {
            text: 'This is a test document about artificial intelligence.',
            metadata: { source: 'test1', title: 'AI Doc' },
          },
          {
            text: 'Machine learning is a subset of AI.',
            metadata: { source: 'test2', title: 'ML Doc' },
          },
        ],
        'docs-collection'
      );

      expect(result.success).toBe(true);
      expect(result.chunksAdded).toBeGreaterThan(0);
    });

    it('should query collection', async () => {
      const ragService = RAGService.getInstance();

      await ragService.createCollection('query-collection');
      await ragService.addDocuments(
        [
          { text: 'Artificial intelligence is transforming industries.' },
          { text: 'Deep learning uses neural networks.' },
        ],
        'query-collection'
      );

      const results = await ragService.query('artificial intelligence', 'query-collection', {
        topK: 2,
        minScore: 0.1,
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should perform hybrid query', async () => {
      const ragService = RAGService.getInstance();

      await ragService.createCollection('hybrid-collection');
      await ragService.addDocuments(
        [
          { text: 'Neural networks are used in deep learning.' },
          { text: 'Natural language processing is a branch of AI.' },
        ],
        'hybrid-collection'
      );

      const results = await ragService.hybridQuery('neural networks', 'hybrid-collection', {
        topK: 2,
        keywordWeight: 0.3,
        semanticWeight: 0.7,
      });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should get collection stats', async () => {
      const ragService = RAGService.getInstance();

      await ragService.createCollection('stats-collection');
      await ragService.addDocuments(
        [{ text: 'Test document for stats.' }],
        'stats-collection'
      );

      const stats = ragService.getCollectionStats('stats-collection');
      expect(stats).toBeDefined();
      expect(stats?.totalDocuments).toBe(1);
      expect(stats?.totalChunks).toBeGreaterThan(0);
    });

    it('should delete collection', async () => {
      const ragService = RAGService.getInstance();

      await ragService.createCollection('delete-collection');
      const deleted = await ragService.dropCollection('delete-collection');

      expect(deleted).toBe(true);
      expect(ragService.listCollections().some(c => c.name === 'delete-collection')).toBe(false);
    });

    it('should delete documents by source', async () => {
      const ragService = RAGService.getInstance();

      await ragService.createCollection('delete-docs-collection');
      await ragService.addDocuments(
        [{ text: 'Document to delete', metadata: { source: 'doc-to-delete' } }],
        'delete-docs-collection'
      );

      const deletedCount = await ragService.deleteDocuments('delete-docs-collection', 'doc-to-delete');
      expect(deletedCount).toBeGreaterThan(0);
    });

    it('should throw error for duplicate collection', async () => {
      const ragService = RAGService.getInstance();

      await ragService.createCollection('duplicate-collection');

      await expect(
        ragService.createCollection('duplicate-collection')
      ).rejects.toThrow('already exists');
    });

    it('should generate chunk IDs', () => {
      const ragService = RAGService.getInstance();
      const id1 = ragService.generateChunkId('source1', 0);
      const id2 = ragService.generateChunkId('source1', 1);

      expect(id1).not.toBe(id2);
      expect(id1.startsWith('chunk_')).toBe(true);
    });
  });

  describe('EmbeddingService', () => {
    beforeEach(() => {
      EmbeddingService.resetInstance();
    });

    it('should embed text', async () => {
      const embeddingService = EmbeddingService.getInstance();
      const result = await embeddingService.embed('Test text');

      expect(result.vector).toBeDefined();
      expect(result.vector.length).toBe(1024);
      expect(result.text).toBe('Test text');
      expect(result.cached).toBe(false);
    });

    it('should use cache for repeated embeddings', async () => {
      const embeddingService = EmbeddingService.getInstance({ cacheEnabled: true });

      const result1 = await embeddingService.embed('Cached text');
      expect(result1.cached).toBe(false);

      // Mock cache hit for second call
      const { cacheManager } = await import('../../utils/cache-manager');
      (cacheManager.get as any).mockResolvedValueOnce(new Array(1024).fill(0.1));

      const result2 = await embeddingService.embed('Cached text');
      expect(result2.cached).toBe(true);
    });

    it('should embed batch of texts', async () => {
      const embeddingService = EmbeddingService.getInstance();
      const result = await embeddingService.embedBatch(['Text 1', 'Text 2', 'Text 3']);

      expect(result.results.length).toBe(3);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should calculate cosine similarity', () => {
      const embeddingService = EmbeddingService.getInstance();
      const a = [1, 0, 0];
      const b = [1, 0, 0];

      const similarity = embeddingService.cosineSimilarity(a, b);
      expect(similarity).toBe(1);
    });

    it('should calculate euclidean distance', () => {
      const embeddingService = EmbeddingService.getInstance();
      const a = [0, 0, 0];
      const b = [1, 1, 1];

      const distance = embeddingService.euclideanDistance(a, b);
      expect(distance).toBeCloseTo(Math.sqrt(3), 5);
    });

    it('should find similar texts', async () => {
      const embeddingService = EmbeddingService.getInstance();
      const candidates = [
        { text: 'Machine learning' },
        { text: 'Deep learning' },
        { text: 'Cooking recipes' },
      ];

      const results = await embeddingService.findSimilar('AI and machine learning', candidates, {
        topK: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should throw error for mismatched vector dimensions', () => {
      const embeddingService = EmbeddingService.getInstance();
      expect(() => embeddingService.cosineSimilarity([1, 2], [1, 2, 3])).toThrow('dimensions must match');
    });

    it('should get cache stats', () => {
      const embeddingService = EmbeddingService.getInstance({ cacheEnabled: true });
      const stats = embeddingService.getCacheStats();

      expect(stats.enabled).toBe(true);
      expect(stats.size).toBe(0);
      expect(stats.ttl).toBeGreaterThan(0);
    });

    it('should clear cache', () => {
      const embeddingService = EmbeddingService.getInstance();
      expect(() => embeddingService.clearCache()).not.toThrow();
    });
  });

  describe('Event Bus Integration', () => {
    it('should emit and receive chat events', () => {
      const handler = vi.fn();
      eventBus.on('chat:test-event', handler);
      eventBus.emit('chat:test-event', { data: 'test' });

      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should support one-time events', () => {
      const handler = vi.fn();
      eventBus.once('chat:once-event', handler);

      eventBus.emit('chat:once-event', { data: 1 });
      eventBus.emit('chat:once-event', { data: 2 });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support event unsubscription', () => {
      const handler = vi.fn();
      const unsubscribe = eventBus.on('chat:unsub-event', handler);

      unsubscribe();
      eventBus.emit('chat:unsub-event', { data: 'test' });

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
