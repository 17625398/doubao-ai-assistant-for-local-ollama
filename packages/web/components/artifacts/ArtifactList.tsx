import React from 'react';
import type { WebArtifact } from '@/types';
import { getArtifactKindLabel } from '@/services/artifacts/artifactFormatting';

interface ArtifactListProps {
  groupedByOrigin: Array<[string, WebArtifact[]]>;
  selectedArtifact: WebArtifact | null;
  filteredCount: number;
  onSelect: (id: string) => void;
}

export const ArtifactList: React.FC<ArtifactListProps> = ({ groupedByOrigin, selectedArtifact, filteredCount, onSelect }) => {
  return (
    <div className="mt-3 min-h-0 flex-1 overflow-auto pr-1">
      {groupedByOrigin.map(([origin, group]) => (
        <section key={origin} className="mb-4">
          <h3 className="mb-2 truncate text-xs font-semibold uppercase tracking-wide text-slate-500">{origin}</h3>
          <div className="space-y-2">
            {group.map((artifact) => (
              <button
                key={artifact.id}
                type="button"
                onClick={() => onSelect(artifact.id)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  selectedArtifact?.id === artifact.id ? 'border-blue-400/60 bg-blue-500/15' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-violet-200">{getArtifactKindLabel(artifact.kind)}</span>
                  <span>{new Date(artifact.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="line-clamp-1 text-sm font-medium text-slate-100">{artifact.title || '未命名'}</div>
              </button>
            ))}
          </div>
        </section>
      ))}
      {filteredCount === 0 ? <div className="rounded-2xl bg-white/[0.03] p-4 text-center text-sm text-slate-500">暂无 Artifact</div> : null}
    </div>
  );
};
