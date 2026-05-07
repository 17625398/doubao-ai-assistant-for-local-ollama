/**
 * Doubao AI 智能分析平台 - 设计系统工具函数
 * 提供类型安全的设计令牌访问方法
 * 
 * @version 2.0.0
 * @updated 2026-04-15
 */

import { colors, spacing, fontSizes, radii, shadows, tokens } from './tokens'
import type { ColorToken, SpacingToken, FontSizeToken, RadiusToken, ShadowToken } from './tokens'

/**
 * 获取颜色值
 * @param color 颜色名称 (primary, secondary, success, warning, error, gray)
 * @param shade 色阶 (50-950)
 * @returns 颜色值
 * 
 * @example
 * getColor('primary', 500) // '#6366f1'
 */
export function getColor<C extends keyof ColorToken, S extends keyof ColorToken[C]>(
  color: C,
  shade: S
): ColorToken[C][S] {
  return colors[color][shade] as ColorToken[C][S]
}

/**
 * 获取间距值
 * @param size 间距等级
 * @returns 间距值
 * 
 * @example
 * getSpacing(4) // '1rem'
 */
export function getSpacing<S extends keyof SpacingToken>(size: S): SpacingToken[S] {
  return spacing[size] as SpacingToken[S]
}

/**
 * 获取字号值
 * @param size 字号等级
 * @returns 字号值
 * 
 * @example
 * getFontSize('xl') // '1.25rem'
 */
export function getFontSize<S extends keyof FontSizeToken>(size: S): FontSizeToken[S] {
  return fontSizes[size] as FontSizeToken[S]
}

/**
 * 获取圆角值
 * @param size 圆角等级
 * @returns 圆角值
 * 
 * @example
 * getRadius('xl') // '0.75rem'
 */
export function getRadius<S extends keyof RadiusToken>(size: S): RadiusToken[S] {
  return radii[size] as RadiusToken[S]
}

/**
 * 获取阴影值
 * @param size 阴影等级
 * @returns 阴影值
 * 
 * @example
 * getShadow('lg') // '0 10px 15px ...'
 */
export function getShadow<S extends keyof ShadowToken>(size: S): ShadowToken[S] {
  return shadows[size] as ShadowToken[S]
}

/**
 * 生成渐变背景
 * @param fromColor 起始颜色
 * @param toColor 结束颜色
 * @param angle 角度（默认 135）
 * @returns CSS 渐变字符串
 * 
 * @example
 * createGradient('primary', 'secondary', 135)
 */
export function createGradient(
  fromColor: keyof ColorToken,
  toColor: keyof ColorToken,
  angle = 135,
  fromShade: keyof ColorToken[keyof ColorToken] = 600,
  toShade: keyof ColorToken[keyof ColorToken] = 600
): string {
  const from = getColor(fromColor, fromShade)
  const to = getColor(toColor, toShade)
  return `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`
}

/**
 * 生成阴影组合
 * @param sizes 阴影等级数组
 * @returns CSS 阴影字符串
 * 
 * @example
 * createShadow('md', 'lg')
 */
export function createShadow(...sizes: Array<keyof ShadowToken>): string {
  return sizes.map(size => getShadow(size)).join(', ')
}

/**
 * 生成响应式样式
 * @param styles 不同断点的样式
 * @returns CSS 媒体查询字符串
 * 
 * @example
 * createResponsiveStyles({
 *   base: { padding: '1rem' },
 *   md: { padding: '2rem' },
 *   lg: { padding: '3rem' }
 * })
 */
export function createResponsiveStyles(
  styles: Record<string, Record<string, string>>
): string {
  let css = ''
  
  // 基础样式
  if (styles.base) {
    css += Object.entries(styles.base)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n')
  }
  
  // 响应式样式
  const { breakpoints } = tokens
  for (const [breakpoint, breakpointStyles] of Object.entries(styles)) {
    if (breakpoint === 'base') continue
    
    const bp = breakpoints[breakpoint as keyof typeof breakpoints]
    if (bp) {
      css += `\n\n@media (min-width: ${bp}px) {\n`
      css += Object.entries(breakpointStyles)
        .map(([key, value]) => `  ${key}: ${value};`)
        .join('\n')
      css += '\n}'
    }
  }
  
  return css
}

/**
 * 生成 CSS 变量映射
 * @returns CSS 变量字符串
 * 
 * @example
 * generateCSSVariables()
 */
export function generateCSSVariables(): string {
  let css = ':root {\n'
  
  // 颜色变量
  for (const [colorName, shades] of Object.entries(colors)) {
    for (const [shade, value] of Object.entries(shades)) {
      css += `  --${colorName}-${shade}: ${value};\n`
    }
  }
  
  // 间距变量
  for (const [size, value] of Object.entries(spacing)) {
    css += `  --space-${size}: ${value};\n`
  }
  
  // 字号变量
  for (const [size, value] of Object.entries(fontSizes)) {
    css += `  --text-${size}: ${value};\n`
  }
  
  // 圆角变量
  for (const [size, value] of Object.entries(radii)) {
    css += `  --radius-${size}: ${value};\n`
  }
  
  css += '}\n'
  return css
}

/**
 * 工具函数：将 px 转换为 rem
 * @param px 像素值
 * @param base 基础字号（默认 16）
 * @returns rem 值
 * 
 * @example
 * pxToRem(16) // '1rem'
 */
export function pxToRem(px: number, base = 16): string {
  return `${px / base}rem`
}

/**
 * 工具函数：计算对比度
 * @param color1 颜色1
 * @param color2 颜色2
 * @returns 对比度比值
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  return (brightest + 0.05) / (darkest + 0.05)
}

/**
 * 内部函数：计算颜色亮度
 */
function getLuminance(color: string): number {
  const rgb = parseColor(color)
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * 内部函数：解析颜色值
 */
function parseColor(color: string): { r: number; g: number; b: number } {
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    const bigint = parseInt(hex, 16)
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    }
  }
  // 默认返回白色
  return { r: 255, g: 255, b: 255 }
}

/**
 * 导出所有工具函数
 */
export const designUtils = {
  getColor,
  getSpacing,
  getFontSize,
  getRadius,
  getShadow,
  createGradient,
  createShadow,
  createResponsiveStyles,
  generateCSSVariables,
  pxToRem,
  calculateContrastRatio,
} as const
