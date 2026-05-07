/**
 * 学术搜索
 *
 * 面向论文、学术资料的研究型搜索
 */
import type { SkillInputPlugin } from '../types'

export const academicSearchSkillPlugin: SkillInputPlugin = {
  id: 'academic-search',
  name: '学术搜索',
  category: 'academic-search',
  description: '检索学术论文、专利和研究报告',

  placeholder: '输入研究关键词或论文标题，我会帮你查找相关文献...',
  acceptMultimodal: true,
  acceptedFileTypes: ['application/pdf'],
  maxAttachments: 3,

  toolbarButtons: [
    { id: 'time-range', label: '时间范围', icon: 'Clock', position: 'bottom' },
    { id: 'field-select', label: '学科领域', icon: 'BookOpen', position: 'bottom' },
    { id: 'sort-by', label: '排序方式', icon: 'ArrowUpDown', position: 'bottom' },
  ],

  guidanceQuestions: [
    'Transformer架构的最新改进有哪些？',
    '查找关于大型语言模型对齐的综述论文',
    '2024年NLP领域最重要的突破是什么？',
  ],
  suggestions: [
    { id: 'a1', label: '论文解读', prompt: '请帮我解读这篇论文的主要贡献：', icon: 'FileText', category: 'template' },
    { id: 'a2', label: '文献综述', prompt: '关于以下主题的文献综述：', icon: 'BookMarked', category: 'template' },
    { id: 'a3', label: '研究方向', prompt: '当前这个领域的研究热点和未来方向是什么？', icon: 'Compass', category: 'recommended' },
  ],

  sendButtonText: '检索',
}
