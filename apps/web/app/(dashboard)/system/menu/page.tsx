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
import { mockMenus, type MockMenu } from "@/lib/mock/system";

const typeMeta = {
  directory: { label: "目录", icon: Folder, color: "text-blue-500" },
  menu: { label: "菜单", icon: FileText, color: "text-purple-500" },
  button: { label: "按钮", icon: MousePointerClick, color: "text-amber-500" },
} as const;

let nextId = 1000;

export default function MenuPage() {
  const [menus, setMenus] = React.useState<MockMenu[]>(mockMenus);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MockMenu | null>(null);
  const [parentId, setParentId] = React.useState<number | null>(null);
  const [delId, setDelId] = React.useState<number | null>(null);

  const flatten = (list: MockMenu[]): MockMenu[] =>
    list.flatMap((m) => [m, ...(m.children ? flatten(m.children) : [])]);

  const handleSave = (data: Partial<MockMenu>) => {
    const newNode: MockMenu = {
      id: nextId++,
      title: data.title || "新菜单",
      type: (data.type as MockMenu["type"]) || "menu",
      path: data.path,
      icon: data.icon,
      permission: data.permission,
      sort: data.sort ?? 1,
      status: (data.status as MockMenu["status"]) || "enabled",
    };

    setMenus((prev) => {
      // 编辑：先删后插
      if (editing) {
        const filtered = removeNode(prev, editing.id);
        return insertNode(filtered, parentId, { ...newNode, id: editing.id });
      }
      return insertNode(prev, parentId, newNode);
    });

    toast.success(editing ? "菜单更新成功" : "菜单新增成功");
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = () => {
    if (delId == null) return;
    setMenus((prev) => removeNode(prev, delId));
    toast.success("已删除该菜单");
    setDelId(null);
  };

  const columns = [
    {
      key: "title",
      title: "菜单名称",
      render: (row: MockMenu, level: number) => {
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
      title: "类型",
      width: 90,
      render: (row: MockMenu) => {
        const meta = typeMeta[row.type];
        return <Badge variant="outline">{meta.label}</Badge>;
      },
    },
    {
      key: "path",
      title: "路由/权限标识",
      render: (row: MockMenu) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {row.path || row.permission || "—"}
        </code>
      ),
    },
    { key: "icon", title: "图标", width: 100, render: (row: MockMenu) => row.icon || "—" },
    {
      key: "sort",
      title: "排序",
      width: 80,
      align: "center" as const,
      render: (row: MockMenu) => <span className="text-muted-foreground">{row.sort}</span>,
    },
    {
      key: "status",
      title: "状态",
      width: 100,
      render: (row: MockMenu) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      title: "操作",
      width: 220,
      render: (row: MockMenu) => (
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
              新增
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
      <PageHeader title="菜单管理" description="配置系统菜单与按钮权限，驱动侧边栏与权限控制">
        <Button onClick={() => { setEditing(null); setParentId(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          新增菜单
        </Button>
      </PageHeader>

      <div className="rounded-lg border bg-card p-3 mb-3">
        <p className="text-xs text-muted-foreground">
          共 {flatten(menus).length} 个节点 ·
          目录 <Badge variant="default" className="mx-1 text-[10px]">目录</Badge>承载层级 ·
          菜单 <Badge variant="secondary" className="mx-1 text-[10px]">菜单</Badge>对应页面 ·
          按钮 <Badge variant="outline" className="mx-1 text-[10px]">按钮</Badge>对应操作权限
        </p>
      </div>

      <TreeTable<MockMenu> columns={columns} data={menus as TreeRow<MockMenu>[]} />

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
        title="删除菜单"
        description="删除菜单会同时删除其下所有子菜单与按钮权限，确定继续吗？"
        confirmText="确认删除"
        onConfirm={handleDelete}
      />
    </div>
  );
}

function removeNode(list: MockMenu[], id: number): MockMenu[] {
  return list
    .filter((m) => m.id !== id)
    .map((m) => (m.children ? { ...m, children: removeNode(m.children, id) } : m));
}

function insertNode(list: MockMenu[], parentId: number | null, node: MockMenu): MockMenu[] {
  if (parentId == null) {
    return [...list, node];
  }
  return list.map((m) => {
    if (m.id === parentId) {
      return { ...m, children: [...(m.children ?? []), node] };
    }
    if (m.children) {
      return { ...m, children: insertNode(m.children, parentId, node) };
    }
    return m;
  });
}

function findParentId(list: MockMenu[], id: number, parent: number | null = null): number | null {
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
  editing: MockMenu | null;
  parentId: number | null;
  allMenus: MockMenu[];
  onSave: (data: Partial<MockMenu>) => void;
}) {
  const [form, setForm] = React.useState<Partial<MockMenu>>({});

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
      toast.error("请输入菜单名称");
      return;
    }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "编辑菜单" : "新增菜单"}</DialogTitle>
          <DialogDescription>
            {editing ? `修改菜单「${editing.title}」` : "配置一个新菜单或按钮权限"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>类型</Label>
              <Select
                value={form.type ?? "menu"}
                onValueChange={(v) => setForm({ ...form, type: v as MockMenu["type"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="directory">目录</SelectItem>
                  <SelectItem value="menu">菜单</SelectItem>
                  <SelectItem value="button">按钮</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>上级菜单</Label>
              <Select
                value={String(parentId ?? "")}
                onValueChange={(v) => setForm({ ...form })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="根目录" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">根目录</SelectItem>
                  {flattenForSelect(allMenus).map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {"　".repeat(m.level)}{m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>名称 *</Label>
              <Input
                value={form.title ?? ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="菜单显示名称"
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
            {form.type !== "button" && (
              <>
                <div className="space-y-2">
                  <Label>路由路径</Label>
                  <Input
                    value={form.path ?? ""}
                    onChange={(e) => setForm({ ...form, path: e.target.value })}
                    placeholder="/system/user"
                  />
                </div>
                <div className="space-y-2">
                  <Label>图标</Label>
                  <Input
                    value={form.icon ?? ""}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="lucide 图标名"
                  />
                </div>
              </>
            )}
            {form.type === "button" && (
              <div className="col-span-2 space-y-2">
                <Label>权限标识</Label>
                <Input
                  value={form.permission ?? ""}
                  onChange={(e) => setForm({ ...form, permission: e.target.value })}
                  placeholder="system:user:create"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>状态</Label>
              <Select
                value={form.status ?? "enabled"}
                onValueChange={(v) => setForm({ ...form, status: v as MockMenu["status"] })}
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

function flattenForSelect(list: MockMenu[], level = 0): { id: number; title: string; level: number }[] {
  return list.flatMap((m) => [
    { id: m.id, title: m.title, level },
    ...(m.children ? flattenForSelect(m.children, level + 1) : []),
  ]);
}
