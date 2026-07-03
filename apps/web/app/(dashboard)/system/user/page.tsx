"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, KeyRound, MoreHorizontal, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-header";
import { CrudTable, type Column } from "@/components/shared/crud-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { mockUsers, type MockUser } from "@/lib/mock/system";
import { mockDepts } from "@/lib/mock/system";

const deptOptions = [
  "研发中心", "财务部", "运营部", "市场部", "客服部", "人事部", "前端组", "后端组", "测试组",
];

export default function UserPage() {
  const [users, setUsers] = React.useState<MockUser[]>(mockUsers);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MockUser | null>(null);
  const [delId, setDelId] = React.useState<number | null>(null);

  const handleSave = (data: Partial<MockUser>) => {
    if (editing) {
      setUsers((prev) => prev.map((u) => (u.id === editing.id ? { ...u, ...data } as MockUser : u)));
      toast.success("用户更新成功");
    } else {
      const newUser: MockUser = {
        id: Math.max(0, ...users.map((u) => u.id)) + 1,
        username: data.username!,
        nickname: data.nickname ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        dept: data.dept ?? "研发中心",
        roles: data.roles ?? ["普通用户"],
        status: "enabled",
        lastLogin: "—",
        createdAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      };
      setUsers((prev) => [newUser, ...prev]);
      toast.success("用户新增成功");
    }
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = () => {
    if (delId == null) return;
    setUsers((prev) => prev.filter((u) => u.id !== delId));
    toast.success("已删除该用户");
    setDelId(null);
  };

  const columns: Column<MockUser>[] = [
    {
      key: "id",
      title: "编号",
      width: 70,
      render: (row) => <span className="text-muted-foreground">{row.id}</span>,
    },
    {
      key: "username",
      title: "用户信息",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              {row.nickname.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{row.nickname}</div>
            <div className="text-xs text-muted-foreground">@{row.username}</div>
          </div>
        </div>
      ),
    },
    { key: "dept", title: "部门" },
    {
      key: "roles",
      title: "角色",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles.map((r) => (
            <Badge key={r} variant="secondary" className="font-normal">
              {r}
            </Badge>
          ))}
        </div>
      ),
    },
    { key: "phone", title: "手机" },
    {
      key: "status",
      title: "状态",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "lastLogin",
      title: "最后登录",
      render: (row) => <span className="text-muted-foreground">{row.lastLogin}</span>,
    },
    {
      key: "actions",
      title: "操作",
      width: 180,
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-primary"
            onClick={() => {
              setEditing(row);
              setFormOpen(true);
            }}
          >
            <Edit2 className="h-3.5 w-3.5" />
            编辑
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <KeyRound className="h-4 w-4" />
                重置密码
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Upload className="h-4 w-4" />
                分配角色
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDelId(row.id)}
              >
                <Trash2 className="h-4 w-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="用户管理" description="维护系统用户，分配角色与权限">
        <Button variant="outline">
          <Upload className="h-4 w-4" />
          导入
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4" />
          导出
        </Button>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          新增用户
        </Button>
      </PageHeader>

      <CrudTable
        columns={columns}
        data={users}
        searchFields={[
          { key: "username", label: "用户名", placeholder: "请输入用户名" },
          { key: "phone", label: "手机号", placeholder: "请输入手机号" },
          {
            key: "status",
            label: "状态",
            type: "select",
            options: [
              { label: "启用", value: "enabled" },
              { label: "停用", value: "disabled" },
            ],
          },
        ]}
        toolbar={
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            导出数据
          </Button>
        }
      />

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={delId != null}
        onOpenChange={(v) => !v && setDelId(null)}
        title="删除用户"
        description="删除后该用户将无法登录系统，且相关数据将被清除。此操作不可撤销，确定继续吗？"
        confirmText="确认删除"
        onConfirm={handleDelete}
      />
    </div>
  );
}

function UserFormDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: MockUser | null;
  onSave: (data: Partial<MockUser>) => void;
}) {
  const [form, setForm] = React.useState<Partial<MockUser>>({});

  React.useEffect(() => {
    if (open) {
      setForm(editing ?? { dept: "研发中心", roles: ["普通用户"] });
    }
  }, [open, editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username) {
      toast.error("请输入用户名");
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑用户" : "新增用户"}</DialogTitle>
          <DialogDescription>
            {editing ? `修改用户 ${editing.nickname} 的信息` : "创建一个新的系统用户"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>用户名 *</Label>
              <Input
                value={form.username ?? ""}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="登录账号"
                disabled={!!editing}
              />
            </div>
            <div className="space-y-2">
              <Label>昵称</Label>
              <Input
                value={form.nickname ?? ""}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                placeholder="显示名称"
              />
            </div>
            <div className="space-y-2">
              <Label>手机号</Label>
              <Input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="11 位手机号"
              />
            </div>
            <div className="space-y-2">
              <Label>邮箱</Label>
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="example@sekiro.com"
              />
            </div>
            <div className="space-y-2">
              <Label>部门</Label>
              <Select
                value={form.dept ?? "研发中心"}
                onValueChange={(v) => setForm({ ...form, dept: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {deptOptions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select
                value={form.status ?? "enabled"}
                onValueChange={(v) => setForm({ ...form, status: v as MockUser["status"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">启用</SelectItem>
                  <SelectItem value="disabled">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit">{editing ? "保存" : "创建"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
