// MemPalace 常量定义

import { MemPalaceConfig } from './types';

// 默认配置
export const DEFAULT_CONFIG: MemPalaceConfig = {
  storagePath: './.mempalace',
  embeddingModel: 'all-MiniLM-L6-v2',
  maxMemorySize: 10000,
  searchLimit: 10,
  searchThreshold: 0.7,
};

// 集合名称
export const COLLECTIONS = {
  WINGS: 'wings',
  ROOMS: 'rooms',
  HALLS: 'halls',
  MEMORIES: 'memories',
};

// localStorage 键名
export const STORAGE_KEYS = {
  WINGS: 'mempalace_wings',
  ROOMS: 'mempalace_rooms',
  HALLS: 'mempalace_halls',
  MEMORIES: 'mempalace_memories',
};

// 检查是否在浏览器环境中
export const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
