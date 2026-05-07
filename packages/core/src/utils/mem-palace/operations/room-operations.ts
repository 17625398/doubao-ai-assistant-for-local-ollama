// Room 操作模块

import { v4 as uuidv4 } from 'uuid';
import { Room } from '../types';
import { STORAGE_KEYS, COLLECTIONS, isBrowser } from '../constants';
import { getFromStorage, getFromStorageById, updateInStorage, deleteFromStorage, saveToStorage } from '../storage-utils';

export class RoomOperations {
  constructor(
    private client: any | null,
    private collections: { [key: string]: any },
    private isSameName: (left: string, right: string) => boolean,
    private getWing: (wingId: string) => Promise<any | null>,
    private updateWing: (wingId: string, data: any) => Promise<any>
  ) {}

  async createRoom(wingId: string, name: string, description?: string): Promise<Room> {
    const room: Room = {
      id: uuidv4(),
      wingId,
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      memoryIds: [],
    };

    if (isBrowser || !this.client) {
      const rooms = getFromStorage<Room>(STORAGE_KEYS.ROOMS);
      rooms.push(room);
      saveToStorage(STORAGE_KEYS.ROOMS, rooms);
      
      const wing = await this.getWing(wingId);
      if (wing) {
        await this.updateWing(wingId, {
          roomIds: [...(wing.roomIds || []), room.id],
        });
      }
      
      return room;
    }

    await this.collections[COLLECTIONS.ROOMS].add({
      ids: [room.id],
      documents: [JSON.stringify(room)],
      metadatas: [{ type: 'room', wingId }],
    });

    const wing = await this.getWing(wingId);
    if (wing) {
      await this.updateWing(wingId, {
        roomIds: [...(wing.roomIds || []), room.id],
      });
    }

    return room;
  }

  async getRoomByName(wingId: string, name: string): Promise<Room | null> {
    const rooms = await this.getRoomsByWing(wingId);
    return rooms.find((room) => this.isSameName(room.name, name)) ?? null;
  }

  async getOrCreateRoom(wingId: string, name: string, description?: string): Promise<Room> {
    const existingRoom = await this.getRoomByName(wingId, name);
    if (existingRoom) {
      return existingRoom;
    }
    return this.createRoom(wingId, name, description);
  }

  async getRoom(roomId: string): Promise<Room | null> {
    if (isBrowser || !this.client) {
      return getFromStorageById<Room>(STORAGE_KEYS.ROOMS, roomId);
    }

    const result = await this.collections[COLLECTIONS.ROOMS].get({
      ids: [roomId],
    });

    if (result.documents.length === 0) return null;
    return JSON.parse(result.documents[0]);
  }

  async getRoomsByWing(wingId: string): Promise<Room[]> {
    if (isBrowser || !this.client) {
      const rooms = getFromStorage<Room>(STORAGE_KEYS.ROOMS);
      return rooms.filter(room => room.wingId === wingId);
    }

    const result = await this.collections[COLLECTIONS.ROOMS].get({
      where: { wingId },
    });

    return result.documents.map((doc: string) => JSON.parse(doc));
  }

  async updateRoom(roomId: string, data: Partial<Room>): Promise<Room> {
    const room = await this.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const updatedRoom = {
      ...room,
      ...data,
      updatedAt: Date.now(),
    };

    if (isBrowser || !this.client) {
      const updated = updateInStorage<Room>(STORAGE_KEYS.ROOMS, roomId, data);
      if (!updated) throw new Error('Failed to update room');
      return updated;
    }

    await this.collections[COLLECTIONS.ROOMS].update({
      ids: [roomId],
      documents: [JSON.stringify(updatedRoom)],
    });

    return updatedRoom;
  }

  async deleteRoom(roomId: string, deleteMemoryFn?: (memoryId: string) => Promise<void>): Promise<void> {
    const room = await this.getRoom(roomId);
    if (!room) return;

    // 删除关联的 memories
    if (deleteMemoryFn) {
      for (const memoryId of room.memoryIds) {
        await deleteMemoryFn(memoryId);
      }
    }

    if (isBrowser || !this.client) {
      deleteFromStorage<Room>(STORAGE_KEYS.ROOMS, roomId);
    } else {
      await this.collections[COLLECTIONS.ROOMS].delete({
        ids: [roomId],
      });
    }

    // 更新 wing 的 roomIds
    const wing = await this.getWing(room.wingId);
    if (wing) {
      await this.updateWing(room.wingId, {
        roomIds: wing.roomIds.filter((id: string) => id !== roomId),
      });
    }
  }
}
