'use client';

import React, { useMemo, useState } from 'react';
import { getArtifactDetail } from '@/services/artifacts/artifactFormatting';
import type { WebArtifact } from '@/types';
import {
  exportWebArtifacts,
  loadWebArtifacts,
  mergeWebArtifacts,
  parseArtifactImport,
  saveWebArtifacts,
} from '@/services/artifacts/artifactStorage';
import { ArtifactDetail } from './ArtifactDetail';
import { ArtifactImportPanel } from './ArtifactImportPanel';
import { ArtifactList } from './ArtifactList';

export const ArtifactWorkbench: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [artifacts, setArtifacts] = useState<WebArtifact[]>(() => loadWebArtifacts());
  const [selectedId, setSelectedId] = useState<string | null>(artifacts[0]?.id ?? null);
  const [importText, setImportText] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  const filteredArtifacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return artifacts;
    return artifacts.filter((artifact) =>
      [artifact.title, artifact.kind]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [query, artifacts]);

  const selectedArtifact = useMemo(
    () => artifacts.find((artifact) => artifact.id === selectedId) || filteredArtifacts[0] || null,
    [filteredArtifacts, artifacts, selectedId],
  );

  const groupedByOrigin = useMemo(() => {
    const groups = new Map<string, WebArtifact[]>();
    for (const artifact of filteredArtifacts) {
      const key = 'default';
      groups.set(key, [...(groups.get(key) || []), artifact]);
    }
    return Array.from(groups.entries());
  }, [filteredArtifacts]);

  const importArtifacts = (): void => {
    try {
      const incoming = parseArtifactImport(importText);
      const next = mergeWebArtifacts(artifacts, incoming);
      setArtifacts(next);
      saveWebArtifacts(next);
      setSelectedId(incoming[0]?.id || next[0]?.id || null);
      setStatus(`已导入 ${incoming.length} 条 Artifact`);
      setImportText('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const clearArtifacts = (): void => {
    setArtifacts([]);
    saveWebArtifacts([]);
    setSelectedId(null);
    setStatus('已清空 Web Artifact 历史');
  };

  const copyJson = async (): Promise<void> => {
    await navigator.clipboard.writeText(exportWebArtifacts(artifacts));
    setStatus('已复制 JSON 到剪贴板');
  };

  const copySelectedMarkdown = async (): Promise<void> => {
    if (!selectedArtifact) return;
    await navigator.clipboard.writeText(getArtifactDetail(selectedArtifact));
    setStatus('已复制当前 Artifact 内容');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-5 right-5 z-50 rounded-full border border-white/15 bg-slate-950/90 px-4 py-3 text-sm font-medium text-slate-100 shadow-2xl shadow-blue-950/40 backdrop-blur hover:bg-slate-900"
      >
        Artifact 工作台
      </button>

      {isOpen ? (
        <aside className="fixed bottom-20 right-5 z-50 flex h-[min(760px,calc(100vh-7rem))] w-[min(1080px,calc(100vw-2.5rem))] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 text-slate-100 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="flex w-[360px] flex-col border-r border-white/10 bg-white/[0.03] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Extension Artifact</h2>
                <p className="text-xs text-slate-400">从扩展侧边栏复制 JSON 后粘贴导入</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                关闭
              </button>
            </div>

            <ArtifactImportPanel
              importText={importText}
              query={query}
              status={status}
              onImportTextChange={setImportText}
              onQueryChange={setQuery}
              onImport={importArtifacts}
              onCopyJson={() => void copyJson()}
              onClear={clearArtifacts}
            />
            <ArtifactList groupedByOrigin={groupedByOrigin} selectedArtifact={selectedArtifact} filteredCount={filteredArtifacts.length} onSelect={setSelectedId} />
          </div>

          <main className="min-w-0 flex-1 overflow-auto p-6">
            <ArtifactDetail artifact={selectedArtifact} onCopy={() => void copySelectedMarkdown()} />
          </main>
        </aside>
      ) : null}
    </>
  );
};
