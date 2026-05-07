# Chat 与 Message 目录合并 - 实施计划

## [ ] Task 1: 查找所有引用 message/ 目录的文件
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 使用 grep 查找所有导入 `@/components/message` 的文件
  - 记录需要更新的文件列表
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `programmatic` TR-1.1: 生成引用文件清单

## [ ] Task 2: 创建 chat/message/ 目录并迁移文件
- **Priority**: P0
- **Depends On**: Task 1
- **Description**: 
  - 在 `chat/` 目录下创建 `message/` 子目录
  - 将 `components/message/` 下的所有文件迁移到 `chat/message/`
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-2.1: 验证 `chat/message/` 目录存在且包含正确文件

## [ ] Task 3: 更新 chat/ 内部的导入路径
- **Priority**: P0
- **Depends On**: Task 2
- **Description**: 
  - 更新 `chat/` 目录下所有文件对 `message/` 的引用
  - 更新路径从 `@/components/message/` 到 `./message/`
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-3.1: 验证 chat 目录内导入路径正确

## [ ] Task 4: 更新 chat/ 外部的导入路径
- **Priority**: P0
- **Depends On**: Task 2
- **Description**: 
  - 更新项目其他位置对 `message/` 的引用
  - 更新路径从 `@/components/message/` 到 `@/components/chat/message/`
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-4.1: 验证无旧路径引用

## [ ] Task 5: 更新测试文件的导入路径
- **Priority**: P1
- **Depends On**: Task 2
- **Description**: 
  - 更新所有测试文件对 `message/` 的引用
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-5.1: 验证测试文件导入路径正确

## [ ] Task 6: 删除原 message/ 目录
- **Priority**: P1
- **Depends On**: Task 3, Task 4, Task 5
- **Description**: 
  - 删除空的 `components/message/` 目录
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-6.1: 验证原目录不存在

## [ ] Task 7: 更新 chat/index.ts 导出
- **Priority**: P1
- **Depends On**: Task 2
- **Description**: 
  - 更新统一导出索引文件，包含 message 组件
- **Acceptance Criteria Addressed**: AC-3
- **Test Requirements**:
  - `programmatic` TR-7.1: 验证导出文件包含 message 组件

## [ ] Task 8: 验证构建和运行
- **Priority**: P0
- **Depends On**: Task 3, Task 4, Task 5, Task 6
- **Description**: 
  - 运行构建命令验证项目能正常构建
  - 启动开发服务器验证功能正常
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `programmatic` TR-8.1: 构建命令执行成功
  - `human-judgement` TR-8.2: 页面能正常访问和交互