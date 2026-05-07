// 上下文模块导出

export { ContextManager, contextManager } from './context-manager';
export { PageContextCapture, pageContextCapture } from './page-context-capture';
export { DocumentContextExtract, documentContextExtract } from './document-context-extract';

export type {
  ContextSource,
  ContextSourceType,
  ContextConfig,
  PageContext,
  DocumentContext
} from './context-manager';

export type { ExtractOptions } from './page-context-capture';
export type { DocumentExtractOptions, SupportedDocType } from './document-context-extract';
