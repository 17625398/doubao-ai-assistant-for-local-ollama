// Search 操作模块

import { Memory, MemorySearchResult, MemPalaceConfig } from '../types';
import { STORAGE_KEYS, COLLECTIONS, isBrowser } from '../constants';
import { getFromStorage } from '../storage-utils';

export class SearchOperations {
  constructor(
    private client: any | null,
    private collections: { [key: string]: any },
    private config: MemPalaceConfig,
    private getWing: (wingId: string) => Promise<any | null>,
    private getRoom: (roomId: string) => Promise<any | null>,
    private getHall: (hallId: string) => Promise<any | null>,
    private getMemory: (memoryId: string) => Promise<Memory | null>
  ) {}

  async searchMemories(
    query: string,
    limit: number = this.config.searchLimit || 10,
    threshold: number = this.config.searchThreshold || 0.7
  ): Promise<MemorySearchResult[]> {
    if (isBrowser || !this.client) {
      return this.searchMemoriesLocal(query, limit, threshold);
    }

    return this.searchMemoriesChroma(query, limit, threshold);
  }

  private async searchMemoriesLocal(
    query: string,
    limit: number,
    threshold: number
  ): Promise<MemorySearchResult[]> {
    const memories = getFromStorage<Memory>(STORAGE_KEYS.MEMORIES);
    const searchResults: MemorySearchResult[] = [];

    for (const memory of memories) {
      const contentLower = memory.content.toLowerCase();
      const queryLower = query.toLowerCase();

      if (contentLower.includes(queryLower)) {
        const matchIndex = contentLower.indexOf(queryLower);
        const score = 1 - (matchIndex / contentLower.length);

        if (score >= (1 - threshold)) {
          const wing = (await this.getWing(memory.wingId)) || undefined;
          const room = (await this.getRoom(memory.roomId)) || undefined;
          const hall = (await this.getHall(memory.hallId)) || undefined;

          searchResults.push({
            memory,
            score,
            wing,
            room,
            hall,
          });
        }
      }
    }

    return searchResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async searchMemoriesChroma(
    query: string,
    limit: number,
    threshold: number
  ): Promise<MemorySearchResult[]> {
    const result = await this.collections[COLLECTIONS.MEMORIES].query({
      queryTexts: [query],
      nResults: limit,
    });

    const searchResults: MemorySearchResult[] = [];

    for (let i = 0; i < result.documents[0].length; i++) {
      const score = result.distances[0][i];
      if (score > threshold) continue;

      const memoryId = result.ids[0][i];
      const memory = await this.getMemory(memoryId);
      if (!memory) continue;

      const wing = (await this.getWing(memory.wingId)) || undefined;
      const room = (await this.getRoom(memory.roomId)) || undefined;
      const hall = (await this.getHall(memory.hallId)) || undefined;

      searchResults.push({
        memory,
        score,
        wing,
        room,
        hall,
      });
    }

    return searchResults;
  }

  async searchMemoriesByWing(
    wingId: string,
    query: string,
    limit: number = this.config.searchLimit || 10,
    threshold: number = this.config.searchThreshold || 0.7
  ): Promise<MemorySearchResult[]> {
    if (isBrowser || !this.client) {
      return this.searchMemoriesByWingLocal(wingId, query, limit, threshold);
    }

    return this.searchMemoriesByWingChroma(wingId, query, limit, threshold);
  }

  private async searchMemoriesByWingLocal(
    wingId: string,
    query: string,
    limit: number,
    threshold: number
  ): Promise<MemorySearchResult[]> {
    const queryLower = query.toLowerCase();
    const results: MemorySearchResult[] = [];

    const memories = getFromStorage<Memory>(STORAGE_KEYS.MEMORIES);
    for (const memory of memories) {
      if (memory.wingId === wingId) {
        const contentLower = memory.content.toLowerCase();

        if (contentLower.includes(queryLower)) {
          const matchIndex = contentLower.indexOf(queryLower);
          const score = 1 - (matchIndex / contentLower.length);

          if (score >= (1 - threshold)) {
            const wing = (await this.getWing(memory.wingId)) || undefined;
            const room = (await this.getRoom(memory.roomId)) || undefined;
            const hall = (await this.getHall(memory.hallId)) || undefined;

            results.push({
              memory,
              score,
              wing,
              room,
              hall,
            });
          }
        }
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async searchMemoriesByWingChroma(
    wingId: string,
    query: string,
    limit: number,
    threshold: number
  ): Promise<MemorySearchResult[]> {
    const result = await this.collections[COLLECTIONS.MEMORIES].query({
      queryTexts: [query],
      nResults: limit * 2,
      where: { wingId },
    });

    const searchResults: MemorySearchResult[] = [];

    for (let i = 0; i < result.documents[0].length; i++) {
      const score = result.distances[0][i];
      if (score > threshold) continue;

      const memoryId = result.ids[0][i];
      const memory = await this.getMemory(memoryId);
      if (!memory) continue;

      const wing = (await this.getWing(memory.wingId)) || undefined;
      const room = (await this.getRoom(memory.roomId)) || undefined;
      const hall = (await this.getHall(memory.hallId)) || undefined;

      searchResults.push({
        memory,
        score,
        wing,
        room,
        hall,
      });
    }

    return searchResults.slice(0, limit);
  }

  async searchMemoriesByRoom(
    roomId: string,
    query: string,
    limit: number = this.config.searchLimit || 10,
    threshold: number = this.config.searchThreshold || 0.7
  ): Promise<MemorySearchResult[]> {
    if (isBrowser || !this.client) {
      return this.searchMemoriesByRoomLocal(roomId, query, limit, threshold);
    }

    return this.searchMemoriesByRoomChroma(roomId, query, limit, threshold);
  }

  private async searchMemoriesByRoomLocal(
    roomId: string,
    query: string,
    limit: number,
    threshold: number
  ): Promise<MemorySearchResult[]> {
    const queryLower = query.toLowerCase();
    const results: MemorySearchResult[] = [];

    const memories = getFromStorage<Memory>(STORAGE_KEYS.MEMORIES);
    for (const memory of memories) {
      if (memory.roomId === roomId) {
        const contentLower = memory.content.toLowerCase();

        if (contentLower.includes(queryLower)) {
          const matchIndex = contentLower.indexOf(queryLower);
          const score = 1 - (matchIndex / contentLower.length);

          if (score >= (1 - threshold)) {
            const wing = (await this.getWing(memory.wingId)) || undefined;
            const room = (await this.getRoom(memory.roomId)) || undefined;
            const hall = (await this.getHall(memory.hallId)) || undefined;

            results.push({
              memory,
              score,
              wing,
              room,
              hall,
            });
          }
        }
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async searchMemoriesByRoomChroma(
    roomId: string,
    query: string,
    limit: number,
    threshold: number
  ): Promise<MemorySearchResult[]> {
    const result = await this.collections[COLLECTIONS.MEMORIES].query({
      queryTexts: [query],
      nResults: limit * 2,
      where: { roomId },
    });

    const searchResults: MemorySearchResult[] = [];

    for (let i = 0; i < result.documents[0].length; i++) {
      const score = result.distances[0][i];
      if (score > threshold) continue;

      const memoryId = result.ids[0][i];
      const memory = await this.getMemory(memoryId);
      if (!memory) continue;

      const wing = (await this.getWing(memory.wingId)) || undefined;
      const room = (await this.getRoom(memory.roomId)) || undefined;
      const hall = (await this.getHall(memory.hallId)) || undefined;

      searchResults.push({
        memory,
        score,
        wing,
        room,
        hall,
      });
    }

    return searchResults.slice(0, limit);
  }
}
