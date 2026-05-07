# Page Assist 扩展安装指南

## 前提条件

在安装 Page Assist 扩展之前，您需要：

1. **安装本地 AI 模型**：
   - 下载并安装 Ollama（https://ollama.com/download）
   - 启动 Ollama 服务

2. **浏览器**：
   - Chrome、Firefox、Edge、Brave 等主流浏览器
   - 支持扩展安装

3. **OpenCLI**（可选，用于命令执行功能）：
   - 下载并安装 OpenCLI 命令行工具
   - 启动 OpenCLI 守护进程

## 安装步骤

### 从 GitHub 仓库安装

1. **克隆仓库**：
   ```bash
   git clone https://github.com/n4ze3m/page-assist.git
   cd page-assist
   ```

2. **安装依赖**：
   ```bash
   # 使用 Bun
   bun install
   
   # 或者使用 npm
   npm install
   ```

3. **构建扩展**：
   ```bash
   # 使用 Bun
   bun run build
   
   # 或者使用 npm
   npm run build
   ```

4. **加载扩展**：
   - **Chrome/Edge/Brave**：
     1. 打开扩展管理页面（chrome://extensions）
     2. 启用开发者模式
     3. 点击「加载已解压的扩展程序」
     4. 选择 `build` 目录
   
   - **Firefox**：
     1. 打开附加组件页面（about:addons）
     2. 点击「管理你的扩展」
     3. 点击「临时载入附加组件」
     4. 选择 `build` 目录中的 `manifest.json` 文件

### 从 Chrome Web Store 安装（未来）

当 Page Assist 扩展发布到 Chrome Web Store 后，您可以直接从商店安装。

## 安装 OpenCLI（可选）

1. **克隆 OpenCLI 仓库**：
   ```bash
   git clone https://github.com/opencli/opencli.git
   cd opencli
   ```

2. **安装依赖**：
   ```bash
   # 使用 npm
   npm install
   ```

3. **构建 OpenCLI**：
   ```bash
   npm run build
   ```

4. **启动 OpenCLI 守护进程**：
   ```bash
   npm run daemon
   ```

## 配置 Page Assist

1. **打开扩展设置**：
   - 点击浏览器扩展图标
   - 选择「选项」或「设置」

2. **配置 AI 服务**：
   - **Ollama**：
     - 默认地址：http://localhost:11434
     - 确保 Ollama 服务已启动
   - **OpenAI API**（可选）：
     - 输入 API 密钥
     - 选择模型
   - **自定义 AI 服务**（可选）：
     - 输入服务地址
     - 配置认证信息

3. **配置 OpenCLI**（可选）：
   - **OpenCLI 地址**：
     - 默认地址：http://localhost:8080
     - 确保 OpenCLI 守护进程已启动
   - **命令执行超时**：
     - 默认：30 秒
     - 根据需要调整
   - **命令历史记录**：
     - 默认：1000 条
     - 根据需要调整

4. **配置快捷键**：
   - 打开浏览器扩展管理页面
   - 点击「键盘快捷键」
   - 为 Page Assist 设置快捷键
   - 默认快捷键：
     - 打开侧边栏：Ctrl+Shift+Y
     - 打开 Web UI：Ctrl+Shift+L
     - 打开 OpenCLI 终端：Ctrl+Shift+T

## 验证安装

1. **检查扩展状态**：
   - 确认扩展图标在浏览器工具栏中显示
   - 扩展图标应为彩色（表示已启用）

2. **测试 AI 连接**：
   - 打开 Page Assist 侧边栏
   - 发送一条测试消息
   - 确认收到 AI 回复

3. **测试网页内容提取**：
   - 打开任意网页
   - 点击侧边栏中的「与网页对话」按钮
   - 确认网页内容被成功提取

4. **测试 OpenCLI 功能**（如果安装了 OpenCLI）：
   - 打开 Page Assist 侧边栏
   - 点击工具栏中的终端图标
   - 输入 `opencli help` 命令
   - 点击执行按钮
   - 确认命令执行成功并显示结果

## 常见问题

### Q: 扩展无法连接到 Ollama
**A**: 请确保：
- Ollama 服务已启动
- 网络连接正常
- 配置的 Ollama 地址正确（默认：http://localhost:11434）

### Q: 侧边栏无法打开
**A**: 请检查：
- 扩展是否已启用
- 浏览器权限是否正确配置
- 快捷键是否冲突

### Q: 网页内容提取失败
**A**: 某些网页可能有防爬措施，尝试：
- 刷新网页
- 等待网页完全加载
- 尝试不同的提取方式

### Q: OpenCLI 命令执行失败
**A**: 请确保：
- OpenCLI 守护进程已启动
- 网络连接正常
- 配置的 OpenCLI 地址正确（默认：http://localhost:8080）

### Q: 命令录制功能不工作
**A**: 请检查：
- 浏览器权限是否正确配置，特别是对网页操作的权限
- OpenCLI 守护进程是否正在运行

### Q: 扩展无响应
**A**: 尝试：
- 重启浏览器
- 重新加载扩展
- 检查浏览器控制台是否有错误信息

## 故障排除

1. **检查浏览器控制台**：
   - 右键点击网页 → 检查 → 控制台
   - 查看是否有错误信息

2. **检查扩展背景页面**：
   - 打开扩展管理页面
   - 找到 Page Assist 扩展
   - 点击「背景页」链接
   - 查看控制台是否有错误信息

3. **检查 OpenCLI 守护进程**：
   - 确认 OpenCLI 守护进程正在运行
   - 检查 OpenCLI 日志是否有错误信息

4. **重新安装扩展**：
   - 卸载现有扩展
   - 重新构建并加载扩展

## 版本兼容性

- **Page Assist**：v1.0.0 及以上
- **Ollama**：v0.1.0 及以上
- **OpenCLI**：v1.0.0 及以上
- **浏览器**：
  - Chrome：最新版本
  - Firefox：最新版本
  - Edge：最新版本
  - Brave：最新版本

## 联系支持

如果您遇到任何问题，可以：

1. 查看 Page Assist GitHub 仓库的 Issues 页面
2. 查看 OpenCLI GitHub 仓库的 Issues 页面
3. 在 GitHub 上创建新的 Issue
4. 参考豆包的官方文档和支持渠道

---

安装完成后，您就可以开始使用 Page Assist 扩展与本地 AI 模型交互，以及使用 OpenCLI 命令执行功能了！