import React, { useRef } from 'react';
import type { LocalCapabilityStatus } from '../../../services/doubao-home/types';

interface LocalCapabilityCenterProps {
  status: LocalCapabilityStatus;
  hasMessages: boolean;
  onInspect: () => void;
  onImportFile: (file: File) => void;
  onExportSession: () => void;
  onClearSession: () => void;
  onDiagnostics: () => void;
  onOpenSettings: () => void;
}

const statusText = {
  unknown: '未检测',
  checking: '检测中',
  online: '在线',
  offline: '离线',
};

export const LocalCapabilityCenter: React.FC<LocalCapabilityCenterProps> = ({ status, hasMessages, onInspect, onImportFile, onExportSession, onClearSession, onDiagnostics, onOpenSettings }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <section className="mb-5 w-full max-w-[704px] rounded-[24px] border border-[#eeeeef] bg-white/95 p-4 shadow-[0_8px_28px_rgba(15,23,42,0.055)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[14px] font-semibold text-[#202124]">本地能力中心</div>
          <div className="mt-1 text-[12px] text-[#77777f]">基于豆包原生能力分层，扩展 Web 版本地模型、文件和诊断能力。</div>
        </div>
        <button type="button" onClick={onOpenSettings} className="rounded-2xl bg-[#f4f4f5] px-3 py-2 text-xs text-[#3f3f46] transition hover:bg-[#ececef]">配置 Ollama</button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <div className="rounded-2xl bg-[#f8f8f9] p-3">
          <div className="text-[11px] text-[#85858d]">Ollama</div>
          <div className="mt-1 text-sm font-semibold text-[#202124]">{statusText[status.ollama]}</div>
        </div>
        <div className="rounded-2xl bg-[#f8f8f9] p-3">
          <div className="text-[11px] text-[#85858d]">模型数量</div>
          <div className="mt-1 text-sm font-semibold text-[#202124]">{status.modelCount}</div>
        </div>
        <div className="rounded-2xl bg-[#f8f8f9] p-3 sm:col-span-2">
          <div className="text-[11px] text-[#85858d]">当前模型</div>
          <div className="mt-1 truncate text-sm font-semibold text-[#202124]">{status.activeModel}</div>
        </div>
      </div>

      {status.importedFileName ? <div className="mt-3 rounded-2xl bg-blue-50 px-3 py-2 text-xs text-blue-700">已导入文件：{status.importedFileName}（{Math.ceil((status.importedFileSize || 0) / 1024)} KB）</div> : null}

      <input ref={inputRef} type="file" className="hidden" accept=".txt,.md,.json,.csv,.log,.ts,.tsx,.js,.jsx,.css,.html,.xml,.yaml,.yml" onChange={(event) => { const file = event.target.files?.[0]; if (file) onImportFile(file); event.currentTarget.value = ''; }} />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={onInspect} className="rounded-2xl bg-[#2563eb] px-3 py-2 text-xs font-medium text-white shadow-[0_6px_16px_rgba(37,99,235,0.2)] transition hover:bg-[#1d4ed8]">检测本地模型</button>
        <button type="button" onClick={() => inputRef.current?.click()} className="rounded-2xl bg-[#f4f4f5] px-3 py-2 text-xs text-[#3f3f46] transition hover:bg-[#ececef]">导入本地文件</button>
        <button type="button" onClick={onDiagnostics} className="rounded-2xl bg-[#f4f4f5] px-3 py-2 text-xs text-[#3f3f46] transition hover:bg-[#ececef]">生成诊断建议</button>
        <button type="button" disabled={!hasMessages} onClick={onExportSession} className="rounded-2xl bg-[#f4f4f5] px-3 py-2 text-xs text-[#3f3f46] transition hover:bg-[#ececef] disabled:cursor-not-allowed disabled:opacity-45">导出会话</button>
        <button type="button" disabled={!hasMessages} onClick={onClearSession} className="rounded-2xl bg-red-50 px-3 py-2 text-xs text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-45">清空会话</button>
      </div>
    </section>
  );
};
