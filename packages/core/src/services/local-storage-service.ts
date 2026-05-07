export class LocalStorageService {
  private readonly STORAGE_PREFIX = 'ai_analysis_';
  private isBrowser: boolean;

  constructor() {
    this.isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  /**
   * 存储数据到本地存储
   * @param key 存储键
   * @param value 存储值
   */
  set<T>(key: string, value: T): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      const fullKey = this.getFullKey(key);
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(fullKey, serializedValue);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  /**
   * 从本地存储获取数据
   * @param key 存储键
   * @param defaultValue 默认值
   * @returns 存储的数据或默认值
   */
  get<T>(key: string, defaultValue: T): T {
    if (!this.isBrowser) {
      return defaultValue;
    }
    try {
      const fullKey = this.getFullKey(key);
      const serializedValue = localStorage.getItem(fullKey);
      if (serializedValue === null) {
        return defaultValue;
      }
      return JSON.parse(serializedValue) as T;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  }

  /**
   * 从本地存储删除数据
   * @param key 存储键
   */
  remove(key: string): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      const fullKey = this.getFullKey(key);
      localStorage.removeItem(fullKey);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }

  /**
   * 清空所有本地存储数据
   */
  clear(): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.STORAGE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  /**
   * 获取所有存储的键
   * @returns 存储键列表
   */
  getKeys(): string[] {
    if (!this.isBrowser) {
      return [];
    }
    try {
      const keys = Object.keys(localStorage);
      return keys
        .filter(key => key.startsWith(this.STORAGE_PREFIX))
        .map(key => key.replace(this.STORAGE_PREFIX, ''));
    } catch (error) {
      console.error('Error getting keys from localStorage:', error);
      return [];
    }
  }

  /**
   * 检查存储是否存在
   * @param key 存储键
   * @returns 是否存在
   */
  has(key: string): boolean {
    if (!this.isBrowser) {
      return false;
    }
    try {
      const fullKey = this.getFullKey(key);
      return localStorage.getItem(fullKey) !== null;
    } catch (error) {
      console.error('Error checking localStorage:', error);
      return false;
    }
  }

  /**
   * 获取带前缀的完整键
   * @param key 原始键
   * @returns 带前缀的完整键
   */
  private getFullKey(key: string): string {
    return `${this.STORAGE_PREFIX}${key}`;
  }

  /**
   * 存储分析结果
   * @param id 分析ID
   * @param result 分析结果
   */
  storeAnalysisResult(id: string, result: any): void {
    this.set(`analysis_${id}`, {
      result,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 获取分析结果
   * @param id 分析ID
   * @returns 分析结果
   */
  getAnalysisResult(id: string): any {
    return this.get(`analysis_${id}`, null);
  }

  /**
   * 存储提取的网页内容
   * @param url 网页URL
   * @param content 提取的内容
   */
  storeExtractedContent(url: string, content: any): void {
    const key = `extracted_${this.hashUrl(url)}`;
    this.set(key, {
      url,
      content,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 获取提取的网页内容
   * @param url 网页URL
   * @returns 提取的内容
   */
  getExtractedContent(url: string): any {
    const key = `extracted_${this.hashUrl(url)}`;
    return this.get(key, null);
  }

  /**
   * 对URL进行哈希处理
   * @param url 网页URL
   * @returns 哈希值
   */
  private hashUrl(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}
