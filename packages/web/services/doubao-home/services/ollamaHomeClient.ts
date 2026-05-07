import type { DoubaoHomeMessage, OllamaSettings } from '../types';

export const OLLAMA_SETTINGS_STORAGE_KEY = 'doubao-home-ollama-settings';

export const defaultOllamaSettings: OllamaSettings = {
  baseUrl: '/api/ollama',
  model: 'gemma4:e4b',
  endpointMode: 'proxy',
};

export function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeBaseUrl(baseUrl: string | undefined): string {
  const value = baseUrl?.trim() || defaultOllamaSettings.baseUrl;
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function isProxyBaseUrl(baseUrl: string): boolean {
  return normalizeBaseUrl(baseUrl).startsWith('/api/ollama');
}

export function buildProxyUrl(path: string): string {
  return `/api/ollama${path.startsWith('/api/') ? path : `/api${path.startsWith('/') ? path : `/${path}`}`}`;
}

export function buildOllamaHeaders(settings: OllamaSettings): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!isProxyBaseUrl(settings.baseUrl)) {
    headers['x-doubao-ollama-upstream'] = normalizeBaseUrl(settings.baseUrl);
  }
  return headers;
}

export function loadOllamaSettings(): OllamaSettings {
  if (typeof window === 'undefined') return defaultOllamaSettings;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(OLLAMA_SETTINGS_STORAGE_KEY) || '{}') as Partial<OllamaSettings>;
    return { ...defaultOllamaSettings, ...parsed, baseUrl: normalizeBaseUrl(parsed.baseUrl || defaultOllamaSettings.baseUrl) };
  } catch {
    return defaultOllamaSettings;
  }
}

export function saveOllamaSettings(settings: OllamaSettings): OllamaSettings {
  const next = {
    ...settings,
    baseUrl: normalizeBaseUrl(settings.baseUrl),
    model: settings.model?.trim() || defaultOllamaSettings.model,
    endpointMode: isProxyBaseUrl(settings.baseUrl) ? 'proxy' : 'upstream',
  } satisfies OllamaSettings;
  window.localStorage.setItem(OLLAMA_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export interface OllamaModelInfo {
  name: string;
  model: string;
  size?: number;
  digest?: string;
  modified_at?: string;
  details?: {
    parameter_size?: string;
    quantization_level?: string;
    family?: string;
  };
}

export async function testOllamaConnection(settings: OllamaSettings): Promise<{ count: number; firstModel?: string; models: OllamaModelInfo[] }> {
  const response = await fetch(buildProxyUrl('/api/tags'), {
    headers: buildOllamaHeaders(settings),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text().catch(() => '')}`);
  const data = await response.json();
  const models: OllamaModelInfo[] = Array.isArray(data?.models) ? data.models : [];
  return {
    count: models.length,
    firstModel: models[0]?.name,
    models,
  };
}

export async function fetchOllamaModels(settings: OllamaSettings): Promise<OllamaModelInfo[]> {
  const response = await fetch(buildProxyUrl('/api/tags'), {
    headers: buildOllamaHeaders(settings),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return Array.isArray(data?.models) ? data.models : [];
}

export async function sendOllamaChat(settings: OllamaSettings, messages: DoubaoHomeMessage[]): Promise<string> {
  const response = await fetch(buildProxyUrl('/api/chat'), {
    method: 'POST',
    headers: buildOllamaHeaders(settings),
    body: JSON.stringify({
      model: settings.model,
      stream: false,
      messages: [
        { role: 'system', content: '你是豆包风格的中文 AI 助手，回答清晰、自然、可执行。' },
        ...messages.map((message) => ({ role: message.role, content: message.content })),
      ],
      options: { temperature: 0.7, top_p: 0.9 },
    }),
  });
  if (!response.ok) throw new Error(await response.text().catch(() => `HTTP ${response.status}`));
  const data = await response.json();
  return String(data?.message?.content || data?.response || '模型返回为空。');
}
