/**
 * 技能输入插件注册表
 *
 * 单例管理所有技能插件的注册、查询、激活、切换。
 * 使用 Map 实现 O(1) 查找。
 */

import { eventBus } from '../../utils/event-bus'
import { logger } from '../../utils/logger'
import type {
  SkillInputPlugin,
  SkillCategory,
  PluginEvent,
} from './types'

export class SkillInputPluginRegistry {
  private static instance: SkillInputPluginRegistry
  private plugins: Map<string, SkillInputPlugin> = new Map()
  private activePluginId: string = 'chat'
  private listeners: Set<(event: PluginEvent) => void> = new Set()

  private constructor() {}

  static getInstance(): SkillInputPluginRegistry {
    if (!SkillInputPluginRegistry.instance) {
      SkillInputPluginRegistry.instance = new SkillInputPluginRegistry()
    }
    return SkillInputPluginRegistry.instance
  }

  // ==================== 注册管理 ====================

  /**
   * 注册一个技能插件
   * @throws 如果已存在同 id 插件
   */
  register(plugin: SkillInputPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`[SkillInputPlugin] Plugin "${plugin.id}" already registered`)
    }
    this.plugins.set(plugin.id, plugin)
    this.emit({ type: 'plugin:registered', pluginId: plugin.id, timestamp: Date.now() })
    logger.info(`[SkillInputPlugin] Registered: ${plugin.id} (${plugin.name})`)
  }

  /**
   * 批量注册
   */
  registerAll(plugins: SkillInputPlugin[]): void {
    for (const p of plugins) this.register(p)
  }

  /**
   * 注销插件
   */
  unregister(pluginId: string): boolean {
    const deleted = this.plugins.delete(pluginId)
    if (deleted) {
      this.emit({ type: 'plugin:list-changed', pluginId, timestamp: Date.now() })
      if (this.activePluginId === pluginId) {
        this.activePluginId = 'chat'
      }
    }
    return deleted
  }

  // ==================== 查询 ====================

  /** 按 ID 获取 */
  get(id: string): SkillInputPlugin | undefined {
    return this.plugins.get(id)
  }

  /** 获取当前活跃插件 */
  getActive(): SkillInputPlugin {
    const plugin = this.plugins.get(this.activePluginId)
    if (!plugin) {
      // fallback 到 chat
      const chat = this.plugins.get('chat')
      return chat!
    }
    return plugin
  }

  /** 获取当前活跃插件 ID */
  getActiveId(): string {
    return this.activePluginId
  }

  /** 按分类获取所有匹配插件 */
  getByCategory(category: SkillCategory): SkillInputPlugin[] {
    const result: SkillInputPlugin[] = []
    for (const p of this.plugins.values()) {
      if (p.category === category) result.push(p)
    }
    return result
  }

  /** 列出所有已注册插件 */
  listAll(): SkillInputPlugin[] {
    return Array.from(this.plugins.values())
  }

  /** 列出所有已注册插件 ID */
  listIds(): string[] {
    return Array.from(this.plugins.keys())
  }

  /** 检查某插件是否已注册 */
  has(id: string): boolean {
    return this.plugins.has(id)
  }

  /** 已注册插件总数 */
  size(): number {
    return this.plugins.size
  }

  // ==================== 激活/切换 ====================

  /**
   * 设置当前活跃插件
   * @param id 目标插件 ID
   * @throws 如果目标插件不存在
   */
  setActive(id: string): void {
    if (!this.plugins.has(id)) {
      throw new Error(`[SkillInputPlugin] Cannot activate unknown plugin: "${id}"`)
    }
    const prevId = this.activePluginId
    this.activePluginId = id
    this.emit({ type: 'plugin:activated', pluginId: id, timestamp: Date.now() })
    if (prevId && prevId !== id) {
      this.emit({ type: 'plugin:deactivated', pluginId: prevId, timestamp: Date.now() })
    }
    logger.info(`[SkillInputPlugin] Active: ${prevId} → ${id}`)
  }

  /** 重置到通用聊天 */
  resetToChat(): void {
    this.setActive('chat')
  }

  // ==================== 事件订阅 ====================

  onPluginChange(callback: (event: PluginEvent) => void): () => void {
    this.listeners.add(callback)
    return () => { this.listeners.delete(callback) }
  }

  private emit(event: PluginEvent): void {
    for (const cb of this.listeners) {
      try { cb(event) } catch (e) { console.error('[SkillInputPlugin] Event listener error:', e) }
    }
    eventBus.emit('skill-plugin:event', event)
  }
}

/** 全局单例 */
export const skillInputPluginRegistry = SkillInputPluginRegistry.getInstance()
