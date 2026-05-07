import type { WebArtifact } from '@/types';

const STORAGE_KEY = 'doubao-web-artifacts';

function isArtifact(value: unknown): value is WebArtifact {
  const artifact = value as Partial<WebArtifact>;
  return Boolean(artifact && typeof artifact.id === 'string' && typeof artifact.kind === 'string' && typeof artifact.createdAt === 'number');
}

export function parseArtifactImport(text: string): WebArtifact[] {
  const parsed = JSON.parse(text) as { records?: WebArtifact[] } | WebArtifact[];
  const artifacts = Array.isArray(parsed) ? parsed : parsed.records;
  if (!Array.isArray(artifacts)) {
    throw new Error('JSON 中没有 records 数组');
  }
  return artifacts.filter(isArtifact);
}

export function loadWebArtifacts(): WebArtifact[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WebArtifact[];
    return Array.isArray(parsed) ? parsed.filter(isArtifact) : [];
  } catch {
    return [];
  }
}

export function saveWebArtifacts(artifacts: WebArtifact[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(artifacts.slice(0, 500)));
}

export function mergeWebArtifacts(current: WebArtifact[], incoming: WebArtifact[]): WebArtifact[] {
  const map = new Map<string, WebArtifact>();
  for (const artifact of [...incoming, ...current]) {
    map.set(artifact.id, artifact);
  }
  return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function exportWebArtifacts(artifacts: WebArtifact[]): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), records: artifacts }, null, 2);
}
