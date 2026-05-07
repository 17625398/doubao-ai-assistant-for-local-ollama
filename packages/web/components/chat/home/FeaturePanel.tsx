import React from 'react';
import type { HomeNavKey } from '../../../services/doubao-home/data/homeContent';
import { browserActions, creationTemplates, moreCapabilities } from '../../../services/doubao-home/data/homeContent';

interface FeaturePanelProps {
  active: HomeNavKey;
  onUsePrompt: (prompt: string) => void;
  onSend?: () => void;
}

const cloudActions = [
  { title: '粘贴文件内容', prompt: '请把我接下来粘贴的文件内容整理成摘要、要点和待办事项。', desc: '整理长文、表格、会议纪要' },
  { title: '文件分类', prompt: '请帮我为一组文件设计分类目录和命名规范。', desc: '生成目录、标签和命名规则' },
  { title: '生成知识库', prompt: '请根据以下资料生成知识库问答对。', desc: '提取问答、概念和检索关键词' },
];

function getPanelData(active: HomeNavKey): Array<{ title: string; prompt: string; desc?: string }> {
  if (active === 'AI 浏览器') return browserActions;
  if (active === 'AI 创作') return creationTemplates;
  if (active === '云盘') return cloudActions;
  if (active === '更多') return moreCapabilities;
  return [];
}

export const FeaturePanel: React.FC<FeaturePanelProps> = ({ active, onUsePrompt, onSend }) => {
  if (active === '豆包') return null;
  const data = getPanelData(active);
  return (
    <section className="mb-6 w-full max-w-[704px] animate-in fade-in slide-in-from-bottom-3 duration-400">
      {/* 分类标签 */}
      <div className="mb-3 flex items-center justify-center gap-2">
        <span className="inline-flex items-center rounded-full bg-gradient-to-r from-[var(--brand-orange)]/10 to-[var(--brand-orange)]/5 px-3 py-1 text-xs font-semibold text-[var(--brand-orange)]">
          {active}
        </span>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        {data.map((item, idx) => (
          <button
            key={item.title}
            type="button"
            onClick={() => { onUsePrompt(item.prompt); onSend?.(); }}
            className="group relative overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-primary)]/95 px-4 py-3.5 text-left shadow-[0_6px_20px_rgba(15,23,42,0.045)]
                       transition-all duration-200 ease-out
                       hover:-translate-y-1 hover:border-[var(--border-medium)] hover:bg-[var(--bg-primary)] hover:shadow-[0_14px_32px_rgba(15,23,42,0.1),0_4px_12px_rgba(255,107,53,0.06)]
                       active:translate-y-0 active:scale-[0.98]
                       animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'backwards' }}
          >
            {/* 悬浮时的顶部高光 */}
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand-orange)]/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <div className="flex items-center justify-between gap-3">
              <div className="truncate text-[14px] font-semibold text-[var(--text-primary)]">{item.title}</div>
              <svg className="h-4 w-4 shrink-0 text-[var(--text-disabled)] transition-all duration-200 translate-x-0 opacity-60 group-hover:translate-x-0.5 group-hover:text-[var(--brand-orange)] group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
            <div className="mt-1.5 line-clamp-2 text-[11.5px] leading-5 text-[var(--text-secondary)]">{item.desc || item.prompt}</div>
          </button>
        ))}
      </div>
    </section>
  );
};
