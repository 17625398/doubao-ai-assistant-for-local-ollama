/**
 * 视频助手
 *
 * 对应原生视频(9)模块
 * 支持链接解析、视频摘要、问答等能力
 */
import type { SkillInputPlugin } from '../types'

export const videoSkillPlugin: SkillInputPlugin = {
  id: 'video',
  name: '视频助手',
  category: 'video',
  description: '解析视频链接、生成字幕摘要、基于视频内容问答',

  placeholder: '粘贴视频链接或描述你想了解的视频内容...',
  acceptMultimodal: true,
  acceptedFileTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
  maxAttachments: 1,

  toolbarButtons: [
    { id: 'paste-link', label: '粘贴链接', icon: 'Link', position: 'left' },
    { id: 'summary-mode', label: '摘要模式', icon: 'Film', position: 'bottom' },
    { id: 'subtitle', label: '生成字幕', icon: 'Subtitles', position: 'bottom' },
  ],

  guidanceTemplate: {
    title: '视频助手',
    subtitle: '智能解析 · 内容摘要 · 精准问答',
    description:
      '粘贴 B站、YouTube、抖音等平台视频链接，或直接上传视频文件，AI 将为你生成内容摘要、时间戳索引，并支持基于视频内容的精准问答。',
    icon: 'Video',
    quickActions: [
      { id: 'v1', label: '生成摘要', prompt: '请为以下视频生成内容摘要：', icon: 'FileBarChart2' },
      { id: 'v2', label: '提取要点', prompt: '列出视频的核心观点和时间节点：', icon: 'List' },
      { id: 'v3', label: '生成字幕', prompt: '请为以下视频生成完整字幕：', icon: 'Subtitles' },
    ],
  },

  guidanceQuestions: [
    '这个视频主要讲了什么？',
    '帮我总结视频中的关键知识点',
    '视频中第5分钟讲的内容能展开吗？',
  ],
  suggestions: [
    { id: 'v-s1', label: '视频摘要', prompt: '请为这个视频生成摘要', icon: 'Film', category: 'template' },
    { id: 'v-s2', label: '提取金句', prompt: '从视频中提取精彩语句', icon: 'Quote', category: 'recommended' },
    { id: 'v-s3', label: '时间线整理', prompt: '按时间顺序整理视频内容脉络', icon: 'Clock', category: 'template' },
  ],

  sendButtonText: '分析视频',
}
