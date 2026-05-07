'use client'

/**
 * SkillContext — 当前活跃技能上下文
 *
 * React Context，管理当前激活的技能插件状态。
 * 所有需要感知当前技能的组件通过此 Context 获取信息。
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { SkillInputPlugin } from '@core/plugins/skill-input-plugin/types'
import { skillInputPluginRegistry, initializeBuiltinPlugins } from '@core/plugins/skill-input-plugin'

// ═══════════════════════════════════════════════
// 模块级单次初始化 — 确保注册表在使用前就绪
// ═══════════════════════════════════════════════
let _pluginsInitialized = false
function ensurePluginsInitialized(): void {
  if (!_pluginsInitialized) {
    try {
      initializeBuiltinPlugins()
      _pluginsInitialized = true
      console.log('[SkillContext] ✅ 内置插件已初始化:', skillInputPluginRegistry.size(), '个')
    } catch (e) {
      console.error('[SkillContext] ❌ 插件初始化失败:', e)
    }
  }
}

interface SkillContextValue {
  /** 当前活跃技能 */
  activePlugin: SkillInputPlugin
  /** 当前活跃技能 ID */
  activePluginId: string
  /** 切换到指定技能 */
  switchToSkill: (pluginId: string) => void
  /** 重置为通用聊天 */
  resetToChat: () => void
  /** 是否处于非通用聊天模式 */
  isSpecializedMode: boolean
}

const SkillContext = createContext<SkillContextValue | null>(null)

export function SkillProvider({ children }: { children: React.ReactNode }) {
  // 首次挂载时确保插件已注册
  const initRef = useRef(false)
  if (!initRef.current) {
    initRef.current = true
    ensurePluginsInitialized()
  }
  const [activeId, setActiveId] = useState(() => skillInputPluginRegistry.getActiveId())

  const switchToSkill = useCallback((pluginId: string) => {
    if (skillInputPluginRegistry.has(pluginId)) {
      skillInputPluginRegistry.setActive(pluginId)
      setActiveId(pluginId)
    }
  }, [])

  const resetToChat = useCallback(() => {
    skillInputPluginRegistry.resetToChat()
    setActiveId('chat')
  }, [])

  // 同步外部 registry 变更
  useEffect(() => {
    const unsubscribe = skillInputPluginRegistry.onPluginChange((event) => {
      if (event.type === 'plugin:activated') {
        setActiveId(event.pluginId)
      }
    })
    return unsubscribe
  }, [])

  // 安全获取活跃插件，始终回退到内置默认值
  const _fallback: SkillInputPlugin = {
    id: 'chat',
    name: '通用聊天',
    category: 'chat',
    placeholder: '输入消息或添加附件...',
    acceptMultimodal: true,
    sendButtonText: '发送',
  }
  const activePlugin = skillInputPluginRegistry.get(activeId)
    ?? skillInputPluginRegistry.get('chat')
    ?? _fallback

  const value: SkillContextValue = {
    activePlugin,
    activePluginId: activeId,
    switchToSkill,
    resetToChat,
    isSpecializedMode: activeId !== 'chat',
  }

  return <SkillContext.Provider value={value}>{children}</SkillContext.Provider>
}

/** 获取当前技能上下文 */
export function useSkillContext(): SkillContextValue {
  const ctx = useContext(SkillContext)
  if (!ctx) {
    throw new Error('[useSkillContext] 必须在 SkillProvider 内部使用')
  }
  return ctx
}

/** 获取当前活跃插件配置的便捷 hook */
export function useActivePlugin(): SkillInputPlugin {
  return useSkillContext().activePlugin
}

export { SkillContext }
