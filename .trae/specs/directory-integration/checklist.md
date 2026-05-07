# 目录结构集成检查清单

## 预检查

- [ ] 确认当前工作目录正确
- [ ] 确认 git 状态干净或已提交更改
- [ ] 确认所有依赖已安装

## 检查项目 1: text-processing-infrastructure 依赖检查

```bash
# 检查是否有包依赖 text-processing-infrastructure
grep -r "text-processing-infrastructure" packages/*/package.json
grep -r "@ai-intelligent-analysis-platform/text-processing" packages/*/src
```

- [ ] 无其他包依赖此包
- [ ] 可以安全删除

## 检查项目 2: opencli-extension 集成

### 2.1 文件结构检查

- [ ] `packages/opencli-extension/package.json` 存在
- [ ] `packages/opencli-extension/tsconfig.json` 存在
- [ ] `packages/opencli-extension/webpack.config.js` 存在
- [ ] `packages/opencli-extension/src/background/index.ts` 存在
- [ ] `packages/opencli-extension/src/popup/index.ts` 存在

### 2.2 配置检查

- [ ] package.json 包含正确的依赖
- [ ] package.json 包含构建脚本
- [ ] tsconfig.json 配置正确
- [ ] webpack.config.js 配置正确

### 2.3 构建检查

- [ ] `npm run build` 在 opencli-extension 目录下成功
- [ ] 生成的 `dist/background.js` 存在
- [ ] 生成的 `dist/popup.js` 存在

## 检查项目 3: Turborepo 集成

### 3.1 turbo.json 检查

- [ ] turbo.json 包含 opencli-extension 配置
- [ ] 运行 `turbo run build` 无警告
- [ ] 运行 `turbo run typecheck` 无警告

### 3.2 根目录 package.json 检查

- [ ] 包含 `build:opencli` 脚本
- [ ] workspaces 配置正确

## 检查项目 4: 最终验证

### 4.1 构建验证

```bash
# 运行完整构建
npm run build

# 运行类型检查
npm run typecheck

# 运行 lint
npm run lint
```

- [ ] `npm run build` 成功
- [ ] `npm run typecheck` 成功
- [ ] `npm run lint` 成功

### 4.2 功能验证

- [ ] OpenCLI 扩展可在 Chrome 中加载
- [ ] 扩展 popup 正常显示
- [ ] 扩展 background 服务正常

## 完成确认

- [ ] 所有检查项通过
- [ ] 文档已更新
- [ ] 代码已提交
