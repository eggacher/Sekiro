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
import { mockDicts, type MockDict } from "@/lib/mock/system";

type DictItem = MockDict["items"][number];

export default function DictPage() {
  const [dicts, setDicts] = React.useState<MockDict[]>(mockDicts);
  const [activeId, setActiveId] = React.useState<number>(mockDicts[0].id);
  const [kw, setKw] = React.useState("");
  const [typeFormOpen, setTypeFormOpen] = React.useState(false);
  const [itemFormOpen, setItemFormOpen] = React.useState(false);
  const [editingType, setEditingType] = React.useState<MockDict | null>(null);
  const [editingItem, setEditingItem] = React.useState<DictItem | null>(null);
  const [delType, setDelType] = React.useState<number | null>(null);
  const [delItemValue, setDelItemValue] = React.useState<string | null>(null);

  const active = dicts.find((d) => d.id === activeId)!;

  const filteredTypes = dicts.filter(
    (d) => !kw || d.name.includes(kw) || d.code.includes(kw)
  );
  const filteredItems = active.items;

  const saveType = (data: Partial<MockDict>) => {
    if (editingType) {
      setDicts((p) => p.map((d) => (d.id === editingType.id ? { ...d, ...data } as MockDict : d)));
      toast.success("字典类型更新成功");
    } else {
      const newType: MockDict = {
        id: Math.max(0, ...dicts.map((d) => d.id)) + 1,
        name: data.name!, code: data.code!,
        status: (data.status as MockDict["status"]) ?? "enabled",
        remark: data.remark ?? "",
        items: [],
        createdAt: new Date().toISOString().replace("T", " ").slice(0, 19),
      };
      setDicts((p) => [newType, ...p]);
      setActiveId(newType.id);
      toast.success("字典类型新增成功");
    }
    setTypeFormOpen(false);
    setEditingType(null);
  };

  const deleteType = () => {
    setDicts((p) => p.filter((d) => d.id !== delType));
    if (activeId === delType && dicts.length > 1) {
      setActiveId(dicts.find((d) => d.id !== delType)!.id);
    }
    setDelType(null);
    toast.success("已删除字典类型");
  };

  const saveItem = (data: Partial<DictItem>) => {
    setDicts((p) =>
      p.map((d) => {
        if (d.id !== activeId) return d;
        if (editingItem) {
          return { ...d, items: d.items.map((it) => (it.value === editingItem.value ? { ...it, ...data } as DictItem : it)) };
        }
        return { ...d, items: [...d.items, {
          label: data.label || "新选项",
          value: data.value || String(Date.now()),
          sort: data.sort ?? d.items.length + 1,
          status: (data.status as DictItem["status"]) ?? "enabled",
        }] };
      })
    );
    toast.success(editingItem ? "字典项更新成功" : "字典项新增成功");
    setItemFormOpen(false);
    setEditingItem(null);
  };

  const deleteItem = () => {
    setDicts((p) => p.map((d) =>
      d.id === activeId ? { ...d, items: d.items.filter((it) => it.value !== delItemValue) } : d
    ));
    setDelItemValue(null);
    toast.success("已删除字典项");
  };

  return (
    <div>
      <PageHeader title="数据字典" description="维护系统中常用的枚举与常量，供下拉、标签复用" />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* 左侧：字典类型 */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b p-3">
            <span className="text-sm font-medium">字典类型</span>
            <Button size="sm" variant="ghost" className="h-7"
              onClick={() => { setEditingType(null); setTypeFormOpen(true); }}>
              <Plus className="h-3.5 w-3.5" />新增
            </Button>
          </div>
          <div className="p-2">
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="搜索字典" className="h-8 pl-8" />
            </div>
            <div className="scrollbar-thin max-h-[560px] space-y-0.5 overflow-y-auto">
              {filteredTypes.map((d) => (
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
                  <Badge variant="outline" className="text-[10px]">{d.items.length}</Badge>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：字典项 */}
        <div className="rounded-lg border bg-card">
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
                <Edit2 className="h-3.5 w-3.5" />编辑类型
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-destructive"
                onClick={() => setDelType(active.id)}>
                <Trash2 className="h-3.5 w-3.5" />删除类型
              </Button>
              <Button size="sm"
                onClick={() => { setEditingItem(null); setItemFormOpen(true); }}>
                <Plus className="h-3.5 w-3.5" />新增字典项
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-16">序号</TableHead>
                <TableHead>字典标签</TableHead>
                <TableHead>字典值</TableHead>
                <TableHead className="w-20 text-center">排序</TableHead>
                <TableHead className="w-24">状态</TableHead>
                <TableHead className="w-28 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    暂无字典项，点击右上角"新增字典项"
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((it, i) => (
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
        </div>
      </div>

      {/* 字典类型表单 */}
      <DictTypeDialog open={typeFormOpen} onOpenChange={setTypeFormOpen}
        editing={editingType} onSave={saveType} />
      {/* 字典项表单 */}
      <DictItemDialog open={itemFormOpen} onOpenChange={setItemFormOpen}
        editing={editingItem} onSave={saveItem} />

      <ConfirmDialog open={delType != null} onOpenChange={(v) => !v && setDelType(null)}
        title="删除字典类型" description="删除后该类型下所有字典项将一并清除，确定继续吗？"
        confirmText="确认删除" onConfirm={deleteType} />
      <ConfirmDialog open={delItemValue != null} onOpenChange={(v) => !v && setDelItemValue(null)}
        title="删除字典项" description="确定要删除该字典项吗？" confirmText="确认删除" onConfirm={deleteItem} />
    </div>
  );
}

function DictTypeDialog({ open, onOpenChange, editing, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editing: MockDict | null; onSave: (data: Partial<MockDict>) => void;
}) {
  const [form, setForm] = React.useState<Partial<MockDict>>({});
  React.useEffect(() => { if (open) setForm(editing ?? { status: "enabled" }); }, [open, editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) { toast.error("请填写字典名称与编码"); return; }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "编辑字典类型" : "新增字典类型"}</DialogTitle>
          <DialogDescription>{editing ? `修改「${editing.name}」` : "创建一个新的字典分类"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>字典名称 *</Label>
              <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>字典编码 *</Label>
              <Input value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="sys_xxx" />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={form.status ?? "enabled"} onValueChange={(v) => setForm({ ...form, status: v as MockDict["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">启用</SelectItem>
                  <SelectItem value="disabled">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>备注</Label>
            <Input value={form.remark ?? ""} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="字典用途说明" />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit">{editing ? "保存" : "创建"}</Button>
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
  const [form, setForm] = React.useState<Partial<DictItem>>({});
  React.useEffect(() => { if (open) setForm(editing ?? { status: "enabled", sort: 1 }); }, [open, editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label || form.value == null) { toast.error("请填写字典标签与值"); return; }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "编辑字典项" : "新增字典项"}</DialogTitle>
          <DialogDescription>{editing ? `修改「${editing.label}」` : "为当前字典类型添加一个选项"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>字典标签 *</Label>
              <Input value={form.label ?? ""} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="显示文本，如：男" />
            </div>
            <div className="space-y-2">
              <Label>字典值 *</Label>
              <Input value={form.value ?? ""} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="存储值，如：0" disabled={!!editing} />
            </div>
            <div className="space-y-2">
              <Label>排序</Label>
              <Input type="number" value={form.sort ?? 1} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={form.status ?? "enabled"} onValueChange={(v) => setForm({ ...form, status: v as DictItem["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">启用</SelectItem>
                  <SelectItem value="disabled">停用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit">{editing ? "保存" : "创建"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
