// MemPalace 类型定义

// 记忆宫殿结构
export interface Wing {
  id: string;
  name: string; // 人物或项目名称
  description?: string;
  createdAt: number;
  updatedAt: number;
  roomIds: string[];
}

export interface Room {
  id: string;
  wingId: string;
  name: string; // 具体主题
  description?: string;
  createdAt: number;
  updatedAt: number;
  memoryIds: string[];
}

export interface Hall {
  id: string;
  name: string; // 记忆类型：facts, events, discoveries等
  description?: string;
  createdAt: number;
  memoryIds: string[];
}

export type MemoryType =
  | 'conversation'
  | 'session-summary'
  | 'profile'
  | 'document-summary'
  | 'skill-draft';

export type DraftCategory =
  | 'creative'
  | 'code'
  | 'analysis';

export interface MemoryMetadata {
  role: 'user' | 'assistant';
  timestamp: number;
  sessionId?: string;
  provider?: string;
  model?: string;
  memoryType?: MemoryType;
  documentTitle?: string;
  draftTitle?: string;
  draftCategory?: DraftCategory;
  analysisTool?: string;
  source?: string;
  sourceDocumentHash?: string;
  summaryScope?: 'session' | 'document' | 'profile';
  [key: string]: any;
}

export interface Memory {
  id: string;
  wingId: string;
  roomId: string;
  hallId: string;
  content: string; // 原始对话内容
  metadata: MemoryMetadata;
  embedding?: number[]; // 向量嵌入
  createdAt: number;
  updatedAt: number;
}

export interface ConversationMemoryInput {
  content: string;
  model?: string;
  provider?: string;
  sessionId?: string;
  wingName?: string;
  wingDescription?: string;
  roomName?: string;
  roomDescription?: string;
  hallName?: string;
  hallDescription?: string;
  memoryType?: MemoryType;
  metadata?: Record<string, any>;
}

// 记忆检索结果
export interface MemorySearchResult {
  memory: Memory;
  score: number;
  wing?: Wing;
  room?: Room;
  hall?: Hall;
}

// 记忆宫殿配置
export interface MemPalaceConfig {
  storagePath: string;
  embeddingModel?: string;
  maxMemorySize?: number;
  searchLimit?: number;
  searchThreshold?: number;
}

// 记忆宫殿服务接口
export interface IMemPalaceService {
  // 初始化
  initialize(): Promise<void>;
  
  // Wing 操作
  createWing(name: string, description?: string): Promise<Wing>;
  getWingByName(name: string): Promise<Wing | null>;
  getOrCreateWing(name: string, description?: string): Promise<Wing>;
  getWing(wingId: string): Promise<Wing | null>;
  getWings(): Promise<Wing[]>;
  updateWing(wingId: string, data: Partial<Wing>): Promise<Wing>;
  deleteWing(wingId: string): Promise<void>;
  
  // Room 操作
  createRoom(wingId: string, name: string, description?: string): Promise<Room>;
  getRoomByName(wingId: string, name: string): Promise<Room | null>;
  getOrCreateRoom(wingId: string, name: string, description?: string): Promise<Room>;
  getRoom(roomId: string): Promise<Room | null>;
  getRoomsByWing(wingId: string): Promise<Room[]>;
  updateRoom(roomId: string, data: Partial<Room>): Promise<Room>;
  deleteRoom(roomId: string): Promise<void>;
  
  // Hall 操作
  createHall(name: string, description?: string): Promise<Hall>;
  getHallByName(name: string): Promise<Hall | null>;
  getOrCreateHall(name: string, description?: string): Promise<Hall>;
  getHall(hallId: string): Promise<Hall | null>;
  getHalls(): Promise<Hall[]>;
  
  // Memory 操作
  addMemory(wingId: string, roomId: string, hallId: string, content: string, metadata: Memory['metadata']): Promise<Memory>;
  addConversationMemory(input: ConversationMemoryInput): Promise<Memory>;
  getMemory(memoryId: string): Promise<Memory | null>;
  getMemoriesByRoom(roomId: string): Promise<Memory[]>;
  getMemoriesByWing(wingId: string): Promise<Memory[]>;
  deleteMemory(memoryId: string): Promise<void>;
  
  // 搜索操作
  searchMemories(query: string, limit?: number, threshold?: number): Promise<MemorySearchResult[]>;
  searchMemoriesByWing(wingId: string, query: string, limit?: number, threshold?: number): Promise<MemorySearchResult[]>;
  searchMemoriesByRoom(roomId: string, query: string, limit?: number, threshold?: number): Promise<MemorySearchResult[]>;
  
  // 批量操作
  batchAddMemories(memories: Omit<Memory, 'id' | 'createdAt' | 'updatedAt' | 'embedding'>[]): Promise<Memory[]>;
  
  // 清理操作
  clearAll(): Promise<void>;
  close(): Promise<void>;
}
