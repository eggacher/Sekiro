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
import { useTranslation } from "@/lib/i18n";
import type { User, Dept, Role, PageResult } from "@sekiro/shared";

export default function UserPage() {
  const { t } = useTranslation();
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
      toast.error(err.message || t("system.user.fetchListFailed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchDepts = async () => {
    try {
      const res = await apiClient.get<Dept[]>("/system/dept");
      setDepts(res);
    } catch (err: any) {
      toast.error(err.message || t("system.user.fetchDeptsFailed"));
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await apiClient.get<PageResult<Role>>("/system/role?page=1&pageSize=1000");
      setRoles(res.list || []);
    } catch (err: any) {
      toast.error(err.message || t("system.user.fetchRolesFailed"));
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
        toast.success(t("system.user.updateSuccess"));
      } else {
        await apiClient.post<User>("/system/user", data);
        toast.success(t("system.user.createSuccess"));
      }
      setFormOpen(false);
      setEditing(null);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || t("system.user.saveFailed"));
    }
  };

  const handleDelete = async () => {
    if (delId == null) return;
    try {
      await apiClient.delete(`/system/user/${delId}`);
      toast.success(t("system.user.deleteSuccess"));
      setDelId(null);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || t("system.user.deleteFailed"));
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    try {
      await apiClient.put(`/system/user/${resetTarget.id}/reset-password`, {});
      toast.success(t("system.user.resetPasswordSuccess"));
      setResetTarget(null);
    } catch (err: any) {
      toast.error(err.message || t("system.user.resetPasswordFailed"));
    }
  };

  const openAssignRoles = (row: User) => {
    setRoleTarget(row);
    setRoleOpen(true);
  };

  const columns: Column<User>[] = [
    {
      key: "id",
      title: t("system.user.column.id"),
      width: 70,
      render: (row) => <span className="text-muted-foreground">{row.id}</span>,
    },
    {
      key: "username",
      title: t("system.user.column.userInfo"),
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
    { key: "deptName", title: t("system.user.column.dept") },
    {
      key: "roleNames",
      title: t("system.user.column.roles"),
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.roleNames || row.roleIds || []).map((r, i) => (
            <Badge key={i} variant="secondary" className="font-normal">
              {typeof r === "string" ? r : t("system.user.roleFallback", { id: r })}
            </Badge>
          ))}
        </div>
      ),
    },
    { key: "phone", title: t("system.user.column.phone") },
    {
      key: "status",
      title: t("common.status"),
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "lastLoginTime",
      title: t("system.user.column.lastLogin"),
      render: (row) => <span className="text-muted-foreground">{row.lastLoginTime ?? "—"}</span>,
    },
    {
      key: "actions",
      title: t("common.operation"),
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
            {t("common.edit")}
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
                {t("system.user.resetPassword")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openAssignRoles(row)}>
                <ShieldCheck className="h-4 w-4" />
                {t("system.user.assignRoles")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDelId(row.id)}
              >
                <Trash2 className="h-4 w-4" />
                {t("common.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t("system.user.title")} description={t("system.user.description")}>
        <Button variant="outline">
          <Upload className="h-4 w-4" />
          {t("system.user.import")}
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4" />
          {t("system.user.export")}
        </Button>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          {t("system.user.createUser")}
        </Button>
      </PageHeader>

      <CrudTable
        columns={columns}
        data={users}
        loading={loading}
        searchFields={[
          { key: "username", label: t("system.user.search.username"), placeholder: t("system.user.search.usernamePlaceholder") },
          { key: "phone", label: t("system.user.search.phone"), placeholder: t("system.user.search.phonePlaceholder") },
          {
            key: "status",
            label: t("common.status"),
            type: "select",
            options: [
              { label: t("system.status.enabled"), value: "enabled" },
              { label: t("system.status.disabled"), value: "disabled" },
            ],
          },
        ]}
        toolbar={
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            {t("system.user.exportData")}
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
            toast.success(t("system.user.assignRolesSuccess"));
            setRoleOpen(false);
            setRoleTarget(null);
            await fetchUsers();
          } catch (err: any) {
            toast.error(err.message || t("system.user.assignRolesFailed"));
          }
        }}
      />

      <ConfirmDialog
        open={delId != null}
        onOpenChange={(v) => !v && setDelId(null)}
        title={t("system.user.deleteTitle")}
        description={t("system.user.deleteDescription")}
        confirmText={t("system.user.deleteConfirm")}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={resetTarget != null}
        onOpenChange={(v) => !v && setResetTarget(null)}
        title={t("system.user.resetPasswordTitle")}
        description={resetTarget ? t("system.user.resetPasswordDescription", { name: resetTarget.nickname }) : ""}
        confirmText={t("system.user.resetConfirm")}
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
  const { t } = useTranslation();
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
      toast.error(t("system.user.form.usernameRequired"));
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
          <DialogTitle>{editing ? t("system.user.editUser") : t("system.user.createUser")}</DialogTitle>
          <DialogDescription>
            {editing ? t("system.user.editDescription", { name: editing.nickname }) : t("system.user.createDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("system.user.form.username")}</Label>
              <Input
                value={form.username ?? ""}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder={t("system.user.form.usernamePlaceholder")}
                disabled={!!editing}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("system.user.form.nickname")}</Label>
              <Input
                value={form.nickname ?? ""}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                placeholder={t("system.user.form.nicknamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("system.user.form.phone")}</Label>
              <Input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={t("system.user.form.phonePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("system.user.form.email")}</Label>
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="example@sekiro.com"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("system.user.form.dept")}</Label>
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
              <Label>{t("common.status")}</Label>
              <Select
                value={form.status ?? "enabled"}
                onValueChange={(v) => setForm({ ...form, status: v as User["status"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">{t("system.status.enabled")}</SelectItem>
                  <SelectItem value="disabled">{t("system.status.disabled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>{t("system.user.form.roles")}</Label>
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
              {t("common.cancel")}
            </Button>
            <Button type="submit">{editing ? t("common.save") : t("common.create")}</Button>
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
  const { t } = useTranslation();
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
          <DialogTitle>{t("system.user.assignRolesTitle", { name: target?.nickname ?? "" })}</DialogTitle>
          <DialogDescription>{t("system.user.assignRolesDescription")}</DialogDescription>
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
            {t("common.cancel")}
          </Button>
          <Button onClick={() => onSave(selected)}>{t("common.save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
