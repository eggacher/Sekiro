"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, Settings2, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageHeader } from "@/components/shared/page-header";
import { CrudTable, type Column } from "@/components/shared/crud-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CheckableTree, type TreeNode } from "@/components/shared/checkable-tree";
import { HasPermission } from "@/components/shared/has-permission";
import { PERMISSIONS } from "@sekiro/shared";
import { apiClient } from "@/lib/api/client";
import { useTranslation } from "@/lib/i18n";
import { translateMenuTitle } from "@/lib/i18n/menu-title";

export default function RolePage() {
  const { t } = useTranslation();

  const dataScopeLabels: Record<string, string> = {
    all: t("system.role.dataScope.all"),
    dept_and_below: t("system.role.dataScope.dept_and_below"),
    dept: t("system.role.dataScope.dept"),
    self: t("system.role.dataScope.self"),
    custom: t("system.role.dataScope.custom"),
  };

  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [delId, setDelId] = React.useState<number | null>(null);
  const [permOpen, setPermOpen] = React.useState(false);
  const [permTarget, setPermTarget] = React.useState<any | null>(null);
  const [checkedKeys, setCheckedKeys] = React.useState<Set<string | number>>(new Set());
  const [menuTree, setMenuTree] = React.useState<TreeNode[]>([]);

  const fetchList = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>("/system/role?page=1&pageSize=1000");
      setList(res.list || []);
    } catch (err: any) {
      toast.error(err.message || t("system.role.fetchListFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchMenuTree = React.useCallback(async () => {
    try {
      const res = await apiClient.get<any[]>("/system/menu");
      const mapNode = (nodes: any[]): TreeNode[] => {
        return nodes.map((n) => ({
          id: n.id,
          title: translateMenuTitle(t, n.title),
          type: n.type,
          children: n.children ? mapNode(n.children) : undefined,
        }));
      };
      setMenuTree(mapNode(res));
    } catch (err: any) {
      toast.error(t("system.role.fetchMenuFailed"));
    }
  }, [t]);

  React.useEffect(() => {
    fetchList();
    fetchMenuTree();
  }, [fetchList, fetchMenuTree]);

  const handleSave = async (data: Partial<any>, customDeptIds: number[]) => {
    try {
      let roleId = editing?.id;
      if (editing) {
        await apiClient.put(`/system/role/${editing.id}`, {
          name: data.name,
          code: data.code,
          description: data.description,
          status: data.status,
        });
        toast.success(t("system.role.updateSuccess"));
      } else {
        const res = await apiClient.post<any>("/system/role", {
          name: data.name,
          code: data.code,
          description: data.description,
          status: data.status || "enabled",
        });
        roleId = res.id;
        toast.success(t("system.role.createSuccess"));
      }

      if (roleId) {
        await apiClient.put(`/system/role/${roleId}/data-scope`, {
          dataScope: data.dataScope || "self",
          customDeptIds: data.dataScope === "custom" ? customDeptIds : [],
        });
      }

      setFormOpen(false);
      setEditing(null);
      await fetchList();
    } catch (err: any) {
      toast.error(err.message || t("system.role.saveFailed"));
    }
  };

  const handleDelete = async () => {
    if (delId == null) return;
    try {
      await apiClient.delete(`/system/role/${delId}`);
      toast.success(t("system.role.deleteSuccess"));
      setDelId(null);
      await fetchList();
    } catch (err: any) {
      toast.error(err.message || t("system.role.deleteFailed"));
    }
  };

  const openPerm = (role: any) => {
    setPermTarget(role);
    const assignedMenuIds = (role.menus || []).map((m: any) => m.menuId);
    setCheckedKeys(new Set(assignedMenuIds));
    setPermOpen(true);
  };

  const handleSavePerm = async () => {
    if (!permTarget) return;
    try {
      await apiClient.put(`/system/role/${permTarget.id}/menus`, {
        menuIds: Array.from(checkedKeys).map(Number),
      });
      toast.success(t("system.role.assignPermSuccess"));
      setPermOpen(false);
      await fetchList();
    } catch (err: any) {
      toast.error(err.message || t("system.role.assignPermFailed"));
    }
  };

  const columns: Column<any>[] = [
    { key: "id", title: t("system.role.column.id"), width: 70, render: (r) => <span className="text-muted-foreground">{r.id}</span> },
    {
      key: "name",
      title: t("system.role.column.name"),
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Shield className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="font-medium">{r.name}</div>
            <div className="text-xs text-muted-foreground">{r.code}</div>
          </div>
        </div>
      ),
    },
    { key: "description", title: t("system.role.column.description") },
    {
      key: "dataScope",
      title: t("system.role.column.dataScope"),
      render: (r) => <Badge variant="outline">{dataScopeLabels[r.dataScope] || r.dataScope}</Badge>,
    },
    {
      key: "status",
      title: t("common.status"),
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions",
      title: t("common.operation"),
      width: 220,
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <HasPermission code={PERMISSIONS.ROLE_UPDATE}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-primary"
              onClick={() => {
                setEditing(r);
                setFormOpen(true);
              }}
            >
              <Edit2 className="h-3.5 w-3.5" />
              {t("common.edit")}
            </Button>
          </HasPermission>
          <HasPermission code={PERMISSIONS.ROLE_ASSIGN_PERMISSION}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-purple-600"
              onClick={() => openPerm(r)}
            >
              <Settings2 className="h-3.5 w-3.5" />
              {t("system.role.permission")}
            </Button>
          </HasPermission>
          <HasPermission code={PERMISSIONS.ROLE_DELETE}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => setDelId(r.id)}
              disabled={r.id === 1}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </HasPermission>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t("system.role.title")} description={t("system.role.description")}>
        <HasPermission code={PERMISSIONS.ROLE_CREATE}>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            {t("system.role.createRole")}
          </Button>
        </HasPermission>
      </PageHeader>

      <CrudTable
        columns={columns}
        data={list}
        loading={loading}
        searchFields={[
          { key: "name", label: t("system.role.search.name"), placeholder: t("system.role.search.namePlaceholder") },
          { key: "code", label: t("system.role.search.code"), placeholder: t("system.role.search.codePlaceholder") },
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
      />

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSave={handleSave}
      />

      <Sheet open={permOpen} onOpenChange={setPermOpen}>
        <SheetContent className="w-[420px] sm:max-w-[420px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              {t("system.role.assignPermTitle", { name: permTarget?.name })}
            </SheetTitle>
            <SheetDescription>
              {t("system.role.assignPermDescription")}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 rounded-lg border p-2">
            <CheckableTree
              data={menuTree}
              checkedKeys={checkedKeys}
              onChange={setCheckedKeys}
              showType
            />
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {t("system.role.selectedCount", { count: checkedKeys.size })}
          </div>
          <div className="mt-6 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPermOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button className="flex-1" onClick={handleSavePerm}>
              {t("system.role.savePermission")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={delId != null}
        onOpenChange={(v) => !v && setDelId(null)}
        title={t("system.role.deleteTitle")}
        description={t("system.role.deleteDescription")}
        confirmText={t("system.role.deleteConfirm")}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function RoleFormDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: any | null;
  onSave: (data: Partial<any>, customDeptIds: number[]) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = React.useState<Partial<any>>({});
  const [deptTree, setDeptTree] = React.useState<TreeNode[]>([]);
  const [checkedDepts, setCheckedDepts] = React.useState<Set<string | number>>(new Set());

  const fetchDeptTree = React.useCallback(async () => {
    try {
      const res = await apiClient.get<any[]>("/system/dept");
      const mapNode = (nodes: any[]): TreeNode[] => {
        return nodes.map((n) => ({
          id: n.id,
          title: n.name,
          children: n.children ? mapNode(n.children) : undefined,
        }));
      };
      setDeptTree(mapNode(res));
    } catch {}
  }, []);

  React.useEffect(() => {
    if (open) {
      setForm(editing ?? { dataScope: "self", status: "enabled" });
      fetchDeptTree();
      if (editing && editing.depts) {
        setCheckedDepts(new Set(editing.depts.map((d: any) => d.deptId)));
      } else {
        setCheckedDepts(new Set());
      }
    }
  }, [open, editing, fetchDeptTree]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) {
      toast.error(t("system.role.formError"));
      return;
    }
    onSave(form, Array.from(checkedDepts).map(Number));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editing ? t("system.role.editRole") : t("system.role.createRole")}</DialogTitle>
          <DialogDescription>
            {editing ? t("system.role.editDescription", { name: editing.name }) : t("system.role.createDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("system.role.form.name")}</Label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("system.role.form.namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("system.role.form.code")}</Label>
              <Input
                value={form.code ?? ""}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder={t("system.role.form.codePlaceholder")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("system.role.form.dataScope")}</Label>
            <Select
              value={form.dataScope ?? "self"}
              onValueChange={(v) => setForm({ ...form, dataScope: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("system.role.dataScope.all")}</SelectItem>
                <SelectItem value="dept_and_below">{t("system.role.dataScope.dept_and_below")}</SelectItem>
                <SelectItem value="dept">{t("system.role.dataScope.dept")}</SelectItem>
                <SelectItem value="self">{t("system.role.dataScope.self")}</SelectItem>
                <SelectItem value="custom">{t("system.role.dataScope.custom")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.dataScope === "custom" && (
            <div className="space-y-2 rounded-lg border p-3">
              <Label className="mb-2 block">{t("system.role.selectCustomDept")}</Label>
              <div className="max-h-[200px] overflow-y-auto rounded border bg-muted/20 p-2">
                <CheckableTree
                  data={deptTree}
                  checkedKeys={checkedDepts}
                  onChange={setCheckedDepts}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("common.status")}</Label>
            <Select
              value={form.status ?? "enabled"}
              onValueChange={(v) => setForm({ ...form, status: v })}
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
          <div className="space-y-2">
            <Label>{t("system.role.form.description")}</Label>
            <Textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("system.role.form.descriptionPlaceholder")}
              rows={3}
            />
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
