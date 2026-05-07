/**
 * 写作助手
 *
 * 对应原生 write-input-plugin.js + 写作(8)模块
 */
import type { SkillInputPlugin } from '../types'

export const writeSkillPlugin: SkillInputPlugin = {
  id: 'write',
  name: '写作助手',
  category: 'write',
  description: '各类文体创作：文章、邮件、文案、故事等',

  placeholder: '描述你想写的内容类型和要求...',
  acceptMultimodal: false,

  toolbarButtons: [
    { id: 'style-select', label: '文风选择', icon: 'Palette', position: 'bottom' },
    { id: 'length-select', label: '篇幅控制', icon: 'Ruler', position: 'bottom' },
    { id: 'tone-select', label: '语气调整', icon: 'Smile', position: 'bottom' },
  ],

  guidanceQuestions: [
    '帮我写一封正式的工作汇报邮件',
    '撰写一篇关于远程工作的议论文',
    '写一段吸引人的产品营销文案',
    '创作一篇科幻短篇故事',
  ],
  suggestions: [
    { id: 'w1', label: '工作邮件', prompt: '帮我写一封工作邮件，主题是', icon: 'Mail', category: 'template' },
    { id: 'w2', label: '文章写作', prompt: '写一篇关于', icon: 'FileEdit', category: 'template' },
    { id: 'w3', label: '营销文案', prompt: '为以下产品写一段营销文案：', icon: 'Megaphone', category: 'template' },
    { id: 'w4', label: '改写润色', prompt: '请帮我润色以下这段文字：', icon: 'Sparkles', category: 'recommended' },
    { id: 'w5', label: '续写故事', prompt: '请续写以下故事：', icon: 'BookOpen', category: 'template' },
  ],

  footerActions: [
    { id: 'continue-write', label: '继续写作', icon: 'PlusCircle', variant: 'ghost' },
    { id: 'change-style', label: '换个风格', icon: 'RefreshCcw', variant: 'ghost' },
  ],

  sendButtonText: '开始写作',
}
