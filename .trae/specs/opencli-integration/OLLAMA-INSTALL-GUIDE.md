# 🧠 Ollama 安装与配置指南

## ❌ 错误信息

```
[WebContentExtractor] "[ERROR]" "Ollama chat failed:" TimeoutError: signal timed out
```

**根本原因**: Ollama（本地 AI 模型服务）未安装或未运行

---

## 📋 系统要求

### 最低配置
- **操作系统**: Windows 10/11, macOS, Linux
- **内存**: 8 GB RAM（推荐 16 GB）
- **存储**: 10 GB 可用空间
- **网络**: 可选（离线可用）

### 推荐配置
- **内存**: 16 GB+ RAM
- **GPU**: NVIDIA GPU with CUDA（可选，但推荐）
- **存储**: SSD，50 GB+ 可用空间

---

## 🚀 安装步骤

### Windows 系统

#### 方法 1: 使用安装程序（推荐）

1. **下载安装程序**
   ```
   访问: https://ollama.com/download/windows
   下载: OllamaSetup.exe
   ```

2. **运行安装程序**
   - 双击 `OllamaSetup.exe`
   - 按照向导完成安装
   - 安装完成后会自动启动

3. **验证安装**
   ```powershell
   ollama --version
   ```

#### 方法 2: 使用命令行

```powershell
# 使用 winget 安装
winget install Ollama.Ollama

# 或使用 scoop
scoop install ollama
```

---

### macOS 系统

#### 方法 1: 使用 Homebrew（推荐）

```bash
# 安装 Ollama
brew install ollama

# 启动服务
brew services start ollama
```

#### 方法 2: 使用安装程序

1. 下载: https://ollama.com/download/mac
2. 解压并拖动到 Applications 文件夹
3. 首次运行需要在系统偏好设置中允许

---

### Linux 系统

```bash
# 一键安装脚本
curl -fsSL https://ollama.com/install.sh | sh

# 启动服务
sudo systemctl start ollama
sudo systemctl enable ollama

# 验证安装
ollama --version
```

---

## 📦 模型下载

### 常用模型推荐

| 模型 | 大小 | 适用场景 | 命令 |
|------|------|----------|------|
| **llama3.2** | 2 GB | 轻量级，快速响应 | `ollama pull llama3.2` |
| **llama3** | 4.7 GB | 通用对话 | `ollama pull llama3` |
| **qwen2.5** | 4.7 GB | 中文优化 | `ollama pull qwen2.5` |
| **gemma2** | 5 GB | Google 模型 | `ollama pull gemma2` |
| **mistral** | 4.1 GB | 欧洲模型 | `ollama pull mistral` |

### 下载模型

```bash
# 下载 Llama 3.2（推荐入门）
ollama pull llama3.2

# 下载 Qwen 2.5（中文推荐）
ollama pull qwen2.5

# 查看已下载的模型
ollama list
```

---

## ⚙️ 配置扩展

### 步骤 1: 确认 Ollama 运行

```bash
# 检查服务状态
ollama ps

# 预期输出:
# NAME    ID    SIZE    PROCESSOR    UNTIL
```

### 步骤 2: 测试 API

```bash
# 测试聊天 API
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "messages": [{"role": "user", "content": "Hello"}],
  "stream": false
}'
```

### 步骤 3: 配置扩展设置

1. 打开扩展设置页面
2. 找到 **Ollama 配置**
3. 设置：
   - **Base URL**: `http://localhost:11434`
   - **默认模型**: `llama3.2`（或您下载的模型）
   - **超时时间**: `120000`（120秒）

---

## 🔧 故障排除

### 问题 1: "ollama" 命令未找到

**症状**: 终端提示 `无法识别 ollama`

**解决方案**:

Windows:
```powershell
# 检查安装路径
$env:PATH += ";C:\Users\$env:USERNAME\AppData\Local\Programs\Ollama"

# 重新加载环境变量
refreshenv
```

macOS/Linux:
```bash
# 添加到 PATH
echo 'export PATH=$PATH:/usr/local/bin' >> ~/.bashrc
source ~/.bashrc
```

### 问题 2: 服务无法启动

**症状**: `ollama ps` 显示无进程

**解决方案**:

Windows:
```powershell
# 手动启动服务
Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden
```

macOS:
```bash
# 使用 launchctl
launchctl load ~/Library/LaunchAgents/com.ollama.ollama.plist
```

Linux:
```bash
# 启动 systemd 服务
sudo systemctl start ollama
sudo systemctl status ollama
```

### 问题 3: 模型下载失败

**症状**: `ollama pull` 失败或卡住

**解决方案**:

1. **检查网络**
   ```bash
   ping ollama.com
   ```

2. **使用镜像**（中国大陆）
   ```bash
   # 设置镜像源
   export OLLAMA_HOST=0.0.0.0
   ollama pull llama3.2
   ```

3. **手动下载**
   - 从 Hugging Face 下载 GGUF 格式模型
   - 使用 `ollama create` 创建自定义模型

### 问题 4: 内存不足

**症状**: 模型加载失败或系统卡顿

**解决方案**:

1. **使用更小模型**
   ```bash
   ollama pull llama3.2  # 2GB，适合 8GB 内存
   ```

2. **关闭其他程序**
   - 关闭不必要的浏览器标签
   - 退出大型应用程序

3. **增加虚拟内存**（Windows）
   - 系统设置 → 高级系统设置 → 性能 → 虚拟内存
   - 设置为自动管理或手动增加

### 问题 5: GPU 未使用

**症状**: 生成速度很慢，CPU 占用高

**解决方案**:

Windows:
```powershell
# 检查 CUDA
nvidia-smi

# 设置环境变量使用 GPU
$env:OLLAMA_GPU_OVERHEAD = "1"
```

---

## 🎯 快速验证清单

### 安装后检查

- [ ] `ollama --version` 显示版本号
- [ ] `ollama list` 显示已下载模型
- [ ] `ollama ps` 显示运行中的模型
- [ ] API 测试返回正常响应
- [ ] 扩展可以正常对话

### 性能优化

- [ ] 使用 SSD 存储模型
- [ ] 关闭不必要的程序
- [ ] 使用适合的模型大小
- [ ] 启用 GPU 加速（如果有）

---

## 📊 模型选择指南

### 根据内存选择

| 系统内存 | 推荐模型 | 大小 |
|----------|----------|------|
| 8 GB | llama3.2, phi3 | 2-3 GB |
| 16 GB | llama3, qwen2.5 | 4-7 GB |
| 32 GB+ | llama3:70b, mixtral | 40+ GB |

### 根据用途选择

| 用途 | 推荐模型 | 特点 |
|------|----------|------|
| 日常对话 | llama3.2 | 快速、轻量 |
| 中文对话 | qwen2.5 | 中文优化 |
| 代码生成 | codellama | 编程专用