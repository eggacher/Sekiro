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
import { useTranslation } from "@/lib/i18n";
import { md5 } from "@/lib/crypto";
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

const NOTIFICATION_LABEL_KEYS: Record<
  keyof NotificationPrefs,
  { label: "profile.notification.system.label" | "profile.notification.operation.label" | "profile.notification.security.label" | "profile.notification.email.label"; desc: "profile.notification.system.desc" | "profile.notification.operation.desc" | "profile.notification.security.desc" | "profile.notification.email.desc" }
> = {
  system: { label: "profile.notification.system.label", desc: "profile.notification.system.desc" },
  operation: { label: "profile.notification.operation.label", desc: "profile.notification.operation.desc" },
  security: { label: "profile.notification.security.label", desc: "profile.notification.security.desc" },
  email: { label: "profile.notification.email.label", desc: "profile.notification.email.desc" },
};

const DEFAULT_PREFS: NotificationPrefs = {
  system: true,
  operation: true,
  security: true,
  email: false,
};

export default function ProfilePage() {
  const { t } = useTranslation();
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
      toast.success(t("profile.toast.profileUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("profile.toast.profileUpdateFailed"));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t("profile.toast.passwordMismatch"));
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiClient.put("/system/user/password", {
        oldPassword: md5(passwordForm.oldPassword),
        newPassword: md5(passwordForm.newPassword),
      });
      toast.success(t("profile.toast.passwordChanged"));
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("profile.toast.passwordChangeFailed"));
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
      <PageHeader title={t("profile.title")} description={t("profile.description")} />
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
            <h3 className="mt-4 text-lg font-semibold">{user?.nickname || t("profile.unsetNickname")}</h3>
            <p className="text-sm text-muted-foreground">@{user?.username || "-"}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {user?.roles?.map((role) => (
                <Badge key={role}>{role}</Badge>
              ))}
              {!user?.roles?.length && <Badge variant="secondary">{t("profile.regularUser")}</Badge>}
            </div>
            <Separator className="my-4" />
            <div className="space-y-2 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("profile.phone")}</span>
                <span>{user?.phone || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("profile.email")}</span>
                <span className="truncate">{user?.email || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("profile.registerTime")}</span>
                <span>-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("profile.lastLogin")}</span>
                <span>{t("profile.justNow")}</span>
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
                <TabsTrigger value="basic"><User className="mr-1 h-3.5 w-3.5" />{t("profile.basicInfo")}</TabsTrigger>
                <TabsTrigger value="security"><Lock className="mr-1 h-3.5 w-3.5" />{t("profile.security")}</TabsTrigger>
                <TabsTrigger value="notify"><Bell className="mr-1 h-3.5 w-3.5" />{t("profile.notifications")}</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="mt-4">
                <div className="grid max-w-2xl grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nickname">{t("profile.nickname")}</Label>
                    <Input
                      id="nickname"
                      value={profile.nickname}
                      onChange={(e) => setProfile((prev) => ({ ...prev, nickname: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">{t("profile.username")}</Label>
                    <Input id="username" value={user?.username || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("profile.mobile")}</Label>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("profile.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
                <Button className="mt-4" onClick={handleSaveProfile} disabled={isSavingProfile}>
                  <Check className="h-4 w-4" />{isSavingProfile ? t("profile.saving") : t("profile.save")}
                </Button>
              </TabsContent>

              <TabsContent value="security" className="mt-4">
                <div className="max-w-md space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="oldPassword">{t("profile.currentPassword")}</Label>
                    <Input
                      id="oldPassword"
                      type="password"
                      placeholder={t("profile.currentPasswordPlaceholder")}
                      value={passwordForm.oldPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t("profile.newPassword")}</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder={t("profile.newPasswordPlaceholder")}
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t("profile.confirmPassword")}</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder={t("profile.confirmPasswordPlaceholder")}
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                    />
                  </div>
                  <Button onClick={handleChangePassword} disabled={isChangingPassword}>
                    <Lock className="h-4 w-4" />{isChangingPassword ? t("profile.changingPassword") : t("profile.changePassword")}
                  </Button>
                  <Separator />
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-start gap-2">
                      <Shield className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <div className="text-sm font-medium">{t("profile.mfaTitle")}</div>
                        <div className="text-xs text-muted-foreground">{t("profile.mfaDescription")}</div>
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
                  {(Object.keys(NOTIFICATION_LABEL_KEYS) as (keyof NotificationPrefs)[]).map((key) => (
                    <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="text-sm font-medium">{t(NOTIFICATION_LABEL_KEYS[key].label)}</div>
                        <div className="text-xs text-muted-foreground">{t(NOTIFICATION_LABEL_KEYS[key].desc)}</div>
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
