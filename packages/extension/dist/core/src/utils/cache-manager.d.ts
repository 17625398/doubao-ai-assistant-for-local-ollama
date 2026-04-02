import { DocumentParseResult } from '../types/document';
/**
 * 缓存项
 */
export interface CacheItem {
    key: string;
    value: DocumentParseResult;
    timestamp: number;
    expiry: number;
}
/**
 * 缓存配置
 */
export interface CacheConfig {
    maxSize: number;
    defaultExpiry: number;
    cleanupInterval: number;
}
/**
 * 缓存管理器
 */
export declare class CacheManager {
    private cache;
    private config;
    private cleanupTimer;
    constructor(config?: Partial<CacheConfig>);
    /**
     * 启动清理定时器
     */
    private startCleanupTimer;
    /**
     * 停止清理定时器
     */
    stop(): void;
    /**
     * 生成缓存键
     */
    generateKey(file: File | string | ArrayBuffer): string;
    /**
     * 计算 ArrayBuffer 的哈希值
     */
    private calculateHash;
    /**
     * 设置缓存
     */
    set(key: string, value: DocumentParseResult, expiry?: number): void;
    /**
     * 获取缓存
     */
    get(key: string): DocumentParseResult | null;
    /**
     * 删除缓存
     */
    delete(key: string): void;
    /**
     * 清空缓存
     */
    clear(): void;
    /**
     * 获取缓存大小
     */
    size(): number;
    /**
     * 清理过期项
     */
    cleanup(): void;
    /**
     * 移除最旧的项
     */
    private evictOldest;
}
/**
 * 全局缓存管理器实例
 */
export declare const cacheManager: CacheManager;
export default CacheManager;
