# Story #15: 个人中心（资料/改密/通知偏好）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现个人中心页面，支持查看/修改个人资料、修改密码、设置通知偏好，并接入后端真实 API。

**Architecture:** 后端在 `UserController` 新增两个端点：`PUT /system/user/profile` 用于当前用户更新资料，`PUT /system/user/password` 用于修改密码（需验证旧密码）。前端 `profile/page.tsx` 从 `auth-store` 读取当前用户，三个 Tab 分别对接资料更新、密码修改、通知偏好（通知偏好暂存 localStorage，P1 可持久化到后端）。

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Zustand, `@sekiro/shared`, NestJS, Prisma, bcrypt

## Global Constraints

- 所有跨进程类型必须使用 `@sekiro/shared`
- 后端接口统一返回 `ApiResponse<T>`，`code=0` 为成功
- 业务码全部走 HTTP 200
- 401 时清除 token 并跳转 `/login`
- 修改密码后必须使当前 token 失效，前端跳转登录页
- 通知偏好当前版本暂存 localStorage，不修改 Prisma schema

---

## File Structure

| 文件 | 责任 |
|------|------|
| `apps/api/src/modules/user/dtos/update-password.dto.ts` | 新增：修改密码入参 DTO（oldPassword + newPassword） |
| `apps/api/src/modules/user/services/user.service.ts` | 新增：`updateProfile` 和 `changePassword` 方法 |
| `apps/api/src/modules/user/user.controller.ts` | 新增：`PUT /system/user/profile` 和 `PUT /system/user/password` 端点 |
| `apps/web/app/(dashboard)/profile/page.tsx` | 重写：从 auth store 读用户，三 Tab 接真实 API |
| `packages/shared/src/types.ts` | 可选：扩展 User 类型支持通知偏好字段（当前版本不扩展） |

---

## Task 1: 后端修改密码 DTO 与服务方法

**Files:**
- Create: `apps/api/src/modules/user/dtos/update-password.dto.ts`
- Modify: `apps/api/src/modules/user/services/user.service.ts`
- Modify: `apps/api/src/modules/user/dtos/index.ts`

**Interfaces:**
- Consumes: `UserRepository`, bcrypt
- Produces: `changePassword(userId, oldPassword, newPassword)` method

- [ ] **Step 1: 创建 UpdatePasswordDto**

```ts
import { IsString, Length, Matches } from "class-validator";

export class UpdatePasswordDto {
  @IsString({ message: "当前密码必须是字符串" })
  oldPassword!: string;

  @IsString({ message: "新密码必须是字符串" })
  @Length(6, 32, { message: "新密码长度必须 6-32 位" })
  newPassword!: string;
}
```

- [ ] **Step 2: 在 user.service.ts 添加 changePassword 方法**

```ts
async changePassword(id: number, oldPassword: string, newPassword: string) {
  const user = await this.userRepo.findById(id);
  if (!user) {
    throw new NotFoundException("用户不存在");
  }
  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) {
    throw new UnprocessableEntityException("当前密码错误");
  }
  const newHash = await bcrypt.hash(newPassword, 10);
  return this.userRepo.updatePassword(id, newHash);
}
```

- [ ] **Step 3: 在 user.service.ts 添加 updateProfile 方法**

```ts
async updateProfile(id: number, data: UpdateUserDto) {
  const user = await this.userRepo.findById(id);
  if (!user) {
    throw new NotFoundException("用户不存在");
  }
  return this.userRepo.update(id, data);
}
```

- [ ] **Step 4: 导出 DTO**

在 `apps/api/src/modules/user/dtos/index.ts` 添加：
```ts
export * from "./update-password.dto";
```

- [ ] **Step 5: 运行后端 typecheck 和测试**

```bash
pnpm --filter @sekiro/api typecheck
pnpm --filter @sekiro/api test
```

Expected: 0 errors, 101 tests passing.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/user/
git commit -m "feat(api): add changePassword and updateProfile methods"
```

---

## Task 2: 后端新增个人中心端点

**Files:**
- Modify: `apps/api/src/modules/user/user.controller.ts`

**Interfaces:**
- Consumes: `UserService.updateProfile`, `UserService.changePassword`, `req.user`
- Produces: `PUT /system/user/profile` 和 `PUT /system/user/password`

- [ ] **Step 1: 在 UserController 添加两个端点**

```ts
@Put("profile")
@HttpCode(200)
async updateProfile(
  @Body() updateDto: UpdateUserDto,
  @Req() req: any,
): Promise<ApiResponse<any>> {
  const data = await this.userService.updateProfile(req.user.userId, updateDto);
  return { code: 0, message: "资料更新成功", data };
}

@Put("password")
@HttpCode(200)
async changePassword(
  @Body() passwordDto: UpdatePasswordDto,
  @Req() req: any,
): Promise<ApiResponse<any>> {
  await this.userService.changePassword(
    req.user.userId,
    passwordDto.oldPassword,
    passwordDto.newPassword,
  );
  return { code: 0, message: "密码修改成功", data: null };
}
```

注意：`req.user` 的结构取决于 JwtAuthGuard 挂载的 payload。如果 payload 是 `{ userId, username }`，用 `req.user.userId`；如果是 `{ id }`，用 `req.user.id`。先检查 `jwt-auth.guard.ts` 和 `jwt.provider.ts` 的 payload 结构。

- [ ] **Step 2: 确认 token payload 结构**

读取 `apps/api/src/modules/auth/guards/jwt-auth.guard.ts` 和 `apps/api/src/modules/auth/providers/jwt.provider.ts`，确认 `req.user` 上可用的用户 ID 字段名。

- [ ] **Step 3: 运行后端 typecheck 和测试**

```bash
pnpm --filter @sekiro/api typecheck
pnpm --filter @sekiro/api test
```

Expected: 0 errors, 101 tests passing.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/user/user.controller.ts
git commit -m "feat(api): add /system/user/profile and /system/user/password endpoints"
```

---

## Task 3: 前端个人中心页面绑定真实数据

**Files:**
- Modify: `apps/web/app/(dashboard)/profile/page.tsx`

**Interfaces:**
- Consumes: `useAuthStore`, `apiClient`, `UpdateUserDto` / `UpdatePasswordDto` shapes
- Produces: 个人资料可编辑、密码可修改、通知偏好可切换

- [ ] **Step 1: 从 auth store 读取当前用户并渲染侧边卡**

```tsx
import { useAuthStore } from "@/lib/store/auth-store";

export default function ProfilePage() {
  const { user } = useAuthStore();
  // 用 user.nickname, user.username, user.phone, user.email, user.avatar 渲染侧边卡
}
```

- [ ] **Step 2: 基本信息 Tab 接 `/system/user/profile`**

```tsx
const [profile, setProfile] = useState({
  nickname: user?.nickname || "",
  phone: user?.phone || "",
  email: user?.email || "",
  avatar: user?.avatar || "",
});

const handleSaveProfile = async () => {
  await apiClient.put("/system/user/profile", profile);
  toast.success("资料已更新");
  // 可选：刷新 /auth/me 或本地更新 auth store
};
```

头像上传先用 base64：使用 `<input type="file" accept="image/*">` + `FileReader.readAsDataURL`，结果存入 `profile.avatar`。

- [ ] **Step 3: 安全 Tab 接 `/system/user/password`**

```tsx
const [passwordForm, setPasswordForm] = useState({
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
});

const handleChangePassword = async () => {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    toast.error("两次输入的新密码不一致");
    return;
  }
  await apiClient.put("/system/user/password", {
    oldPassword: passwordForm.oldPassword,
    newPassword: passwordForm.newPassword,
  });
  toast.success("密码修改成功，请重新登录");
  clearAuth();
  window.location.href = "/login";
};
```

- [ ] **Step 4: 通知偏好 Tab 存 localStorage**

```tsx
type NotificationPrefs = {
  system: boolean;
  operation: boolean;
  security: boolean;
  email: boolean;
};

const [prefs, setPrefs] = useState<NotificationPrefs>(() => {
  if (typeof window === "undefined") return { system: true, operation: true, security: true, email: false };
  const stored = localStorage.getItem("sekiro-notification-prefs");
  return stored ? JSON.parse(stored) : { system: true, operation: true, security: true, email: false };
});

const updatePref = (key: keyof NotificationPrefs, value: boolean) => {
  const next = { ...prefs, [key]: value };
  setPrefs(next);
  localStorage.setItem("sekiro-notification-prefs", JSON.stringify(next));
};
```

- [ ] **Step 5: 运行前端 typecheck**

```bash
pnpm --filter @sekiro/web typecheck
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/(dashboard)/profile/page.tsx
git commit -m "feat(web): connect profile page to real APIs"
```

---

## Task 4: 全量验证与文档更新

**Files:**
- Modify: `.superpowers/sdd/progress.md`
- Modify: `.superpowers/sdd/GITHUB_ISSUES_STATUS.md`

**Interfaces:**
- Consumes: 所有前面 Task 的产出
- Produces: 验证报告、issue 状态更新

- [ ] **Step 1: 运行全量验证**

```bash
pnpm typecheck
pnpm lint
pnpm --filter @sekiro/api test
```

Expected: 全部通过。

- [ ] **Step 2: 更新 progress ledger**

在 `.superpowers/sdd/progress.md` 中新增 Story #15 段落，标记所有任务完成。

- [ ] **Step 3: 更新 GITHUB_ISSUES_STATUS.md**

将 Story #15 标记为已完成（本地实现完成）。

- [ ] **Step 4: Commit**

```bash
git add .superpowers/sdd/
git commit -m "docs(sync): update progress and issue status for Story #15"
```

---

## Self-Review

### 1. Spec coverage

对照 GitHub issue #15 验收清单：

| 验收项 | 对应 Task |
|--------|----------|
| 个人中心三个 Tab | Task 3 |
| 基本信息可改 | Task 3 |
| 安全：修改密码需旧密码 + 二次确认 | Task 1~3 |
| 修改密码后强制重新登录 | Task 3 |
| 通知偏好：4 类开关 | Task 3（localStorage） |
| 头像上传（base64） | Task 3 |

### 2. Placeholder scan

无 TBD/TODO/"implement later"/"appropriate error handling"/"similar to Task N"。

### 3. Type consistency

- `UpdateUserDto` 已存在并支持 nickname/phone/email/avatar
- `UpdatePasswordDto` 新定义 oldPassword/newPassword
- 前端表单状态类型与 DTO 一致

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-05-personal-center.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints for review.

**Which approach?**
