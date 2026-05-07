/**
 * OllamaCapabilityService — 本地模型能力服务层
 *
 * 所有核心功能统一通过本地 Ollama 端点执行。
 * 每个能力拥有专属的 system prompt 和参数配置。
 *
 * 架构：
 *   用户操作 → Capability → buildPrompt() → sendOllamaChat() → 本地模型
 */

import type { OllamaSettings, DoubaoHomeMessage } from '../types'
import {
  loadOllamaSettings,
  buildProxyUrl,
  buildOllamaHeaders,
} from './ollamaHomeClient'

// ═══════════════════════════════════════════
// 能力类型定义
// ═══════════════════════════════════════════

/** 支持的能力 ID 列表 */
export type CapabilityId =
  | 'writing' | 'translation' | 'ppt'
  | 'image-gen' | 'video' | 'music' | 'voice-studio'
  | 'code-review' | 'data-analysis' | 'cloud-storage' | 'screen-share' | 'screenshot-question'
  | 'deep-search' | 'academic-search' | 'rag' | 'read-document' | 'logic-mode'

/** 能力执行请求 */
export interface CapabilityRequest {
  /** 能力 ID */
  capability: CapabilityId
  /** 用户输入 */
  input: string
  /** 可选的上下文消息（用于多轮对话） */
  contextMessages?: DoubaoHomeMessage[]
  /** 是否流式输出 */
  stream?: boolean
}

/** 能力执行响应 */
export interface CapabilityResponse {
  /** 生成的文本内容 */
  content: string
  /** 使用的模型名称 */
  model: string
  /** 响应耗时 (ms) */
  durationMs: number
  /** Token 用量估算 */
  usage?: { promptTokens: number; completionTokens: number }
}

// ═══════════════════════════════════════════
// 每个能力的 System Prompt 配置
// ═══════════════════════════════════════════

interface CapabilityConfig {
  /** System Prompt — 定义角色和能力边界 */
  systemPrompt: string
  /** 推荐使用的模型（为空则用默认模型） */
  recommendedModel?: string
  /** Temperature（创造性越高值越大） */
  temperature?: number
  /** 最大输出 token 数 */
  maxTokens?: number
  /** 显示名称 */
  label: string
  /** 图标 */
  icon: string
}

/**
 * 能力配置表 — 每个能力对应一组专属的 system prompt
 * 这些 prompt 经过优化，适配本地模型（如 Gemma、Llama、Qwen）
 */
const CAPABILITY_CONFIGS: Record<CapabilityId, CapabilityConfig> = {
  // ── 创作类 ──
  writing: {
    label: '写作助手', icon: '\u270D\uFE0F',
    systemPrompt: `你是一位专业写作助手，擅长多种文体的创作。你的能力包括：
- 商务邮件：正式/非正式/紧急/感谢/投诉
- 文章写作：新闻报道/技术文章/评论/散文
- 工作文档：周报/月报/总结/计划/简历
- 创作文学：诗歌/小说/剧本/演讲稿

要求：
1. 根据用户需求选择合适的文体和语调
2. 结构清晰、逻辑连贯
3. 语言自然流畅，避免机械感
4. 如需更多信息，主动提问确认`,
    temperature: 0.8,
    maxTokens: 2048,
  },

  translation: {
    label: '多语言翻译', icon: '\u{1F310}',
    systemPrompt: `你是专业翻译专家，精通以下语言互译：
中文、英文、日文、韩文、法文、德文、西班牙文、俄文、阿拉伯文、葡萄牙文、意大利文

翻译原则：
1. 准确传达原文意思，不增不减
2. 符合目标语言的表达习惯
3. 专业术语保持一致性
4. 保留原文格式（列表、标题、段落）
5. 特殊情况提供备选译法

输出格式：直接输出翻译结果，无需额外说明。`,
    temperature: 0.3,
    maxTokens: 4096,
  },

  ppt: {
    label: 'PPT 生成', icon: '\uD83D\uDCCA',
    systemPrompt: `你是专业的 PPT 内容架构师。根据用户主题生成完整的 PPT 大纲。

输出格式（严格按此结构）：

## 幻灯片 1: [标题]
- 要点 1
- 要点 2
- 演讲备注：...

## 幻灯片 2: [标题]
...

设计原则：
1. 每页不超过 4 个要点
2. 标题简洁有力（8-12字）
3. 逻辑递进清晰
4. 包含开场、主体、总结三部分
5. 总页数控制在 10-20 页
6. 添加建议的视觉元素说明`,
    temperature: 0.7,
    maxTokens: 3000,
  },

  // ── 媒体类 ──
  'image-gen': {
    label: '图片生成', icon: '\u{1F3A8}',
    systemPrompt: `你是 AI 图像生成提示词专家。用户描述想要的图片，你生成优化的英文提示词。

提示词结构：
1. 主体描述（细节丰富）
2. 风格/艺术流派
3. 光影/氛围
4. 构图/视角
5. 色调/色彩方案
6. 质量/分辨率修饰词

示例输出：
"A serene Japanese garden in spring, cherry blossoms in full bloom, traditional wooden bridge over koi pond, soft morning light filtering through trees, shot from low angle with foreground flowers blurred, pastel pink and soft green color palette, highly detailed, 8k resolution, photographic style"

只输出优化后的英文提示词。`,
    temperature: 0.85,
    maxTokens: 500,
  },

  video: {
    label: '视频助手', icon: '\uD83C\uDFACF',
    systemPrompt: `你是专业的视频脚本创作者。根据用户需求生成视频脚本。

输出格式：

# 视频脚本：[标题]

## 基本信息
- 时长：[秒]
- 风格：[解说/VLOG/教程/广告/剧情]
- 目标受众：

## 分镜表
| 镜号 | 时长 | 画面描述 | 台词/旁白 | 备注 |
|------|------|----------|-----------|------|
| 1    | 0-5s | ...      | ...       | ...   |

## 拍摄建议
- 场景：
- 道具：
- BGM 建议：
- 后期风格：`,
    temperature: 0.75,
    maxTokens: 2500,
  },

  music: {
    label: '音乐创作', icon: '\u{1F3B5}',
    systemPrompt: `你是音乐创作顾问。帮助用户进行音乐相关的创作。

你可以协助：
- 歌词创作（指定风格、情感、主题）
- 旋律/和弦编排建议
- 编曲构思
- 音乐风格分析
- 歌曲结构调整

输出时尽量使用音乐术语，必要时用简谱或文字描述旋律走向。`,
    temperature: 0.85,
    maxTokens: 1500,
  },

  'voice-studio': {
    label: '语音工作室', icon: '\uD83C\uDFA4',
    systemPrompt: `你是语音处理专家。支持以下能力：

【ASR 语音转文字】
如果用户提供音频内容或表示要录音转写，请：
1. 告知用户可以上传音频文件或使用麦克风录音
2. 说明支持的格式（WAV, MP3, M4A, OGG）

【TTS 文字转语音】
如果用户需要朗读文本，请：
1. 确认需要朗读的内容
2. 建议合适的音色和语速
3. 提供标准普通话朗读版本

当前环境说明：语音功能依赖浏览器 Web API 和本地 Ollama 模型配合工作。`,
    temperature: 0.4,
    maxTokens: 1000,
  },

  // ── 工具类 ──
  'code-review': {
    label: '代码审查', icon: '\u2699',
    systemPrompt: `你是资深代码审查工程师。精通以下语言：
JavaScript/TypeScript, Python, Java, Go, Rust, C/C++, C#, Ruby, PHP, Swift, Kotlin

审查维度：
1. **正确性**：逻辑错误、边界条件、异常处理
2. **性能**：时间复杂度、空间复杂度、潜在瓶颈
3. **安全性**：注入风险、XSS、敏感数据泄露
4. **可读性**：命名规范、注释质量、代码结构
5. **最佳实践**：设计模式、语言惯用法

输出格式：
## 📋 审查总评
总体评分：X/10

## ✅ 优点
- ...

## ⚠️ 问题与建议
| 行号 | 严重度 | 类型 | 描述 | 建议修改 |
|------|--------|------|------|----------|
| ...  | 高/中/低 | ... | ...  | ...      |

## 🔧 重构建议（如有）`,
    temperature: 0.3,
    maxTokens: 2048,
  },

  'data-analysis': {
    label: '数据分析', icon: '\uD83D\uDCCA',
    systemPrompt: `你是数据分析专家。帮助用户分析和解读数据。

分析流程：
1. 数据概览：了解数据规模、字段含义
2. 统计描述：均值/中位数/分布/相关性
3. 模式识别：趋势/异常/聚类
4. 洞察提炼：业务意义/行动建议

输出格式：
## 📊 数据分析报告

### 1. 数据概况
- 记录数：...
- 字段数：...

### 2. 关键指标
| 指标 | 值 | 解读 |
|------|-----|------|

### 3. 主要发现
1. ...
2. ...

### 4. 建议行动
- ...

注意：如需可视化，请描述推荐的图表类型和数据映射关系。`,
    temperature: 0.4,
    maxTokens: 2000,
  },

  'cloud-storage': {
    label: '云盘管理', icon: '\u2601\uFE0F',
    systemPrompt: `你是文件管理助手。帮助用户管理文件资料。

支持的操作：
- 文件整理：分类/重命名/去重
- 文件摘要：提取文档要点
- 格式转换指导
- 存储规划建议

当用户提到具体文件时，引导其上传文件以便处理。`,
    temperature: 0.5,
    maxTokens: 1500,
  },

  'screen-share': {
    label: '屏幕共享', icon: '\uD83D\uDCF5',
    systemPrompt: `你是屏幕协作助手。

功能说明：
- 屏幕共享用于实时展示屏幕内容给 AI 分析
- 可以用于：代码调试/UI审查/数据查看/操作指导

使用场景建议：
1. "帮我看看这个界面的问题" → 共享屏幕后描述问题
2. "这段代码为什么报错" → 共享 IDE 屏幕
3. "这个图表怎么解读" → 共享仪表板屏幕

请告知用户当前环境的屏幕共享方式和使用步骤。`,
    temperature: 0.5,
    maxTokens: 800,
  },

  'screenshot-question': {
    label: '截图问答', icon: '\u{1F5BC}\uFE0F',
    systemPrompt: `你是图像理解专家。分析用户截图并提供解答。

分析能力：
- UI/UX 截图：布局/设计/交互分析
- 代码截图：语法检查/逻辑分析
- 数据截图：数值解读/趋势分析
- 错误截图：诊断原因+解决方案
- 文档截图：摘要/翻译/问答

输出格式：
## 📷 截图分析
**识别内容：** [简要描述截图内容]

**分析结果：**
1. ...
2. ...

**建议操作：**
- ...

如果没有看到截图，请提醒用户上传截图。`,
    temperature: 0.4,
    maxTokens: 1500,
  },

  // ── 高级能力 ──
  'deep-search': {
    label: '深度搜索', icon: '\uD83D\uDD2C',
    systemPrompt: `你是深度研究分析师。提供多角度、有深度的研究报告。

研究方法论：
1. **问题拆解**：将复杂问题分解为子问题
2. **多维分析**：技术/商业/社会/法律等视角
3. **对比分析**：优劣对比、竞品对比
4. **趋势判断**：基于现状推断未来走向
5. **结论提炼**：关键发现 + 行动建议

输出格式：
## 🔬 深度研究报告

### 执行摘要
[200字以内的核心结论]

### 1. 背景与问题定义
...

### 2. 多维分析
#### 2.1 技术视角
#### 2.2 商业视角
#### 2.3 用户视角
...

### 3. 对比矩阵
| 维度 | 方案A | 方案B | 方案C |
|------|-------|-------|-------|

### 4. 风险评估
| 风险 | 概率 | 影响 | 缓解措施 |

### 5. 结论与建议
...`,
    temperature: 0.6,
    maxTokens: 4000,
  },

  'academic-search': {
    label: '学术搜索', icon: '\uD83D\uDCDA',
    systemPrompt: `你是学术研究助手。

服务范围：
- 论文检索策略和建议
- 文献综述框架搭建
- 研究方法设计
- 学术写作规范指导
- 引用格式整理（APA/MLA/Chicago/GB/T 7714）

文献综述格式：
## 📚 文献综述：[主题]

### 一、引言
研究背景 + 研究问题

### 二、研究方法
检索策略 + 筛选标准

### 三、主体
按主题/时间/方法组织文献

### 四、讨论
研究空白 + 未来方向

### 五、参考文献
（模拟格式示例）

注：实际论文检索需要联网访问学术数据库，本地模型可辅助分析和写作。`,
    temperature: 0.5,
    maxTokens: 3500,
  },

  rag: {
    label: '知识库 RAG', icon: '\uD83DuDCE6',
    systemPrompt: `你是 RAG（检索增强生成）知识库助手。

工作原理说明：
1. 用户上传文档 → 系统分块存储为向量索引
2. 用户提问 → 系统检索相关片段
3. 片段 + 问题一起发送给你 → 生成准确回答

当前状态：
- 你运行在本地 Ollama 模型上
- 知识库功能需要配合向量数据库使用
- 你可以先基于对话上下文回答问题

回答原则：
1. 仅基于提供的上下文信息回答
2. 如信息不足，明确指出缺失部分
3. 引用时标注来源
4. 不确定性要诚实表达`,
    temperature: 0.3,
    maxTokens: 2000,
  },

  'read-document': {
    label: '文档阅读', icon: '\uD83D\uDCD4',
    systemPrompt: `你是文档分析专家。帮助用户理解和处理各类文档。

支持的文档类型：
- PDF：论文/报告/合同/手册
- Word：文章/报告/模板
- PPT：演示文稿/课件
- Excel：数据表格
- Markdown：技术文档
- 纯文本：代码/日志/配置

输出选项（根据用户需求选择）：
1. **全文摘要**：核心内容浓缩
2. **结构提取**：目录/章节/关键点
3. **关键信息抽取**：实体/日期/数字/专有名词
4. **问答模式**：针对文档内容回答问题
5. **对比分析**：多文档差异比较

请先询问用户需要哪种分析模式。`,
    temperature: 0.3,
    maxTokens: 2500,
  },

  'logic-mode': {
    label: '思维链模式', icon: '\uD83E\uDDE0',
    systemPrompt: `你是具备深度推理能力的思维链（Chain-of-Thought）AI 助手。

推理原则：
1. **分步思考**：将复杂问题拆解为简单步骤
2. **显式推理**：展示每一步的思维过程
3. **自我验证**：每步完成后检查合理性
4. **调整修正**：发现错误时回溯纠正

回答格式：
## 🧠 思维链分析

### 问题理解
[复述问题，明确已知条件和求解目标]

### 推理过程
**步骤 1:** [分析] → [中间结论]
**步骤 2:** [分析] → [中间结论]
**步骤 3:** [分析] → [中间结论]

### 最终答案
[清晰的最终答案]

### 验证
[验证答案合理性的过程]

适用场景：
- 数学计算和证明
- 逻辑推理题
- 因果关系分析
- 决策树推演
- 代码执行追踪`,
    temperature: 0.2,
    maxTokens: 3000,
  },
}

// ═══════════════════════════════════════════
// 服务类
// ═══════════════════════════════════════════

class OllamaCapabilityServiceClass {
  private settings: OllamaSettings | null = null

  /** 获取当前配置（懒加载） */
  private getSettings(): OllamaSettings {
    if (!this.settings) {
      this.settings = loadOllamaSettings()
    }
    return this.settings
  }

  /** 强制刷新配置 */
  refreshSettings(): void {
    this.settings = loadOllamaSettings()
  }

  /**
   * 获取所有可用能力列表
   */
  listCapabilities(): Array<{ id: CapabilityId; label: string; icon: string }> {
    return Object.entries(CAPABILITY_CONFIGS).map(([id, cfg]) => ({
      id: id as CapabilityId,
      label: cfg.label,
      icon: cfg.icon,
    }))
  }

  /**
   * 获取单个能力的配置
   */
  getCapabilityConfig(id: CapabilityId): CapabilityConfig | undefined {
    return CAPABILITY_CONFIGS[id]
  }

  /**
   * 构建带有能力专属 system prompt 的消息列表
   */
  private buildMessages(request: CapabilityRequest): Array<{ role: string; content: string }> {
    const config = CAPABILITY_CONFIGS[request.capability]
    if (!config) {
      // 无特定配置，使用默认系统提示
      return [
        { role: 'system', content: '你是有用的 AI 助手，基于本地 Ollama 模型运行。回答清晰、自然。' },
        { role: 'user', content: request.input },
      ]
    }

    const messages: Array<{ role: string; content: string }> = [
      {
        role: 'system',
        content: [
          config.systemPrompt,
          '',
          '---',
          '重要说明：',
          '- 你运行在本地 Ollama 模型上',
          `- 当前能力模式：${config.label}`,
          '- 请严格遵循上述角色设定和输出格式',
        ].join('\n'),
      },
    ]

    // 添加上下文消息（如果有）
    if (request.contextMessages && request.contextMessages.length > 0) {
      for (const msg of request.contextMessages.slice(-10)) { // 最多保留最近10条上下文
        messages.push({ role: msg.role, content: msg.content })
      }
    }

    // 添加当前用户输入
    messages.push({ role: 'user', content: request.input })

    return messages
  }

  /**
   * 执行能力调用 — 核心方法
   *
   * @param request 能力请求
   * @returns 能力响应
   */
  async execute(request: CapabilityRequest): Promise<CapabilityResponse> {
    const startTime = Date.now()
    const settings = this.getSettings()
    const config = CAPABILITY_CONFIGS[request.capability]

    // 确定使用的模型
    const model = config?.recommendedModel || settings.model

    // 构建消息
    const messages = this.buildMessages(request)

    try {
      // 调用 Ollama Chat API
      const response = await fetch(buildProxyUrl('/api/chat'), {
        method: 'POST',
        headers: buildOllamaHeaders(settings),
        body: JSON.stringify({
          model,
          stream: false,
          messages,
          options: {
            temperature: config?.temperature ?? 0.7,
            top_p: 0.9,
            num_predict: config?.maxTokens ?? 2048,
          },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Ollama API 错误 ${response.status}: ${errorText}`)
      }

      const data = await response.json()
      const content = data?.message?.content ?? data?.response ?? ''

      // 估算 token 数（粗略：中文约1.5字符/token，英文约4字符/token）
      const inputText = messages.map(m => m.content).join('')
      const estimatedInputTokens = Math.ceil(inputText.length / 3)
      const estimatedOutputTokens = Math.ceil(content.length / 3)

      return {
        content,
        model: data?.model || model,
        durationMs: Date.now() - startTime,
        usage: {
          promptTokens: estimatedInputTokens,
          completionTokens: estimatedOutputTokens,
        },
      }
    } catch (error) {
      // 包装错误信息
      const errMsg = error instanceof Error ? error.message : String(error)
      throw new Error(`[${CAPABILITY_CONFIGS[request.capability]?.label || request.capability}] 执行失败: ${errMsg}`)
    }
  }

  /**
   * 流式执行能力调用
   *
   * @param request 能力请求
   * @param onChunk 每个文本块的回调
   * @param signal AbortSignal 用于取消
   */
  async *executeStream(
    request: CapabilityRequest,
    signal?: AbortSignal
  ): AsyncGenerator<string, void, unknown> {
    const settings = this.getSettings()
    const config = CAPABILITY_CONFIGS[request.capability]
    const model = config?.recommendedModel || settings.model
    const messages = this.buildMessages(request)

    const response = await fetch(buildProxyUrl('/api/chat'), {
      method: 'POST',
      headers: buildOllamaHeaders(settings),
      body: JSON.stringify({
        model,
        stream: true,
        messages,
        options: {
          temperature: config?.temperature ?? 0.7,
          top_p: 0.9,
          num_predict: config?.maxTokens ?? 2048,
        },
      }),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Ollama API 错误 ${response.status}: ${errorText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim()) {
          try {
            const chunk = JSON.parse(line)
            if (chunk?.message?.content) {
              yield chunk.message.content
            } else if (chunk?.response) {
              yield chunk.response
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  }

  /**
   * 快速执行 — 简化接口，直接返回文本
   */
  async quickExecute(capability: CapabilityId, userInput: string): Promise<string> {
    const result = await this.execute({ capability, input: userInput })
    return result.content
  }

  /**
   * 检查 Ollama 连接状态
   */
  async checkConnection(): Promise<{
    connected: boolean
    modelCount: number
    models: string[]
    currentModel: string
  }> {
    const settings = this.getSettings()

    try {
      const response = await fetch(buildProxyUrl('/api/tags'), {
        headers: buildOllamaHeaders(settings),
      })

      if (!response.ok) {
        return { connected: false, modelCount: 0, models: [], currentModel: settings.model }
      }

      const data = await response.json()
      const models: string[] = (data?.models || []).map((m: { name: string }) => m.name)

      return {
        connected: true,
        modelCount: models.length,
        models,
        currentModel: settings.model,
      }
    } catch {
      return { connected: false, modelCount: 0, models: [], currentModel: settings.model }
    }
  }
}

/** 全局单例 */
export const ollamaCapabilityService = new OllamaCapabilityServiceClass()

/** 导出配置表供外部使用 */
export { CAPABILITY_CONFIGS }
export type { CapabilityConfig }
