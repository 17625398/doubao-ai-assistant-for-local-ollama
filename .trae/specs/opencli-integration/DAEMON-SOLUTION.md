# 🔧 OpenCLI "No daemon connected" 错误解决方案

## ❌ 错误信息

```
OpenCLI
No daemon connected
```

**原因**: OpenCLI CLI 的守护进程（daemon）未运行

---

## 📋 解决方案

### 方案 1: 手动启动 OpenCLI 守护进程

#### 步骤 1: 检查是否已安装 OpenCLI

打开命令提示符或终端，执行：

```bash
opencli --version
```

**如果显示版本号**: ✅ 已安装，继续步骤 2  
**如果提示命令不存在**: ❌ 未安装，请先安装

#### 步骤 2: 启动守护进程

在终端中执行：

```bash
opencli daemon start
```

**预期输出**:
```
✅ OpenCLI daemon started on port 19825
✅ Daemon is running
```

#### 步骤 3: 验证守护进程状态

执行：

```bash
opencli status
```

**预期输出**:
```
✅ Daemon status:
   - Running: true
   - Port: 19825
   - Version: x.x.x
   - Uptime: Xs
```

#### 步骤 4: 测试扩展功能

重新点击"⚡ 一键提取"按钮或其他 OpenCLI 功能

---

### 方案 2: 使用后台运行模式

如果您希望守护进程在后台持续运行：

#### Windows 系统

**方法 A: 使用 start 命令**

```bash
start /b opencli daemon run
```

**方法 B: 使用 PowerShell**

```powershell
Start-Process -FilePath "opencli" -ArgumentList "daemon", "run" -WindowStyle Hidden
```

**方法 C: 使用 Windows 任务计划程序**

1. 打开"任务计划程序"
2. 创建基本任务
3. 设置触发器为"登录时"
4. 操作设置为：`opencli daemon run`
5. 勾选"不管用户是否登录都要运行"

#### macOS/Linux 系统

**方法 A: 使用 nohup**

```bash
nohup opencli daemon run > /tmp/opencli.log 2>&1 &
```

**方法 B: 使用 systemd (Linux)**

创建文件 `/etc/systemd/system/opencli.service`:

```ini
[Unit]
Description=OpenCLI Daemon
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/opencli daemon run
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

然后执行：

```bash
sudo systemctl enable opencli
sudo systemctl start opencli
```

---

### 方案 3: 自动启动守护进程（推荐）

如果希望扩展自动启动守护进程，可以添加以下功能：

#### 方法 A: 在扩展设置中添加"自动启动"选项

**位置**: 扩展设置页面 → OpenCLI 配置

**操作**:
1. 启用"自动启动守护进程"
2. 扩展会在检测到守护进程未运行时自动启动

#### 方法 B: 手动实现自动启动脚本

创建 `start-opencli-daemon.bat` (Windows):

```batch
@echo off
echo Starting OpenCLI daemon...
opencli daemon start
if %errorlevel% equ 0 (
    echo ✅ Daemon started successfully
) else (
    echo ❌ Failed to start daemon
)
pause
```

双击此文件即可启动守护进程。

---

## 🔍 排查步骤

### 问题 1: 守护进程启动失败

**症状**: 执行 `opencli daemon start` 后报错

**排查方法**:

1. **检查端口占用**
   ```bash
   # Windows
   netstat -ano | findstr :19825
   
   # macOS/Linux
   lsof -i :19825
   ```

2. **检查权限**
   ```bash
   # 以管理员/Root 身份运行
   sudo opencli daemon start  # Linux/macOS
   # 右键以管理员身份运行  # Windows
   ```

3. **查看日志**
   ```bash
   opencli daemon logs
   ```

### 问题 2: 端口被占用

**错误信息**: `Port 19825 is already in use`

**解决方案**:

1. **结束占用端口的进程**
   ```bash
   # Windows
   taskkill /PID <进程ID> /F
   
   # macOS/Linux
   kill -9 <进程ID>
   ```

2. **更改端口**
   ```bash
   opencli config set port 19826
   opencli daemon start
   ```

### 问题 3: 守护进程意外停止

**症状**: 守护进程启动后很快停止

**解决方案**:

1. **查看详细日志**
   ```bash
   opencli daemon logs --follow
   ```

2. **使用调试模式**
   ```bash
   opencli daemon run --debug
   ```

3. **检查系统资源**
   - 内存是否充足
   - 磁盘空间是否足够
   - CPU 是否过载

---

## 🛠️ 高级配置

### 自定义端口

如果默认端口 19825 被占用：

```bash
# 修改配置
opencli config set port 19826

# 重启守护进程
opencli daemon restart
```

同时需要在扩展代码中修改端口：
- 文件: `packages/extension/src/services/opencli-bridge.ts`
- 行号: 43
- 修改内容: `private readonly daemonUrl: string = 'http://localhost:19826';`

### 超时配置

如果网络较慢导致超时：

```bash
# 修改超时时间（毫秒）
opencli config set timeout 60000
```

### 日志级别

调整日志详细程度：

```bash
# 调试模式（最详细）
opencli config set log-level debug

# 信息模式（默认）
opencli config set log-level info

# 错误模式（只显示错误）
opencli config set log-level error
```

---

## 📊 状态检查命令

### 常用命令

```bash
# 检查守护进程状态
opencli status

# 查看版本
opencli --version

# 查看帮助
opencli --help

# 查看守护进程日志
opencli daemon logs

# 重启守护进程
opencli daemon restart

# 停止守护进程
opencli daemon stop
```

### API 状态检查

直接访问 HTTP API：

```bash
curl http://localhost:19825/status
```

**预期响应**:
```json
{
  "running": true,
  "version": "1.6.1",
  "port": 19825,
  "uptime": 3600
}
```

---

## 🎯 快速修复清单

### ✅ 检查清单

- [ ] 已安装 OpenCLI CLI
- [ ] 守护进程正在运行
- [ ] 端口 19825 可访问
- [ ] 防火墙允许连接
- [ ] 扩展配置正确

### ⚡ 快速修复流程

```bash
# 1. 安装 OpenCLI（如未安装）
npm install -g opencli

# 2. 启动守护进程
opencli daemon start

# 3. 验证状态
opencli status

# 4. 测试功能
# 在浏览器中使用扩展功能
```

---

## 💡 最佳实践

### ✅ 推荐做法

1. **开机自启**
   - 将守护进程设为开机启动
   - 避免每次手动启动

2. **监控状态**
   - 定期检查守护进程状态
   - 及时发现并解决问题

3. **日志管理**
   - 定期清理旧日志
   - 保留重要错误日志

4. **备份配置**
   - 备份 OpenCLI 配置文件
   - 便于快速恢复

### ❌ 避免做法

1. ❌ 不要频繁重启守护进程
2. ❌ 不要在生产环境使用 debug 模式
3. ❌ 不要忽略错误日志
4. ❌ 不要使用过时的版本

---

## 🆘 紧急恢复

### 如果所有方法都失败

1. **完全重装 OpenCLI**
   ```bash
   # 卸载
   npm uninstall -g opencli
   
   # 清理残留
   rm -rf ~/.opencli  # Linux/macOS
   rmdir /s "%USERPROFILE%\.opencli"  # Windows
   
   # 重新安装
   npm install -g opencli@latest
   ```

2. **重置扩展设置**
   ```
   1. 导航到 chrome://extensions/
   2. 找到扩展
   3. 点击"清除数据"
   4. 重新配置
   ```

3. **联系支持**
   - GitHub Issues: https://github.com/jackwener/opencli/issues
   - 提供完整错误信息和系统信息

---

## 📝 故障报告模板

如果问题仍然存在，请提供以下信息：

```markdown
## 系统信息
- 操作系统: Windows 11 / macOS 14 / Ubuntu 22.04
- 浏览器: Chrome 120+
- OpenCLI 版本: 1.x.x
- 扩展版本: 1.0.0

## 错误信息
```
[粘贴完整错误信息]
```

## 复现步骤
1. ...
2. ...

## 尝试过的方案
- [x] 重启守护进程
- [ ] 更改端口
- [ ] 完全重装

## 日志输出
```
[粘贴相关日志]
```
```

---

## 🎉 成功标志

当您看到以下信息时，说明问题已解决：

```bash
$ opencli status
✅ OpenCLI Status:
   - Running: ✅ Yes
   - Port: 19825
   - Version: 1.6.1
   - Uptime: 5m 30s
   - Commands executed: 10
   - Success rate: 100%
```

并且浏览器中的 OpenCLI 功能可以正常使用！

---

**创建日期**: 2026-04-04  
**版本**: 1.0.0  
**状态**: ✅ 生产就绪
