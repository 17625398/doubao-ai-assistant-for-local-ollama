# OpenCLI 安装指南

## 1. 安装 OpenCLI CLI 工具

已完成 ✅

```bash
npm install -g @jackwener/opencli
```

版本：v1.6.1

## 2. 安装浏览器扩展

### 步骤：

1. **下载扩展**
   - 访问：https://github.com/jackwener/opencli/releases/latest/download/opencli-extension.zip
   - 下载 `opencli-extension.zip` 文件

2. **解压扩展**
   - 将下载的 zip 文件解压到任意目录
   - 例如：`D:\Doubao\refactored\opencli-extension\`

3. **加载到 Chrome**
   - 打开 Chrome 浏览器
   - 访问：`chrome://extensions/`
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择解压后的扩展文件夹

4. **验证安装**
   ```bash
   opencli doctor
   ```
   
   期望输出：
   ```
   [OK] Daemon: running on port 19825
   [OK] Extension: connected
   [OK] Connectivity: all checks passed
   ```

## 3. 测试命令

安装完成后，尝试以下命令：

```bash
# 查看所有可用命令
opencli list

# 查看 Daemon 状态
opencli daemon status

# 运行健康检查
opencli doctor

# 测试简单命令（无需浏览器）
opencli hackernews top --limit 5

# 测试浏览器命令（需要扩展）
opencli bilibili hot --limit 5
```

## 4. 常见问题

### Q: Extension not connected
**A**: 确保：
- Chrome 浏览器已打开
- 扩展已启用
- 扩展已加载到正确的目录

### Q: Daemon not running
**A**: 运行 `opencli doctor` 会自动启动 daemon

### Q: 命令执行失败
**A**: 检查：
- Node.js 版本 >= 20.0.0
- 网络连接正常
- 目标网站可访问

## 5. 下一步

安装完成后，继续配置技能库集成。
