# 安全策略与最佳实践

## 概述

本文档记录 AI 智能分析平台的安全最佳实践、已知限制和安全检查清单。所有贡献者应遵循这些准则以确保代码和系统的安全性。

## 安全最佳实践

### 1. API 密钥管理

- **禁止硬编码密钥**：所有 API 密钥、密码和敏感令牌必须通过环境变量或安全的密钥管理系统提供
- **密钥格式检测**：项目内置 OpenClawSecurityService，可自动检测以下密钥格式：
  - OpenAI API Key (`sk-...`)
  - Google API Key (`AIza...`)
  - GitHub PAT (`ghp_...`)
  - 通用密码模式
  - 私钥格式 (`-----BEGIN PRIVATE KEY-----`)
- **密钥掩码**：在日志和错误信息中，密钥应被掩码处理（如 `sk-t...789`）
- **环境变量示例**：
  ```bash
  OPENAI_API_KEY=sk-...
  GEMINI_API_KEY=...
  LINKMIND_API_KEY=...
  ```

### 2. 输入验证与 XSS 防护

- **MessageSanitizer**：所有用户输入必须通过 `MessageSanitizer` 进行处理
  - 移除 HTML 标签
  - 转义特殊字符（`&`, `<`, `>`, `"`, `'`）
  - 移除控制字符（`\x00-\x1F`, `\x7F`）
  - 限制内容长度（最大 10000 字符）
- **恶意内容检测**：自动检测并阻止包含以下内容的输入：
  - `javascript:` 协议
  - 事件处理器（`onerror`, `onload`, `onclick`）
  - `<script>` 和 `<iframe>` 标签
  - `eval()` 调用
- **HTML 转义**：在扩展和 Web 界面中使用 `escapeHtml` 函数转义动态内容

### 3. 文件上传安全

- **文件类型限制**：仅允许以下文件类型：
  - 图片：`image/jpeg`, `image/png`, `image/gif`, `image/webp`
  - 文档：`application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - 文本：`text/plain`, `text/markdown`, `text/html`
  - 电子表格：`application/vnd.ms-excel`, `text/csv`
- **文件大小限制**：
  - 文档服务：`50MB`
  - ChatClaw 文档服务：`10MB`
  - 日志文件：`10MB`（自动轮转）
- **MIME 类型验证**：上传文件时验证 MIME 类型与扩展名的一致性
- **代码文件处理**：代码文件（`.ts`, `.js`, `.py` 等）被识别为 `code` 类型，内容提取时限制长度

### 4. 危险函数使用规范

以下危险函数在项目中存在使用，已采取安全措施：

| 函数 | 位置 | 用途 | 安全措施 |
|------|------|------|----------|
| `eval()` | `chatclaw-agent-service.ts:760` | 数学表达式计算 | 仅用于受信任的表达式，建议替换为安全计算库 |
| `eval()` | `plugin-system.ts:364` | 插件代码执行 | 插件代码来自受信任源，建议添加代码签名验证 |
| `new Function()` | `plugin-system.ts:329` | 动态模块导入 | 仅用于模块路径，限制输入范围 |
| `new Function()` | `example-tool-plugin.ts:59` | 数学表达式计算 | 清理表达式后使用，建议替换为安全库 |
| `innerHTML` | 多处 | DOM 内容更新 | 仅在受控环境中使用，确保内容已转义 |

**建议**：逐步替换 `eval()` 和 `new Function()` 为安全的替代方案：
- 数学计算：使用 `mathjs` 或自定义安全解析器
- 插件系统：实现代码签名和沙箱执行

### 5. 本地文件访问限制

- **文件系统访问**：以下服务需要文件系统访问权限：
  - `OpenKBService`：知识库文件管理
  - `LoggerService`：日志文件写入
  - `PluginManagerService`：插件文件加载
  - `PageIndexService`：页面索引持久化
- **安全措施**：
  - 所有文件路径应验证在允许的目录内
  - 使用 `path.resolve()` 和 `path.normalize()` 防止路径遍历
  - 日志目录和知识库目录应配置为受限访问
  - 文件操作前检查文件存在性和权限

### 6. URL 验证与 SSRF 防护

- **协议验证**：仅允许 `http://` 和 `https://` 协议
- **SSRF 防护**：阻止访问内部网络地址：
  - `127.0.0.1`, `localhost`
  - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
  - `0.0.0.0`, `169.254.0.0/16`
  - IPv6 本地地址 (`::1`, `fc00::/7`)
- **URL 解析**：使用 `new URL()` 验证 URL 格式
- **路径清理**：移除路径遍历尝试（`../`, `..\\`）

### 7. WebSocket 安全

- **协议要求**：优先使用 `wss://`（加密 WebSocket）
- **验证**：拒绝 `ws://` 在生产环境中的使用
- **消息验证**：WebSocket 消息应经过与 HTTP 请求相同的验证流程

## 已知限制

### 当前版本的安全限制

1. **eval() 使用**：`chatclaw-agent-service.ts` 和 `plugin-system.ts` 中仍使用 `eval()`，虽然仅在受信任环境中使用，但建议未来版本移除
2. **MIME 类型伪造**：`AttachmentProcessor` 主要依赖文件 MIME 类型进行类型判断，攻击者可能通过伪造 MIME 类型上传恶意文件
3. **插件代码执行**：远程插件通过 `eval()` 执行，缺乏代码签名验证机制
4. **浏览器扩展 innerHTML**：扩展侧栏使用 `innerHTML` 更新内容，虽然已使用 `escapeHtml` 转义，但建议迁移到更安全的 DOM API
5. **文件系统路径验证**：部分文件系统操作缺乏严格的路径遍历防护，建议统一使用路径验证工具函数

### 建议改进

- [ ] 替换所有 `eval()` 和 `new Function()` 为安全替代方案
- [ ] 实现文件签名验证（magic number）以替代纯 MIME 类型检查
- [ ] 添加插件代码签名和验证机制
- [ ] 统一文件系统路径验证工具
- [ ] 实现更完善的 SSRF 防护中间件
- [ ] 添加请求速率限制和 DDoS 防护

## 安全测试

项目包含以下安全测试套件：

```bash
# 运行所有安全测试
cd packages/core && npm test -- src/__tests__/security/

# 运行输入验证测试
npm test -- input-validation.test.ts

# 运行文件上传安全测试
npm test -- file-upload-security.test.ts

# 运行 API 安全测试
npm test -- api-security.test.ts
```

### 测试覆盖范围

- **input-validation.test.ts**：XSS 防护、HTML 转义、恶意内容检测、输入长度限制
- **file-upload-security.test.ts**：文件类型验证、大小限制、MIME 类型检查、路径遍历防护
- **api-security.test.ts**：密钥管理、URL 验证、请求头安全、响应处理、SSRF 防护

## 报告安全问题

如果您发现安全漏洞，请通过以下方式报告：

1. **不要**在公开 issue 中披露漏洞细节
2. 发送邮件至项目维护团队
3. 提供详细的复现步骤和影响评估
4. 等待修复发布后再公开披露

## 安全修复记录

### 2026-04-27 安全修复

本次优化修复了以下安全问题：

1. **MessageSanitizer XSS 防护增强**
   - 修复了 `<` 和 `>` 被错误移除而非转义的问题
   - 特殊字符现在正确转义为 `&lt;` 和 `&gt;`
   - 事件处理器检测从固定列表扩展为通用正则 `/on\w+\s*=/gi`
   - 新增 `javascript:` URL 协议检查

2. **API 密钥泄露防护**
   - 错误信息中的密钥现在正确被 `[REDACTED]` 替换
   - 修复了通用字符替换导致的密钥残留问题

3. **文件上传安全**
   - 验证文件大小限制逻辑
   - MIME 类型与扩展名双重验证

## 安全审计

定期运行安全审计：

```bash
# 运行依赖安全审计
npm audit

# 运行项目安全测试
npm run security-audit

# 运行所有测试（包括安全测试）
cd packages/core && npm run test
```

## 合规性

- 遵循 OWASP Top 10 安全准则
- 实施最小权限原则
- 所有敏感操作记录审计日志
- 定期更新依赖包以修复已知漏洞
