/**
 * 代码编写
 *
 * 对应原生 coding-input-plugin.js + 代码(16)模块
 */
import type { SkillInputPlugin } from '../types'

export const codeSkillPlugin: SkillInputPlugin = {
  id: 'code',
  name: '代码编写',
  category: 'code',
  description: '编写、调试、优化、解释代码，支持主流编程语言',

  placeholder: '描述你需要的功能或贴上需要修改的代码...',
  acceptMultimodal: true,
  maxAttachments: 5,

  toolbarButtons: [
    { id: 'language', label: '语言', icon: 'Code2', position: 'bottom' },
    { id: 'paste-code', label: '粘贴代码', icon: 'ClipboardCode', position: 'left' },
    { id: 'run-code', label: '运行', icon: 'Play', position: 'right' },
  ],

  guidanceQuestions: [
    '用 Python 实现一个快速排序算法',
    '帮我把这段 JavaScript 改写成 TypeScript',
    '写一个 React Hook 来管理表单状态',
    '为什么我的 API 请求报 CORS 错误？',
  ],
  suggestions: [
    { id: 'cd1', label: '写函数', prompt: '用', icon: 'FunctionSquare', category: 'template' },
    { id: 'cd2', label: '调试Bug', prompt: '帮我调试以下代码的问题：', icon: 'Bug', category: 'template' },
    { id: 'cd3', label: '代码审查', prompt: '请审查以下代码的质量和潜在问题：', icon: 'Eye', category: 'recommended' },
    { id: 'cd4', label: '加注释', prompt: '为以下代码添加详细的注释说明：', icon: 'MessageSquarePlus', category: 'template' },
    { id: 'cd5', label: '优化重构', prompt: '请优化重构以下代码：', icon: 'Zap', category: 'recommended' },
  ],

  sendButtonText: '生成代码',
}
