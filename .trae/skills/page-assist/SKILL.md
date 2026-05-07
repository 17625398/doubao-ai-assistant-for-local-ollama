# Page Assist 技能

## 技能名称
Page Assist

## 技能描述
将 Page Assist 浏览器扩展集成到豆包中，实现本地 AI 模型与网页浏览的深度集成，同时集成 OpenCLI 命令行工具的强大自动化能力。

## 功能特点
- 支持本地 AI 模型与网页内容的交互
- 提供侧边栏和 Web UI 两种交互方式
- 支持一键提取网页内容并发送给 AI
- 支持与多种本地 AI 模型的对话
- 支持截图和书签管理
- **OpenCLI 集成**：支持在 Page Assist 中执行 OpenCLI 命令
- **命令历史记录**：保存和管理命令执行历史
- **命令录制**：录制网页操作并转换为 OpenCLI 命令
- **批量执行**：支持命令队列管理和批量执行

## 安装要求
- **浏览器**：支持 Chrome、Firefox、Edge、Brave 等主流浏览器
- **本地 AI 模型**：需要安装 Ollama 或其他兼容的本地 AI 模型
- **Page Assist 扩展**：需要安装 Page Assist 浏览器扩展
- **OpenCLI**：需要安装 OpenCLI 命令行工具（可选，用于命令执行功能）

## 安装步骤
1. **安装本地 AI 模型**：
   - 下载并安装 Ollama（https://ollama.com/download）
   - 启动 Ollama 服务

2. **安装 Page Assist 扩展**：
   - 从 GitHub 仓库下载 Page Assist 扩展（https://github.com/n4ze3m/page-assist）
   - 按照仓库中的安装指南安装扩展

3. **安装 OpenCLI**（可选）：
   - 从 GitHub 仓库下载 OpenCLI（https://github.com/opencli/opencli）
   - 按照仓库中的安装指南安装 OpenCLI
   - 启动 OpenCLI 守护进程

4. **配置 Page Assist**：
   - 在扩展设置中配置本地 AI 模型连接
   - 确保扩展能够正常与本地 AI 模型通信
   - 如果安装了 OpenCLI，确保扩展能够与 OpenCLI 通信

## 使用方法

### 侧边栏交互
1. 在浏览器中打开任意网页
2. 使用以下方式打开 Page Assist 侧边栏：
   - 右键点击网页，选择 "Open Page Assist"
   - 使用键盘快捷键：Ctrl+Shift+Y
3. 在侧边栏中与本地 AI 模型交互
4. 可以提取网页内容并发送给 AI 进行分析

### Web UI 交互
1. 点击浏览器扩展图标
2. 选择 "Open Web UI"
3. 在新标签页中与本地 AI 模型交互
4. 可以创建新的聊天会话

### 网页内容交互
1. 打开 Page Assist 侧边栏
2. 点击 "与网页对话" 按钮
3. 针对网页内容提问
4. AI 会基于网页内容给出回答

### OpenCLI 命令执行
1. 打开 Page Assist 侧边栏
2. 点击工具栏中的终端图标
3. 在命令输入框中输入 OpenCLI 命令
4. 点击执行按钮或按 Enter 键执行命令
5. 查看命令执行结果和错误信息

### 命令历史记录
1. 打开 OpenCLI 命令执行界面
2. 点击命令历史按钮
3. 查看历史命令列表
4. 点击历史命令重新执行
5. 使用搜索框过滤历史命令

### 命令录制
1. 打开 OpenCLI 命令执行界面
2. 点击录制按钮开始录制
3. 在网页上执行操作
4. 点击停止按钮结束录制
5. 查看生成的 OpenCLI 命令

### 批量执行和命令队列
1. 打开 OpenCLI 命令执行界面
2. 点击队列按钮打开命令队列
3. 添加多个命令到队列
4. 点击执行按钮执行队列
5. 可以暂停、继续或取消队列执行

## 配置选项

### AI 服务配置
- **Ollama**：配置本地 Ollama 服务地址
- **OpenAI API**：配置 OpenAI API 兼容的端点
- **自定义 AI 服务**：配置其他 AI 服务

### OpenCLI 配置
- **OpenCLI 地址**：配置 OpenCLI 守护进程地址
- **命令执行超时**：设置命令执行的超时时间
- **命令历史记录**：设置历史记录的最大数量

### 快捷键配置
- 打开侧边栏：Ctrl+Shift+Y
- 打开 Web UI：Ctrl+Shift+L
- 打开 OpenCLI 终端：Ctrl+Shift+T
- 可以在浏览器扩展设置中自定义快捷键

## 常见问题

### Q: 无法连接到本地 AI 模型
**A**: 请确保本地 AI 模型（如 Ollama）已经启动，并且 Page Assist 扩展的配置正确。

### Q: 侧边栏无法打开
**A**: 请检查浏览器扩展是否已启用，以及权限是否正确配置。

### Q: 网页内容提取失败
**A**: 某些网页可能有防爬措施，尝试使用不同的提取方式。

### Q: OpenCLI 命令执行失败
**A**: 请确保 OpenCLI 守护进程已经启动，并且 Page Assist 扩展能够与 OpenCLI 通信。

### Q: 命令录制功能不工作
**A**: 请确保浏览器权限设置正确，特别是对网页操作的权限。

## 注意事项
- Page Assist 扩展依赖本地 AI 模型，需要确保模型已经正确安装和配置
- OpenCLI 功能依赖 OpenCLI 命令行工具，需要确保工具已经正确安装和配置
- 扩展会在本地存储会话数据和设置
- 与网页内容的交互可能会受到网页结构的影响
- 执行 OpenCLI 命令时请确保命令的安全性，避免执行未知命令

## 版本兼容性
- **Page Assist**：v1.0.0 及以上
- **Ollama**：v0.1.0 及以上
- **OpenCLI**：v1.0.0 及以上
- **浏览器**：最新版本的 Chrome、Firefox、Edge、Brave 等

## 相关链接
- Page Assist GitHub 仓库：https://github.com/n4ze3m/page-assist
- OpenCLI GitHub 仓库：https://github.com/opencli/opencli
- Ollama 官方网站：https://ollama.com
- 豆包官方网站：https://www.doubao.com