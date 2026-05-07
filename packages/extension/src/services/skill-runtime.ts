import type { DoubaoPageContext, DoubaoSkillRequest, DoubaoSkillResult } from '../shared/protocol'
import { completeSkillWithConfiguredModel } from './model-client'

function splitSentences(text: string, limit = 4): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[。！？.!?])\s+/u)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, limit)
}

function getSourceText(request: DoubaoSkillRequest): string {
  return request.prompt || request.context?.selectedText || request.context?.mainText || ''
}

export function buildLocalSkillResult(request: DoubaoSkillRequest, warning?: string): DoubaoSkillResult {
  const context = request.context
  const sourceText = getSourceText(request)
  const title = context?.title || '当前内容'
  const keySentences = splitSentences(sourceText, 5)
  const headings = context?.headings?.slice(0, 6) ?? []
  const generatedAt = new Date().toISOString()
  const base = {
    source: 'local-fallback' as const,
    warning,
    generatedAt,
  }

  switch (request.skillId) {
    case 'translate':
      return {
        ...base,
        skillId: request.skillId,
        title: `翻译：${title}`,
        summary: '模型不可用时已生成翻译任务草稿。请在设置中配置 Ollama 或 OpenAI-compatible 服务以获得真实翻译。',
        sections: [
          { title: '待翻译片段', items: keySentences.length ? keySentences : ['未检测到可翻译文本'] },
          { title: '翻译策略', items: ['保留专有名词', '优先按段落翻译', '根据用户偏好语言输出'] },
        ],
        suggestedPrompts: ['翻译为英文并保留 Markdown', '翻译为中文并解释术语', '提取双语词汇表'],
      }
    case 'deep-search':
      return {
        ...base,
        skillId: request.skillId,
        title: `深度搜索：${title}`,
        summary: '已生成深度搜索任务框架，可接入搜索聚合服务执行。',
        sections: [
          { title: '搜索种子', items: [context?.title, context?.description, ...(headings.slice(0, 3))].filter(Boolean) as string[] },
          { title: '可追踪链接', items: (context?.links ?? []).slice(0, 5).map(link => `${link.text} — ${link.href}`) },
        ],
        suggestedPrompts: ['围绕这个主题做竞品分析', '查找最新资料并给出引用', '生成研究报告大纲'],
      }
    case 'extract-outline':
      return {
        ...base,
        skillId: request.skillId,
        title: `大纲：${title}`,
        summary: '根据页面标题和标题层级生成了结构化大纲。',
        sections: [
          { title: '页面标题层级', items: headings.length ? headings : ['页面没有明显标题层级'] },
          { title: '关键句', items: keySentences.length ? keySentences : ['未提取到关键句'] },
        ],
        suggestedPrompts: ['把大纲转为思维导图', '生成会议纪要', '找出论证漏洞'],
      }
    case 'write-email':
      return {
        ...base,
        skillId: request.skillId,
        title: `写作助手：${title}`,
        summary: '已基于当前页面生成邮件写作上下文，可继续指定收件人、语气和目标。',
        sections: [
          { title: '可引用信息', items: keySentences.length ? keySentences : ['请先选择或提取页面内容'] },
          { title: '邮件结构', items: ['背景说明', '核心观点', '需要对方采取的行动', '礼貌结尾'] },
        ],
        suggestedPrompts: ['写一封商务邮件', '改写得更简洁', '生成中英双语版本'],
      }
    case 'code-review':
      return {
        ...base,
        skillId: request.skillId,
        title: `代码审查：${title}`,
        summary: '已准备代码审查任务。若当前页面包含代码块或选区，将优先分析选区。',
        sections: [
          { title: '审查维度', items: ['正确性', '安全性', '可维护性', '性能', '测试覆盖'] },
          { title: '输入预览', items: keySentences.length ? keySentences : ['未检测到代码或文本选区'] },
        ],
        suggestedPrompts: ['指出潜在 bug', '给出重构建议', '补充单元测试'],
      }
    case 'diagnose-page':
      return {
        ...base,
        skillId: request.skillId,
        title: `页面诊断：${title}`,
        summary: '已完成本地页面上下文诊断摘要。',
        sections: [
          {
            title: '页面统计',
            items: context
              ? [`字符数：${context.stats.characters}`, `标题数：${context.stats.headings}`, `链接数：${context.stats.links}`, `图片数：${context.stats.images}`]
              : ['暂无页面上下文'],
          },
          { title: '风险提示', items: ['如遇登录页或动态页面，请使用真实浏览器上下文重新提取', '如内容为空，可能受 iframe、Shadow DOM 或权限限制影响'] },
        ],
        suggestedPrompts: ['重新提取页面', '检查登录状态', '导出诊断报告'],
      }
    case 'summarize':
    default:
      return {
        ...base,
        skillId: 'summarize',
        title: `摘要：${title}`,
        summary: keySentences[0] || context?.description || '已捕获页面上下文，可继续接入模型生成更完整摘要。',
        sections: [
          { title: '关键句', items: keySentences.length ? keySentences : ['未提取到足够正文'] },
          { title: '页面结构', items: headings.length ? headings : ['未检测到标题结构'] },
        ],
        suggestedPrompts: ['把这页内容整理成三点行动建议', '提取关键事实、数据和来源', '生成适合发给同事的摘要'],
      }
  }
}

function modelMarkdownToResult(request: DoubaoSkillRequest, markdown: string, provider: string, model: string): DoubaoSkillResult {
  const context = request.context
  const title = context?.title || '当前内容'
  const lines = markdown
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
  const bullets = lines
    .filter(line => /^[-*•]\s+/.test(line) || /^\d+[.)、]\s+/.test(line))
    .map(line => line.replace(/^[-*•]\s+/, '').replace(/^\d+[.)、]\s+/, ''))
    .slice(0, 8)

  return {
    skillId: request.skillId,
    title: `模型增强：${title}`,
    summary: lines.find(line => !line.startsWith('#'))?.replace(/^#+\s*/, '') || '模型已返回结果。',
    sections: [
      { title: '模型输出要点', items: bullets.length ? bullets : lines.slice(0, 5) },
      {
        title: '上下文来源',
        items: context ? [`${context.title}`, `${context.url}`, `正文字符：${context.stats.characters}`] : ['用户自定义输入'],
      },
    ],
    suggestedPrompts: ['继续展开', '压缩为 100 字', '转为表格', '生成行动清单'],
    generatedAt: new Date().toISOString(),
    source: 'model',
    provider,
    model,
    markdown,
  }
}

export async function runDoubaoSkill(request: DoubaoSkillRequest): Promise<DoubaoSkillResult> {
  try {
    const completion = await completeSkillWithConfiguredModel(request)
    if (!completion.content.trim()) {
      return buildLocalSkillResult(request, '模型返回为空，已使用本地回退结果。')
    }
    return modelMarkdownToResult(request, completion.content, completion.provider, completion.model)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return buildLocalSkillResult(request, `模型调用失败，已使用本地回退：${message}`)
  }
}

export function attachContext(request: DoubaoSkillRequest, activeContext: DoubaoPageContext | null): DoubaoSkillRequest {
  return {
    ...request,
    context: request.context || activeContext || undefined,
  }
}
