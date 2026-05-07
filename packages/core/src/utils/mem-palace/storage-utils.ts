// MemPalace 存储工具函数

import { safeLocalStorage } from '../context-engineering/storage-helper';

// 从 localStorage 获取数据
export const getFromStorage = <T>(key: string): T[] => {
  try {
    const data = safeLocalStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// 保存数据到 localStorage
export const saveToStorage = (key: string, data: any[]): void => {
  try {
    safeLocalStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// 根据 ID 从 localStorage 获取数据
export const getFromStorageById = <T extends { id: string }>(key: string, id: string): T | null => {
  const items = getFromStorage<T>(key);
  return items.find(item => item.id === id) || null;
};

// 更新 localStorage 中的数据
export const updateInStorage = <T extends { id: string }>(key: string, id: string, update: Partial<T>): T | null => {
  const items = getFromStorage<T>(key);
  const index = items.findIndex(item => item.id === id);
  if (index === -1) return null;
  
  items[index] = { ...items[index], ...update, updatedAt: Date.now() };
  saveToStorage(key, items);
  return items[index];
};

// 从 localStorage 删除数据
export const deleteFromStorage = <T extends { id: string }>(key: string, id: string): void => {
  const items = getFromStorage<T>(key);
  const filteredItems = items.filter(item => item.id !== id);
  saveToStorage(key, filteredItems);
};

// 添加数据到 localStorage
export const addToStorage = <T>(key: string, item: T): void => {
  const items = getFromStorage<T>(key);
  items.push(item);
  saveToStorage(key, items);
};
