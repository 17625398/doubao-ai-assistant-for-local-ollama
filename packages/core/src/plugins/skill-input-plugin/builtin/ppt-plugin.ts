/**
 * PPT 生成
 *
 * 对应原生 PPT(7)模块 + ppt-artifact 相关组件
 */
import type { SkillInputPlugin } from '../types'

export const pptSkillPlugin: SkillInputPlugin = {
  id: 'ppt',
  name: 'PPT生成',
  category: 'ppt',
  description: '一键生成专业PPT演示文稿',

  placeholder: '描述你的PPT主题、受众和页数要求...',
  acceptMultimodal: true,
  maxAttachments: 3,

  toolbarButtons: [
    { id: 'template', label: '模板风格', icon: 'LayoutTemplate', position: 'bottom' },
    { id: 'page-count', label: '页数', icon: 'FileStack', position: 'bottom' },
    { id: 'theme-color', label: '配色方案', icon: 'Palette', position: 'bottom' },
  ],

  guidanceQuestions: [
    '制作一份关于AI发展趋势的10页PPT',
    '为新产品发布会准备一份15页演示文稿',
    '创建一份季度工作汇报PPT模板',
    '生成一份教学课件PPT',
  ],
  suggestions: [
    { id: 'p1', label: '商务汇报', prompt: '制作一份商务汇报PPT，主题是', icon: 'Briefcase', category: 'template' },
    { id: 'p2', label: '教学课件', prompt: '制作一份教学PPT，科目是', icon: 'GraduationCap', category: 'template' },
    { id: 'p3', label: '产品介绍', prompt: '为以下产品制作一份介绍PPT：', icon: 'Package', category: 'template' },
    { id: 'p4', label: '年度总结', prompt: '制作一份年度工作总结PPT', icon: 'CalendarDays', category: 'recommended' },
  ],

  sendButtonText: '生成PPT',
}
