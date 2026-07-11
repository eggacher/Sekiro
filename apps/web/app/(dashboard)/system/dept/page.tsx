"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, Building2, Phone, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { TreeTable, type TreeRow } from "@/components/shared/tree-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { HasPermission } from "@/components/shared/has-permission";
import { apiClient } from "@/lib/api/client";
import { useTranslation } from "@/lib/i18n";
import { PERMISSIONS, type Dept } from "@sekiro/shared";

export default function DeptPage() {
  const { t } = useTranslation();
  const [depts, setDepts] = React.useState<Dept[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Dept | null>(null);
  const [parentId, setParentId] = React.useState<number | null>(null);
  const [delId, setDelId] = React.useState<number | null>(null);

  const fetchTree = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Dept[]>("/system/dept");
      setDepts(res);
    } catch (err: any) {
      toast.error(err.message || t("system.dept.fetchListFailed"));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (data: Partial<Dept>) => {
    try {
      if (editing) {
        await apiClient.put<Dept>(`/system/dept/${editing.id}`, { ...data, parentId });
        toast.success(t("system.dept.updateSuccess"));
      } else {
        await apiClient.post<Dept>("/system/dept", { ...data, parentId });
        toast.success(t("system.dept.createSuccess"));
      }
      setFormOpen(false);
      setEditing(null);
      setParentId(null);
      await fetchTree();
    } catch (err: any) {
      toast.error(err.message || t("system.dept.saveFailed"));
    }
  };

  const handleDelete = async () => {
    if (delId == null) return;
    try {
      await apiClient.delete(`/system/dept/${delId}`);
      toast.success(t("system.dept.deleteSuccess"));
      setDelId(null);
      await fetchTree();
    } catch (err: any) {
      toast.error(err.message || t("system.dept.deleteFailed"));
    }
  };

  const columns = [
    {
      key: "name",
      title: t("system.dept.column.name"),
      render: (row: Dept, level: number) => (
        <span className="flex items-center gap-2">
          <Building2 className={`h-4 w-4 ${level === 0 ? "text-primary" : "text-muted-foreground"}`} />
          <span className={level === 0 ? "font-semibold" : ""}>{row.name}</span>
        </span>
      ),
    },
    {
      key: "leader",
      title: t("system.dept.column.leader"),
      width: 140,
      render: (row: Dept) =>
        row.leader ? (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            {row.leader}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "phone",
      title: t("system.dept.column.phone"),
      width: 160,
      render: (row: Dept) =>
        row.phone ? (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            {row.phone}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "sort",
      title: t("system.dept.column.sort"),
      width: 80,
      align: "center" as const,
      render: (row: Dept) => <span className="text-muted-foreground">{row.sort}</span>,
    },
    {
      key: "status",
      title: t("common.status"),
      width: 100,
      render: (row: Dept) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      title: t("common.operation"),
      width: 220,
      render: (row: Dept) => (
        <div className="flex items-center gap-1">
          <HasPermission code={PERMISSIONS.DEPT_CREATE}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-primary"
              onClick={() => { setEditing(null); setParentId(row.id); setFormOpen(true); }}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("common.create")}
            </Button>
          </HasPermission>
          <HasPermission code={PERMISSIONS.DEPT_UPDATE}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-primary"
              onClick={() => { setEditing(row); setParentId(findParentId(depts, row.id)); setFormOpen(true); }}
            >
              <Edit2 className="h-3.5 w-3.5" />
              {t("common.edit")}
            </Button>
          </HasPermission>
          <HasPermission code={PERMISSIONS.DEPT_DELETE}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => setDelId(row.id)}
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
      <PageHeader title={t("system.dept.title")} description={t("system.dept.description")}>
        <HasPermission code={PERMISSIONS.DEPT_CREATE}>
          <Button onClick={() => { setEditing(null); setParentId(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />
            {t("system.dept.createDept")}
          </Button>
        </HasPermission>
      </PageHeader>

      <TreeTable<Dept> columns={columns} data={depts as TreeRow<Dept>[]} />

      <DeptFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        parentId={parentId}
        allDepts={depts}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={delId != null}
        onOpenChange={(v) => !v && setDelId(null)}
        title={t("system.dept.deleteTitle")}
        description={t("system.dept.deleteDescription")}
        confirmText={t("system.dept.deleteConfirm")}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function findParentId(list: Dept[], id: number, parent: number | null = null): number | null {
  for (const m of list) {
    if (m.id === id) return parent;
    if (m.children) {
      const f = findParentId(m.children, id, m.id);
      if (f !== null) return f;
    }
  }
  return null;
}

function flattenForSelect(list: Dept[], level = 0): { id: number; name: string; level: number }[] {
  return list.flatMap((m) => [
    { id: m.id, name: m.name, level },
    ...(m.children ? flattenForSelect(m.children, level + 1) : []),
  ]);
}

function DeptFormDialog({
  open, onOpenChange, editing, parentId, allDepts, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Dept | null;
  parentId: number | null;
  allDepts: Dept[];
  onSave: (data: Partial<Dept>) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = React.useState<Partial<Dept>>({});

  React.useEffect(() => {
    if (open) setForm(editing ?? { status: "enabled", sort: 1 });
  }, [open, editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error(t("system.dept.form.nameRequired"));
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? t("system.dept.editDept") : t("system.dept.createDept")}</DialogTitle>
          <DialogDescription>
            {editing ? t("system.dept.editDescription", { name: editing.name }) : t("system.dept.createDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("system.dept.form.parent")}</Label>
              <Select value={String(parentId ?? "")} onValueChange={() => setForm({ ...form })}>
                <SelectTrigger><SelectValue placeholder={t("system.dept.form.parentPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("system.dept.form.parentPlaceholder")}</SelectItem>
                  {flattenForSelect(allDepts).map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {"　".repeat(m.level)}{m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("system.dept.form.name")}</Label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t("system.dept.form.namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("system.dept.form.leader")}</Label>
              <Input
                value={form.leader ?? ""}
                onChange={(e) => setForm({ ...form, leader: e.target.value })}
                placeholder={t("system.dept.form.leaderPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("system.dept.form.phone")}</Label>
              <Input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={t("system.dept.form.phonePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("system.dept.form.sort")}</Label>
              <Input
                type="number"
                value={form.sort ?? 1}
                onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("common.status")}</Label>
              <Select
                value={form.status ?? "enabled"}
                onValueChange={(v) => setForm({ ...form, status: v as Dept["status"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">{t("system.status.enabled")}</SelectItem>
                  <SelectItem value="disabled">{t("system.status.disabled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit">{editing ? t("common.save") : t("common.create")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
