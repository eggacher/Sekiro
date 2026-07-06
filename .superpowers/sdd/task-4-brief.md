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
