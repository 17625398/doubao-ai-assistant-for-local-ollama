import React from 'react';
import type { WebArtifact } from '@/types';
import { getArtifactDetail, getArtifactKindLabel } from '@/services/artifacts/artifactFormatting';

interface ArtifactDetailProps {
  artifact: WebArtifact | null;
  onCopy: () => void;
}

export const ArtifactDetail: React.FC<ArtifactDetailProps> = ({ artifact, onCopy }) => {
  if (!artifact) {
    return <div className="flex h-full items-center justify-center text-slate-500">导入扩展 Artifact JSON 后查看详情</div>;
  }

  return (
    <article>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="rounded-full bg-violet-500/15 px-2 py-1 text-violet-200">{getArtifactKindLabel(artifact.kind)}</span>
            <span>{new Date(artifact.createdAt).toLocaleString()}</span>
          </div>
          <h2 className="text-2xl font-semibold text-white">{artifact.title || '未命名 Artifact'}</h2>
        </div>
        <button type="button" onClick={onCopy} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-100">
          复制内容
        </button>
      </div>
      <pre className="whitespace-pre-wrap rounded-3xl border border-white/10 bg-slate-900/80 p-5 text-sm leading-7 text-slate-200">{getArtifactDetail(artifact)}</pre>
    </article>
  );
};
