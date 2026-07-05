"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, KeyRound, MoreHorizontal, Download, Upload, ShieldCheck } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-header";
import { CrudTable, type Column } from "@/components/shared/crud-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { apiClient } from "@/lib/api/client";
import type { User, Dept, Role, PageResult } from "@sekiro/shared";

export default function UserPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const [depts, setDepts] = React.useState<Dept[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<User | null>(null);
  const [delId, setDelId] = React.useState<number | null>(null);
  const [roleOpen, setRoleOpen] = React.useState(false);
  const [roleTarget, setRoleTarget] = React.useState<User | null>(null);
  const [resetTarget, setResetTarget] = React.useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<PageResult<User>>("/system/user?page=1&pageSize=1000");
      setUsers(res.list);
    } catch (err: any) {
      toast.error(err.message || "加载用户列表失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepts = async () => {
    try {
      const res = await apiClient.get<Dept[]>("/system/dept");
      setDepts(res);
    } catch (err: any) {
      toast.error(err.message || "加载部门列表失败");
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await apiClient.get<PageResult<Role>>("/system/role?page=1&pageSize=1000");
      setRoles(res.list || []);
    } catch (err: any) {
      toast.error(err.message || "加载角色列表失败");
    }
  };

  React.useEffect(() => {
    fetchUsers();
    fetchDepts();
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (data: Partial<User>) => {
    try {
      if (editing) {
        await apiClient.put<User>(`/system/user/${editing.id}`, data);
        toast.success("用户更新成功");
      } else {
        await apiClient.post<User>("/system/user", data);
        toast.success("用户新增成功");
      }
      setFormOpen(false);
      setEditing(null);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "保存用户失败");
    }
  };

  const handleDelete = async () => {
    if (delId == null) return;
    try {
      await apiClient.delete(`/system/user/${delId}`);
      toast.success("已删除该用户");
      setDelId(null);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "删除用户失败");
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    try {
      await apiClient.put(`/system/user/${resetTarget.id}/reset-password`, {});
      toast.success("密码重置成功");
      setResetTarget(null);
    } catch (err: any) {
      toast.error(err.message || "重置密码失败");
    }
  };

  const openAssignRoles = (row: User) => {
    setRoleTarget(row);
    setRoleOpen(true);
  };

  const columns: Column<User>[] = [
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
    { key: "deptName", title: "部门" },
    {
      key: "roleNames",
      title: "角色",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.roleNames || row.roleIds || []).map((r, i) => (
            <Badge key={i} variant="secondary" className="font-normal">
              {typeof r === "string" ? r : `角色 ${r}`}
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
      key: "lastLoginTime",
      title: "最后登录",
      render: (row) => <span className="text-muted-foreground">{row.lastLoginTime ?? "—"}</span>,
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
              <DropdownMenuItem onClick={() => setResetTarget(row)}>
                <KeyRound className="h-4 w-4" />
                重置密码
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openAssignRoles(row)}>
                <ShieldCheck className="h-4 w-4" />
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
        loading={loading}
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
        depts={depts}
        roles={roles}
        onSave={handleSave}
      />

      <RoleAssignDialog
        open={roleOpen}
        onOpenChange={setRoleOpen}
        target={roleTarget}
        roles={roles}
        onSave={async (roleIds) => {
          if (!roleTarget) return;
          try {
            await apiClient.put(`/system/user/${roleTarget.id}/roles`, { roleIds });
            toast.success("分配角色成功");
            setRoleOpen(false);
            setRoleTarget(null);
            await fetchUsers();
          } catch (err: any) {
            toast.error(err.message || "分配角色失败");
          }
        }}
      />

      <ConfirmDialog
        open={delId != null}
        onOpenChange={(v) => !v && setDelId(null)}
        title="删除用户"
        description="删除后该用户将无法登录系统，且相关数据将被清除。此操作不可撤销，确定继续吗？"
        confirmText="确认删除"
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={resetTarget != null}
        onOpenChange={(v) => !v && setResetTarget(null)}
        title="重置密码"
        description={resetTarget ? `确定要重置用户「${resetTarget.nickname}」的登录密码吗？` : ""}
        confirmText="确认重置"
        onConfirm={handleResetPassword}
      />
    </div>
  );
}

function UserFormDialog({
  open,
  onOpenChange,
  editing,
  depts,
  roles,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: User | null;
  depts: Dept[];
  roles: Role[];
  onSave: (data: Partial<User>) => void;
}) {
  const [form, setForm] = React.useState<Partial<User>>({});

  React.useEffect(() => {
    if (open) {
      setForm(
        editing ?? {
          status: "enabled",
          deptId: depts[0]?.id,
          roleIds: roles[0] ? [roles[0].id] : [],
        }
      );
    }
  }, [open, editing, depts, roles]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username) {
      toast.error("请输入用户名");
      return;
    }
    onSave(form);
  };

  const toggleRole = (roleId: number, checked: boolean) => {
    const current = form.roleIds ?? [];
    if (checked) {
      setForm({ ...form, roleIds: [...current, roleId] });
    } else {
      setForm({ ...form, roleIds: current.filter((id) => id !== roleId) });
    }
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
                value={String(form.deptId ?? "")}
                onValueChange={(v) => setForm({ ...form, deptId: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {depts.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select
                value={form.status ?? "enabled"}
                onValueChange={(v) => setForm({ ...form, status: v as User["status"] })}
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
            <div className="col-span-2 space-y-2">
              <Label>角色</Label>
              <div className="flex flex-wrap gap-3 rounded-md border p-3">
                {roles.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={(form.roleIds ?? []).includes(r.id)}
                      onCheckedChange={(checked) => toggleRole(r.id, checked === true)}
                    />
                    {r.name}
                  </label>
                ))}
              </div>
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

function RoleAssignDialog({
  open,
  onOpenChange,
  target,
  roles,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: User | null;
  roles: Role[];
  onSave: (roleIds: number[]) => void;
}) {
  const [selected, setSelected] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (open && target) {
      setSelected(target.roleIds ?? []);
    }
  }, [open, target]);

  const toggle = (roleId: number, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, roleId] : prev.filter((id) => id !== roleId)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>分配角色 · {target?.nickname ?? ""}</DialogTitle>
          <DialogDescription>勾选需要分配给该用户的角色</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {roles.map((r) => (
            <label
              key={r.id}
              className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50"
            >
              <span className="flex items-center gap-3">
                <Checkbox
                  checked={selected.includes(r.id)}
                  onCheckedChange={(checked) => toggle(r.id, checked === true)}
                />
                <span className="font-medium">{r.name}</span>
              </span>
              <Badge variant="outline">{r.code}</Badge>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => onSave(selected)}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
