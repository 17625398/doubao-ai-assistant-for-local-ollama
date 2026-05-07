/**
 * 图片生成
 *
 * 对应原生 image-input-plugin.js + 图片(12)模块
 */
import type { SkillInputPlugin } from '../types'

export const imageGenSkillPlugin: SkillInputPlugin = {
  id: 'image-gen',
  name: '图片生成',
  category: 'image-gen',
  description: '通过文字描述生成精美图片',

  placeholder: '描述你想生成的图片，越详细效果越好...',
  acceptMultimodal: false,

  toolbarButtons: [
    { id: 'style', label: '风格', icon: 'Palette', position: 'bottom' },
    { id: 'size', label: '尺寸', icon: 'Maximize2', position: 'bottom' },
    { id: 'ratio', label: '比例', icon: 'AspectRatio', position: 'bottom' },
    { id: 'negative-prompt', label: '负面提示词', icon: 'Ban', position: 'bottom' },
  ],

  guidanceQuestions: [
    '生成一只穿着宇航服的猫在月球上漫步的照片',
    '赛博朋克风格的未来城市夜景',
    '一幅中国水墨画风格的山水图',
    '一张极简主义的商业海报设计',
  ],
  suggestions: [
    { id: 'ig1', label: '写实风', prompt: '一张写实风格的', icon: 'Camera', category: 'template' },
    { id: 'ig2', label: '二次元', prompt: '动漫风格的', icon: 'Sparkle', category: 'template' },
    { id: 'ig3', label: '油画风', prompt: '油画风格的', icon: 'Brush', category: 'template' },
    { id: 'ig4', label: '3D渲染', prompt: '3D渲染风格的', icon: 'Box', category: 'template' },
    { id: 'ig5', label: '像素风', prompt: '像素艺术风格的', icon: 'Grid3x3', category: 'template' },
  ],

  sendButtonText: '生成图片',
}
