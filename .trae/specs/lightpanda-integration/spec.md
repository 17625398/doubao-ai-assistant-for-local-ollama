# Lightpanda 深度集成规格文档

## 为什么

集成 Lightpanda 无头浏览器，解决现有网页内容提取无法处理 JavaScript 渲染页面的问题。Lightpanda 具有超低内存占用（比 Chrome 少 16 倍）和极速执行（比 Chrome 快 9 倍）的优势，能显著提升网页内容提取的准确性和效率。

## 变更内容

- **新增** Lightpanda 浏览器集成模块
- **新增** 多引擎内容提取策略（Lightpanda + Jina.ai）
- **新增** CDP 服务器模式支持
- **增强** `/api/read` 端点，支持引擎选择
- **新增** Docker Compose 配置用于 Lightpanda 服务
- **新增** 网页内容提取引擎选择 UI

## 影响范围

- 受影响的 API：`/api/read`（增强）
- 新增模块：`packages/core/src/utils/lightpanda-client.ts`
- 新增组件：`LightpandaConfigPanel`
- 配置文件：`docker-compose.yml`（新增 Lightpanda 服务）

## 新增需求

### 需求1: Lightpanda 客户端封装

系统应提供 Lightpanda 客户端封装，支持多种调用方式。

#### 场景1.1: CLI 模式调用
- **当** 系统需要抓取网页内容
- **并且** Lightpanda 二进制文件可用
- **然后** 使用 `lightpanda fetch` 命令抓取
- **并且** 返回提取的 HTML 内容

#### 场景1.2: CDP 服务器模式
- **当** 需要处理复杂的网页交互
- **然后** 连接到 Lightpanda CDP 服务器
- **并且** 通过 Puppeteer API 控制浏览器
- **并且** 执行自定义提取脚本

#### 场景1.3: Docker 模式
- **当** 本地未安装 Lightpanda
- **然后** 自动使用 Docker 启动 Lightpanda 服务
- **并且** 通过端口映射进行通信

### 需求2: 多引擎提取策略

系统应支持多种提取引擎，并自动选择最佳方案。

#### 场景2.1: 自动引擎选择
- **当** 用户请求提取网页内容
- **并且** 未指定引擎
- **然后** 系统按优先级尝试：
  1. Lightpanda（如果可用）
  2. Jina.ai（作为后备）
- **并且** 返回第一个成功的结果

#### 场景2.2: 引擎降级处理
- **当** Lightpanda 抓取失败
- **然后** 自动降级到 Jina.ai
- **并且** 记录失败原因

#### 场景2.3: 用户指定引擎
- **当** 用户明确指定使用 Lightpanda
- **并且** Lightpanda 不可用
- **然后** 返回错误提示
- **并且** 建议安装或切换到自动模式

### 需求3: 增强内容提取

使用 Lightpanda 执行 JavaScript 后提取内容。

#### 场景3.1: SPA 页面提取
- **当** 目标页面是单页应用（SPA）
- **然后** Lightpanda 执行 JavaScript
- **并且** 等待网络空闲
- **并且** 提取最终渲染的 DOM 内容

#### 场景3.2: 动态内容加载
- **当** 页面需要滚动加载更多内容
- **然后** Lightpanda 模拟滚动操作
- **并且** 等待新内容加载
- **并且** 提取完整内容

#### 场景3.3: 登录态页面
- **当** 页面需要 Cookie 或 Session
- **然后** 支持设置自定义请求头
- **并且** 携带 Cookie 访问页面

### 需求4: 配置管理

系统应提供 Lightpanda 配置管理界面。

#### 场景4.1: 引擎配置
- **当** 用户打开设置面板
- **然后** 显示 Lightpanda 配置选项
- **并且** 支持配置：
  - 使用模式（CLI / CDP / Docker）
  - 二进制路径
  - CDP 服务器地址
  - 超时时间
  - 是否遵守 robots.txt

#### 场景4.2: 状态检测
- **当** 用户查看配置
- **然后** 检测 Lightpanda 可用性
- **并且** 显示状态指示器（可用/不可用）

#### 场景4.3: Docker 一键启动
- **当** 用户点击"启动 Lightpanda 服务"
- **然后** 自动执行 Docker 命令
- **并且** 等待服务就绪
- **并且** 显示服务状态

## 修改需求

### 需求5: 增强 /api/read 端点

**修改内容**：扩展现有的 `/api/read` API，支持引擎选择

- 新增 `engine` 查询参数（`auto` | `lightpanda` | `jina`）
- 返回结果包含使用的引擎信息
- 优化错误处理和降级逻辑

## 技术要求

### Lightpanda 集成
- 支持 Lightpanda CLI 调用
- 支持 CDP 服务器连接（WebSocket）
- 支持 Docker 容器管理
- 超时控制：默认 30 秒

### 多引擎策略
- 引擎优先级：Lightpanda > Jina.ai
- 自动降级机制
- 用户可强制指定引擎
- 记录引擎使用统计

### 内容提取
- 支持 JavaScript 执行
- 支持网络空闲等待
- 支持自定义请求头
- 支持 Cookie 传递

### 配置管理
- 配置文件持久化
- 环境变量支持
- 运行时状态检测
- Docker 容器生命周期管理

## 性能要求

- Lightpanda 启动时间 < 1 秒（CDP 模式）
- 页面抓取时间 < 10 秒（普通页面）
- 内存占用 < 100MB（Lightpanda 进程）
- 并发请求支持：默认 5 个并发

## 安全要求

- 遵守 robots.txt 规则（可配置）
- 请求超时控制
- 防止资源耗尽（并发限制）
- 敏感信息不记录日志

## Docker 配置

```yaml
version: '3.8'
services:
  lightpanda:
    image: lightpanda/browser:nightly
    ports:
      - "9222:9222"
    environment:
      - LIGHTPANDA_DISABLE_TELEMETRY=true
    restart: unless-stopped
```
