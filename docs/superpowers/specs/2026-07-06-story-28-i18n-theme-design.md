# Story #28: i18n 国际化 + 主题切换 设计文档

> **关联**: GitHub Issue #28 · Epic #3 · Milestone v0.5 生产就绪  
> **来源**: `PRD F-LAYOUT-03/04/05` · `SPEC §6` 前端契约  
> **状态**: 已实现

---

## 1. 目标

为 `apps/web` 增加：

1. **i18n 国际化**：至少支持中文（zh-CN）与英文（en-US），所有 UI 文案集中管理，切换语言实时生效并持久化。
2. **主题切换**：在已有的 `next-themes` 基础上，补全「跟随系统」选项与主题色（primary color）自定义。
3. **多页签 Tabs**：原型已实现并持久化，本 story 仅做集成验证与文案接入 i18n。

验收标准来自 #28：

- [x] 切换语言实时生效
- [x] 主题持久化（localStorage）

---

## 2. 现状盘点

| 能力 | 当前状态 | 缺口 |
| --- | --- | --- |
| 主题 Provider | `components/theme-provider.tsx` 已封装 `next-themes` | 无缺 |
| 主题切换按钮 | `components/layout/theme-toggle.tsx` 仅支持 light/dark 二态切换 | 缺少 system 选项与主题色选择 |
| 多页签 Tabs | `components/layout/tabs-nav.tsx` + `lib/store/app-store.ts` 已实现，zustand persist 持久化 | 部分文案未接入 i18n |
| i18n | 无任何 i18n 库或字典 | 全部 UI 文案硬编码中文 |
| 语言切换 UI | 无 | 需在 Header 增加语言选择器 |

---

## 3. 方案选型

### 3.1 i18n：轻量自定义 Hook（无额外依赖）

**理由**：

- 项目当前为 Next.js 14 App Router，但无 SSR/SEO 多语言需求，不需要 `next-intl` 的 middleware 与路由改造。
- 自定义方案依赖零、体积小，符合「脚手架保持轻量」原则。
- 字典集中管理，类型安全，切换语言通过 React Context + localStorage 即可。

**替代方案**：`next-intl`

- 优点：生态成熟、支持复数/格式化。
- 缺点：需改路由/middleware，对当前 scope 过重。
- **结论**：本次采用自定义方案；若未来需要 SSR 多语言，可平滑迁移到 `next-intl`。

### 3.2 主题：扩展 `next-themes` + CSS 变量动态覆盖

**理由**：

- `next-themes` 已安装并工作良好，继续复用。
- 主题色通过动态修改 `:root` / `.dark` 的 `--primary` HSL 变量实现，与现有 Tailwind 体系无缝兼容。
- 提供 6 组预设色板，不引入 CSS-in-JS 新依赖。

---

## 4. 架构设计

### 4.1 文件结构

```
apps/web/
├── app/layout.tsx                    # 注入 I18nProvider + ThemeProvider
├── components/providers/
│   ├── i18n-provider.tsx             # 语言 Context + localStorage 持久化
│   └── theme-provider.tsx            # 已存在（next-themes 包装）
├── components/layout/
│   ├── header.tsx                    # 接入 LangSwitcher + ThemeSettings
│   ├── lang-switcher.tsx             # 语言下拉切换
│   ├── theme-toggle.tsx              # 改造为 ThemeSettings（模式+色板）
│   └── tabs-nav.tsx                  # 接入 i18n 文案
├── lib/i18n/
│   ├── config.ts                     # Locale 类型、默认语言、支持列表
│   ├── types.ts                      # 字典类型定义
│   ├── index.ts                      # useTranslation + I18nProvider
│   └── dictionaries/
│       ├── zh.ts                     # 中文字典
│       └── en.ts                     # 英文字典
└── app/globals.css                   # 新增主题色变量工具类
```

### 4.2 数据流

```
用户点击语言切换
  → LangSwitcher 调用 setLocale()
  → I18nProvider 更新 locale，持久化到 localStorage
  → useTranslation 返回对应字典
  → 组件重新渲染，文案切换

用户点击主题模式/色板
  → ThemeSettings 调用 next-themes setTheme() 或 set primary color
  → next-themes 持久化 theme 到 localStorage
  → CSS 变量更新，界面刷新
```

### 4.3 接口与类型

```ts
// lib/i18n/config.ts
export type Locale = "zh-CN" | "en-US";
export const defaultLocale: Locale = "zh-CN";
export const locales: Locale[] = ["zh-CN", "en-US"];

// lib/i18n/types.ts
export type Dictionary = typeof import("./dictionaries/zh").zh;

// lib/i18n/index.ts
export function useTranslation(): { t: (key: string) => string; locale: Locale; setLocale: (l: Locale) => void };
export function I18nProvider(props: { children: React.ReactNode }): JSX.Element;
```

### 4.4 字典设计

采用扁平 key 命名空间，便于阅读与类型推导：

```ts
export const zh = {
  "app.name": "Sekiro 管理后台",
  "app.description": "开箱即用的中后台脚手架",
  "theme.light": "浅色",
  "theme.dark": "深色",
  "theme.system": "跟随系统",
  "theme.color": "主题色",
  "language.name": "简体中文",
  "nav.home": "工作台",
  "nav.collapse": "收起",
  "login.title": "欢迎回来",
  // ...
};
```

`useTranslation` 提供 `t("theme.light")` 访问方式，支持嵌套 key 的点号解析（实现一个轻量的 `get` 函数）。

### 4.5 主题色方案

提供 6 套预设色板，每套包含 light/dark 下的 `--primary` 与 `--ring`：

| 色板 | Light primary HSL | Dark primary HSL |
| --- | --- | --- |
| default (blue) | 221.2 83.2% 53.3% | 217.2 91.2% 59.8% |
| purple | 262.1 83.3% 57.8% | 263.4 70% 50.4% |
| green | 142.1 76.2% 36.3% | 142.1 70.6% 45.3% |
| orange | 24.6 95% 53.1% | 20.5 90.2% 48.2% |
| rose | 346.8 77.2% 49.8% | 346.8 77.2% 49.8% |
| zinc | 240 5.9% 10% | 0 0% 90.2% |

实现：在 `<html>` 上通过 `style` 内联设置 `--primary` / `--ring` CSS 变量；切换色板时更新 localStorage 并写回 style。

---

## 5. 关键改动清单

### 5.1 新增文件

- `apps/web/lib/i18n/config.ts`
- `apps/web/lib/i18n/types.ts`
- `apps/web/lib/i18n/index.ts`
- `apps/web/lib/i18n/dictionaries/zh.ts`
- `apps/web/lib/i18n/dictionaries/en.ts`
- `apps/web/components/providers/i18n-provider.tsx`
- `apps/web/components/layout/lang-switcher.tsx`

### 5.2 修改文件

- `apps/web/app/layout.tsx`：包裹 `I18nProvider`。
- `apps/web/components/layout/header.tsx`：替换 `ThemeToggle` 为 `ThemeSettings`，加入 `LangSwitcher`。
- `apps/web/components/layout/theme-toggle.tsx`：扩展为 `ThemeSettings`，支持 light/dark/system 与色板选择。
- `apps/web/components/layout/sidebar.tsx`：接入 i18n 文案（收起按钮、fallback）。
- `apps/web/components/layout/tabs-nav.tsx`：接入 i18n 文案（关闭其他/关闭全部）。
- `apps/web/components/providers/auth-provider.tsx`：接入 i18n 文案（加载中）。
- `apps/web/app/(auth)/login/page.tsx`：接入 i18n 文案。
- `apps/web/app/(dashboard)/page.tsx`：接入 i18n 文案（统计卡片、图表标题、最近动态）。
- `apps/web/app/globals.css`：添加主题色工具类与过渡。

### 5.3 不改动

- `next-themes` 的 `ThemeProvider` 配置保持不变。
- Tabs 的 zustand store 逻辑保持不变。
- 后端 API、shared 包、mock 数据保持不变。

---

## 6. 测试策略

1. **类型检查**：`pnpm --filter @sekiro/web typecheck` 必须无错。
2. **构建检查**：`pnpm --filter @sekiro/web build` 必须成功。
3. **手动验证**：
   - 登录页中英文切换生效。
   - Header 中语言、主题模式、主题色切换生效。
   - 刷新页面后语言与主题持久化。
   - Tabs 文案随语言切换变化。

---

## 7. 风险与取舍

| 风险 | 应对 |
| --- | --- |
| 自定义 i18n 无法覆盖复杂复数/格式化 | 当前 scope 无此需求；未来可迁移 next-intl |
| 主题色通过内联 style 设置，SSR 首屏可能闪 | App Router 为 CSR 主导（AuthProvider 强制 client），可接受 |
| 文案量大，翻译不完全 | 本 story 覆盖 layout + login + dashboard；其余页面文案保留中文占位，后续迭代补齐 |

---

## 8. 决策确认

- **i18n 方案**：轻量自定义 Hook + 字典文件。
- **主题方案**：扩展 `next-themes`，新增 system 模式与 6 组主题色。
- **Tabs**：不改动核心逻辑，仅接入 i18n 文案。
