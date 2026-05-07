import React from 'react';
import { Plus, Zap, Code, PenTool, Presentation, Sparkles, Image, MoreHorizontal } from 'lucide-react';

interface QuickToolbarProps {
  onAction?: (action: string) => void;
}

const toolbarItems = [
  { id: 'fast', label: '快速', icon: Zap },
  { id: 'code', label: '编程', icon: Code },
  { id: 'write', label: '写作', icon: PenTool },
  { id: 'ppt', label: 'PPT 生成', icon: Presentation },
  { id: 'hyper', label: '超拟模式', icon: Sparkles },
  { id: 'image', label: '图像生成', icon: Image },
];

export const QuickToolbar: React.FC<QuickToolbarProps> = ({ onAction }) => {
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto">
      <button
        onClick={() => onAction?.('add')}
        className="flex items-center justify-center w-7 h-7 rounded-lg text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors flex-shrink-0"
        title="添加"
      >
        <Plus size={16} strokeWidth={2} />
      </button>

      <div className="w-px h-4 bg-[var(--theme-border-secondary)] flex-shrink-0" />

      {toolbarItems.map(item => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onAction?.(item.id)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors whitespace-nowrap flex-shrink-0"
          >
            <Icon size={14} strokeWidth={2} />
            <span>{item.label}</span>
          </button>
        );
      })}

      <button
        onClick={() => onAction?.('more')}
        className="flex items-center justify-center w-7 h-7 rounded-lg text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors flex-shrink-0"
        title="更多"
      >
        <MoreHorizontal size={16} strokeWidth={2} />
      </button>
    </div>
  );
};
