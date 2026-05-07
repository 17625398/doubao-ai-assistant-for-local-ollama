import { describe, expect, it } from 'vitest'
import { getResponseStyleSystemPrompt, toCavemanServiceMode } from '../utils/response-style'

describe('response-style', () => {
  it('normal 或 undefined 不注入额外系统提示词', () => {
    expect(getResponseStyleSystemPrompt(undefined)).toBeNull()
    expect(getResponseStyleSystemPrompt('normal')).toBeNull()
  })

  it('不同 caveman 档位返回对应提示词', () => {
    expect(getResponseStyleSystemPrompt('caveman-lite')).toContain('保持正常语法')
    expect(getResponseStyleSystemPrompt('caveman')).toContain('短句、短段落')
    expect(getResponseStyleSystemPrompt('caveman-ultra')).toContain('极度精简')
  })

  it('扩展模式返回对应提示词', () => {
    expect(getResponseStyleSystemPrompt('wenyan')).toContain('文言文风格')
    expect(getResponseStyleSystemPrompt('concise')).toContain('简洁模式')
    expect(getResponseStyleSystemPrompt('technical')).toContain('技术术语模式')
    expect(getResponseStyleSystemPrompt('code')).toContain('代码优化模式')
  })

  it('回答风格可映射为 caveman service mode', () => {
    expect(toCavemanServiceMode(undefined)).toBeNull()
    expect(toCavemanServiceMode('normal')).toBeNull()
    expect(toCavemanServiceMode('caveman-lite')).toBe('lite')
    expect(toCavemanServiceMode('caveman')).toBe('full')
    expect(toCavemanServiceMode('caveman-ultra')).toBe('ultra')
    expect(toCavemanServiceMode('wenyan-ultra')).toBe('wenyan-ultra')
    expect(toCavemanServiceMode('technical')).toBe('technical')
  })
})
