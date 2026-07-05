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
import { apiClient } from "@/lib/api/client";
import type { Dept } from "@sekiro/shared";

export default function DeptPage() {
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
      toast.error(err.message || "加载部门列表失败");
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
        toast.success("部门更新成功");
      } else {
        await apiClient.post<Dept>("/system/dept", { ...data, parentId });
        toast.success("部门新增成功");
      }
      setFormOpen(false);
      setEditing(null);
      setParentId(null);
      await fetchTree();
    } catch (err: any) {
      toast.error(err.message || "保存部门失败");
    }
  };

  const handleDelete = async () => {
    if (delId == null) return;
    try {
      await apiClient.delete(`/system/dept/${delId}`);
      toast.success("已删除该部门");
      setDelId(null);
      await fetchTree();
    } catch (err: any) {
      toast.error(err.message || "删除部门失败");
    }
  };

  const columns = [
    {
      key: "name",
      title: "部门名称",
      render: (row: Dept, level: number) => (
        <span className="flex items-center gap-2">
          <Building2 className={`h-4 w-4 ${level === 0 ? "text-primary" : "text-muted-foreground"}`} />
          <span className={level === 0 ? "font-semibold" : ""}>{row.name}</span>
        </span>
      ),
    },
    {
      key: "leader",
      title: "负责人",
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
      title: "联系电话",
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
      title: "排序",
      width: 80,
      align: "center" as const,
      render: (row: Dept) => <span className="text-muted-foreground">{row.sort}</span>,
    },
    {
      key: "status",
      title: "状态",
      width: 100,
      render: (row: Dept) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      title: "操作",
      width: 220,
      render: (row: Dept) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-primary"
            onClick={() => { setEditing(null); setParentId(row.id); setFormOpen(true); }}
          >
            <Plus className="h-3.5 w-3.5" />
            新增
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-primary"
            onClick={() => { setEditing(row); setParentId(findParentId(depts, row.id)); setFormOpen(true); }}
          >
            <Edit2 className="h-3.5 w-3.5" />
            编辑
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
      <PageHeader title="部门管理" description="维护组织架构，配置数据权限范围">
        <Button onClick={() => { setEditing(null); setParentId(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          新增部门
        </Button>
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
        title="删除部门"
        description="删除部门会同时删除其下所有子部门，确定继续吗？"
        confirmText="确认删除"
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
  const [form, setForm] = React.useState<Partial<Dept>>({});

  React.useEffect(() => {
    if (open) setForm(editing ?? { status: "enabled", sort: 1 });
  }, [open, editing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("请输入部门名称");
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "编辑部门" : "新增部门"}</DialogTitle>
          <DialogDescription>
            {editing ? `修改部门「${editing.name}」` : "在组织架构中新增一个部门"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>上级部门</Label>
              <Select value={String(parentId ?? "")} onValueChange={() => setForm({ ...form })}>
                <SelectTrigger><SelectValue placeholder="顶级部门" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">顶级部门</SelectItem>
                  {flattenForSelect(allDepts).map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {"　".repeat(m.level)}{m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>部门名称 *</Label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="部门名称"
              />
            </div>
            <div className="space-y-2">
              <Label>负责人</Label>
              <Input
                value={form.leader ?? ""}
                onChange={(e) => setForm({ ...form, leader: e.target.value })}
                placeholder="负责人姓名"
              />
            </div>
            <div className="space-y-2">
              <Label>联系电话</Label>
              <Input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="联系电话"
              />
            </div>
            <div className="space-y-2">
              <Label>排序</Label>
              <Input
                type="number"
                value={form.sort ?? 1}
                onChange={(e) => setForm({ ...form, sort: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select
                value={form.status ?? "enabled"}
                onValueChange={(v) => setForm({ ...form, status: v as Dept["status"] })}
              >
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
