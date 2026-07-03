"use client";

import * as React from "react";
import { Save, Image as ImageIcon, Globe, Bell, Shield, Palette } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";

function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: typeof Globe; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Field({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label>{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="w-[280px] shrink-0">{children}</div>
    </div>
  );
}

export default function ConfigPage() {
  const [dirty, setDirty] = React.useState(false);
  const handleSave = () => {
    setDirty(false);
    toast.success("配置已保存");
  };

  return (
    <div>
      <PageHeader title="系统配置" description="管理系统运行时可调参数">
        <Button onClick={handleSave} disabled={!dirty}>
          <Save className="h-4 w-4" />保存配置
        </Button>
      </PageHeader>

      <div onChange={() => setDirty(true)} className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="站点信息" icon={Globe}>
          <Field label="站点名称" hint="显示在浏览器标题与登录页">
            <Input defaultValue="Sekiro 管理后台" />
          </Field>
          <Field label="站点 Logo 文字">
            <Input defaultValue="Sekiro" />
          </Field>
          <Field label="备案信息" hint="底部展示的 ICP 备案号">
            <Input defaultValue="京 ICP 备 2026000000 号" />
          </Field>
          <Field label="站点描述">
            <Textarea rows={2} defaultValue="开箱即用的中后台脚手架" />
          </Field>
        </SectionCard>

        <SectionCard title="外观与主题" icon={Palette}>
          <Field label="默认主题">
            <Select defaultValue="light">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">亮色</SelectItem>
                <SelectItem value="dark">暗色</SelectItem>
                <SelectItem value="system">跟随系统</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="主题色">
            <div className="flex gap-2">
              {["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"].map((c, i) => (
                <button key={c} className="h-8 w-8 rounded-full border-2 border-transparent ring-offset-2 hover:ring-2 hover:ring-ring"
                  style={{ background: c, outline: i === 0 ? "2px solid hsl(var(--ring))" : "none", outlineOffset: 2 }} />
              ))}
            </div>
          </Field>
          <Field label="启用水印" hint="在页面上叠加用户名水印">
            <div className="flex items-center justify-end"><Switch defaultChecked /></div>
          </Field>
          <Field label="多页签模式" hint="启用顶部多标签页">
            <div className="flex items-center justify-end"><Switch defaultChecked /></div>
          </Field>
        </SectionCard>

        <SectionCard title="登录与安全" icon={Shield}>
          <Field label="登录验证码" hint="登录时需输入图形验证码">
            <div className="flex items-center justify-end"><Switch defaultChecked /></div>
          </Field>
          <Field label="登录失败锁定" hint="连续失败 N 次后锁定账号">
            <Input type="number" defaultValue={5} />
          </Field>
          <Field label="锁定时长（分钟）">
            <Input type="number" defaultValue={30} />
          </Field>
          <Field label="Token 有效期（分钟）">
            <Input type="number" defaultValue={120} />
          </Field>
          <Field label="强制密码强度">
            <Select defaultValue="medium">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">弱（任意）</SelectItem>
                <SelectItem value="medium">中（字母+数字）</SelectItem>
                <SelectItem value="high">强（大小写+数字+符号）</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </SectionCard>

        <SectionCard title="通知设置" icon={Bell}>
          <Field label="站内通知" hint="异常登录、系统消息推送到站内">
            <div className="flex items-center justify-end"><Switch defaultChecked /></div>
          </Field>
          <Field label="邮件通知">
            <div className="flex items-center justify-end"><Switch /></div>
          </Field>
          <Field label="短信通知">
            <div className="flex items-center justify-end"><Switch /></div>
          </Field>
          <Separator />
          <Field label="SMTP 服务器">
            <Input placeholder="smtp.example.com" defaultValue="smtp.sekiro.com" />
          </Field>
          <Field label="发件邮箱">
            <Input type="email" defaultValue="noreply@sekiro.com" />
          </Field>
        </SectionCard>
      </div>
    </div>
  );
}
