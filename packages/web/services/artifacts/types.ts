/**
 * Artifact 类型定义增强
 *
 * 扩展 WebArtifactKind 以支持更多原生豆包 Canvas 承载层类型：
 * code-artifact / ppt-preview / video-artifact / whiteboard / step-canvas / search-result
 */

// ==================== 基础类型 ====================

export type WebArtifactKind =
  | 'skill-result'
  | 'diagnostic-report'
  | 'code-artifact'       // 代码产物（可编辑+工具栏）
  | 'ppt-preview'         // PPT 预览
  | 'video-artifact'      // 视频 artifact
  | 'whiteboard'          // 白板画布
  | 'step-canvas'         // 分步展示面板
  | 'search-result';      // 搜索结果画布

export interface BaseArtifact {
  id: string
  kind: WebArtifactKind
  title?: string
  createdAt: number
  metadata?: Record<string, unknown>
}

// ==================== Code Artifact ====================

export interface CodeArtifact extends BaseArtifact {
  kind: 'code-artifact'
  code: string
  language: string
  filename?: string
  /** 是否可编辑 */
  editable?: boolean
}

// ==================== PPT Preview Artifact ====================

export interface PptPreviewArtifact extends BaseArtifact {
  kind: 'ppt-preview'
  slideCount: number
  thumbnailUrl?: string
  downloadUrl?: string
}

// ==================== Video Artifact ====================

export interface VideoArtifact extends BaseArtifact {
  kind: 'video-artifact'
  videoUrl?: string
  thumbnailUrl?: string
  duration?: number
  summary?: string
}

// ==================== Whiteboard Artifact ====================

export interface WhiteboardArtifact extends BaseArtifact {
  kind: 'whiteboard'
  canvasData?: string // 序列化的画布内容
  width?: number
  height?: number
}

// ==================== Step Canvas Artifact ====================

export interface StepCanvasArtifact extends BaseArtifact {
  kind: 'step-canvas'
  steps: StepItem[]
  currentStep?: number
}

export interface StepItem {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  content?: string
}

// ==================== Search Result Artifact ====================

export interface SearchResultArtifact extends BaseArtifact {
  kind: 'search-result'
  query: string
  sources: SearchResultSource[]
  summary?: string
}

export interface SearchResultSource {
  title: string
  url: string
  snippet: string
  favicon?: string
}

// ==================== 联合类型 ====================
export type WebArtifact =
  | CodeArtifact
  | PptPreviewArtifact
  | VideoArtifact
  | WhiteboardArtifact
  | StepCanvasArtifact
  | SearchResultArtifact
  | (BaseArtifact & { kind: 'skill-result' | 'diagnostic-report' });
