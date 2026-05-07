# 目录结构检查与集成规范

## 1. 概述

本规范用于检查 `D:\Doubao\refactored` 项目的目录结构，并集成未正确集成的目录。

## 2. 当前目录结构分析

### 2.1 Monorepo 结构

项目采用 monorepo 结构，使用 npm workspaces 和 Turborepo 管理：

```
D:\Doubao\refactored/
├── packages/
│   ├── core/                          # 核心库 ✅ 已集成
│   ├── extension/                     # 浏览器扩展 ✅ 已集成
│   ├── web/                           # Web 应用 ✅ 已集成
│   ├── knowledge-base/                # 知识库 ⚠️ 需评估
│   ├── opencli-extension/             # OpenCLI 扩展 ❌ 未集成
│   └── text-processing-infrastructure/ # 文本处理基础设施 ❌ 空包
├── docs/                              # 项目文档
├── scripts/                           # 脚本文件
└── config/                            # 配置文件
```

### 2.2 问题识别

#### 问题 1: `text-processing-infrastructure` 空包

- **位置**: `packages/text-processing-infrastructure/`
- **状态**: 只有 `package.json`，没有实际代码
- **依赖**: 包含 NLP 相关依赖（transformers, cheerio, jsdom, nltk, node-nlp, playwright, spacy）
- **问题**: 
  - 没有 `index.js` 或任何源代码
  - 没有构建脚本
  - turbo.json 警告找不到此包

#### 问题 2: `opencli-extension` 未集成

- **位置**: `packages/opencli-extension/`
- **状态**: 独立的浏览器扩展，未集成到构建流程
- **问题**:
  - 没有 `package.json`
  - manifest.json 引用 `dist/background.js`，但没有源代码
  - 没有构建脚本
  - 未添加到 turbo 构建流程

#### 问题 3: `knowledge-base` 目录

- **位置**: `packages/knowledge-base/`
- **状态**: 知识库存储目录
- **评估**: 这是数据目录，不需要构建集成

## 3. 集成方案

### 3.1 方案 A: 删除空包

对于 `text-processing-infrastructure`：

**选项 A1**: 完全删除
- 如果不需要此功能，直接删除整个目录

**选项 A2**: 实现基础结构
- 创建 `src/` 目录
- 添加文本处理相关功能
- 添加构建配置

### 3.2 方案 B: 集成 OpenCLI 扩展

对于 `opencli-extension`：

**步骤**:
1. 创建 `package.json`
2. 创建 `src/` 目录，添加 TypeScript 源代码
3. 添加构建配置（webpack/esbuild）
4. 添加到 turbo.json pipeline
5. 更新根目录 package.json scripts

### 3.3 推荐方案

基于项目当前状态，推荐以下操作：

1. **删除 `text-processing-infrastructure`**: 由于它是空包且没有实际用途
2. **集成 `opencli-extension`**: 将其转换为完整的 TypeScript 项目
3. **保留 `knowledge-base`**: 作为数据目录，不需要构建

## 4. 目标结构

集成后的目录结构：

```
packages/
├── core/                    # 核心库
├── extension/               # 主浏览器扩展
├── web/                     # Web 应用
├── knowledge-base/          # 知识库数据
└── opencli-extension/       # OpenCLI 扩展（已集成）
    ├── src/
    │   ├── background/
    │   ├── popup/
    │   └── index.ts
    ├── dist/
    ├── package.json
    ├── tsconfig.json
    └── webpack.config.js
```

## 5. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 删除空包影响依赖 | 低 | 检查是否有其他包依赖它 |
| OpenCLI 集成复杂度 | 中 | 参考现有 extension 包结构 |
| 构建流程变更 | 中 | 充分测试 turbo pipeline |

## 6. 验收标准

1. 所有包都有完整的 `package.json`
2. `turbo.json` 不再显示警告
3. `npm run build` 成功构建所有包
4. `npm run typecheck` 通过所有类型检查
