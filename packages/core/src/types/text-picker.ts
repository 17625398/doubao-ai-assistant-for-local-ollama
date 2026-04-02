// 文本选择器相关类型定义

/**
 * 文本选择器操作类型
 */
export enum TextPickerAction {
  COPY = 'copy',
  SEARCH = 'search',
  TRANSLATE = 'translate',
  EXPLAIN = 'explain',
  SUMMARIZE = 'summarize',
  SAVE = 'save',
  SHARE = 'share',
  MORE = 'more',
}

/**
 * 文本选择器配置
 */
export interface TextPickerConfig {
  /** 是否启用文本选择器 */
  enabled: boolean;
  /** 显示的操作按钮 */
  actions: TextPickerAction[];
  /** 是否在扩展中启用 */
  enableInExtension: boolean;
  /** 是否在Web应用中启用 */
  enableInWeb: boolean;
  /** 自定义操作 */
  customActions?: TextPickerCustomAction[];
}

/**
 * 自定义操作
 */
export interface TextPickerCustomAction {
  /** 操作ID */
  id: string;
  /** 操作名称 */
  name: string;
  /** 操作图标 */
  icon: string;
  /** 操作处理函数 */
  handler: (text: string, selection: Selection) => void;
}

/**
 * 文本选择事件
 */
export interface TextSelectionEvent {
  /** 选中的文本 */
  text: string;
  /** 选择对象 */
  selection: Selection;
  /** 选择范围 */
  range: Range;
  /** 鼠标位置 */
  mousePosition: { x: number; y: number };
  /** 页面URL */
  url: string;
  /** 页面标题 */
  title: string;
}

/**
 * 文本选择器接口
 */
export interface TextPicker {
  /**
   * 初始化文本选择器
   */
  init(config?: Partial<TextPickerConfig>): void;
  
  /**
   * 启用文本选择器
   */
  enable(): void;
  
  /**
   * 禁用文本选择器
   */
  disable(): void;
  
  /**
   * 更新配置
   */
  updateConfig(config: Partial<TextPickerConfig>): void;
  
  /**
   * 销毁文本选择器
   */
  destroy(): void;
}
