/**
 * Seafile 私有云盘客户端
 * 支持通过 Repo Token 访问 Seafile 仓库
 */

import { logger } from './logger';

export interface SeafileConfig {
  serverUrl: string;
  repoToken: string;
}

export interface SeafileItem {
  type: 'file' | 'dir';
  name: string;
  path: string;
  size?: number;
  mtime?: number;
  id?: string;
}

export class SeafileClient {
  private config: SeafileConfig;

  constructor(config: SeafileConfig) {
    this.config = config;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SeafileConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * 构建 API URL
   */
  private buildUrl(endpoint: string): string {
    const baseUrl = this.config.serverUrl.replace(/\/$/, '');
    return `${baseUrl}${endpoint}`;
  }

  /**
   * 获取请求头
   */
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Token ${this.config.repoToken}`,
      'Accept': 'application/json',
    };
  }

  /**
   * 列出目录内容
   */
  async listDir(path: string = '/', recursive: boolean = false): Promise<SeafileItem[]> {
    try {
      const params = new URLSearchParams();
      params.append('path', path);
      if (recursive) {
        params.append('recursive', '1');
      }

      const url = this.buildUrl(`/api/v2.1/via-repo-token/dir/?${params.toString()}`);
      logger.info('[Seafile] Listing directory:', path);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to list directory: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // 转换数据格式
      const items: SeafileItem[] = [];
      
      if (data.dirent_list) {
        for (const item of data.dirent_list) {
          items.push({
            type: item.type === 'dir' ? 'dir' : 'file',
            name: item.name,
            path: item.path || `${path}/${item.name}`.replace(/\/+/g, '/'),
            size: item.size,
            mtime: item.mtime,
            id: item.id,
          });
        }
      }

      logger.info('[Seafile] Found', items.length, 'items');
      return items;
    } catch (error) {
      logger.error('[Seafile] Error listing directory:', error);
      throw error;
    }
  }

  /**
   * 获取文件下载链接
   */
  async getFileDownloadLink(path: string): Promise<string> {
    try {
      const params = new URLSearchParams();
      params.append('path', path);

      const url = this.buildUrl(`/api/v2.1/via-repo-token/file/?${params.toString()}`);
      logger.info('[Seafile] Getting download link for:', path);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get download link: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      logger.error('[Seafile] Error getting download link:', error);
      throw error;
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(path: string): Promise<Blob> {
    try {
      const downloadUrl = await this.getFileDownloadLink(path);
      logger.info('[Seafile] Downloading file from:', downloadUrl);

      const response = await fetch(downloadUrl, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      logger.error('[Seafile] Error downloading file:', error);
      throw error;
    }
  }

  /**
   * 获取文件内容（文本文件）
   */
  async getFileContent(path: string): Promise<string> {
    try {
      const blob = await this.downloadFile(path);
      return await blob.text();
    } catch (error) {
      logger.error('[Seafile] Error getting file content:', error);
      throw error;
    }
  }

  /**
   * 获取上传链接
   */
  async getUploadLink(path: string = '/'): Promise<{ uploadUrl: string; parentDir: string }> {
    try {
      const params = new URLSearchParams();
      params.append('path', path);

      const url = this.buildUrl(`/api/v2.1/via-repo-token/upload-link/?${params.toString()}`);
      logger.info('[Seafile] Getting upload link for:', path);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get upload link: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return {
        uploadUrl: data.url,
        parentDir: path,
      };
    } catch (error) {
      logger.error('[Seafile] Error getting upload link:', error);
      throw error;
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(file: File, path: string = '/'): Promise<void> {
    try {
      const { uploadUrl, parentDir } = await this.getUploadLink(path);
      logger.info('[Seafile] Uploading file to:', parentDir);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('parent_dir', parentDir);
      formData.append('replace', '1');

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload file: ${response.status} - ${errorText}`);
      }

      logger.info('[Seafile] File uploaded successfully');
    } catch (error) {
      logger.error('[Seafile] Error uploading file:', error);
      throw error;
    }
  }

  /**
   * 创建目录
   */
  async createDir(path: string): Promise<void> {
    try {
      const url = this.buildUrl('/api/v2.1/via-repo-token/dir/');
      logger.info('[Seafile] Creating directory:', path);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create directory: ${response.status} - ${errorText}`);
      }

      logger.info('[Seafile] Directory created successfully');
    } catch (error) {
      logger.error('[Seafile] Error creating directory:', error);
      throw error;
    }
  }

  /**
   * 删除文件或目录
   */
  async deleteItem(path: string): Promise<void> {
    try {
      const params = new URLSearchParams();
      params.append('path', path);

      const url = this.buildUrl(`/api/v2.1/via-repo-token/dir/?${params.toString()}`);
      logger.info('[Seafile] Deleting item:', path);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete item: ${response.status} - ${errorText}`);
      }

      logger.info('[Seafile] Item deleted successfully');
    } catch (error) {
      logger.error('[Seafile] Error deleting item:', error);
      throw error;
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listDir('/');
      return true;
    } catch (error) {
      logger.error('[Seafile] Connection test failed:', error);
      return false;
    }
  }
}

// 单例实例
let seafileClient: SeafileClient | null = null;

export function getSeafileClient(config?: SeafileConfig): SeafileClient {
  if (!seafileClient && config) {
    seafileClient = new SeafileClient(config);
  } else if (seafileClient && config) {
    seafileClient.updateConfig(config);
  }
  
  if (!seafileClient) {
    throw new Error('Seafile client not initialized');
  }
  
  return seafileClient;
}

export function resetSeafileClient(): void {
  seafileClient = null;
}
