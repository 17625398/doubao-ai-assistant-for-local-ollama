/**
 * 搜索 — 实时联网搜索
 */
import type { SkillInputPlugin } from '../types'

export const searchSkillPlugin: SkillInputPlugin = {
  id: 'search',
  name: '搜索',
  category: 'search',
  description: '实时获取互联网信息并总结回答',

  placeholder: '你想了解什么？我会帮你搜索最新信息...',
  acceptMultimodal: false,

  toolbarButtons: [
    { id: 'time-range', label: '时间范围', icon: 'Clock', position: 'bottom' },
    { id: 'source-select', label: '来源筛选', icon: 'Filter', position: 'bottom' },
  ],

  guidanceQuestions: [
    '今天有什么重大新闻？',
    '2024年AI领域有哪些突破？',
    '最新的iPhone价格是多少？',
    '最近上映的好看电影有哪些？',
  ],
  suggestions: [
    { id: 's1', label: '今日热点', prompt: '今天的热点新闻有哪些？', icon: 'TrendingUp', category: 'trending' },
    { id: 's2', label: '科技动态', prompt: '科技领域的最新动态', icon: 'Cpu', category: 'trending' },
    { id: 's3', label: '产品对比', prompt: '对比分析以下两款产品：', icon: 'Scale', category: 'template' },
  ],

  sendButtonText: '搜索',
}
