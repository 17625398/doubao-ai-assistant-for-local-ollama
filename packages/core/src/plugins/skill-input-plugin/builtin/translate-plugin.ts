/**
 * 翻译
 *
 * 对应原生 translate-input-plugin.js + 翻译(5)模块
 * 支持 FEATURE_TRANS_PREFER_LANG 偏好语言
 */
import type { SkillInputPlugin } from '../types'

export const translateSkillPlugin: SkillInputPlugin = {
  id: 'translate',
  name: '翻译',
  category: 'translate',
  description: '高质量多语言翻译，支持语境理解和专业术语',

  placeholder: '输入要翻译的文本或粘贴长文...',
  acceptMultimodal: true,
  maxAttachments: 3,

  toolbarButtons: [
    { id: 'src-lang', label: '源语言', icon: 'Globe', position: 'bottom' },
    { id: 'tgt-lang', label: '目标语言', icon: 'Languages', position: 'bottom' },
    { id: 'domain', label: '专业领域', icon: 'Tag', position: 'bottom' },
  ],

  guidanceQuestions: [
    '把以下中文翻译成地道的英文',
    '翻译这段技术文档到中文',
    '将这篇日文新闻翻译成中文',
  ],
  suggestions: [
    { id: 't1', label: '中→英', prompt: '请翻译成英文：', icon: 'ArrowRightLeft', category: 'template' },
    { id: 't2', label: '英→中', prompt: '请翻译成中文：', icon: 'ArrowLeftRight', category: 'template' },
    { id: 't3', label: '日→中', prompt: '请翻译成中文：', icon: 'ArrowLeftRight', category: 'template' },
    { id: 't4', label: '整篇翻译', prompt: '请完整翻译以下文章，保持原文风格和语气：', icon: 'FileText', category: 'recommended' },
  ],

  footerActions: [
    { id: 'swap-languages', label: '交换语言', icon: 'ArrowLeftRight', variant: 'ghost' },
    { id: 'copy-result', label: '复制结果', icon: 'Copy', variant: 'ghost' },
  ],

  sendButtonText: '翻译',
}
