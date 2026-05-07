/**
 * 通用聊天 — 最基础的输入体验
 */
import type { SkillInputPlugin } from '../types'

export const chatSkillPlugin: SkillInputPlugin = {
  id: 'chat',
  name: '通用聊天',
  category: 'chat',
  description: '与 AI 自由对话，支持多模态内容',

  placeholder: '输入你的问题...',
  acceptMultimodal: true,
  maxAttachments: 10,

  toolbarButtons: [
    { id: 'attachment', label: '附件', icon: 'Paperclip', position: 'left' },
    { id: 'voice', label: '语音', icon: 'Mic', position: 'right' },
    { id: 'screenshot', label: '截图', icon: 'Camera', position: 'right' },
  ],
  showSendButton: true,
  sendButtonText: '发送',

  guidanceQuestions: [
    '帮我写一首关于春天的诗',
    '解释量子纠缠是什么',
    '总结今天的新闻要点',
    '推荐几本值得读的书',
  ],
  suggestions: [
    { id: 'c1', label: '帮我写作', prompt: '帮我写一篇', icon: 'PenTool', category: 'recommended' },
    { id: 'c2', label: '图像生成', prompt: '生成一张图片，主题是', icon: 'ImagePlus', category: 'recommended' },
    { id: 'c3', label: '代码助手', prompt: '编写一个函数来', icon: 'Code2', category: 'recommended' },
    { id: 'c4', label: '翻译文本', prompt: '翻译以下内容到英文：', icon: 'Languages', category: 'template' },
  ],

  footerActions: [],
}
