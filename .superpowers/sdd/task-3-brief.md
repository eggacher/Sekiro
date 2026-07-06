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

