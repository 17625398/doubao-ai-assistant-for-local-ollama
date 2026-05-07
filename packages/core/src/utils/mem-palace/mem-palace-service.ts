// MemPalace 服务实现

import { MemPalaceConfig } from './types';
import { BaseMemPalaceService } from './base-mem-palace-service';
import { isBrowser } from './constants';
import { COLLECTIONS } from './constants';

// 仅在非浏览器环境中定义和加载 ChromaDB
let ChromaClient: any = null;

// 确保在浏览器环境中完全排除 ChromaDB 代码
// 使用 Webpack 的魔法注释来告诉 Webpack 在浏览器环境中忽略这个导入
if (!isBrowser) {
  // 这个代码块在浏览器环境中不会执行
  (async () => {
    try {
      // 动态导入 ChromaDB，使用魔法注释告诉 Webpack 在浏览器环境中忽略
      const chromadb = await import(/* webpackIgnore: true */ 'chromadb');
      ChromaClient = chromadb.ChromaClient;
    } catch (error) {
      console.warn('ChromaDB not available in this environment');
    }
  })();
}

export class MemPalaceService extends BaseMemPalaceService {
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 检查是否在浏览器环境中
      if (isBrowser) {
        console.warn('MemPalace: Running in browser environment, using localStorage fallback');
        // 初始化操作模块（浏览器环境使用 localStorage）
        this.initializeOperations();
        this.initialized = true;
        return;
      }

      // 检查 ChromaDB 是否可用
      if (!ChromaClient) {
        console.warn('MemPalace: ChromaDB not available, using localStorage fallback');
        // 初始化操作模块（使用 localStorage 后备）
        this.initializeOperations();
        this.initialized = true;
        return;
      }

      // 动态导入 ChromaDB（再次使用魔法注释）
      const chromadb = await import(/* webpackIgnore: true */ 'chromadb');
      const { ChromaClient: RealChromaClient } = chromadb;

      // 初始化 ChromaDB 客户端
      this.client = new RealChromaClient({
        path: this.config.storagePath,
      });

      // 创建或获取集合
      for (const [name, collectionName] of Object.entries(COLLECTIONS)) {
        try {
          this.collections[name] = await this.client!.getCollection({ name: collectionName });
        } catch {
          this.collections[name] = await this.client!.createCollection({
            name: collectionName,
            metadata: { type: name },
          });
        }
      }

      // 初始化操作模块
      this.initializeOperations();

      // 初始化默认 halls
      await this.initializeDefaultHalls();

      this.initialized = true;
      console.log('MemPalace initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MemPalace:', error);
      // 初始化失败时，使用 localStorage 作为后备
      console.warn('MemPalace: Falling back to localStorage');
      // 初始化操作模块（使用 localStorage 后备）
      this.initializeOperations();
      this.initialized = true;
    }
  }

  // 初始化默认 halls
  private async initializeDefaultHalls(): Promise<void> {
    const defaultHalls = [
      { name: 'events', description: '事件和对话' },
      { name: 'facts', description: '事实和知识' },
      { name: 'preferences', description: '用户偏好' },
    ];

    for (const hall of defaultHalls) {
      await this.hallOps.getOrCreateHall(hall.name, hall.description);
    }
  }
}

// 全局实例
let memPalaceService: MemPalaceService | null = null;

export function getMemPalaceService(config?: Partial<MemPalaceConfig>): MemPalaceService {
  if (!memPalaceService) {
    memPalaceService = new MemPalaceService(config);
  }
  return memPalaceService;
}
