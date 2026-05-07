// MemPalace 基础服务类 - 精简版本
// 使用模块化操作类

import { v4 as uuidv4 } from 'uuid';
import {
  Wing,
  Room,
  Hall,
  Memory,
  MemorySearchResult,
  MemPalaceConfig,
  IMemPalaceService,
  ConversationMemoryInput,
} from './types';
import { DEFAULT_CONFIG, isBrowser } from './constants';
import { WingOperations } from './operations/wing-operations';
import { RoomOperations } from './operations/room-operations';
import { HallOperations } from './operations/hall-operations';
import { MemoryOperations } from './operations/memory-operations';
import { SearchOperations } from './operations/search-operations';

// 仅在非浏览器环境中定义和加载 ChromaDB
let ChromaClient: any = null;

// 确保在浏览器环境中完全排除 ChromaDB 代码
if (!isBrowser) {
  (async () => {
    try {
      const chromadb = await import(/* webpackIgnore: true */ 'chromadb');
      ChromaClient = chromadb.ChromaClient;
    } catch (error) {
      console.warn('ChromaDB not available in this environment');
    }
  })();
}

export abstract class BaseMemPalaceService implements IMemPalaceService {
  protected client: any | null = null;
  protected collections: { [key: string]: any } = {};
  protected config: MemPalaceConfig;
  protected initialized = false;

  // 模块化操作实例
  protected wingOps!: WingOperations;
  protected roomOps!: RoomOperations;
  protected hallOps!: HallOperations;
  protected memoryOps!: MemoryOperations;
  protected searchOps!: SearchOperations;

  constructor(config?: Partial<MemPalaceConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  protected isSameName(left: string, right: string): boolean {
    return left.trim().toLowerCase() === right.trim().toLowerCase();
  }

  protected initializeOperations(): void {
    this.wingOps = new WingOperations(this.client, this.collections, this.isSameName.bind(this));
    this.hallOps = new HallOperations(this.client, this.collections, this.isSameName.bind(this));
    this.roomOps = new RoomOperations(
      this.client,
      this.collections,
      this.isSameName.bind(this),
      this.wingOps.getWing.bind(this.wingOps),
      this.wingOps.updateWing.bind(this.wingOps)
    );
    this.memoryOps = new MemoryOperations(
      this.client,
      this.collections,
      this.wingOps.getWing.bind(this.wingOps),
      this.roomOps.getRoom.bind(this.roomOps),
      this.hallOps.getHall.bind(this.hallOps),
      this.roomOps.updateRoom.bind(this.roomOps),
      this.wingOps.getOrCreateWing.bind(this.wingOps),
      this.roomOps.getOrCreateRoom.bind(this.roomOps),
      this.hallOps.getOrCreateHall.bind(this.hallOps)
    );
    this.searchOps = new SearchOperations(
      this.client,
      this.collections,
      this.config,
      this.wingOps.getWing.bind(this.wingOps),
      this.roomOps.getRoom.bind(this.roomOps),
      this.hallOps.getHall.bind(this.hallOps),
      this.memoryOps.getMemory.bind(this.memoryOps)
    );
  }

  abstract initialize(): Promise<void>;

  // Wing 操作 - 委托给 WingOperations
  async createWing(name: string, description?: string): Promise<Wing> {
    await this.initialize();
    return this.wingOps.createWing(name, description);
  }

  async getWingByName(name: string): Promise<Wing | null> {
    await this.initialize();
    return this.wingOps.getWingByName(name);
  }

  async getOrCreateWing(name: string, description?: string): Promise<Wing> {
    await this.initialize();
    return this.wingOps.getOrCreateWing(name, description);
  }

  async getWing(wingId: string): Promise<Wing | null> {
    await this.initialize();
    return this.wingOps.getWing(wingId);
  }

  async getWings(): Promise<Wing[]> {
    await this.initialize();
    return this.wingOps.getWings();
  }

  async updateWing(wingId: string, data: Partial<Wing>): Promise<Wing> {
    await this.initialize();
    return this.wingOps.updateWing(wingId, data);
  }

  async deleteWing(wingId: string): Promise<void> {
    await this.initialize();
    return this.wingOps.deleteWing(wingId, this.roomOps.deleteRoom.bind(this.roomOps), this.memoryOps.deleteMemory.bind(this.memoryOps));
  }

  // Room 操作 - 委托给 RoomOperations
  async createRoom(wingId: string, name: string, description?: string): Promise<Room> {
    await this.initialize();
    return this.roomOps.createRoom(wingId, name, description);
  }

  async getRoomByName(wingId: string, name: string): Promise<Room | null> {
    await this.initialize();
    return this.roomOps.getRoomByName(wingId, name);
  }

  async getOrCreateRoom(wingId: string, name: string, description?: string): Promise<Room> {
    await this.initialize();
    return this.roomOps.getOrCreateRoom(wingId, name, description);
  }

  async getRoom(roomId: string): Promise<Room | null> {
    await this.initialize();
    return this.roomOps.getRoom(roomId);
  }

  async getRoomsByWing(wingId: string): Promise<Room[]> {
    await this.initialize();
    return this.roomOps.getRoomsByWing(wingId);
  }

  async updateRoom(roomId: string, data: Partial<Room>): Promise<Room> {
    await this.initialize();
    return this.roomOps.updateRoom(roomId, data);
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.initialize();
    return this.roomOps.deleteRoom(roomId, this.memoryOps.deleteMemory.bind(this.memoryOps));
  }

  // Hall 操作 - 委托给 HallOperations
  async createHall(name: string, description?: string): Promise<Hall> {
    await this.initialize();
    return this.hallOps.createHall(name, description);
  }

  async getHallByName(name: string): Promise<Hall | null> {
    await this.initialize();
    return this.hallOps.getHallByName(name);
  }

  async getOrCreateHall(name: string, description?: string): Promise<Hall> {
    await this.initialize();
    return this.hallOps.getOrCreateHall(name, description);
  }

  async getHall(hallId: string): Promise<Hall | null> {
    await this.initialize();
    return this.hallOps.getHall(hallId);
  }

  async getHalls(): Promise<Hall[]> {
    await this.initialize();
    return this.hallOps.getHalls();
  }

  // Memory 操作 - 委托给 MemoryOperations
  async addMemory(
    wingId: string,
    roomId: string,
    hallId: string,
    content: string,
    metadata: Memory['metadata']
  ): Promise<Memory> {
    await this.initialize();
    return this.memoryOps.addMemory(wingId, roomId, hallId, content, metadata);
  }

  async addConversationMemory(input: ConversationMemoryInput): Promise<Memory> {
    await this.initialize();
    return this.memoryOps.addConversationMemory(input);
  }

  async getMemory(memoryId: string): Promise<Memory | null> {
    await this.initialize();
    return this.memoryOps.getMemory(memoryId);
  }

  async getMemoriesByRoom(roomId: string): Promise<Memory[]> {
    await this.initialize();
    return this.memoryOps.getMemoriesByRoom(roomId);
  }

  async getMemoriesByWing(wingId: string): Promise<Memory[]> {
    await this.initialize();
    return this.memoryOps.getMemoriesByWing(wingId);
  }

  async deleteMemory(memoryId: string): Promise<void> {
    await this.initialize();
    return this.memoryOps.deleteMemory(memoryId);
  }

  // 搜索操作 - 委托给 SearchOperations
  async searchMemories(
    query: string,
    limit?: number,
    threshold?: number
  ): Promise<MemorySearchResult[]> {
    await this.initialize();
    return this.searchOps.searchMemories(query, limit, threshold);
  }

  async searchMemoriesByWing(
    wingId: string,
    query: string,
    limit?: number,
    threshold?: number
  ): Promise<MemorySearchResult[]> {
    await this.initialize();
    return this.searchOps.searchMemoriesByWing(wingId, query, limit, threshold);
  }

  async searchMemoriesByRoom(
    roomId: string,
    query: string,
    limit?: number,
    threshold?: number
  ): Promise<MemorySearchResult[]> {
    await this.initialize();
    return this.searchOps.searchMemoriesByRoom(roomId, query, limit, threshold);
  }

  // 批量添加记忆
  async batchAddMemories(
    memories: Omit<Memory, 'id' | 'createdAt' | 'updatedAt' | 'embedding'>[]
  ): Promise<Memory[]> {
    await this.initialize();
    const results: Memory[] = [];
    for (const memoryData of memories) {
      const memory = await this.memoryOps.addMemory(
        memoryData.wingId,
        memoryData.roomId,
        memoryData.hallId,
        memoryData.content,
        memoryData.metadata
      );
      results.push(memory);
    }
    return results;
  }

  // 清理所有数据
  async clearAll(): Promise<void> {
    await this.initialize();
    // 清理所有集合
    for (const collection of Object.values(this.collections)) {
      if (collection && typeof collection.delete === 'function') {
        await collection.delete();
      }
    }
    this.collections = {};
    this.initialized = false;
  }

  // 关闭服务
  async close(): Promise<void> {
    this.collections = {};
    this.client = null;
    this.initialized = false;
  }
}
