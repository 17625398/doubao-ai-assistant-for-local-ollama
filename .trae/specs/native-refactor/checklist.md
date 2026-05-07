# 根据豆包原生程序重构项目 - 验证检查清单

## 功能开关服务
- [x] 中心化 FeatureCapabilityService 已创建
- [x] 功能开关配置结构完整（follow-up、OCR、deep-search、picker）
- [x] 环境变量覆盖机制正常工作
- [x] 服务已正确导出到核心模块

## Web 内容提取服务
- [x] ExtractionResult schema 已扩展（源引擎、回退追踪、置信度）
- [x] handleHttp 和调度器回退遥测已增强
- [x] web-content-extraction-service 与 pipeline 已集成

## PDF/OCR 策略层
- [x] PdfProcessingPolicy 配置对象已引入
- [x] 超时/重试策略已集中化
- [x] PDF 解析器已更新使用策略配置

## 后续问题生成管道
- [x] 后续问题 payload 验证器已实现
- [x] category enum 和 priority bounds 已定义
- [x] 遥测点已添加（超时、解析失败、回退使用）

## 文本选择器事件总线
- [x] 类型化事件总线适配器已创建
- [x] 动作 ID 到面板命令的映射注册表已实现
- [x] page.tsx 已更新使用新的事件总线

## UI 面板编排系统
- [x] 面板路由/状态机已提取
- [x] 全局事件连接已移至专用 hook/module
- [x] page.tsx 面板逻辑已简化

## 测试与验证
- [x] 所有单元测试通过
- [x] 集成测试覆盖关键场景
- [x] 手动验证关键用户流程正常工作
- [x] 性能不低于重构前
- [x] 项目构建成功