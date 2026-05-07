/**
 * 文档阅读 — PDF/Word/TXT 等文档的智能解析与问答
 *
 * 对应原生 read-document-input-plugin.js + 文档(26)模块
 */
import type { SkillInputPlugin } from '../types'

export const readDocumentSkillPlugin: SkillInputPlugin = {
  id: 'read-document',
  name: '文档阅读',
  category: 'read-document',
  description: '上传文档进行智能解析、摘要提取和问答',

  placeholder: '上传PDF、Word或其他文档，我来帮你分析和问答...',
  acceptMultimodal: true,
  acceptedFileTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
  maxAttachments: 5,

  toolbarButtons: [
    { id: 'upload-file', label: '上传文档', icon: 'Upload', position: 'left' },
    { id: 'summary-mode', label: '摘要模式', icon: 'FileBarChart2', position: 'bottom' },
    { id: 'ocr-toggle', label: 'OCR识别', icon: 'ScanLine', position: 'bottom' },
  ],

  guidanceTemplate: {
    title: '文档阅读助手',
    subtitle: '智能解析 · 摘要提取 · 精准问答',
    description:
      '支持 PDF、Word、Excel、TXT、Markdown 等多种格式，可提取摘要、翻译全文、基于文档内容进行问答。',
    icon: 'FileText',
    steps: [
      {
        title: '上传文档',
        description: '拖拽或点击上传你想要分析的文档',
        action: { label: '选择文档', prompt: '' },
      },
      {
        title: '智能解析',
        description: 'AI 自动识别文档结构和关键内容',
      },
      {
        title: '交互问答',
        description: '基于文档内容进行精准提问',
      },
    ],
    quickActions: [
      { id: 'rd1', label: '生成摘要', prompt: '请为这份文档生成结构化摘要', icon: 'ListCollapse' },
      { id: 'rd2', label: '提取要点', prompt: '列出文档的核心观点和关键数据', icon: 'Target' },
      { id: 'rd3', label: '全文翻译', prompt: '请将文档内容翻译成中文', icon: 'Languages' },
    ],
  },

  guidanceQuestions: [
    '这份文档的主要内容是什么？',
    '帮我提炼文档中的关键数据',
    '文档中的结论是否可靠？',
  ],
  suggestions: [
    { id: 'rd-s1', label: '生成摘要', prompt: '为这份文档生成摘要', icon: 'FileBarChart2', category: 'template' },
    { id: 'rd-s2', label: '翻译全文', prompt: '将文档翻译成', icon: 'Languages', category: 'template' },
    { id: 'rd-s3', label: '提取表格', prompt: '从文档中提取所有表格数据', icon: 'Table2', category: 'recommended' },
  ],

  sendButtonText: '分析文档',
}
