# 目录结构集成任务列表

## 阶段 1: 分析与评估

### 任务 1.1: 检查依赖关系
- [ ] 检查 `text-processing-infrastructure` 是否被其他包依赖
- [ ] 检查 `opencli-extension` 的功能需求
- [ ] 评估集成工作量

### 任务 1.2: 备份与准备
- [ ] 备份当前项目状态
- [ ] 创建功能分支

## 阶段 2: 处理空包

### 任务 2.1: 删除 text-processing-infrastructure
- [ ] 检查是否有代码引用此包
- [ ] 从 package-lock.json 中移除引用
- [ ] 删除 `packages/text-processing-infrastructure/` 目录
- [ ] 更新根目录 package.json（如有引用）

## 阶段 3: 集成 OpenCLI 扩展

### 任务 3.1: 创建项目结构
- [ ] 在 `packages/opencli-extension/` 创建 `src/` 目录
- [ ] 创建 `src/background/index.ts`
- [ ] 创建 `src/popup/index.ts`
- [ ] 迁移现有 `popup.js` 代码到 TypeScript

### 任务 3.2: 添加配置文件
- [ ] 创建 `package.json`
- [ ] 创建 `tsconfig.json`
- [ ] 创建 `webpack.config.js`

### 任务 3.3: 集成到构建流程
- [ ] 更新 `turbo.json` 添加 opencli-extension
- [ ] 更新根目录 `package.json` scripts
- [ ] 测试构建流程

## 阶段 4: 验证与测试

### 任务 4.1: 验证构建
- [ ] 运行 `npm run build` 验证所有包构建成功
- [ ] 运行 `npm run typecheck` 验证类型检查通过
- [ ] 运行 `npm run lint` 验证代码规范

### 任务 4.2: 功能测试
- [ ] 测试 OpenCLI 扩展功能
- [ ] 验证扩展可以正常加载

## 阶段 5: 文档更新

### 任务 5.1: 更新文档
- [ ] 更新 README.md
- [ ] 更新项目结构文档
- [ ] 添加 OpenCLI 扩展使用说明
