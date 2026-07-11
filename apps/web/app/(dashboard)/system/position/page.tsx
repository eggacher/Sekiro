"use client";

import * as React from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HasPermission } from "@/components/shared/has-permission";
import { PageHeader } from "@/components/shared/page-header";
import { CrudTable, type Column } from "@/components/shared/crud-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { apiClient } from "@/lib/api/client";
import { useTranslation } from "@/lib/i18n";
import { PERMISSIONS, type Position, type PageResult } from "@sekiro/shared";

export default function PositionPage() {
  const { t } = useTranslation();
  const [list, setList] = React.useState<Position[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Position | null>(null);
  const [delId, setDelId] = React.useState<number | null>(null);

  const fetchList = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<PageResult<Position>>("/system/position?page=1&pageSize=1000");
      setList(res.list);
    } catch (err: any) {
      toast.error(err.message || t("system.position.fetchListFailed"));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (data: Partial<Position>) => {
    try {
      if (editing) {
        await apiClient.put(`/system/position/${editing.id}`, {
          name: data.name,
          sort: data.sort,
          status: data.status,
        });
        toast.success(t("system.position.updateSuccess"));
      } else {
        await apiClient.post("/system/position", {
          name: data.name,
          code: data.code,
          sort: data.sort,
          status: data.status,
        });
        toast.success(t("system.position.createSuccess"));
      }
      setFormOpen(false);
      setEditing(null);
      await fetchList();
    } catch (err: any) {
      toast.error(err.message || t("system.position.saveFailed"));
    }
  };

  const handleDelete = async () => {
    if (delId === null) return;
    try {
      await apiClient.delete(`/system/position/${delId}`);
      toast.success(t("system.position.deleteSuccess"));
      setDelId(null);
      await fetchList();
    } catch (err: any) {
      toast.error(err.message || t("system.position.deleteFailed"));
    }
  };

  const columns: Column<Position>[] = [
    { key: "id", title: t("system.position.column.id"), width: 70, render: (r) => <span className="text-muted-foreground">{r.id}</span> },
    { key: "name", title: t("system.position.column.name"), render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "code", title: t("system.position.column.code"), render: (r) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.code}</code> },
    { key: "sort", title: t("system.position.column.sort"), width: 100, align: "center", render: (r) => <span className="text-muted-foreground">{r.sort}</span> },
    { key: "status", title: t("common.status"), width: 120, render: (r) => <StatusBadge status={r.status} /> },
    { key: "createdAt", title: t("system.position.column.createdAt"), render: (r) => <span className="text-muted-foreground">{r.createdAt}</span> },
    {
      key: "actions", title: t("common.operation"), width: 160, align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <HasPermission code={PERMISSIONS.POSITION_UPDATE}>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-primary"
              onClick={() => { setEditing(r); setFormOpen(true); }}>
              <Edit2 className="h-3.5 w-3.5" />{t("common.edit")}
            </Button>
          </HasPermission>
          <HasPermission code={PERMISSIONS.POSITION_DELETE}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
              onClick={() => setDelId(r.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </HasPermission>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t("system.position.title")} description={t("system.position.description")}>
        <HasPermission code={PERMISSIONS.POSITION_CREATE}>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" />{t("system.position.createPosition")}
          </Button>
        </HasPermission>
      </PageHeader>

      <CrudTable columns={columns} data={list} loading={loading}
        searchFields={[
          { key: "name", label: t("system.position.search.name"), placeholder: t("system.position.search.namePlaceholder") },
          { key: "code", label: t("system.position.search.code"), placeholder: t("system.position.search.codePlaceholder") },
          { key: "status", label: t("common.status"), type: "select",
            options: [{ label: t("system.status.enabled"), value: "enabled" }, { label: t("system.status.disabled"), value: "disabled" }] },
        ]} />

      <PositionFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onSave={handleSave} />
      <ConfirmDialog open={delId != null} onOpenChange={(v) => !v && setDelId(null)}
        title={t("system.position.deleteTitle")} description={t("system.position.deleteDescription")} confirmText={t("system.position.deleteConfirm")} onConfirm={handleDelete} />
    </div>
  );
}

function PositionFormDialog({ open, onOpenChange, editing, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editing: Position | null; onSave: (data: Partial<Position>) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = React.useState<Partial<Position>>({});
  React.useEffect(() => { if (open) setForm(editing ?? { status: "enabled", sort: 1 }); }, [open, editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) { toast.error(t("system.position.formError")); return; }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? t("system.position.editPosition") : t("system.position.createPosition")}</DialogTitle>
          <DialogDescription>{editing ? t("system.position.editDescription", { name: editing.name }) : t("system.position.createDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("system.position.form.name")}</Label>
              <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("system.position.form.namePlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("system.position.form.code")}</Label>
              <Input value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder={t("system.position.form.codePlaceholder")} disabled={!!editing} />
            </div>
            <div className="space-y-2">
              <Label>{t("system.position.form.sort")}</Label>
              <Input type="number" value={form.sort ?? 1} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>{t("common.status")}</Label>
              <Select value={form.status ?? "enabled"} onValueChange={(v) => setForm({ ...form, status: v as Position["status"] })}>
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
