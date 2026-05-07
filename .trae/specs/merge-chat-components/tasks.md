# 组件目录合并 - 实施计划

## [ ] Task 1: 检查重复文件差异
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 对比 `chat/ChatInputBox.tsx` 和 `doubao-home/ChatInputBox.tsx` 的差异
  - 确定保留哪个版本或合并两者
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `human-judgement` TR-1.1: 查看两个文件的内容差异，确定处理策略

## [ ] Task 2: 创建 chat/home/ 目录并迁移组件
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 在 `chat/` 目录下创建 `home/` 子目录
  - 将 `doubao-home/` 下的所有文件（除 `ChatInputBox.tsx`）迁移到 `chat/home/`
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-2.1: 验证 `chat/home/` 目录存在且包含正确的文件

## [ ] Task 3: 更新 chat/home/ 内部的导入路径
- **Priority**: P0
- **Depends On**: Task 2
- **Description**: 
  - 更新 `chat/home/` 目录下组件的导入路径
  - 修复相对路径引用
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 验证所有导入路径正确

## [ ] Task 4: 更新外部对 doubao-home 组件的引用
- **Priority**: P0
- **Depends On**: Task 2
- **Description**: 
  - 查找所有使用 `doubao-home` 组件的文件
  - 更新导入路径到 `chat/home/`
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-4.1: 验证没有对 `doubao-home` 的引用

## [ ] Task 5: 处理 ChatInputBox.tsx 引用
- **Priority**: P0
- **Depends On**: Task 1, Task 4
- **Description**: 
  - 更新所有对 `doubao-home/ChatInputBox` 的引用到 `chat/ChatInputBox`
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `programmatic` TR-5.1: 验证所有 ChatInputBox 引用指向正确路径

## [ ] Task 6: 删除原 doubao-home 目录
- **Priority**: P1
- **Depends On**: Task 4, Task 5
- **Description**: 
  - 删除空的 `doubao-home/` 目录
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-6.1: 验证 `doubao-home/` 目录不存在

## [ ] Task 7: 验证构建和运行
- **Priority**: P0
- **Depends On**: Task 3, Task 4, Task 5, Task 6
- **Description**: 
  - 运行构建命令验证项目能正常构建
  - 启动开发服务器验证功能正常
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-7.1: 构建命令执行成功
  - `human-judgement` TR-7.2: 页面能正常访问和交互