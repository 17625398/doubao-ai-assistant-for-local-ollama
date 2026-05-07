# 代码规范与开发流程

## 1. 代码规范

### 1.1 通用规范

- **缩进**：使用2个空格进行缩进，不使用Tab
- **换行**：每行不超过80个字符
- **分号**：使用分号结束语句
- **引号**：使用单引号，JSX中使用双引号
- **命名**：
  - 变量和函数：使用驼峰命名法（camelCase）
  - 类和接口：使用帕斯卡命名法（PascalCase）
  - 常量：使用全大写加下划线（UPPER_SNAKE_CASE）
  - 私有变量：使用下划线前缀（_privateVar）

### 1.2 TypeScript规范

- **类型定义**：优先使用接口（interface）而非类型别名（type）
- **类型注解**：为函数参数和返回值添加类型注解
- **可选参数**：使用可选链操作符（?.）和空值合并操作符（??）
- **枚举**：使用枚举类型定义一组相关的常量
- **泛型**：合理使用泛型提高代码复用性

### 1.3 React规范

- **组件命名**：使用帕斯卡命名法
- **文件命名**：组件文件使用帕斯卡命名法，其他文件使用驼峰命名法
- **Hook使用**：遵循Hook规则，只在函数组件和自定义Hook中使用Hook
- **状态管理**：使用Zustand进行状态管理
- **样式**：使用Tailwind CSS进行样式管理

### 1.4 代码组织

- **文件结构**：按功能模块组织文件
- **模块导出**：使用ES模块语法（import/export）
- **注释**：为复杂逻辑添加注释，使用JSDoc格式为函数和接口添加文档
- **错误处理**：使用try/catch捕获异常，合理处理错误

## 2. 开发流程

### 2.1 环境搭建

1. **安装Node.js**：版本18.0.0及以上
2. **安装依赖**：
   ```bash
   cd refactored
   npm install
   ```
3. **启动开发服务器**：
   ```bash
   # 启动所有服务
   npm run dev
   
   # 启动特定服务
   npm run build:core    # 构建核心模块
   npm run build:extension  # 构建浏览器扩展
   npm run build:web     # 构建Web应用
   ```

### 2.2 代码检查

- **类型检查**：
  ```bash
  npm run typecheck
  ```

- **代码 lint**：
  ```bash
  npm run lint
  ```

- **代码格式化**：
  ```bash
  npx prettier --write .
  ```

### 2.3 测试流程

- **运行测试**：
  ```bash
  cd packages/core
  npm run test
  ```

- **测试覆盖率**：确保核心功能有足够的测试覆盖率

### 2.4 构建与部署

- **构建项目**：
  ```bash
  npm run build
  ```

- **打包Web应用**：
  ```bash
  npm run package:web     # 打包为tar.gz
  npm run package:web:zip  # 打包为zip
  ```

### 2.5 协作流程

1. **分支管理**：
   - `main`：主分支，用于发布稳定版本
   - `develop`：开发分支，用于集成新功能
   - `feature/*`：特性分支，用于开发新功能
   - `fix/*`：修复分支，用于修复bug

2. **提交规范**：
   - 提交信息应清晰明了，使用以下格式：
     ```
     <type>(<scope>): <subject>
     
     <body>
     
     <footer>
     ```
   - 类型包括：feat（新功能）、fix（修复）、docs（文档）、style（样式）、refactor（重构）、test（测试）、chore（构建/依赖）

3. **代码审查**：
   - 所有代码变更必须经过代码审查
   - 审查重点包括：代码质量、安全性、性能、可读性

4. **持续集成**：
   - 每次提交都会触发构建和测试
   - 确保所有测试通过后才能合并代码

## 3. 工具集成

### 3.1 ESLint

- 配置文件：`.eslintrc.js`
- 规则：遵循ESLint推荐规则，结合TypeScript和Prettier

### 3.2 Prettier

- 配置文件：`.prettierrc.js`
- 规则：统一代码格式化风格

### 3.3 TypeScript

- 配置文件：`tsconfig.json`
- 规则：严格的类型检查，确保代码类型安全

### 3.4 Vitest

- 配置文件：`vitest.config.ts`
- 用于单元测试和集成测试

## 4. 最佳实践

1. **代码复用**：提取重复代码为函数或组件
2. **性能优化**：避免不必要的渲染和计算
3. **安全性**：注意输入验证和权限控制
4. **可维护性**：保持代码简洁明了，避免过度复杂
5. **文档**：为公共API和复杂逻辑添加文档

## 5. 参考资源

- [Vue FastAPI Admin](https://github.com/mizhexiaoxiao/vue-fastapi-admin)
- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [React 官方文档](https://react.dev/)
- [ESLint 官方文档](https://eslint.org/docs/)
- [Prettier 官方文档](https://prettier.io/docs/)
