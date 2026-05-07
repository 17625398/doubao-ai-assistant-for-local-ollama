/**
 * 深度搜索 — 多源验证、深度洞察
 *
 * 对应原生 deep-search-input-plugin.js
 * 强调查询构造和来源追溯
 */
import type { SkillInputPlugin } from '../types'

export const deepSearchSkillPlugin: SkillInputPlugin = {
  id: 'deep-search',
  name: '深度搜索',
  category: 'deep-search',
  description: '自动拆解问题并多源验证，提供深度洞察报告',

  placeholder: '描述你要深入研究的问题，我会自动拆解并多源验证...',
  acceptMultimodal: false,

  toolbarButtons: [
    { id: 'time-range', label: '时间范围', icon: 'Clock', position: 'bottom' },
    { id: 'source-select', label: '来源选择', icon: 'Database', position: 'bottom' },
    { id: 'depth-level', label: '研究深度', icon: 'Layers', position: 'bottom' },
  ],

  guidanceTemplate: {
    title: '深度搜索助手',
    subtitle: '多源验证 · 深度洞察',
    description:
      '深度搜索会自动拆解你的问题，从多个来源交叉验证信息，最终输出带有引用来源的结构化研究报告。',
    icon: 'Brain',
    steps: [
      {
        title: '描述问题',
        description: '详细说明你想要研究的主题或问题',
        action: { label: '开始研究', prompt: '' },
      },
      {
        title: '智能拆解',
        description: '系统将问题拆解为多个子任务并行搜索',
      },
      {
        title: '多源验证',
        description: '从学术/新闻/官方等多渠道交叉验证',
      },
      {
        title: '输出报告',
        description: '生成结构化报告，附带来源链接和可信度评估',
      },
    ],
    quickActions: [
      { id: 'ds1', label: '竞品对比', prompt: '请深度对比分析 GPT-4o 和 Claude 3.5 Sonnet 的性能差异', icon: 'GitCompare' },
      { id: 'ds2', label: '行业趋势', prompt: '2025年大模型行业发展趋势深度研究', icon: 'TrendingUp' },
      { id: 'ds3', label: '技术调研', prompt: '调研 React Server Components 的实际应用现状和最佳实践', icon: 'SearchCode' },
    ],
  },

  guidanceQuestions: [
    '对比 GPT-4o 和 Claude 3.5 Sonnet 的最新性能',
    '2024-2025年大模型技术发展趋势研究',
    '分析某公司的竞争格局和商业模式',
  ],

  sendButtonText: '开始深度研究',
}
