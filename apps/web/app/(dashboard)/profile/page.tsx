"use client";

import * as React from "react";
import { User, Lock, Bell, Shield, Camera, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { useAuthStore } from "@/lib/store/auth-store";
import { apiClient } from "@/lib/api/client";
import { MfaSetupDialog } from "@/components/mfa/mfa-setup-dialog";
import { MfaVerifyInput } from "@/components/mfa/mfa-verify-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { CurrentUser, Menu } from "@sekiro/shared";

type MeResponse = {
  user: CurrentUser;
  permissions: string[];
  menus: Menu[];
};

type NotificationPrefs = {
  system: boolean;
  operation: boolean;
  security: boolean;
  email: boolean;
};

const NOTIFICATION_LABELS: Record<
  keyof NotificationPrefs,
  { label: string; desc: string }
> = {
  system: { label: "系统消息", desc: "版本更新、维护公告" },
  operation: { label: "操作提醒", desc: "重要操作的通知" },
  security: { label: "安全告警", desc: "异常登录、权限变更" },
  email: { label: "邮件订阅", desc: "每周数据汇总邮件" },
};

const DEFAULT_PREFS: NotificationPrefs = {
  system: true,
  operation: true,
  security: true,
  email: false,
};

export default function ProfilePage() {
  const { user } = useAuthStore();

  const [profile, setProfile] = React.useState({
    nickname: user?.nickname || "",
    phone: user?.phone || "",
    email: user?.email || "",
    avatar: user?.avatar || "",
  });

  const [passwordForm, setPasswordForm] = React.useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [prefs, setPrefs] = React.useState<NotificationPrefs>(() => {
    if (typeof window === "undefined") return DEFAULT_PREFS;
    const stored = localStorage.getItem("sekiro-notification-prefs");
    return stored ? (JSON.parse(stored) as NotificationPrefs) : DEFAULT_PREFS;
  });

  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);

  const [mfaSetupOpen, setMfaSetupOpen] = React.useState(false);
  const [mfaDisableOpen, setMfaDisableOpen] = React.useState(false);
  const [disableCode, setDisableCode] = React.useState("");
  const [disabling, setDisabling] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (user) {
      setProfile({
        nickname: user.nickname || "",
        phone: user.phone || "",
        email: user.email || "",
        avatar: user.avatar || "",
      });
    }
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setProfile((prev) => ({ ...prev, avatar: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await apiClient.put("/system/user/profile", profile);
      toast.success("资料已更新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "资料更新失败");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("两次输入的新密码不一致");
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiClient.put("/system/user/password", {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success("密码修改成功，请重新登录");
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "密码修改失败");
      setIsChangingPassword(false);
    }
  };

  const updatePref = (key: keyof NotificationPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("sekiro-notification-prefs", JSON.stringify(next));
    }
  };

  const handleMfaToggle = (checked: boolean) => {
    if (checked) {
      setMfaSetupOpen(true);
    } else {
      setMfaDisableOpen(true);
    }
  };

  const handleMfaEnabled = () => {
    apiClient.get<MeResponse>("/auth/me").then((data) => {
      useAuthStore.setState((state) => ({
        ...state,
        user: data.user ? { ...state.user, ...data.user } : state.user,
      }));
    });
  };

  const handleDisableMfa = async () => {
    if (disableCode.length !== 6) {
      toast.error("请输入 6 位验证码");
      return;
    }
    setDisabling(true);
    try {
      await apiClient.post("/auth/mfa/disable", { code: disableCode });
      toast.success("两步验证已关闭");
      setMfaDisableOpen(false);
      setDisableCode("");
      handleMfaEnabled();
    } catch (err: any) {
      toast.error(err.message || "关闭失败");
    } finally {
      setDisabling(false);
    }
  };

  const initials = user?.nickname?.[0] || user?.username?.[0] || "U";

  return (
    <div>
      <PageHeader title="个人中心" description="管理你的账户信息、安全与偏好设置" />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* 侧边个人卡 */}
        <Card className="h-fit">
          <CardContent className="pt-6 text-center">
            <div className="relative mx-auto h-24 w-24">
              <Avatar className="h-24 w-24 ring-4 ring-background">
                {profile.avatar && <AvatarImage src={profile.avatar} alt={user?.nickname || ""} />}
                <AvatarFallback className="bg-gradient-to-br from-primary to-purple-500 text-2xl font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={handleAvatarClick}
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{user?.nickname || "未设置昵称"}</h3>
            <p className="text-sm text-muted-foreground">@{user?.username || "-"}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {user?.roles?.map((role) => (
                <Badge key={role}>{role}</Badge>
              ))}
              {!user?.roles?.length && <Badge variant="secondary">普通用户</Badge>}
            </div>
            <Separator className="my-4" />
            <div className="space-y-2 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">手机</span>
                <span>{user?.phone || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">邮箱</span>
                <span className="truncate">{user?.email || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">注册时间</span>
                <span>-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">最后登录</span>
                <span>刚刚</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 详情 Tabs */}
        <Card>
          <CardHeader className="pb-2" />
          <CardContent>
            <Tabs defaultValue="basic">
              <TabsList>
                <TabsTrigger value="basic"><User className="mr-1 h-3.5 w-3.5" />基本信息</TabsTrigger>
                <TabsTrigger value="security"><Lock className="mr-1 h-3.5 w-3.5" />安全设置</TabsTrigger>
                <TabsTrigger value="notify"><Bell className="mr-1 h-3.5 w-3.5" />通知偏好</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="mt-4">
                <div className="grid max-w-2xl grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nickname">昵称</Label>
                    <Input
                      id="nickname"
                      value={profile.nickname}
                      onChange={(e) => setProfile((prev) => ({ ...prev, nickname: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">用户名</Label>
                    <Input id="username" value={user?.username || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">手机号</Label>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">邮箱</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
                <Button className="mt-4" onClick={handleSaveProfile} disabled={isSavingProfile}>
                  <Check className="h-4 w-4" />{isSavingProfile ? "保存中..." : "保存修改"}
                </Button>
              </TabsContent>

              <TabsContent value="security" className="mt-4">
                <div className="max-w-md space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="oldPassword">当前密码</Label>
                    <Input
                      id="oldPassword"
                      type="password"
                      placeholder="请输入当前密码"
                      value={passwordForm.oldPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">新密码</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="至少 8 位，含字母与数字"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">确认新密码</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="再次输入新密码"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                    />
                  </div>
                  <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                    <Lock className="h-4 w-4" />{isChangingPassword ? "修改中..." : "修改密码"}
                  </Button>
                  <Separator />
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-start gap-2">
                      <Shield className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <div className="text-sm font-medium">两步验证 (MFA)</div>
                        <div className="text-xs text-muted-foreground">使用 TOTP 应用增强账户安全</div>
                      </div>
                    </div>
                    <Switch
                      checked={user?.mfaEnabled || false}
                      onCheckedChange={handleMfaToggle}
                    />
                  </div>

                  <MfaSetupDialog
                    open={mfaSetupOpen}
                    onOpenChange={setMfaSetupOpen}
                    onEnabled={handleMfaEnabled}
                  />

                  <Dialog open={mfaDisableOpen} onOpenChange={setMfaDisableOpen}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>关闭两步验证</DialogTitle>
                        <DialogDescription>
                          请输入 Authenticator 应用中的 6 位验证码以确认关闭。
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <MfaVerifyInput value={disableCode} onChange={setDisableCode} disabled={disabling} />
                        <Button onClick={handleDisableMfa} disabled={disabling || disableCode.length !== 6} className="w-full">
                          {disabling ? "关闭中..." : "确认关闭"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </TabsContent>

              <TabsContent value="notify" className="mt-4">
                <div className="max-w-md space-y-3">
                  {(Object.keys(NOTIFICATION_LABELS) as (keyof NotificationPrefs)[]).map((key) => (
                    <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="text-sm font-medium">{NOTIFICATION_LABELS[key].label}</div>
                        <div className="text-xs text-muted-foreground">{NOTIFICATION_LABELS[key].desc}</div>
                      </div>
                      <Switch
                        checked={prefs[key]}
                        onCheckedChange={(checked) => updatePref(key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
