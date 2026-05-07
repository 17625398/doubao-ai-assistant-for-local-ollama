# 部署和发布指南

## 项目结构

豆包 AI 助手项目采用 Monorepo 架构，包含以下主要包：

- **@doubao/core**: 核心共享模块，包含文档解析、AI 处理等功能
- **@doubao/extension**: Chrome 扩展
- **@doubao/web**: Web 应用

## 构建步骤

### 1. 安装依赖

```bash
# 在项目根目录执行
npm install
```

### 2. 构建核心模块

```bash
# 构建核心模块
npm run build:core

# 或者构建所有模块
npm run build
```

### 3. 构建 Web 应用

```bash
# 构建 Web 应用
npm run build:web

# 启动开发服务器
npm run dev
```

### 4. 构建 Chrome 扩展

```bash
# 构建 Chrome 扩展
npm run build:extension
```

## 部署方式

### Web 应用部署

1. **静态网站托管**
   - 构建完成后，`packages/web/out` 目录包含静态网站文件
   - 可以部署到 Vercel、Netlify、GitHub Pages 等静态网站托管服务

2. **Docker 部署**
   - 创建 Dockerfile
   - 构建 Docker 镜像
   - 部署到容器服务

### Chrome 扩展部署

1. **本地开发模式**
   - 打开 Chrome 浏览器
   - 访问 `chrome://extensions`
   - 启用 "开发者模式"
   - 点击 "加载已解压的扩展程序"
   - 选择 `packages/extension/dist` 目录

2. **发布到 Chrome Web Store**
   - 准备扩展包（zip 文件）
   - 访问 Chrome Web Store 开发者控制台
   - 上传扩展包
   - 填写扩展信息并提交审核

## 环境配置

### 配置文件

项目使用环境变量进行配置：

- **OLLAMA_BASE_URL**: Ollama 服务地址（默认：http://192.168.0.32:11434）
- **DEFAULT_MODEL**: 默认使用的 AI 模型（默认：llama2）
- **MAX_CACHE_SIZE**: 缓存最大大小（默认：50）
- **CACHE_EXPIRY**: 缓存过期时间（默认：3600000 毫秒）

### 本地开发配置

在 `.env.local` 文件中设置环境变量：

```env
OLLAMA_BASE_URL=http://localhost:11434
DEFAULT_MODEL=llama2
```

### 生产环境配置

#### 非Docker环境编译后修改OLLAMA_BASE_URL

在非Docker环境编译后部署到生产环境时，OLLAMA_BASE_URL是通过环境变量设置的，不需要重新编译代码。以下是具体的设置方法：

1. **启动时直接设置环境变量**
   ```bash
   # Linux/macOS
   OLLAMA_BASE_URL=http://your-ollama-server:11434 node server.js
   
   # Windows PowerShell
   $env:OLLAMA_BASE_URL="http://your-ollama-server:11434"; node server.js
   
   # Windows 命令提示符
   set OLLAMA_BASE_URL=http://your-ollama-server:11434 && node server.js
   ```

2. **创建启动脚本**
   - **Linux/macOS (start.sh)**
     ```bash
     #!/bin/bash
     export OLLAMA_BASE_URL=http://your-ollama-server:11434
     node server.js
     ```
   - **Windows (start.bat)**
     ```batch
     @echo off
     set OLLAMA_BASE_URL=http://your-ollama-server:11434
     node server.js
     ```

3. **系统环境变量**
   - **Linux/macOS**
     ```bash
     # 永久设置
     echo 'export OLLAMA_BASE_URL=http://your-ollama-server:11434' >> /etc/environment
     source /etc/environment
     ```
   - **Windows Server**
     1. 右键点击"此电脑" → "属性" → "高级系统设置" → "环境变量"
     2. 在"系统变量"中点击"新建"
     3. 变量名：`OLLAMA_BASE_URL`
     4. 变量值：`http://your-ollama-server:11434`
     5. 点击"确定"保存

4. **使用进程管理工具**
   - **PM2**
     ```javascript
     // ecosystem.config.js
     module.exports = {
       apps: [
         {
           name: "your-app",
           script: "server.js",
           env: {
             OLLAMA_BASE_URL: "http://your-ollama-server:11434"
           }
         }
       ]
     };
     ```

#### Docker环境配置

在Docker环境中，可以在`docker-compose.yml`文件中添加环境变量：

```yaml
services:
  web:
    build: ./packages/web
    ports:
      - "3000:3000"
    environment:
      - OLLAMA_BASE_URL=http://your-ollama-server:11434
    restart: unless-stopped
```

## 性能优化

1. **构建优化**
   - 使用 Next.js 的静态生成和增量静态再生
   - 优化依赖包大小
   - 启用代码分割

2. **运行时优化**
   - 使用缓存机制减少重复解析
   - 实现文档分块处理
   - 优化 AI 模型调用

## 安全考虑

1. **数据安全**
   - 本地处理敏感文档，不向第三方发送数据
   - 支持文档加密和访问控制

2. **模型安全**
   - 安全的模型加载和执行
   - 限制模型权限

3. **网络安全**
   - 使用 HTTPS 传输
   - 验证 API 调用

## 监控和日志

1. **日志系统**
   - 核心模块使用内置的 logger 进行日志记录
   - 支持不同级别的日志（info、debug、error）

2. **监控指标**
   - 文档解析时间
   - AI 处理时间
   - 缓存命中率
   - 系统资源使用情况

## 故障排查

### 常见问题

1. **Ollama 服务连接失败**
   - 检查 Ollama 服务是否运行
   - 验证 OLLAMA_BASE_URL 配置是否正确

2. **文档解析失败**
   - 检查文档格式是否支持
   - 检查文档是否损坏

3. **内存使用过高**
   - 启用分块处理
   - 调整缓存大小

4. **构建失败**
   - 检查依赖是否安装正确
   - 验证 TypeScript 类型定义

## 版本管理

1. **版本号格式**
   - 使用语义化版本号：MAJOR.MINOR.PATCH
   - MAJOR: 重大变更
   - MINOR: 新功能
   - PATCH:  bug 修复

2. **发布流程**
   - 更新版本号
   - 构建所有模块
   - 运行测试
   - 发布到相应平台

## 总结

豆包 AI 助手项目的部署和发布流程简单明了，支持多种部署方式。通过合理的配置和优化，可以确保系统的稳定性和性能。在部署过程中，需要注意安全考虑和故障排查，确保系统的可靠运行。