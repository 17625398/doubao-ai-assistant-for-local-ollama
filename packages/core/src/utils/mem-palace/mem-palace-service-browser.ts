// MemPalace 浏览器兼容服务实现
// 使用 localStorage 替代 ChromaDB，避免 Node.js 依赖

import { v4 as uuidv4 } from 'uuid'
import type { Wing, Room, Hall, Memory, MemorySearchResult, MemPalaceConfig, IMemPalaceService, ConversationMemoryInput } from './types'

// 默认配置
const DEFAULT_CONFIG: MemPalaceConfig = {
  storagePath: 'mempalace',
  embeddingModel: 'all-MiniLM-L6-v2',
  maxMemorySize: 10000,
  searchLimit: 10,
  searchThreshold: 0.7,
}

// 存储键名常量
const STORAGE_KEYS = {
  WINGS: 'mempalace_wings',
  ROOMS: 'mempalace_rooms',
  HALLS: 'mempalace_halls',
  MEMORIES: 'mempalace_memories',
} as const

export class MemPalaceServiceBrowser implements IMemPalaceService {
  private config: MemPalaceConfig
  private initialized = false
  private wings: Map<string, Wing> = new Map()
  private rooms: Map<string, Room> = new Map()
  private halls: Map<string, Hall> = new Map()
  private memories: Map<string, Memory> = new Map()

  constructor(config?: Partial<MemPalaceConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    }
  }

  /**
   * 比较两个名称是否相同（忽略大小写和空格）
   */
  private isSameName(left: string, right: string): boolean {
    return left.trim().toLowerCase() === right.trim().toLowerCase()
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // 从 localStorage 加载数据
      this.loadFromStorage()

      // 初始化默认 halls
      await this.initializeDefaultHalls()

      this.initialized = true
      console.log('MemPalace Browser initialized successfully')
    } catch (error) {
      console.error('Failed to initialize MemPalace Browser:', error)
      throw error
    }
  }

  /**
   * 从 localStorage 加载数据
   */
  private loadFromStorage(): void {
    try {
      // 加载 wings
      const wingsData = localStorage.getItem(STORAGE_KEYS.WINGS)
      if (wingsData) {
        const wingsArray: Wing[] = JSON.parse(wingsData)
        wingsArray.forEach(wing => this.wings.set(wing.id, wing))
      }

      // 加载 rooms
      const roomsData = localStorage.getItem(STORAGE_KEYS.ROOMS)
      if (roomsData) {
        const roomsArray: Room[] = JSON.parse(roomsData)
        roomsArray.forEach(room => this.rooms.set(room.id, room))
      }

      // 加载 halls
      const hallsData = localStorage.getItem(STORAGE_KEYS.HALLS)
      if (hallsData) {
        const hallsArray: Hall[] = JSON.parse(hallsData)
        hallsArray.forEach(hall => this.halls.set(hall.id, hall))
      }

      // 加载 memories
      const memoriesData = localStorage.getItem(STORAGE_KEYS.MEMORIES)
      if (memoriesData) {
        const memoriesArray: Memory[] = JSON.parse(memoriesData)
        memoriesArray.forEach(memory => this.memories.set(memory.id, memory))
      }
    } catch (error) {
      console.error('Error loading from storage:', error)
    }
  }

  /**
   * 保存所有数据到 localStorage
   */
  private saveToStorage(): void {
    try {
      // 保存 wings
      localStorage.setItem(STORAGE_KEYS.WINGS, JSON.stringify(Array.from(this.wings.values())))

      // 保存 rooms
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(Array.from(this.rooms.values())))

      // 保存 halls
      localStorage.setItem(STORAGE_KEYS.HALLS, JSON.stringify(Array.from(this.halls.values())))

      // 保存 memories
      localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(Array.from(this.memories.values())))
    } catch (error) {
      console.error('Error saving to storage:', error)
    }
  }

  /**
   * 保存单个集合到 localStorage
   */
  private saveCollection(key: string, data: unknown[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error(`Error saving collection ${key}:`, error)
    }
  }

  /**
   * 保存所有数据到 localStorage（优化版）
   */
  private saveAllToStorage(): void {
    this.saveCollection(STORAGE_KEYS.WINGS, Array.from(this.wings.values()))
    this.saveCollection(STORAGE_KEYS.ROOMS, Array.from(this.rooms.values()))
    this.saveCollection(STORAGE_KEYS.HALLS, Array.from(this.halls.values()))
    this.saveCollection(STORAGE_KEYS.MEMORIES, Array.from(this.memories.values()))
  }

  private async initializeDefaultHalls(): Promise<void> {
    const defaultHalls = [
      { name: 'conversations', description: '对话和聊天记录' },
      { name: 'facts', description: '事实和信息' },
      { name: 'events', description: '事件和对话' },
      { name: 'discoveries', description: '发现和洞察' },
      { name: 'questions', description: '问题和疑问' },
      { name: 'answers', description: '答案和解决方案' },
    ];

    for (const hallData of defaultHalls) {
      const existingHall = Array.from(this.halls.values()).find(h => h.name === hallData.name);
      if (!existingHall) {
        const hall: Hall = {
          id: uuidv4(),
          name: hallData.name,
          description: hallData.description,
          createdAt: Date.now(),
          memoryIds: [],
        };
        this.halls.set(hall.id, hall);
      }
    }

    this.saveToStorage();
  }

  // Wing 操作
  async createWing(name: string, description?: string): Promise<Wing> {
    await this.initialize();

    const wing: Wing = {
      id: uuidv4(),
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      roomIds: [],
    };

    this.wings.set(wing.id, wing);
    this.saveToStorage();

    return wing;
  }

  async getWingByName(name: string): Promise<Wing | null> {
    await this.initialize();
    return Array.from(this.wings.values()).find((wing) => this.isSameName(wing.name, name)) || null;
  }

  async getOrCreateWing(name: string, description?: string): Promise<Wing> {
    const existingWing = await this.getWingByName(name);
    if (existingWing) {
      return existingWing;
    }
    return this.createWing(name, description);
  }

  async getWing(wingId: string): Promise<Wing | null> {
    await this.initialize();
    return this.wings.get(wingId) || null;
  }

  async getWings(): Promise<Wing[]> {
    await this.initialize();
    return Array.from(this.wings.values());
  }

  async updateWing(wingId: string, data: Partial<Wing>): Promise<Wing> {
    await this.initialize();

    const wing = this.wings.get(wingId);
    if (!wing) throw new Error('Wing not found');

    const updatedWing = {
      ...wing,
      ...data,
      updatedAt: Date.now(),
    };

    this.wings.set(wingId, updatedWing);
    this.saveToStorage();

    return updatedWing;
  }

  async deleteWing(wingId: string): Promise<void> {
    await this.initialize();

    // 删除关联的 rooms
    const roomsToDelete = Array.from(this.rooms.values()).filter(r => r.wingId === wingId);
    for (const room of roomsToDelete) {
      await this.deleteRoom(room.id);
    }

    this.wings.delete(wingId);
    this.saveToStorage();
  }

  // Room 操作
  async createRoom(wingId: string, name: string, description?: string): Promise<Room> {
    await this.initialize();

    const room: Room = {
      id: uuidv4(),
      wingId,
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      memoryIds: [],
    };

    this.rooms.set(room.id, room);

    // 更新 wing 的 roomIds
    const wing = this.wings.get(wingId);
    if (wing) {
      wing.roomIds = [...(wing.roomIds || []), room.id];
      wing.updatedAt = Date.now();
      this.wings.set(wingId, wing);
    }

    this.saveToStorage();
    return room;
  }

  async getRoomByName(wingId: string, name: string): Promise<Room | null> {
    await this.initialize();
    return Array.from(this.rooms.values()).find((room) => room.wingId === wingId && this.isSameName(room.name, name)) || null;
  }

  async getOrCreateRoom(wingId: string, name: string, description?: string): Promise<Room> {
    const existingRoom = await this.getRoomByName(wingId, name);
    if (existingRoom) {
      return existingRoom;
    }
    return this.createRoom(wingId, name, description);
  }

  async getRoom(roomId: string): Promise<Room | null> {
    await this.initialize();
    return this.rooms.get(roomId) || null;
  }

  async getRoomsByWing(wingId: string): Promise<Room[]> {
    await this.initialize();
    return Array.from(this.rooms.values()).filter(r => r.wingId === wingId);
  }

  async updateRoom(roomId: string, data: Partial<Room>): Promise<Room> {
    await this.initialize();

    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');

    const updatedRoom = {
      ...room,
      ...data,
      updatedAt: Date.now(),
    };

    this.rooms.set(roomId, updatedRoom);
    this.saveToStorage();

    return updatedRoom;
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.initialize();

    const room = this.rooms.get(roomId);
    if (!room) return;

    // 删除关联的 memories
    for (const memoryId of room.memoryIds || []) {
      await this.deleteMemory(memoryId);
    }

    this.rooms.delete(roomId);

    // 更新 wing 的 roomIds
    const wing = this.wings.get(room.wingId);
    if (wing) {
      wing.roomIds = (wing.roomIds || []).filter(id => id !== roomId);
      wing.updatedAt = Date.now();
      this.wings.set(room.wingId, wing);
    }

    this.saveToStorage();
  }

  // Hall 操作
  async createHall(name: string, description?: string): Promise<Hall> {
    await this.initialize();

    const hall: Hall = {
      id: uuidv4(),
      name,
      description,
      createdAt: Date.now(),
      memoryIds: [],
    };

    this.halls.set(hall.id, hall);
    this.saveToStorage();

    return hall;
  }

  async getHallByName(name: string): Promise<Hall | null> {
    await this.initialize();
    return Array.from(this.halls.values()).find((hall) => this.isSameName(hall.name, name)) || null;
  }

  async getOrCreateHall(name: string, description?: string): Promise<Hall> {
    const existingHall = await this.getHallByName(name);
    if (existingHall) {
      return existingHall;
    }
    return this.createHall(name, description);
  }

  async getHall(hallId: string): Promise<Hall | null> {
    await this.initialize();
    return this.halls.get(hallId) || null;
  }

  async getHalls(): Promise<Hall[]> {
    await this.initialize();
    return Array.from(this.halls.values());
  }

  // Memory 操作
  async addMemory(wingId: string, roomId: string, hallId: string, content: string, metadata: Memory['metadata']): Promise<Memory> {
    await this.initialize();

    const memory: Memory = {
      id: uuidv4(),
      wingId,
      roomId,
      hallId,
      content,
      metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.memories.set(memory.id, memory);

    // 更新 room 的 memoryIds
    const room = this.rooms.get(roomId);
    if (room) {
      room.memoryIds = [...(room.memoryIds || []), memory.id];
      room.updatedAt = Date.now();
      this.rooms.set(roomId, room);
    }

    this.saveToStorage();
    return memory;
  }

  async addConversationMemory(input: ConversationMemoryInput): Promise<Memory> {
    const wing = await this.getOrCreateWing(input.wingName ?? 'Conversations', input.wingDescription ?? 'AI 对话记忆');
    const room = await this.getOrCreateRoom(wing.id, input.roomName ?? 'General', input.roomDescription ?? '通用对话');
    const hall = await this.getOrCreateHall(input.hallName ?? 'events', input.hallDescription ?? '事件和对话');
    return this.addMemory(wing.id, room.id, hall.id, input.content, {
      timestamp: Date.now(),
      role: 'assistant',
      sessionId: input.sessionId,
      model: input.model,
      provider: input.provider,
      memoryType: input.memoryType ?? 'conversation',
      ...(input.metadata ?? {}),
    });
  }

  async getMemory(memoryId: string): Promise<Memory | null> {
    await this.initialize();
    return this.memories.get(memoryId) || null;
  }

  async getMemoriesByRoom(roomId: string): Promise<Memory[]> {
    await this.initialize();
    return Array.from(this.memories.values()).filter(m => m.roomId === roomId);
  }

  async getMemoriesByWing(wingId: string): Promise<Memory[]> {
    await this.initialize();
    return Array.from(this.memories.values()).filter(m => m.wingId === wingId);
  }

  async deleteMemory(memoryId: string): Promise<void> {
    await this.initialize();

    const memory = this.memories.get(memoryId);
    if (!memory) return;

    this.memories.delete(memoryId);

    // 更新 room 的 memoryIds
    const room = this.rooms.get(memory.roomId);
    if (room) {
      room.memoryIds = (room.memoryIds || []).filter(id => id !== memoryId);
      room.updatedAt = Date.now();
      this.rooms.set(memory.roomId, room);
    }

    this.saveToStorage();
  }

  // 搜索操作 - 简化的文本搜索（浏览器版本不支持向量搜索）
  async searchMemories(query: string, limit: number = this.config.searchLimit || 10, threshold: number = this.config.searchThreshold || 0.7): Promise<MemorySearchResult[]> {
    await this.initialize();

    const queryLower = query.toLowerCase();
    const results: MemorySearchResult[] = [];

    for (const memory of this.memories.values()) {
      const contentLower = memory.content.toLowerCase();
      const similarity = this.calculateSimilarity(queryLower, contentLower);

      if (similarity >= threshold) {
        const wing = this.wings.get(memory.wingId);
        const room = this.rooms.get(memory.roomId);
        const hall = this.halls.get(memory.hallId);

        results.push({
          memory,
          score: similarity,
          wing,
          room,
          hall
        });
      }
    }

    // 按分数排序并限制结果数量
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // 计算文本相似度（简化版）
  private calculateSimilarity(query: string, text: string): number {
    if (!query || !text) return 0;
    
    // 简单的文本匹配算法
    const queryWords = query.split(/\s+/);
    const textWords = text.split(/\s+/);
    
    let matchedWords = 0;
    for (const word of queryWords) {
      if (textWords.includes(word)) {
        matchedWords++;
      }
    }
    
    return matchedWords / queryWords.length;
  }

  // 按 wing 搜索记忆
  async searchMemoriesByWing(wingId: string, query: string, limit: number = this.config.searchLimit || 10, threshold: number = this.config.searchThreshold || 0.7): Promise<MemorySearchResult[]> {
    await this.initialize();

    const queryLower = query.toLowerCase();
    const results: MemorySearchResult[] = [];

    for (const memory of this.memories.values()) {
      if (memory.wingId === wingId) {
        const contentLower = memory.content.toLowerCase();
        const similarity = this.calculateSimilarity(queryLower, contentLower);

        if (similarity >= threshold) {
          const wing = this.wings.get(memory.wingId);
          const room = this.rooms.get(memory.roomId);
          const hall = this.halls.get(memory.hallId);

          results.push({
            memory,
            score: similarity,
            wing,
            room,
            hall
          });
        }
      }
    }

    // 按分数排序并限制结果数量
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // 按 room 搜索记忆
  async searchMemoriesByRoom(roomId: string, query: string, limit: number = this.config.searchLimit || 10, threshold: number = this.config.searchThreshold || 0.7): Promise<MemorySearchResult[]> {
    await this.initialize();

    const queryLower = query.toLowerCase();
    const results: MemorySearchResult[] = [];

    for (const memory of this.memories.values()) {
      if (memory.roomId === roomId) {
        const contentLower = memory.content.toLowerCase();
        const similarity = this.calculateSimilarity(queryLower, contentLower);

        if (similarity >= threshold) {
          const wing = this.wings.get(memory.wingId);
          const room = this.rooms.get(memory.roomId);
          const hall = this.halls.get(memory.hallId);

          results.push({
            memory,
            score: similarity,
            wing,
            room,
            hall
          });
        }
      }
    }

    // 按分数排序并限制结果数量
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // 批量添加记忆
  async batchAddMemories(memories: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Memory[]> {
    await this.initialize();

    const createdMemories: Memory[] = [];

    for (const memoryData of memories) {
      const memory: Memory = {
        ...memoryData,
        id: uuidv4(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.memories.set(memory.id, memory);

      // 更新 room 的 memoryIds
      const room = this.rooms.get(memory.roomId);
      if (room) {
        room.memoryIds = [...(room.memoryIds || []), memory.id];
        room.updatedAt = Date.now();
        this.rooms.set(memory.roomId, room);
      }

      createdMemories.push(memory);
    }

    this.saveToStorage();
    return createdMemories;
  }

  // 清理所有数据
  async clearAll(): Promise<void> {
    await this.initialize();

    this.wings.clear();
    this.rooms.clear();
    this.halls.clear();
    this.memories.clear();

    // 清理 localStorage
    try {
      localStorage.removeItem(STORAGE_KEYS.WINGS);
      localStorage.removeItem(STORAGE_KEYS.ROOMS);
      localStorage.removeItem(STORAGE_KEYS.HALLS);
      localStorage.removeItem(STORAGE_KEYS.MEMORIES);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  // 关闭服务
  async close(): Promise<void> {
    // 浏览器版本不需要特殊关闭操作
    this.initialized = false;
  }
}
