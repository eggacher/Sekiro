"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, Folder, FileText, MousePointerClick } from "lucide-react";
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
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { TreeTable, type TreeRow } from "@/components/shared/tree-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { apiClient } from "@/lib/api/client";
import { useTranslation } from "@/lib/i18n";
import type { Menu } from "@sekiro/shared";

export default function MenuPage() {
  const { t } = useTranslation();

  const typeMeta = React.useMemo(
    () => ({
      directory: { label: t("system.menu.type.directory"), icon: Folder, color: "text-blue-500" },
      menu: { label: t("system.menu.type.menu"), icon: FileText, color: "text-purple-500" },
      button: { label: t("system.menu.type.button"), icon: MousePointerClick, color: "text-amber-500" },
    }),
    [t]
  );

  const [menus, setMenus] = React.useState<Menu[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Menu | null>(null);
  const [parentId, setParentId] = React.useState<number | null>(null);
  const [delId, setDelId] = React.useState<number | null>(null);

  const fetchTree = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Menu[]>("/system/menu");
      setMenus(res);
    } catch (err: any) {
      toast.error(err.message || t("system.menu.fetchListFailed"));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (data: Partial<Menu>) => {
    try {
      if (editing) {
        await apiClient.put<Menu>(`/system/menu/${editing.id}`, { ...data, parentId });
        toast.success(t("system.menu.updateSuccess"));
      } else {
        await apiClient.post<Menu>("/system/menu", { ...data, parentId });
        toast.success(t("system.menu.createSuccess"));
      }
      setFormOpen(false);
      setEditing(null);
      setParentId(null);
      await fetchTree();
    } catch (err: any) {
      toast.error(err.message || t("system.menu.saveFailed"));
    }
  };

  const handleDelete = async () => {
    if (delId == null) return;
    try {
      await apiClient.delete(`/system/menu/${delId}`);
      toast.success(t("system.menu.deleteSuccess"));
      setDelId(null);
      await fetchTree();
    } catch (err: any) {
      toast.error(err.message || t("system.menu.deleteFailed"));
    }
  };

  const flatten = (list: Menu[]): Menu[] =>
    list.flatMap((m) => [m, ...(m.children ? flatten(m.children) : [])]);

  const columns = [
    {
      key: "title",
      title: t("system.menu.column.title"),
      render: (row: Menu, level: number) => {
        const meta = typeMeta[row.type];
        const Icon = meta.icon;
        return (
          <span className={`flex items-center gap-2 ${meta.color}`}>
            <Icon className="h-4 w-4" />
            <span className={level === 0 ? "font-semibold" : ""}>{row.title}</span>
          </span>
        );
      },
    },
    {
      key: "type",
      title: t("system.menu.column.type"),
      width: 90,
      render: (row: Menu) => {
        const meta = typeMeta[row.type];
        return <Badge variant="outline">{meta.label}</Badge>;
      },
    },
    {
      key: "path",
      title: t("system.menu.column.path"),
      render: (row: Menu) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {row.path || row.permission || "—"}
        </code>
      ),
    },
    { key: "icon", title: t("system.menu.column.icon"), width: 100, render: (row: Menu) => row.icon || "—" },
    {
      key: "sort",
      title: t("system.menu.column.sort"),
      width: 80,
      align: "center" as const,
      render: (row: Menu) => <span className="text-muted-foreground">{row.sort}</span>,
    },
    {
      key: "status",
      title: t("common.status"),
      width: 100,
      render: (row: Menu) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      title: t("common.operation"),
      width: 220,
      render: (row: Menu) => (
        <div className="flex items-center gap-1">
          {row.type !== "button" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-primary"
              onClick={() => {
                setEditing(null);
                setParentId(row.id);
                setFormOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("common.create")}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-primary"
            onClick={() => {
              setEditing(row);
              setParentId(findParentId(menus, row.id));
              setFormOpen(true);
            }}
          >
            <Edit2 className="h-3.5 w-3.5" />
            {t("common.edit")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => setDelId(row.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t("system.menu.title")} description={t("system.menu.description")}>
        <Button onClick={() => { setEditing(null); setParentId(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          {t("system.menu.createMenu")}
        </Button>
      </PageHeader>

      <div className="rounded-lg border bg-card p-3 mb-3">
        <p className="text-xs text-muted-foreground">
          {t("system.menu.stats.total", { count: flatten(menus).length })} ·{" "}
          {t("system.menu.stats.directory")} <Badge variant="default" className="mx-1 text-[10px]">{t("system.menu.stats.directory")}</Badge>
          {t("system.menu.stats.directoryDesc")} ·{" "}
          {t("system.menu.stats.menu")} <Badge variant="secondary" className="mx-1 text-[10px]">{t("system.menu.stats.menu")}</Badge>
          {t("system.menu.stats.menuDesc")} ·{" "}
          {t("system.menu.stats.button")} <Badge variant="outline" className="mx-1 text-[10px]">{t("system.menu.stats.button")}</Badge>
          {t("system.menu.stats.buttonDesc")}
        </p>
      </div>

      <TreeTable<Menu> columns={columns} data={menus as TreeRow<Menu>[]} />

      <MenuFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        parentId={parentId}
        allMenus={menus}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={delId != null}
        onOpenChange={(v) => !v && setDelId(null)}
        title={t("system.menu.deleteTitle")}
        description={t("system.menu.deleteDescription")}
        confirmText={t("system.menu.deleteConfirm")}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function findParentId(list: Menu[], id: number, parent: number | null = null): number | null {
  for (const m of list) {
    if (m.id === id) return parent;
    if (m.children) {
      const found = findParentId(m.children, id, m.id);
      if (found !== null) return found;
    }
  }
  return null;
}

function MenuFormDialog({
  open,
  onOpenChange,
  editing,
  parentId,
  allMenus,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Menu | null;
  parentId: number | null;
  allMenus: Menu[];
  onSave: (data: Partial<Menu>) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = React.useState<Partial<Menu>>({});

  React.useEffect(() => {
    if (open) {
      setForm(
        editing ?? {
          type: "menu",
          status: "enabled",
          sort: 1,
        }
      );
    }
  }, [open, editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      toast.error(t("system.menu.form.nameRequired"));
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? t("system.menu.editMenu") : t("system.menu.createMenu")}</DialogTitle>
          <DialogDescription>
            {editing ? t("system.menu.editDescription", { title: editing.title }) : t("system.menu.createDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("system.menu.form.type")}</Label>
              <Select
                value={form.type ?? "menu"}
                onValueChange={(v) => setForm({ ...form, type: v as Menu["type"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="directory">{t("system.menu.type.directory")}</SelectItem>
                  <SelectItem value="menu">{t("system.menu.type.menu")}</SelectItem>
                  <SelectItem value="button">{t("system.menu.type.button")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("system.menu.form.parent")}</Label>
              <Select
                value={String(parentId ?? "")}
                onValueChange={(v) => setForm({ ...form })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("system.menu.form.parentPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("system.menu.form.parentPlaceholder")}</SelectItem>
                  {flattenForSelect(allMenus).map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {"　".repeat(m.level)}{m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("system.menu.form.name")}</Label>
              <Input
                value={form.title ?? ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("system.menu.form.namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("system.menu.form.sort")}</Label>
              <Input
                type="number"
                value={form.sort ?? 1}
                onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })}
              />
            </div>
            {form.type !== "button" && (
              <>
                <div className="space-y-2">
                  <Label>{t("system.menu.form.route")}</Label>
                  <Input
                    value={form.path ?? ""}
                    onChange={(e) => setForm({ ...form, path: e.target.value })}
                    placeholder={t("system.menu.form.routePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("system.menu.form.icon")}</Label>
                  <Input
                    value={form.icon ?? ""}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder={t("system.menu.form.iconPlaceholder")}
                  />
                </div>
              </>
            )}
            {form.type === "button" && (
              <div className="col-span-2 space-y-2">
                <Label>{t("system.menu.form.permission")}</Label>
                <Input
                  value={form.permission ?? ""}
                  onChange={(e) => setForm({ ...form, permission: e.target.value })}
                  placeholder={t("system.menu.form.permissionPlaceholder")}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("common.status")}</Label>
              <Select
                value={form.status ?? "enabled"}
                onValueChange={(v) => setForm({ ...form, status: v as Menu["status"] })}
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

function flattenForSelect(list: Menu[], level = 0): { id: number; title: string; level: number }[] {
  return list.flatMap((m) => [
    { id: m.id, title: m.title, level },
    ...(m.children ? flattenForSelect(m.children, level + 1) : []),
  ]);
}
