# Story #28: i18n 国际化 + 主题切换

## 定位

补齐并完善 Sekiro 前端已有的国际化（i18n）与主题切换能力。将当前硬编码的中文 UI 文本全面替换为可翻译的 key，把现有扁平字典重构为按模块拆分的结构，覆盖登录页、工作台、个人中心、系统管理、系统监控等核心页面与共享组件。同时验证并修复主题切换（light/dark/system + 主题色）在现有实现中的问题。

后端错误消息不在本次范围内；暗色模式下 recharts 仅做最小可读性修复，不做完整主题适配。

---

## 目标

1. 将 `lib/i18n/dictionaries/zh.ts` / `en.ts` 重构为按模块拆分的目录结构。
2. 为登录页、工作台、个人中心、系统管理（用户/角色/菜单/部门/岗位/字典）、系统监控（在线用户/操作日志/登录日志/服务监控）、布局组件（header/sidebar）、共享组件（crud-table/page-header/confirm-dialog）等核心 UI 提供完整的中英双语 key。
3. 替换上述页面和组件中的硬编码中文为 `t()` 调用。
4. 验证并修复主题切换：确保 light/dark/system 与主题色持久化、刷新恢复，暗色模式下 recharts 基础可读。
5. 保持 `pnpm typecheck` 通过，`pnpm --filter @sekiro/web build` 成功。

---

## 范围

### In Scope

- `apps/web/lib/i18n/dictionaries/` 目录重构
- `apps/web/lib/i18n/types.ts` 类型更新
- 核心页面国际化：
  - `app/(auth)/login/page.tsx`
  - `app/(dashboard)/page.tsx`
  - `app/(dashboard)/profile/page.tsx`
  - `app/(dashboard)/system/user/page.tsx`
  - `app/(dashboard)/system/role/page.tsx`
  - `app/(dashboard)/system/menu/page.tsx`
  - `app/(dashboard)/system/dept/page.tsx`
  - `app/(dashboard)/system/position/page.tsx`
  - `app/(dashboard)/system/dict/page.tsx`
  - `app/(dashboard)/monitor/operation-log/page.tsx`
  - `app/(dashboard)/monitor/login-log/page.tsx`
  - `app/(dashboard)/monitor/online/page.tsx`
  - `app/(dashboard)/monitor/server/page.tsx`
- 布局与共享组件国际化：
  - `components/layout/header.tsx`
  - `components/layout/sidebar.tsx`
  - `components/shared/crud-table.tsx`
  - `components/shared/page-header.tsx`
  - `components/shared/confirm-dialog.tsx`
  - `components/shared/tree-table.tsx`
  - `components/layout/lang-switcher.tsx`
  - `components/layout/theme-toggle.tsx`
- 主题切换检查与修复：
  - `components/theme-provider.tsx`
  - `components/layout/theme-toggle.tsx`
  - `app/globals.css`
  - 工作台 recharts 暗色可读性
- 文档：
  - `docs/superpowers/specs/2026-07-07-i18n-themes-design.md`
  - `docs/superpowers/plans/2026-07-07-i18n-themes.md`（后续由 writing-plans 补充）

### Out of Scope

- 后端 API 错误消息国际化
- 新增第三种语言
- 完整 recharts 主题系统（仅做最小可读性修复）
- 路由级 locale prefix（如 `/en/login`）
- 日期/数字/货币格式化

---

## 架构设计

### 字典结构

```
apps/web/lib/i18n/dictionaries/
├── zh/
│   ├── index.ts       # 合并并导出 zh Dictionary
│   ├── common.ts      # app.*, common.*, nav.*, tabs.*, auth.*, table.*, dialog.*
│   ├── login.ts
│   ├── dashboard.ts
│   ├── profile.ts
│   ├── system.ts      # 用户/角色/菜单/部门/岗位/字典通用 + 各页面
│   └── monitor.ts     # 监控页面
└── en/
    ├── index.ts
    ├── common.ts
    ├── login.ts
    ├── dashboard.ts
    ├── profile.ts
    ├── system.ts
    └── monitor.ts
```

合并方式（`zh/index.ts`）：

```ts
import { common } from "./common";
import { login } from "./login";
import { dashboard } from "./dashboard";
import { profile } from "./profile";
import { system } from "./system";
import { monitor } from "./monitor";

export const zh = {
  ...common,
  ...login,
  ...dashboard,
  ...profile,
  ...system,
  ...monitor,
} as const;
```

`types.ts` 改为：

```ts
import { zh } from "./dictionaries/zh";

export type Dictionary = typeof zh;
export type TranslationKey = keyof Dictionary;
```

`lib/i18n/index.tsx` 的 `t()` 已支持点号路径，保持现有实现不变。

### Key 命名约定

- 页面级：`{page}.{component?}.{meaning}`，例如 `"login.title"`、`"user.search.placeholder"`
- 通用：`common.{domain}.{meaning}`，例如 `"common.table.search"`、`"common.dialog.confirm"`
- 导航：`nav.{path}`，例如 `"nav.user"`
- 主题：`theme.{light|dark|system|color|appearance}`

### 翻译使用方式

在 Client Component 中：

```tsx
"use client";
import { useTranslation } from "@/lib/i18n";

export function SomeComponent() {
  const { t } = useTranslation();
  return <h1>{t("login.title")}</h1>;
}
```

在 Server Component 中（如需要 metadata 或初始渲染）：本次尽量在 Client Component 中完成；若必须在 Server Component 使用，通过 props 从 Client wrapper 传入，或标记为 `"use client"`。

### 主题切换

现有实现：
- `next-themes` 的 `ThemeProvider` 在 `layout.tsx` 中包裹应用
- `useTheme` 提供 theme / setTheme / resolvedTheme
- `ThemeSettings` 组件管理 light/dark/system 与主题色
- 主题色通过直接修改 `:root` 的 `--primary` 和 `--ring` CSS 变量实现

本次需验证/修复：
1. `ThemeSettings` 是否正确挂载在 header 中
2. 主题色刷新后是否正确恢复（已用 `localStorage` + `useEffect`）
3. 暗色模式下工作台 recharts 的坐标轴/文字颜色是否可读；若不可读，给相关图表加 `stroke` / `fill` 动态颜色

---

## 数据流

### i18n

```
localStorage (sekiro:locale)
        ↓
I18nProvider (client) 读取并设置 locale
        ↓
dictionaries[locale] 被选中
        ↓
useTranslation().t(key) 返回对应字符串
        ↓
React 组件渲染
```

### Theme

```
localStorage (theme, sekiro:theme-color)
        ↓
next-themes ThemeProvider 管理 class/dark
        ↓
ThemeSettings 应用 --primary / --ring
        ↓
Tailwind CSS 变量驱动 UI 颜色
```

---

## 错误处理

- 若 `t()` 传入未定义的 key，回退显示 key 字符串本身（现有实现已支持）。
- 若某个模块字典缺失英文翻译，先以中文占位，确保不破坏类型。
- 拆分后 TypeScript `TranslationKey` 推导必须保持精确；若合并导致类型丢失，改用 `satisfies` 或显式 `as const`。

---

## 验收标准

- [ ] `lib/i18n/dictionaries/` 完成按模块拆分，`zh` / `en` 结构一致
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm --filter @sekiro/web build` 成功
- [ ] 登录页切换英文后全部文案为英文
- [ ] 工作台切换英文后全部文案为英文
- [ ] 个人中心切换英文后全部文案为英文
- [ ] 系统管理各页面切换英文后全部文案为英文
- [ ] 系统监控各页面切换英文后全部文案为英文
- [ ] 共享组件（表格、弹窗、页面头部等）切换英文后全部文案为英文
- [ ] light/dark/system 主题切换正常，刷新后保持
- [ ] 主题色切换正常，刷新后保持
- [ ] 暗色模式下工作台 recharts 图表文字/坐标轴可读

---

## 风险与规避

| 风险 | 规避方式 |
| --- | --- |
| 大量页面替换 key 导致遗漏 | 按页面分批替换，每页验证 |
| 字典拆分后类型推导失败 | 使用 `as const` + `satisfies`，保留 `TranslationKey = keyof typeof zh` |
| 服务端组件无法使用 `useTranslation` | 将需要翻译的页面/组件标记为 `"use client"`，或通过 props 传入 |
| 暗色模式下 recharts 不可读 | 动态读取当前主题，给图表文字/轴线设置对比色 |
| 主题色与 Tailwind 的 `dark` 模式冲突 | 主题色只改 `--primary`/`--ring`，不动 `--background`/`--foreground` |

---

## 后续可扩展

- 后端错误消息国际化（新增 story）
- 路由级 locale prefix（`/en/login`）
- 引入 `next-intl` 做更完整的 i18n 路由支持
- 日期/数字/货币格式化（`Intl.DateTimeFormat`、`Intl.NumberFormat`）
- 更多语言（ja、ko 等）

---

## 关联

- **Story**: #28
- **Epic**: #3 v0.5 生产就绪
- **前置依赖**: Story #16（前端基建）、#24（API 文档）、#26（Docker 部署）、#27（安全基线）均已完成
- **相关文档**: `docs/FEATURES.md` §三（布局与 UI）、§七（开发体验）
