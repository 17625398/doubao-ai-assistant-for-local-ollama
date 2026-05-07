/**
 * 音乐生成
 *
 * 对应原生音乐(4)模块 + 汽水音乐集成 (FEATURE_ENABLE_QISHUI)
 */
import type { SkillInputPlugin } from '../types'

export const musicSkillPlugin: SkillInputPlugin = {
  id: 'music',
  name: '音乐生成',
  category: 'music',
  description: 'AI 音乐创作，支持多种风格和乐器编排',

  placeholder: '描述你想要的音乐风格、情绪和使用场景...',
  acceptMultimodal: false,

  toolbarButtons: [
    { id: 'genre', label: '音乐风格', icon: 'Music4', position: 'bottom' },
    { id: 'mood', label: '情绪氛围', icon: 'Heart', position: 'bottom' },
    { id: 'duration', label: '时长', icon: 'Timer', position: 'bottom' },
    { id: 'instrument', label: '主乐器', icon: 'Guitar', position: 'bottom' },
  ],

  guidanceQuestions: [
    '生成一首轻松欢快的背景音乐',
    '创作一段适合冥想的钢琴曲',
    '做一首电子舞曲风格的BGM',
    '写一段电影配乐风格的管弦乐',
  ],
  suggestions: [
    { id: 'm1', label: '轻音乐', prompt: '生成一首轻柔舒缓的背景音乐，时长约3分钟', icon: 'Music2', category: 'template' },
    { id: 'm2', label: '电子', prompt: '生成一首电子风格的音乐，节奏感强', icon: 'Radio', category: 'template' },
    { id: 'm3', label: '古典', prompt: '生成一首古典风格的钢琴曲', icon: 'Piano', category: 'template' },
    { id: 'm4', label: '影视BGM', prompt: '生成一段适合用于影视片段的背景音乐', icon: 'Clapperboard', category: 'template' },
    { id: 'm5', label: 'Lo-fi', prompt: '生成一首 Lo-fi 风格的学习背景音乐', icon: 'Headphones', category: 'template' },
  ],

  sendButtonText: '生成音乐',
}
