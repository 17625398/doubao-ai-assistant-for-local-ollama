import React from 'react';

interface ArtifactImportPanelProps {
  importText: string;
  query: string;
  status: string;
  onImportTextChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onImport: () => void;
  onCopyJson: () => void;
  onClear: () => void;
}

export const ArtifactImportPanel: React.FC<ArtifactImportPanelProps> = ({
  importText,
  query,
  status,
  onImportTextChange,
  onQueryChange,
  onImport,
  onCopyJson,
  onClear,
}) => {
  return (
    <>
      <textarea
        value={importText}
        onChange={(event) => onImportTextChange(event.target.value)}
        placeholder="粘贴扩展侧导出的 Artifact JSON"
        className="h-28 resize-none rounded-2xl border border-white/10 bg-slate-900/80 p-3 text-xs text-slate-100 outline-none placeholder:text-slate-500"
      />
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" onClick={onImport} className="rounded-xl bg-blue-500 px-3 py-2 text-xs font-semibold text-white">
          导入
        </button>
        <button type="button" onClick={onCopyJson} className="rounded-xl bg-white/10 px-3 py-2 text-xs text-slate-200">
          复制 JSON
        </button>
        <button type="button" onClick={onClear} className="rounded-xl bg-red-500/15 px-3 py-2 text-xs text-red-200">
          清空
        </button>
      </div>
      {status ? <p className="mt-2 text-xs text-blue-200">{status}</p> : null}

      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="搜索标题、页面、来源、类型"
        className="mt-4 rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm outline-none placeholder:text-slate-500"
      />
    </>
  );
};
