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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";

export default function ProfilePage() {
  return (
    <div>
      <PageHeader title="个人中心" description="管理你的账户信息、安全与偏好设置" />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* 侧边个人卡 */}
        <Card className="h-fit">
          <CardContent className="pt-6 text-center">
            <div className="relative mx-auto h-24 w-24">
              <Avatar className="h-24 w-24 ring-4 ring-background">
                <AvatarFallback className="bg-gradient-to-br from-primary to-purple-500 text-2xl font-bold text-primary-foreground">
                  A
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <h3 className="mt-4 text-lg font-semibold">超级管理员</h3>
            <p className="text-sm text-muted-foreground">@admin</p>
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              <Badge>超级管理员</Badge>
              <Badge variant="secondary">研发中心</Badge>
            </div>
            <Separator className="my-4" />
            <div className="space-y-2 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">手机</span>
                <span>138****8000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">邮箱</span>
                <span className="truncate">admin@sekiro.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">注册时间</span>
                <span>2024-01-01</span>
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
                    <Label>昵称</Label>
                    <Input defaultValue="超级管理员" />
                  </div>
                  <div className="space-y-2">
                    <Label>用户名</Label>
                    <Input defaultValue="admin" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>手机号</Label>
                    <Input defaultValue="13800138000" />
                  </div>
                  <div className="space-y-2">
                    <Label>邮箱</Label>
                    <Input type="email" defaultValue="admin@sekiro.com" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>个人简介</Label>
                    <Input defaultValue="负责系统整体运维与配置" />
                  </div>
                </div>
                <Button className="mt-4" onClick={() => toast.success("资料已更新")}>
                  <Check className="h-4 w-4" />保存修改
                </Button>
              </TabsContent>

              <TabsContent value="security" className="mt-4">
                <div className="max-w-md space-y-4">
                  <div className="space-y-2">
                    <Label>当前密码</Label>
                    <Input type="password" placeholder="请输入当前密码" />
                  </div>
                  <div className="space-y-2">
                    <Label>新密码</Label>
                    <Input type="password" placeholder="至少 8 位，含字母与数字" />
                  </div>
                  <div className="space-y-2">
                    <Label>确认新密码</Label>
                    <Input type="password" placeholder="再次输入新密码" />
                  </div>
                  <Button onClick={() => toast.success("密码修改成功")}>
                    <Lock className="h-4 w-4" />修改密码
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
                    <Switch />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notify" className="mt-4">
                <div className="max-w-md space-y-3">
                  {[
                    { label: "系统消息", desc: "版本更新、维护公告", checked: true },
                    { label: "操作提醒", desc: "重要操作的通知", checked: true },
                    { label: "安全告警", desc: "异常登录、权限变更", checked: true },
                    { label: "邮件订阅", desc: "每周数据汇总邮件", checked: false },
                  ].map((n) => (
                    <div key={n.label} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="text-sm font-medium">{n.label}</div>
                        <div className="text-xs text-muted-foreground">{n.desc}</div>
                      </div>
                      <Switch defaultChecked={n.checked} />
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
