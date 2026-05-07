// Wing 操作模块

import { v4 as uuidv4 } from 'uuid';
import { Wing } from '../types';
import { STORAGE_KEYS, COLLECTIONS, isBrowser } from '../constants';
import { getFromStorage, getFromStorageById, updateInStorage, deleteFromStorage, saveToStorage } from '../storage-utils';

export class WingOperations {
  constructor(
    private client: any | null,
    private collections: { [key: string]: any },
    private isSameName: (left: string, right: string) => boolean
  ) {}

  async createWing(name: string, description?: string): Promise<Wing> {
    const wing: Wing = {
      id: uuidv4(),
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      roomIds: [],
    };

    if (isBrowser || !this.client) {
      const wings = getFromStorage<Wing>(STORAGE_KEYS.WINGS);
      wings.push(wing);
      saveToStorage(STORAGE_KEYS.WINGS, wings);
      return wing;
    }

    await this.collections[COLLECTIONS.WINGS].add({
      ids: [wing.id],
      documents: [JSON.stringify(wing)],
      metadatas: [{ type: 'wing' }],
    });

    return wing;
  }

  async getWingByName(name: string): Promise<Wing | null> {
    const wings = await this.getWings();
    return wings.find((wing) => this.isSameName(wing.name, name)) ?? null;
  }

  async getOrCreateWing(name: string, description?: string): Promise<Wing> {
    const existingWing = await this.getWingByName(name);
    if (existingWing) {
      return existingWing;
    }
    return this.createWing(name, description);
  }

  async getWing(wingId: string): Promise<Wing | null> {
    if (isBrowser || !this.client) {
      return getFromStorageById<Wing>(STORAGE_KEYS.WINGS, wingId);
    }

    const result = await this.collections[COLLECTIONS.WINGS].get({
      ids: [wingId],
    });

    if (result.documents.length === 0) return null;
    return JSON.parse(result.documents[0]);
  }

  async getWings(): Promise<Wing[]> {
    if (isBrowser || !this.client) {
      return getFromStorage<Wing>(STORAGE_KEYS.WINGS);
    }

    const result = await this.collections[COLLECTIONS.WINGS].get();
    return result.documents.map((doc: string) => JSON.parse(doc));
  }

  async updateWing(wingId: string, data: Partial<Wing>): Promise<Wing> {
    const wing = await this.getWing(wingId);
    if (!wing) throw new Error('Wing not found');

    const updatedWing = {
      ...wing,
      ...data,
      updatedAt: Date.now(),
    };

    if (isBrowser || !this.client) {
      const updated = updateInStorage<Wing>(STORAGE_KEYS.WINGS, wingId, data);
      if (!updated) throw new Error('Failed to update wing');
      return updated;
    }

    await this.collections[COLLECTIONS.WINGS].update({
      ids: [wingId],
      documents: [JSON.stringify(updatedWing)],
    });

    return updatedWing;
  }

  async deleteWing(wingId: string, deleteRoomFn: (roomId: string, deleteMemoryFn?: (memoryId: string) => Promise<void>) => Promise<void>, deleteMemoryFn?: (memoryId: string) => Promise<void>): Promise<void> {
    // 删除关联的 rooms
    const rooms = await this.getRoomsByWing(wingId);
    for (const room of rooms) {
      await deleteRoomFn(room.id, deleteMemoryFn);
    }

    if (isBrowser || !this.client) {
      deleteFromStorage<Wing>(STORAGE_KEYS.WINGS, wingId);
      return;
    }

    await this.collections[COLLECTIONS.WINGS].delete({
      ids: [wingId],
    });
  }

  private async getRoomsByWing(wingId: string): Promise<any[]> {
    if (isBrowser || !this.client) {
      const rooms = getFromStorage<any>(STORAGE_KEYS.ROOMS);
      return rooms.filter((room: any) => room.wingId === wingId);
    }

    const result = await this.collections[COLLECTIONS.ROOMS].get({
      where: { wingId },
    });

    return result.documents.map((doc: string) => JSON.parse(doc));
  }
}
