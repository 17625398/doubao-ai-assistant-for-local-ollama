# 任务列表

## 任务1: Lightpanda 客户端封装
- [ ] 创建 Lightpanda 客户端模块
  - [ ] 创建 `packages/core/src/utils/lightpanda-client.ts`
  - [ ] 实现 CLI 模式调用封装
  - [ ] 实现 CDP 服务器连接封装
  - [ ] 实现 Docker 模式管理

- [ ] 实现多模式支持
  - [ ] CLI 模式：调用 lightpanda fetch 命令
  - [ ] CDP 模式：通过 WebSocket 连接 CDP 服务器
  - [ ] Docker 模式：管理 Docker 容器生命周期

- [ ] 添加错误处理和降级逻辑
  - [ ] 实现超时控制
  - [ ] 添加重试机制
  - [ ] 实现错误分类和处理

## 任务2: 多引擎提取策略
- [ ] 创建引擎管理器
  - [ ] 创建 `packages/core/src/utils/extraction-engine-manager.ts`
  - [ ] 实现引擎优先级管理
  - [ ] 实现自动降级逻辑

- [ ] 集成到现有 API
  - [ ] 修改 `/api/read` 端点支持引擎选择
  - [ ] 添加 `engine` 查询参数处理
  - [ ] 返回引擎使用信息

- [ ] 添加引擎统计
  - [ ] 记录各引擎使用次数
  - [ ] 记录成功率和平均响应时间
  - [ ] 提供统计查询接口

## 任务3: 增强内容提取
- [ ] 实现 JavaScript 执行支持
  - [ ] 等待页面加载完成
  - [ ] 支持网络空闲检测
  - [ ] 支持自定义等待条件

- [ ] 实现动态内容处理
  - [ ] 模拟滚动操作
  - [ ] 等待动态内容加载
  - [ ] 处理无限滚动页面

- [ ] 支持自定义请求配置
  - [ ] 自定义请求头
  - [ ] Cookie 传递
  - [ ] User-Agent 设置

## 任务4: 配置管理 UI
- [ ] 创建 LightpandaConfigPanel 组件
  - [ ] 设计配置面板 UI
  - [ ] 实现模式选择（CLI/CDP/Docker）
  - [ ] 添加配置表单

- [ ] 实现状态检测
  - [ ] 检测 Lightpanda 可用性
  - [ ] 显示状态指示器
  - [ ] 提供诊断信息

- [ ] Docker 管理功能
  - [ ] 一键启动/停止容器
  - [ ] 显示容器状态
  - [ ] 查看容器日志

## 任务5: Docker 配置
- [ ] 创建 Docker Compose 配置
  - [ ] 创建 `docker-compose.yml`
  - [ ] 配置 Lightpanda 服务
  - [ ] 设置环境变量

- [ ] 添加启动脚本
  - [ ] 创建 `scripts/start-lightpanda.sh`
  - [ ] 创建 `scripts/stop-lightpanda.sh`
  - [ ] Windows 批处理脚本

## 任务6: 文档和测试
- [ ] 更新文档
  - [ ] 更新 README.md 添加 Lightpanda 说明
  - [ ] 更新 CHANGELOG.md
  - [ ] 添加配置指南

- [ ] 添加测试
  - [ ] 单元测试 Lightpanda 客户端
  - [ ] 集成测试多引擎策略
  - [ ] 端到端测试内容提取

# 任务依赖关系
- 任务2 依赖 任务1（客户端封装完成）
- 任务3 依赖 任务1（基础功能完成）
- 任务4 依赖 任务2（API 增强完成）
- 任务5 可独立进行
- 任务6 依赖 所有其他任务
