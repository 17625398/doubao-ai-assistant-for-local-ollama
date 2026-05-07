# OpenCLI 状态显示问题修复

## 问题描述

扩展程序 UI 显示 "OpenCLI 未就绪，请检查安装"，但 OpenCLI 实际上已经正确安装并运行。

## 原因分析

OpenCLI daemon 在端口 `19825` 上运行，但它的健康检查端点 `/health` 或根路径 `/` 会返回 **403 Forbidden** 错误。这是 OpenCLI daemon 的默认行为，并不表示它没有运行。

## 解决方案

### 方案 1: 修改状态检测逻辑 (已实施)

修改了扩展程序的 `checkOpenCLIStatus()` 方法，将任何 HTTP 响应 (包括 403) 视为 daemon 正在运行的标志。

**修改文件**: `packages/extension/src/side-panel/index.ts`

**关键代码**:
```typescript
// 检查 opencli daemon 是否运行
// 注意：daemon 可能返回 403，但这表示它正在运行
const response = await fetch('http://localhost:19825/', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
}).catch(() => null);

// 如果收到响应 (即使是 403)，说明 daemon 正在运行
if (response) {
  statusEl.classList.add('ready');
  statusEl.classList.remove('error');
  statusEl.querySelector('.status-text')!.textContent = 'OpenCLI 已就绪';
}
```

### 方案 2: 验证 OpenCLI 安装

如果状态仍然显示"未就绪"，请按以下步骤验证 OpenCLI 安装:

#### 1. 检查 OpenCLI 是否安装

```bash
opencli --version
```

应该显示：`1.6.1`

#### 2. 检查 daemon 是否运行

```bash
# 方法 1: 检查端口
netstat -ano | findstr :19825

# 方法 2: 使用 PowerShell
Test-NetConnection -ComputerName localhost -Port 19825
```

#### 3. 测试 daemon 连接

```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:19825/" -Method GET

# 如果返回 403，说明 daemon 正在运行 (这是正常的)
```

#### 4. 重启 daemon (如果需要)

```bash
# 停止现有 daemon 进程
taskkill /F /IM opencli.exe

# 重新启动 daemon
opencli daemon start
```

### 方案 3: 浏览器扩展配置

确保在 Lightpanda 浏览器中正确配置了 OpenCLI 扩展:

1. 打开 Lightpanda 浏览器
2. 访问扩展管理页面
3. 启用 OpenCLI 扩展
4. 确保扩展有权限访问 `http://localhost:19825/*`

## 状态说明

| 显示状态 | 含义 | 操作 |
|---------|------|------|
| ✅ OpenCLI 已就绪 | daemon 正在运行 | 无需操作 |
| ⚠️ OpenCLI 未就绪，请检查安装 | daemon 未运行或未安装 | 安装或启动 daemon |
| ❌ OpenCLI 未连接 | 网络问题或 CORS 限制 | 检查浏览器扩展权限 |

## 验证修复

重新加载扩展程序的侧边栏页面，状态应该显示为 **"OpenCLI 已就绪"**。

如果仍然显示"未就绪"，请检查:

1. OpenCLI 是否正确安装 (`opencli --version`)
2. daemon 是否在运行 (检查端口 19825)
3. 浏览器扩展是否有权限访问本地服务
4. 防火墙是否阻止了本地连接

## 注意事项

- OpenCLI daemon 返回 403 是正常行为，不是错误
- 即使返回 403，daemon 仍然可以正常处理操作命令
- 状态检测只关心 daemon 是否响应，不关心响应内容

---

**更新时间**: 2026-04-03  
**影响版本**: 所有使用 OpenCLI 集成的版本
