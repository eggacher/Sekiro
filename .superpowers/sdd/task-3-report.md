# Task 3 Report: 前端个人中心页面绑定真实数据

## What I implemented

Modified `apps/web/app/(dashboard)/profile/page.tsx` to wire the frontend profile page to real APIs:

1. **Sidebar card reads from auth store**
   - Imported `useAuthStore` and rendered `user.nickname`, `user.username`, `user.phone`, `user.email`, `user.avatar`, and `user.roles`.
   - Avatar now uses `AvatarImage` when an avatar URL/base64 is available, falling back to initials.

2. **Basic info tab connected to `PUT /system/user/profile`**
   - Added controlled state for `nickname`, `phone`, `email`, `avatar`.
   - Save handler calls `apiClient.put("/system/user/profile", profile)` and shows toast feedback.
   - Added loading state to prevent duplicate submissions.

3. **Avatar upload via base64**
   - Hidden `<input type="file" accept="image/*">` triggered by the camera button.
   - `FileReader.readAsDataURL` stores the result in `profile.avatar`.

4. **Security tab connected to `PUT /system/user/password`**
   - Added controlled state for `oldPassword`, `newPassword`, `confirmPassword`.
   - Validates that new password and confirmation match.
   - On success, clears auth and redirects to `/login`.

5. **Notification preferences stored in localStorage**
   - Added `NotificationPrefs` type and default values.
   - Initializes from `localStorage.getItem("sekiro-notification-prefs")`.
   - Persists changes immediately on toggle.

## What I tested and test results

Ran the frontend typecheck:

```bash
pnpm --filter @sekiro/web typecheck
```

Result: **0 errors** (exit code 0).

## Files changed

- `apps/web/app/(dashboard)/profile/page.tsx`

## Self-review findings

- Removed the static "个人简介" field from the basic info tab because it is not part of the `UpdateUserDto` backend contract and the brief did not mention it.
- "注册时间" and "最后登录" in the sidebar remain as static placeholders because `CurrentUser` does not expose those fields.
- Chose not to add a `setUser` method to the auth store; the brief only specified modifying `page.tsx`.
- No runtime testing was performed because this task only required typecheck verification.

## Issues or concerns

None.
