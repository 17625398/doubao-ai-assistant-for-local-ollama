/**
 * 技能输入插件系统入口
 */

import type { SkillInputPlugin } from './types'

export type {
  SkillInputPlugin,
  SkillCategory,
  ToolbarButtonConfig,
  FooterActionConfig,
  GuidanceTemplate,
  GuidanceStep,
  QuickActionItem,
  SuggestionItem,
  MultimodalAttachment,
  SubmitPayload,
  PluginEvent,
} from './types'

export { SKILL_CATEGORIES } from './types'

export {
  SkillInputPluginRegistry,
  skillInputPluginRegistry,
} from './registry'

export { chatSkillPlugin } from './builtin/chat-plugin'
export { searchSkillPlugin } from './builtin/search-plugin'
export { deepSearchSkillPlugin } from './builtin/deep-search-plugin'
export { academicSearchSkillPlugin } from './builtin/academic-search-plugin'
export { readDocumentSkillPlugin } from './builtin/read-document-plugin'
export { writeSkillPlugin } from './builtin/write-plugin'
export { translateSkillPlugin } from './builtin/translate-plugin'
export { codeSkillPlugin } from './builtin/code-plugin'
export { imageGenSkillPlugin } from './builtin/image-gen-plugin'
export { videoSkillPlugin } from './builtin/video-plugin'
export { pptSkillPlugin } from './builtin/ppt-plugin'
export { musicSkillPlugin } from './builtin/music-plugin'

import { skillInputPluginRegistry } from './registry'
import { chatSkillPlugin } from './builtin/chat-plugin'
import { searchSkillPlugin } from './builtin/search-plugin'
import { deepSearchSkillPlugin } from './builtin/deep-search-plugin'
import { academicSearchSkillPlugin } from './builtin/academic-search-plugin'
import { readDocumentSkillPlugin } from './builtin/read-document-plugin'
import { writeSkillPlugin } from './builtin/write-plugin'
import { translateSkillPlugin } from './builtin/translate-plugin'
import { codeSkillPlugin } from './builtin/code-plugin'
import { imageGenSkillPlugin } from './builtin/image-gen-plugin'
import { videoSkillPlugin } from './builtin/video-plugin'
import { pptSkillPlugin } from './builtin/ppt-plugin'
import { musicSkillPlugin } from './builtin/music-plugin'

/**
 * 初始化并注册所有内置技能插件
 * 在应用启动时调用一次即可
 */
export function initializeBuiltinPlugins(): void {
  const registry = skillInputPluginRegistry
  const builtins: SkillInputPlugin[] = [
    chatSkillPlugin,
    searchSkillPlugin,
    deepSearchSkillPlugin,
    academicSearchSkillPlugin,
    readDocumentSkillPlugin,
    writeSkillPlugin,
    translateSkillPlugin,
    codeSkillPlugin,
    imageGenSkillPlugin,
    videoSkillPlugin,
    pptSkillPlugin,
    musicSkillPlugin,
  ]
  registry.registerAll(builtins)
}
