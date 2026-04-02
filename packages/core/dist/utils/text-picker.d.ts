import { TextPicker, TextPickerConfig } from '../types/text-picker';
/**
 * 文本选择器实现
 */
export declare class BrowserTextPicker implements TextPicker {
    private config;
    private container;
    private isEnabled;
    private mousePosition;
    constructor();
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
    /**
     * 处理鼠标移动，记录鼠标位置
     */
    private handleMouseMove;
    /**
     * 处理鼠标释放，显示文本选择器
     */
    private handleMouseUp;
    /**
     * 显示文本选择器
     */
    private showPicker;
    /**
     * 隐藏文本选择器
     */
    private hidePicker;
    /**
     * 处理文档点击，关闭选择器
     */
    private handleDocumentClick;
    /**
     * 创建操作按钮
     */
    private createActionButton;
    /**
     * 创建自定义操作按钮
     */
    private createCustomActionButton;
    /**
     * 复制文本
     */
    private copyText;
    /**
     * 搜索文本
     */
    private searchText;
    /**
     * 翻译文本
     */
    private translateText;
    /**
     * 解释文本
     */
    private explainText;
    /**
     * 总结文本
     */
    private summarizeText;
    /**
     * 保存文本
     */
    private saveText;
    /**
     * 分享文本
     */
    private shareText;
    /**
     * 显示更多选项
     */
    private showMoreOptions;
}
/**
 * 全局文本选择器实例
 */
export declare const textPicker: BrowserTextPicker;
export default textPicker;
