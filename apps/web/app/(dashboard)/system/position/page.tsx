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
import { PageHeader } from "@/components/shared/page-header";
import { CrudTable, type Column } from "@/components/shared/crud-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { mockPositions, type MockPosition } from "@/lib/mock/system";

export default function PositionPage() {
  const [list, setList] = React.useState<MockPosition[]>(mockPositions);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MockPosition | null>(null);
  const [delId, setDelId] = React.useState<number | null>(null);

  const handleSave = (data: Partial<MockPosition>) => {
    if (editing) {
      setList((p) => p.map((x) => (x.id === editing.id ? { ...x, ...data } as MockPosition : x)));
      toast.success("岗位更新成功");
    } else {
      setList((p) => [
        {
          id: Math.max(0, ...p.map((x) => x.id)) + 1,
          name: data.name!, code: data.code!, sort: data.sort ?? 1,
          status: (data.status as MockPosition["status"]) ?? "enabled",
          createdAt: new Date().toISOString().replace("T", " ").slice(0, 19),
        },
        ...p,
      ]);
      toast.success("岗位新增成功");
    }
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = () => {
    setList((p) => p.filter((x) => x.id !== delId));
    toast.success("已删除该岗位");
    setDelId(null);
  };

  const columns: Column<MockPosition>[] = [
    { key: "id", title: "编号", width: 70, render: (r) => <span className="text-muted-foreground">{r.id}</span> },
    { key: "name", title: "岗位名称", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "code", title: "岗位编码", render: (r) => <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.code}</code> },
    { key: "sort", title: "排序", width: 100, align: "center", render: (r) => <span className="text-muted-foreground">{r.sort}</span> },
    { key: "status", title: "状态", width: 120, render: (r) => <StatusBadge status={r.status} /> },
    { key: "createdAt", title: "创建时间", render: (r) => <span className="text-muted-foreground">{r.createdAt}</span> },
    {
      key: "actions", title: "操作", width: 160, align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-primary"
            onClick={() => { setEditing(r); setFormOpen(true); }}>
            <Edit2 className="h-3.5 w-3.5" />编辑
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
            onClick={() => setDelId(r.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="岗位管理" description="维护组织中的岗位信息">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />新增岗位
        </Button>
      </PageHeader>

      <CrudTable columns={columns} data={list}
        searchFields={[
          { key: "name", label: "岗位名称", placeholder: "请输入岗位名称" },
          { key: "code", label: "岗位编码", placeholder: "请输入编码" },
          { key: "status", label: "状态", type: "select",
            options: [{ label: "启用", value: "enabled" }, { label: "停用", value: "disabled" }] },
        ]} />

      <PositionFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} onSave={handleSave} />
      <ConfirmDialog open={delId != null} onOpenChange={(v) => !v && setDelId(null)}
        title="删除岗位" description="确定要删除该岗位吗？" confirmText="确认删除" onConfirm={handleDelete} />
    </div>
  );
}

function PositionFormDialog({ open, onOpenChange, editing, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  editing: MockPosition | null; onSave: (data: Partial<MockPosition>) => void;
}) {
  const [form, setForm] = React.useState<Partial<MockPosition>>({});
  React.useEffect(() => { if (open) setForm(editing ?? { status: "enabled", sort: 1 }); }, [open, editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.code) { toast.error("请填写岗位名称与编码"); return; }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "编辑岗位" : "新增岗位"}</DialogTitle>
          <DialogDescription>{editing ? `修改岗位「${editing.name}」` : "创建一个新的岗位"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>岗位名称 *</Label>
              <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：高级工程师" />
            </div>
            <div className="space-y-2">
              <Label>岗位编码 *</Label>
              <Input value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="如：senior_dev" />
            </div>
            <div className="space-y-2">
              <Label>排序</Label>
              <Input type="number" value={form.sort ?? 1} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={form.status ?? "enabled"} onValueChange={(v) => setForm({ ...form, status: v as MockPosition["status"] })}>
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
