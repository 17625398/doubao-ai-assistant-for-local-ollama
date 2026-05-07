// Memory 操作模块

import { v4 as uuidv4 } from 'uuid';
import { Memory, MemorySearchResult, ConversationMemoryInput } from '../types';
import { STORAGE_KEYS, COLLECTIONS, isBrowser } from '../constants';
import { getFromStorage, getFromStorageById, deleteFromStorage, saveToStorage } from '../storage-utils';

export class MemoryOperations {
  constructor(
    private client: any | null,
    private collections: { [key: string]: any },
    private getWing: (wingId: string) => Promise<any | null>,
    private getRoom: (roomId: string) => Promise<any | null>,
    private getHall: (hallId: string) => Promise<any | null>,
    private updateRoom: (roomId: string, data: any) => Promise<any>,
    private getOrCreateWing: (name: string, description?: string) => Promise<any>,
    private getOrCreateRoom: (wingId: string, name: string, description?: string) => Promise<any>,
    private getOrCreateHall: (name: string, description?: string) => Promise<any>
  ) {}

  async addMemory(wingId: string, roomId: string, hallId: string, content: string, metadata: Memory['metadata']): Promise<Memory> {
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

    if (isBrowser || !this.client) {
      const memories = getFromStorage<Memory>(STORAGE_KEYS.MEMORIES);
      memories.push(memory);
      saveToStorage(STORAGE_KEYS.MEMORIES, memories);
      
      const room = await this.getRoom(roomId);
      if (room) {
        await this.updateRoom(roomId, {
          memoryIds: [...(room.memoryIds || []), memory.id],
        });
      }
      
      return memory;
    }

    await this.collections[COLLECTIONS.MEMORIES].add({
      ids: [memory.id],
      documents: [content],
      metadatas: [{
        type: 'memory',
        wingId,
        roomId,
        hallId,
        ...metadata,
      }],
    });

    const room = await this.getRoom(roomId);
    if (room) {
      await this.updateRoom(roomId, {
        memoryIds: [...(room.memoryIds || []), memory.id],
      });
    }

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
    if (isBrowser || !this.client) {
      return getFromStorageById<Memory>(STORAGE_KEYS.MEMORIES, memoryId);
    }

    const result = await this.collections[COLLECTIONS.MEMORIES].get({
      ids: [memoryId],
    });

    if (result.documents.length === 0) return null;

    const metadata = result.metadatas[0];
    return {
      id: memoryId,
      wingId: metadata.wingId,
      roomId: metadata.roomId,
      hallId: metadata.hallId,
      content: result.documents[0],
      metadata: {
        role: metadata.role,
        timestamp: metadata.timestamp,
        sessionId: metadata.sessionId,
        ...metadata,
      },
      createdAt: metadata.createdAt || Date.now(),
      updatedAt: metadata.updatedAt || Date.now(),
    };
  }

  async getMemoriesByRoom(roomId: string): Promise<Memory[]> {
    if (isBrowser || !this.client) {
      const memories = getFromStorage<Memory>(STORAGE_KEYS.MEMORIES);
      return memories.filter(memory => memory.roomId === roomId);
    }

    const result = await this.collections[COLLECTIONS.MEMORIES].get({
      where: { roomId },
    });

    return result.documents.map((doc: string, index: number) => {
      const metadata = result.metadatas[index];
      return {
        id: result.ids[index],
        wingId: metadata.wingId,
        roomId: metadata.roomId,
        hallId: metadata.hallId,
        content: doc,
        metadata: {
          role: metadata.role,
          timestamp: metadata.timestamp,
          sessionId: metadata.sessionId,
          ...metadata,
        },
        createdAt: metadata.createdAt || Date.now(),
        updatedAt: metadata.updatedAt || Date.now(),
      };
    });
  }

  async getMemoriesByWing(wingId: string): Promise<Memory[]> {
    if (isBrowser || !this.client) {
      const memories = getFromStorage<Memory>(STORAGE_KEYS.MEMORIES);
      return memories.filter(memory => memory.wingId === wingId);
    }

    const result = await this.collections[COLLECTIONS.MEMORIES].get({
      where: { wingId },
    });

    return result.documents.map((doc: string, index: number) => {
      const metadata = result.metadatas[index];
      return {
        id: result.ids[index],
        wingId: metadata.wingId,
        roomId: metadata.roomId,
        hallId: metadata.hallId,
        content: doc,
        metadata: {
          role: metadata.role,
          timestamp: metadata.timestamp,
          sessionId: metadata.sessionId,
          ...metadata,
        },
        createdAt: metadata.createdAt || Date.now(),
        updatedAt: metadata.updatedAt || Date.now(),
      };
    });
  }

  async deleteMemory(memoryId: string): Promise<void> {
    const memory = await this.getMemory(memoryId);
    if (!memory) return;

    if (isBrowser || !this.client) {
      deleteFromStorage<Memory>(STORAGE_KEYS.MEMORIES, memoryId);
    } else {
      await this.collections[COLLECTIONS.MEMORIES].delete({
        ids: [memoryId],
      });
    }

    // 更新 room 的 memoryIds
    const room = await this.getRoom(memory.roomId);
    if (room) {
      await this.updateRoom(memory.roomId, {
        memoryIds: room.memoryIds.filter((id: string) => id !== memoryId),
      });
    }
  }
}
