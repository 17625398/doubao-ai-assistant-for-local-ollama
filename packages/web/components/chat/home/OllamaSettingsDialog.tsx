import React, { useEffect, useState, useCallback } from 'react';
import type { OllamaSettings } from '../../../services/doubao-home/types';
import { fetchOllamaModels, type OllamaModelInfo } from '../../../services/doubao-home/services/ollamaHomeClient';

interface OllamaSettingsDialogProps {
  open: boolean;
  settings: OllamaSettings;
  draft: OllamaSettings;
  onDraftChange: (draft: OllamaSettings) => void;
  onClose: () => void;
  onTest: () => void;
  onSave: () => void;
}

export const OllamaSettingsDialog: React.FC<OllamaSettingsDialogProps> = ({ open, settings, draft, onDraftChange, onClose, onTest, onSave }) => {
  const [models, setModels] = useState<OllamaModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState('');

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    setModelError('');
    try {
      const list = await fetchOllamaModels(draft);
      setModels(list);
      // 如果当前模型不在列表中且列表不为空，默认选中第一个
      if (list.length > 0 && !list.find(m => m.name === draft.model)) {
        onDraftChange({ ...draft, model: list[0].name });
      }
    } catch (err) {
      setModelError(err instanceof Error ? err.message : '获取模型列表失败');
    } finally {
      setLoadingModels(false);
    }
  }, [draft, onDraftChange]);

  // 打开对话框时自动加载模型列表
  useEffect(() => {
    if (open) {
      loadModels();
    }
  }, [open, loadModels]);

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  // 格式化模型大小
  const formatModelSize = (bytes?: number): string => {
    if (!bytes) return '';
    const gb = bytes / 1024 / 1024 / 1024;
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(0)} MB`;
  };

  return (
    <>
      {/* 遮罩层 - 仅覆盖主内容区，不覆盖侧边栏 */}
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px] transition-opacity duration-300"
        style={{ left: 'var(--sidebar-width, 240px)' }}
        onClick={onClose}
      />

      {/* 右侧面板 */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[400px] max-w-[90vw] bg-white dark:bg-[#1e2634] shadow-[-8px_0_40px_rgba(0,0,0,0.12)] border-l border-[var(--border-light)] flex flex-col animate-slide-in-right">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-orange)] to-[var(--brand-orange-dark)] shadow-md shadow-[var(--brand-orange)]/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">本地 Ollama 配置</h2>
              <p className="text-[11px] text-[var(--text-tertiary)]">管理模型和连接设置</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区 - 可滚动 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* 当前配置信息 */}
          <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
            <div className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">当前生效配置</div>
            <div className="flex items-center gap-2 text-[13px] text-[var(--text-primary)]">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
              <span className="font-mono text-[12px]">{settings.baseUrl}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[13px] text-[var(--text-primary)]">
              <span className="flex h-2 w-2 rounded-full bg-[var(--brand-orange)]" />
              <span className="font-medium">{settings.model}</span>
            </div>
          </div>

          {/* Ollama 端点 */}
          <div>
            <label className="text-[12px] font-medium text-[var(--text-secondary)]">Ollama 端点</label>
            <input
              value={draft.baseUrl}
              onChange={(event) => onDraftChange({ ...draft, baseUrl: event.target.value })}
              placeholder="/api/ollama 或 http://localhost:11434"
              className="mt-2 h-10 w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 text-[13px] text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange)]/10"
            />
            <p className="mt-1.5 text-[11px] text-[var(--text-tertiary)]">默认走 /api/ollama 代理；填写本地或局域网地址时也会由服务端代理转发。</p>
          </div>

          {/* 模型选择区域 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] font-medium text-[var(--text-secondary)]">模型选择</label>
              <button
                type="button"
                onClick={loadModels}
                disabled={loadingModels}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-[var(--brand-orange)] hover:bg-[var(--brand-orange)]/10 transition disabled:opacity-50"
              >
                {loadingModels ? (
                  <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                )}
                刷新列表
              </button>
            </div>

            {modelError && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 px-3 py-2 text-[11px] text-red-600 dark:text-red-400">
                {modelError}
              </div>
            )}

            {models.length > 0 ? (
              <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)] overflow-hidden">
                {models.map((model) => {
                  const isSelected = draft.model === model.name;
                  return (
                    <button
                      key={model.name}
                      type="button"
                      onClick={() => onDraftChange({ ...draft, model: model.name })}
                      className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-all ${
                        isSelected
                          ? 'bg-[var(--brand-orange)]/5 border-l-2 border-l-[var(--brand-orange)]'
                          : 'hover:bg-[var(--bg-secondary)] border-l-2 border-l-transparent'
                      }`}
                    >
                      {/* 选中指示 */}
                      <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
                        isSelected ? 'border-[var(--brand-orange)] bg-[var(--brand-orange)]' : 'border-[var(--border-medium)]'
                      }`}>
                        {isSelected && (
                          <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>

                      {/* 模型信息 */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[13px] font-medium truncate ${isSelected ? 'text-[var(--brand-orange)]' : 'text-[var(--text-primary)]'}`}>
                            {model.name}
                          </span>
                          {model.details?.parameter_size && (
                            <span className="shrink-0 rounded-full bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[10px] text-[var(--text-tertiary)]">
                              {model.details.parameter_size}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                          {model.size && <span>{formatModelSize(model.size)}</span>}
                          {model.details?.quantization_level && (
                            <span className="text-amber-500">{model.details.quantization_level}</span>
                          )}
                          {model.details?.family && <span>· {model.details.family}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : !loadingModels && !modelError ? (
              <div className="rounded-2xl border border-dashed border-[var(--border-light)] bg-[var(--bg-secondary)] px-3 py-6 text-center text-[12px] text-[var(--text-tertiary)]">
                <svg className="mx-auto h-8 w-8 text-[var(--text-disabled)] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M9.75 3.104c.282.026.563.056.844.09m-.844-.09a24.305 24.305 0 013.75 0m3.75 0v5.714a2.25 2.25 0 01-.659 1.591L19 14.5M15.75 3.104v5.714a2.25 2.25 0 00.659 1.591L19 14.5M5 14.5l2.25-2.25M5 14.5l2.25 2.25M19 14.5l-2.25-2.25M19 14.5l-2.25 2.25" />
                </svg>
                未获取到模型列表，请检查 Ollama 服务是否运行
              </div>
            ) : null}
          </div>

          {/* 手动输入模型名称（备用） */}
          <div>
            <label className="text-[12px] font-medium text-[var(--text-secondary)]">或手动输入模型名称</label>
            <input
              value={draft.model}
              onChange={(event) => onDraftChange({ ...draft, model: event.target.value })}
              placeholder="gemma4:e4b / llama3.1 / qwen2.5"
              className="mt-2 h-10 w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 text-[13px] text-[var(--text-primary)] outline-none transition focus:border-[var(--brand-orange)] focus:ring-2 focus:ring-[var(--brand-orange)]/10"
            />
          </div>

          {/* 代理说明 */}
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 px-3 py-2.5 text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed">
            <span className="font-medium">提示：</span>允许代理到 localhost、127.0.0.1、10.x、172.16-31.x、192.168.x 等内网地址。
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--border-light)] bg-[var(--bg-primary)]">
          <button
            type="button"
            onClick={onTest}
            className="rounded-xl bg-[var(--bg-secondary)] px-4 py-2 text-[13px] text-[var(--text-secondary)] transition hover:bg-[var(--border-light)]"
          >
            测试连接
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl bg-[var(--brand-orange)] px-4 py-2 text-[13px] font-medium text-white shadow-md shadow-[var(--brand-orange)]/20 transition hover:bg-[var(--brand-orange-dark)]"
          >
            保存配置
          </button>
        </div>
      </div>
    </>
  );
};
