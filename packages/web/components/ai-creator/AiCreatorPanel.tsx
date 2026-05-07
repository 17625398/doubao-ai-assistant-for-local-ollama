'use client';

import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Presentation, 
  Code2, 
  BarChart3, 
  Languages, 
  FileSearch,
  Sparkles,
  Loader2
} from 'lucide-react';

interface AiCreatorPanelProps {
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}

type CreatorMode = 'writing' | 'ppt' | 'code-review' | 'data-analysis' | 'translation' | 'summary';

interface Template {
  id: string;
  name: string;
  icon: React.ReactNode;
  prompt: string;
  placeholder: string;
}

const templates: Record<CreatorMode, Template[]> = {
  writing: [
    { id: 'email', name: '邮件', icon: <FileText size={20} />, prompt: '帮我写一封专业的邮件，主题是：', placeholder: '请输入邮件主题或内容要点' },
    { id: 'summary', name: '总结', icon: <FileSearch size={20} />, prompt: '请帮我总结以下内容：', placeholder: '请粘贴需要总结的文本' },
    { id: 'report', name: '报告', icon: <BarChart3 size={20} />, prompt: '帮我写一份详细的报告，主题是：', placeholder: '请输入报告主题' },
    { id: 'essay', name: '文章', icon: <Sparkles size={20} />, prompt: '帮我写一篇文章，主题是：', placeholder: '请输入文章主题' },
    { id: 'story', name: '故事', icon: <FileText size={20} />, prompt: '帮我写一个有趣的故事，主题是：', placeholder: '请输入故事主题' },
    { id: 'poem', name: '诗歌', icon: <Sparkles size={20} />, prompt: '帮我写一首诗歌，主题是：', placeholder: '请输入诗歌主题' },
  ],
  ppt: [
    { id: 'business', name: '商务PPT', icon: <Presentation size={20} />, prompt: '帮我创建一个商务演示PPT，主题是：', placeholder: '请输入PPT主题' },
    { id: 'product', name: '产品介绍', icon: <BarChart3 size={20} />, prompt: '帮我创建一个产品介绍PPT：', placeholder: '请描述产品特点' },
    { id: 'project', name: '项目汇报', icon: <FileText size={20} />, prompt: '帮我创建项目汇报PPT：', placeholder: '请描述项目内容' },
  ],
  'code-review': [
    { id: 'review', name: '代码审查', icon: <Code2 size={20} />, prompt: '请帮我审查以下代码：', placeholder: '请粘贴代码' },
    { id: 'optimize', name: '代码优化', icon: <Sparkles size={20} />, prompt: '请帮我优化以下代码：', placeholder: '请粘贴需要优化的代码' },
    { id: 'explain', name: '代码解释', icon: <FileSearch size={20} />, prompt: '请帮我解释以下代码：', placeholder: '请粘贴需要解释的代码' },
  ],
  'data-analysis': [
    { id: 'analyze', name: '数据分析', icon: <BarChart3 size={20} />, prompt: '请帮我分析以下数据：', placeholder: '请粘贴数据或描述数据' },
    { id: 'visualize', name: '图表建议', icon: <Presentation size={20} />, prompt: '我需要可视化以下数据，请建议合适的图表类型：', placeholder: '请描述数据特征' },
    { id: 'insights', name: '洞察发现', icon: <Sparkles size={20} />, prompt: '请帮我从以下数据中发现洞察：', placeholder: '请粘贴数据' },
  ],
  translation: [
    { id: 'zh-en', name: '中译英', icon: <Languages size={20} />, prompt: '请将以下内容翻译成英文：', placeholder: '请输入中文文本' },
    { id: 'en-zh', name: '英译中', icon: <Languages size={20} />, prompt: '请将以下内容翻译成中文：', placeholder: '请输入英文文本' },
    { id: 'multi', name: '多语言', icon: <Languages size={20} />, prompt: '请将以下内容翻译成目标语言：', placeholder: '请输入文本，并说明目标语言' },
  ],
  summary: [
    { id: 'text-summary', name: '文本摘要', icon: <FileSearch size={20} />, prompt: '请帮我总结以下内容：', placeholder: '请粘贴需要摘要的文本' },
    { id: 'key-points', name: '要点提取', icon: <Sparkles size={20} />, prompt: '请帮我提取以下内容的关键点：', placeholder: '请粘贴文本' },
    { id: 'meeting', name: '会议纪要', icon: <FileText size={20} />, prompt: '请帮我整理以下会议内容成纪要：', placeholder: '请粘贴会议记录' },
  ],
};

const modeConfig: Record<CreatorMode, { name: string; description: string; icon: React.ReactNode }> = {
  writing: { name: 'AI写作', description: '生成各种类型的文本内容', icon: <FileText size={24} /> },
  ppt: { name: 'PPT生成', description: '创建专业的演示文稿', icon: <Presentation size={24} /> },
  'code-review': { name: '代码审查', description: '审查、优化和解释代码', icon: <Code2 size={24} /> },
  'data-analysis': { name: '数据分析', description: '分析数据并发现洞察', icon: <BarChart3 size={24} /> },
  translation: { name: '翻译', description: '多语言翻译服务', icon: <Languages size={24} /> },
  summary: { name: '摘要生成', description: '提取要点和生成摘要', icon: <FileSearch size={24} /> },
};

export const AiCreatorPanel: React.FC<AiCreatorPanelProps> = ({ onClose, onGenerate }) => {
  const [activeMode, setActiveMode] = useState<CreatorMode>('writing');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const currentTemplates = templates[activeMode];

  const handleGenerate = async () => {
    if (!content.trim() || !selectedTemplate) return;

    const template = currentTemplates.find(t => t.id === selectedTemplate);
    if (!template) return;

    setIsGenerating(true);
    const prompt = `${template.prompt}${content}`;
    
    try {
      await onGenerate(prompt);
      onClose();
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const modes: CreatorMode[] = ['writing', 'ppt', 'code-review', 'data-analysis', 'translation', 'summary'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--theme-bg-secondary)] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-[var(--theme-border-secondary)]">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--theme-border-secondary)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--theme-accent-primary)]/10">
              <Sparkles size={20} className="text-[var(--theme-accent-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--theme-text-primary)]">AI 创作助手</h2>
              <p className="text-xs text-[var(--theme-text-tertiary)]">{modeConfig[activeMode].description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 模式选择 */}
        <div className="flex border-b border-[var(--theme-border-secondary)] overflow-x-auto">
          {modes.map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setActiveMode(mode);
                setSelectedTemplate('');
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeMode === mode
                  ? 'border-[var(--theme-accent-primary)] text-[var(--theme-accent-primary)] bg-[var(--theme-accent-primary)]/5'
                  : 'border-transparent text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
              }`}
            >
              {modeConfig[mode].icon}
              {modeConfig[mode].name}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 模板选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-3">
              选择模板
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {currentTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    selectedTemplate === template.id
                      ? 'border-[var(--theme-accent-primary)] bg-[var(--theme-accent-primary)]/10 text-[var(--theme-accent-primary)]'
                      : 'border-[var(--theme-border-secondary)] hover:border-[var(--theme-border-primary)] hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${selectedTemplate === template.id ? 'bg-[var(--theme-accent-primary)]/20' : 'bg-[var(--theme-bg-primary)]'}`}>
                    {template.icon}
                  </div>
                  <span className="text-sm font-medium">{template.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 内容输入 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1">
              输入内容
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={selectedTemplate ? currentTemplates.find(t => t.id === selectedTemplate)?.placeholder : '请选择一个模板'}
              className="w-full px-4 py-3 border border-[var(--theme-border-secondary)] rounded-xl focus:ring-2 focus:ring-[var(--theme-accent-primary)]/50 focus:border-[var(--theme-accent-primary)] min-h-[150px] resize-none transition-all bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-tertiary)]"
              disabled={!selectedTemplate}
            />
          </div>

          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !content.trim() || !selectedTemplate}
            className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              isGenerating || !content.trim() || !selectedTemplate
                ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-tertiary)] cursor-not-allowed'
                : 'bg-[var(--theme-accent-primary)] text-white hover:bg-[var(--theme-accent-primary)]/90 shadow-lg shadow-[var(--theme-accent-primary)]/25'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                开始创作
              </>
            )}
          </button>

          {/* 提示 */}
          <p className="text-xs text-[var(--theme-text-tertiary)] text-center mt-4">
            AI 将根据您的描述生成相应的内容，请尽量详细描述您的需求
          </p>
        </div>
      </div>
    </div>
  );
};

export default AiCreatorPanel;