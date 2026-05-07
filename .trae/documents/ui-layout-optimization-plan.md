# UI 和布局优化计划

## 目标
按照原生豆包程序优化 `http://127.0.0.1:3000/` 的 UI 和布局，提升用户体验。

## 当前问题分析

1. **构建错误**: `Module not found: Can't resolve '@/components/ui/hover-card'` — 缺少 shadcn/ui 组件
2. **Ollama 404 错误**: `/api/ollama/chat` 返回 404，API 路由可能未正确注册
3. **首页布局**: 当前 DoubaoHomePage 布局基本可用，但缺少一些原生豆包的视觉细节

## 优化步骤

### 阶段 1: 修复构建错误（阻塞性问题）

1. **创建缺失的 UI 组件**
   - 创建 `packages/web/src/components/ui/hover-card.tsx`
   - 创建 `packages/web/src/components/ui/badge.tsx`
   - 基于现有项目中的 Tooltip 组件风格实现

2. **修复 SourceCitation.tsx 引用**
   - 检查 `app/unified-chat/components/ragflow/SourceCitation.tsx` 的实际路径
   - 确保所有引用路径正确

### 阶段 2: 修复 Ollama API 404 错误

1. **检查 API 路由配置**
   - 确认 `[...path]/route.ts` 文件位置正确
   - 检查 Next.js 是否正确识别 catch-all 路由
   - 清理 `.next` 缓存并重启开发服务器

2. **验证代理配置**
   - 确保 `next.config.js` 中的 `OLLAMA_BASE_URL` 使用 `localhost:11434`
   - 确认 `.env.local` 配置正确

### 阶段 3: 首页 UI/UX 优化

1. **DoubaoHomePage 布局优化**
   - 优化侧边栏 `HomeSidebar` 的视觉效果
   - 增强聊天消息区域的视觉层次
   - 改进输入框区域的交互反馈

2. **FeaturePanel 优化**
   - 增强功能卡片的悬停效果
   - 添加更多动画过渡
   - 优化网格布局响应式表现

3. **ChatInputBox 优化**
   - 优化工具按钮组的视觉一致性
   - 增强拖放区域的视觉反馈
   - 改进附件预览的卡片样式

4. **全局样式优化**
   - 检查并优化 `globals.css` 中的动画定义
   - 确保暗色模式支持完整
   - 添加平滑滚动和过渡效果

### 阶段 4: 验证和测试

1. **构建验证**
   - 运行 `npm run build` 确保无错误
   - 检查所有 TypeScript 类型正确

2. **功能验证**
   - 验证 Ollama API 代理正常工作
   - 验证文档解析功能可用
   - 验证聊天功能正常

3. **视觉验证**
   - 检查首页布局是否符合预期
   - 验证响应式布局在各尺寸下正常
   - 检查暗色模式切换正常

## 实施顺序

1. 先修复构建错误（hover-card 组件）
2. 清理缓存重启服务器
3. 并行优化 UI 组件
4. 最终验证构建和功能

## 注意事项

- 保持与现有代码风格一致
- 使用 Tailwind CSS 进行样式定义
- 确保暗色模式兼容性
- 避免引入新的依赖（如果可能）
