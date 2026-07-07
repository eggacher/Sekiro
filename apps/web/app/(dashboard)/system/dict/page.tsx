"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, BookMarked, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api/client";
import { useTranslation } from "@/lib/i18n";
import type { DictType, DictItem, PageResult } from "@sekiro/shared";

export default function DictPage() {
  const { t } = useTranslation();
  const [dicts, setDicts] = React.useState<DictType[]>([]);
  const [activeId, setActiveId] = React.useState<number | null>(null);
  const [items, setItems] = React.useState<DictItem[]>([]);
  const [kw, setKw] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [itemsLoading, setItemsLoading] = React.useState(false);

  const [typeFormOpen, setTypeFormOpen] = React.useState(false);
  const [itemFormOpen, setItemFormOpen] = React.useState(false);
  const [editingType, setEditingType] = React.useState<DictType | null>(null);
  const [editingItem, setEditingItem] = React.useState<DictItem | null>(null);
  const [delType, setDelType] = React.useState<number | null>(null);
  const [delItemValue, setDelItemValue] = React.useState<string | null>(null);

  const active = dicts.find((d) => d.id === activeId);

  const filteredTypes = dicts.filter(
    (d) => !kw || d.name.includes(kw) || d.code.includes(kw)
  );

  const fetchTypes = async (shouldSelectFirst = false) => {
    try {
      setLoading(true);
      const res = await apiClient.get<PageResult<DictType>>("/system/dict?page=1&pageSize=1000");
      setDicts(res.list);
      if (res.list.length > 0 && (activeId === null || shouldSelectFirst)) {
        setActiveId(res.list[0].id);
      }
    } catch (err: any) {
      toast.error(err.message || t("system.dict.fetchTypesFailed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (typeId: number) => {
    try {
      setItemsLoading(true);
      const res = await apiClient.get<PageResult<DictItem>>(`/system/dict-item?typeId=${typeId}&page=1&pageSize=1000`);
      setItems(res.list);
    } catch (err: any) {
      toast.error(err.message || t("system.dict.fetchItemsFailed"));
    } finally {
      setItemsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (activeId !== null) {
      fetchItems(activeId);
    } else {
      setItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const saveType = async (data: Partial<DictType>) => {
    try {
      if (editingType) {
        await apiClient.put(`/system/dict/${editingType.id}`, {
          name: data.name,
          status: data.status,
          remark: data.remark,
        });
        toast.success(t("system.dict.typeUpdateSuccess"));
      } else {
        const res = await apiClient.post<DictType>("/system/dict", {
          name: data.name,
          code: data.code,
          status: data.status,
          remark: data.remark,
        });
        setActiveId(res.id);
        toast.success(t("system.dict.typeCreateSuccess"));
      }
      setTypeFormOpen(false);
      setEditingType(null);
      await fetchTypes();
    } catch (err: any) {
      toast.error(err.message || t("system.dict.typeSaveFailed"));
    }
  };

  const deleteType = async () => {
    if (delType === null) return;
    try {
      await apiClient.delete(`/system/dict/${delType}`);
      toast.success(t("system.dict.typeDeleteSuccess"));
      setDelType(null);
      const remaining = dicts.filter((d) => d.id !== delType);
      if (activeId === delType) {
        setActiveId(remaining.length > 0 ? remaining[0].id : null);
      }
      await fetchTypes();
    } catch (err: any) {
      toast.error(err.message || t("system.dict.typeDeleteFailed"));
    }
  };

  const saveItem = async (data: Partial<DictItem>) => {
    if (activeId === null) return;
    try {
      if (editingItem) {
        await apiClient.put(`/system/dict-item/${editingItem.id}`, {
          label: data.label,
          value: data.value,
          sort: data.sort,
          status: data.status,
        });
        toast.success(t("system.dict.itemUpdateSuccess"));
      } else {
        await apiClient.post("/system/dict-item", {
          typeId: activeId,
          label: data.label,
          value: data.value,
          sort: data.sort,
          status: data.status,
        });
        toast.success(t("system.dict.itemCreateSuccess"));
      }
      setItemFormOpen(false);
      setEditingItem(null);
      await fetchItems(activeId);
    } catch (err: any) {
      toast.error(err.message || t("system.dict.itemSaveFailed"));
    }
  };

  const deleteItem = async () => {
    if (!delItemValue) return;
    const itemToDelete = items.find((it) => it.value === delItemValue);
    if (!itemToDelete) return;
    try {
      await apiClient.delete(`/system/dict-item/${itemToDelete.id}`);
      toast.success(t("system.dict.itemDeleteSuccess"));
      setDelItemValue(null);
      if (activeId !== null) {
        await fetchItems(activeId);
      }
    } catch (err: any) {
      toast.error(err.message || t("system.dict.itemDeleteFailed"));
    }
  };

  return (
    <div>
      <PageHeader title={t("system.dict.title")} description={t("system.dict.description")} />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* 左侧：字典类型 */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b p-3">
            <span className="text-sm font-medium">{t("system.dict.typeTitle")}</span>
            <Button size="sm" variant="ghost" className="h-7"
              onClick={() => { setEditingType(null); setTypeFormOpen(true); }}>
              <Plus className="h-3.5 w-3.5" />{t("common.create")}
            </Button>
          </div>
          <div className="p-2">
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={kw} onChange={(e) => setKw(e.target.value)} placeholder={t("system.dict.searchPlaceholder")} className="h-8 pl-8" />
            </div>
            <div className="scrollbar-thin max-h-[560px] space-y-0.5 overflow-y-auto">
              {loading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">{t("system.dict.loading")}</div>
              ) : filteredTypes.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">{t("system.dict.noMatch")}</div>
              ) : (
                filteredTypes.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setActiveId(d.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                      activeId === d.id ? "bg-primary/10 text-primary" : "hover:bg-accent"
                    )}
                  >
                    <BookMarked className="h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{d.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{d.code}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 右侧：字典项 */}
        <div className="rounded-lg border bg-card">
          {!active ? (
            <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground">
              <BookMarked className="mb-2 h-8 w-8 opacity-50" />
              {t("system.dict.emptyState")}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{active.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{active.code}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{active.remark}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7"
                    onClick={() => { setEditingType(active); setTypeFormOpen(true); }}>
                    <Edit2 className="h-3.5 w-3.5" />{t("system.dict.editType")}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-destructive"
                    onClick={() => setDelType(active.id)}>
                    <Trash2 className="h-3.5 w-3.5" />{t("system.dict.deleteType")}
                  </Button>
                  <Button size="sm"
                    onClick={() => { setEditingItem(null); setItemFormOpen(true); }}>
                    <Plus className="h-3.5 w-3.5" />{t("system.dict.createItem")}
                  </Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-16">{t("system.dict.column.index")}</TableHead>
                    <TableHead>{t("system.dict.column.label")}</TableHead>
                    <TableHead>{t("system.dict.column.value")}</TableHead>
                    <TableHead className="w-20 text-center">{t("system.dict.column.sort")}</TableHead>
                    <TableHead className="w-24">{t("common.status")}</TableHead>
                    <TableHead className="w-28 text-right">{t("system.dict.column.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        {t("system.dict.itemsLoading")}
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        {t("system.dict.noItems")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((it, i) => (
                      <TableRow key={it.value}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{it.label}</TableCell>
                        <TableCell><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{it.value}</code></TableCell>
                        <TableCell className="text-center text-muted-foreground">{it.sort}</TableCell>
                        <TableCell><StatusBadge status={it.status} /></TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary"
                              onClick={() => { setEditingItem(it); setItemFormOpen(true); }}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                              onClick={() => setDelItemValue(it.value)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </div>

      {/* 字典类型表单 */}
      <DictTypeDialog open={typeFormOpen} onOpenChange={setTypeFormOpen}
        editing={editingType} onSave={saveType} />
      {/* 字典项表单 */}
      <DictItemDialog open={itemFormOpen} onOpenChange={setItemFormOpen}
        editing={editingItem} onSave={saveItem} />

      <ConfirmDialog open={delType != null} onOpenChange={(v) => !v && setDelType(null)}
        title={t("system.dict.deleteTypeTitle")} description={t("system.dict.deleteTypeDescription")}
        confirmText={t("system.dict.deleteConfirm")} onConfirm={deleteType} />
      <ConfirmDialog open={delItemValue != null} onOpenChange={(v) => !v && setDelItemValue(null)}
        title={t("system.dict.deleteItemTitle")} description={t("system.dict.deleteItemDescription")}
        confirmText={t("system.dict.deleteConfirm")} onConfirm={deleteItem} />
    </div>
  );
}

function DictTypeDialog({ open, onOpenChange, editing, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editing: DictType | null; onSave: (data: Partial<DictType>) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = React.useState<Partial<DictType>>({});
  React.useEffect(() => { if (open) setForm(editing ?? { status: "enabled" }); }, [open, editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) { toast.error(t("system.dict.typeDialog.formError")); return; }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? t("system.dict.typeDialog.editTitle") : t("system.dict.typeDialog.createTitle")}</DialogTitle>
          <DialogDescription>{editing ? t("system.dict.typeDialog.editDescription", { name: editing.name }) : t("system.dict.typeDialog.createDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("system.dict.typeDialog.nameLabel")}</Label>
              <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("system.dict.typeDialog.codeLabel")}</Label>
              <Input value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder={t("system.dict.typeDialog.codePlaceholder")} disabled={!!editing} />
            </div>
            <div className="space-y-2">
              <Label>{t("common.status")}</Label>
              <Select value={form.status ?? "enabled"} onValueChange={(v) => setForm({ ...form, status: v as DictType["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">{t("system.status.enabled")}</SelectItem>
                  <SelectItem value="disabled">{t("system.status.disabled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("system.dict.typeDialog.remarkLabel")}</Label>
            <Input value={form.remark ?? ""} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder={t("system.dict.typeDialog.remarkPlaceholder")} />
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

function DictItemDialog({ open, onOpenChange, editing, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editing: DictItem | null; onSave: (data: Partial<DictItem>) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = React.useState<Partial<DictItem>>({});
  React.useEffect(() => { if (open) setForm(editing ?? { status: "enabled", sort: 1 }); }, [open, editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label || form.value == null) { toast.error(t("system.dict.itemDialog.formError")); return; }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? t("system.dict.itemDialog.editTitle") : t("system.dict.itemDialog.createTitle")}</DialogTitle>
          <DialogDescription>{editing ? t("system.dict.itemDialog.editDescription", { label: editing.label }) : t("system.dict.itemDialog.createDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("system.dict.itemDialog.labelLabel")}</Label>
              <Input value={form.label ?? ""} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={t("system.dict.itemDialog.labelPlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label>{t("system.dict.itemDialog.valueLabel")}</Label>
              <Input value={form.value ?? ""} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder={t("system.dict.itemDialog.valuePlaceholder")} disabled={!!editing} />
            </div>
            <div className="space-y-2">
              <Label>{t("system.dict.itemDialog.sortLabel")}</Label>
              <Input type="number" value={form.sort ?? 1} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>{t("common.status")}</Label>
              <Select value={form.status ?? "enabled"} onValueChange={(v) => setForm({ ...form, status: v as DictItem["status"] })}>
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
