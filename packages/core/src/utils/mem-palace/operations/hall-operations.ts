// Hall 操作模块

import { v4 as uuidv4 } from 'uuid';
import { Hall } from '../types';
import { STORAGE_KEYS, COLLECTIONS, isBrowser } from '../constants';
import { getFromStorage, getFromStorageById, saveToStorage } from '../storage-utils';

export class HallOperations {
  constructor(
    private client: any | null,
    private collections: { [key: string]: any },
    private isSameName: (left: string, right: string) => boolean
  ) {}

  async createHall(name: string, description?: string): Promise<Hall> {
    const hall: Hall = {
      id: uuidv4(),
      name,
      description,
      createdAt: Date.now(),
      memoryIds: [],
    };

    if (isBrowser || !this.client) {
      const halls = getFromStorage<Hall>(STORAGE_KEYS.HALLS);
      halls.push(hall);
      saveToStorage(STORAGE_KEYS.HALLS, halls);
      return hall;
    }

    await this.collections[COLLECTIONS.HALLS].add({
      ids: [hall.id],
      documents: [JSON.stringify(hall)],
      metadatas: [{ type: 'hall' }],
    });

    return hall;
  }

  async getHallByName(name: string): Promise<Hall | null> {
    const halls = await this.getHalls();
    return halls.find((hall) => this.isSameName(hall.name, name)) ?? null;
  }

  async getOrCreateHall(name: string, description?: string): Promise<Hall> {
    const existingHall = await this.getHallByName(name);
    if (existingHall) {
      return existingHall;
    }
    return this.createHall(name, description);
  }

  async getHall(hallId: string): Promise<Hall | null> {
    if (isBrowser || !this.client) {
      return getFromStorageById<Hall>(STORAGE_KEYS.HALLS, hallId);
    }

    const result = await this.collections[COLLECTIONS.HALLS].get({
      ids: [hallId],
    });

    if (result.documents.length === 0) return null;
    return JSON.parse(result.documents[0]);
  }

  async getHalls(): Promise<Hall[]> {
    if (isBrowser || !this.client) {
      return getFromStorage<Hall>(STORAGE_KEYS.HALLS);
    }

    const result = await this.collections[COLLECTIONS.HALLS].get();
    return result.documents.map((doc: string) => JSON.parse(doc));
  }
}
