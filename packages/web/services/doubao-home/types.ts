import type { MultimodalAttachment } from './utils/multimodal';

export type DoubaoHomeMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: MultimodalAttachment[];  // 用户消息可携带多模态附件
};

export type OllamaEndpointMode = 'proxy' | 'upstream';

export type OllamaSettings = {
  baseUrl: string;
  model: string;
  endpointMode?: OllamaEndpointMode;
};

export type LocalCapabilityStatus = {
  ollama: 'unknown' | 'checking' | 'online' | 'offline';
  modelCount: number;
  activeModel: string;
  importedFileName?: string;
  importedFileSize?: number;
  lastExportedAt?: string;
};
