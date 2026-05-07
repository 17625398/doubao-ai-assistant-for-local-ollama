# 国际化 (i18n) 使用指南

## 概述

AI智能分析平台支持多语言国际化，目前支持中文（zh-CN）和英文（en-US）两种语言。

## 技术栈

- **i18next**: 核心国际化框架
- **react-i18next**: React 集成插件
- **next-i18next**: Next.js 集成（如需要）

## 目录结构

```
packages/web/src/i18n/
├── index.ts          # i18n 初始化配置
└── lang/
    ├── zh-CN.ts      # 中文翻译文件
    └── en-US.ts      # 英文翻译文件
```

## 使用方法

### 1. 在组件中使用翻译

```tsx
'use client';

import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('app.name')}</h1>
      <p>{t('common.save')}</p>
    </div>
  );
}
```

### 2. 添加新的翻译键

1. 在 `packages/web/src/i18n/lang/zh-CN.ts` 中添加中文翻译：

```typescript
export default {
  // ... 现有翻译
  myFeature: {
    title: '我的功能',
    description: '功能描述',
  },
};
```

2. 在 `packages/web/src/i18n/lang/en-US.ts` 中添加英文翻译：

```typescript
export default {
  // ... 现有翻译
  myFeature: {
    title: 'My Feature',
    description: 'Feature description',
  },
};
```

### 3. 使用翻译键

```tsx
const { t } = useTranslation();

// 使用点符号访问嵌套键
<h1>{t('myFeature.title')}</h1>
<p>{t('myFeature.description')}</p>
```

## 翻译键命名规范

### 命名空间

- `app`: 应用级别的翻译（如应用名称）
- `common`: 通用操作（保存、取消、删除等）
- `nav`: 导航相关的翻译
- `navigation`: 导航菜单相关的翻译（用于管理后台）
- `chat`: 聊天功能相关的翻译
- `user`: 用户管理相关的翻译
- `role`: 角色管理相关的翻译
- `menu`: 菜单管理相关的翻译
- `settings`: 设置相关的翻译
- `login`: 登录相关的翻译
- `analytics`: 数据分析相关的翻译
- `plugin`: 插件管理相关的翻译

### 命名规则

1. 使用小写字母和驼峰命名法
2. 键名应该清晰表达其含义
3. 避免使用过于通用的名称

## 语言切换

平台提供了 `LanguageSelector` 组件用于切换语言：

```tsx
import { LanguageSelector } from '@/components/LanguageSelector';

// 在 Header 或其他地方使用
<LanguageSelector />
```

语言选择会自动保存到 `localStorage`，下次访问时会自动恢复。

## 服务器端渲染 (SSR) 注意事项

由于 Next.js App Router 的特性，i18n 配置需要特殊处理：

1. **服务器端**: 不使用 `initReactI18next`，直接使用 i18next 核心功能
2. **客户端**: 动态加载 `initReactI18next`，确保 React 上下文正确初始化

参见 `packages/web/src/i18n/index.ts` 的实现。

## 最佳实践

### 1. 始终添加 `'use client'` 指令

在使用 `useTranslation` 的组件中，确保添加 `'use client'` 指令：

```tsx
'use client';

import { useTranslation } from 'react-i18next';
// ...
```

### 2. 提供默认值

对于可能不存在的键，提供默认值：

```tsx
{t('some.key', 'Default Value')}
```

### 3. 使用插值

i18next 支持字符串插值：

```typescript
// 翻译文件
{
  greeting: '你好，{{name}}！'
}

// 组件中使用
{t('greeting', { name: '张三' })}
```

### 4. 复数形式

i18next 支持复数形式：

```typescript
// 翻译文件
{
  itemCount: '{{count}} 个项目',
  itemCount_plural: '{{count}} 个项目'
}

// 组件中使用
{t('itemCount', { count: 5 })}
```

## 添加新语言

1. 在 `packages/web/src/i18n/lang/` 目录下创建新的翻译文件，如 `ja-JP.ts`
2. 在 `packages/web/src/i18n/index.ts` 中导入并添加到 `resources`
3. 更新 `LanguageSelector` 组件，添加新语言选项

## 故障排除

### 问题："NO_I18NEXT_INSTANCE" 警告

**原因**: 组件在 i18n 实例初始化之前尝试使用 `useTranslation`

**解决**: 
- 确保组件标记为 `'use client'`
- 检查 i18n 初始化顺序
- 在静态生成时，此警告可以忽略

### 问题：翻译不生效

**原因**: 
- 翻译键不存在
- 语言文件未正确导入

**解决**:
- 检查翻译键拼写
- 确认语言文件已添加到 `resources`
- 检查浏览器控制台是否有错误

### 问题：服务器端渲染错误

**原因**: 在服务器端使用了 React 特定的 i18n 功能

**解决**:
- 确保服务器端不使用 `initReactI18next`
- 使用 `typeof window` 检查环境

## 示例代码

### Header 组件

```tsx
'use client';

import { useTranslation } from 'react-i18next';

export function Header() {
  const { t } = useTranslation();

  return (
    <header>
      <h1>{t('app.name')}</h1>
      <nav>
        <Link href="/">{t('nav.home')}</Link>
        <Link href="/chat">{t('nav.chat')}</Link>
        <Link href="/settings">{t('nav.settings')}</Link>
      </nav>
    </header>
  );
}
```

### 表单组件

```tsx
'use client';

import { useTranslation } from 'react-i18next';

export function UserForm() {
  const { t } = useTranslation();

  return (
    <form>
      <label>{t('user.name')}</label>
      <input placeholder={t('user.username')} />
      
      <button type="submit">{t('common.save')}</button>
      <button type="button">{t('common.cancel')}</button>
    </form>
  );
}
```

## 相关文件

- `packages/web/src/i18n/index.ts` - i18n 配置
- `packages/web/src/i18n/lang/zh-CN.ts` - 中文翻译
- `packages/web/src/i18n/lang/en-US.ts` - 英文翻译
- `packages/web/src/components/LanguageSelector.tsx` - 语言选择器
- `packages/web/src/components/Header.tsx` - 使用示例

## 参考资源

- [i18next 官方文档](https://www.i18next.com/)
- [react-i18next 官方文档](https://react.i18next.com/)
- [Next.js 国际化指南](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
