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
import { apiClient } from "@/lib/api/client";

const dataScopeLabels: Record<string, string> = {
  all: "全部数据",
  dept_and_below: "本部门及以下",
  dept: "仅本部门",
  self: "仅本人",
  custom: "自定义",
};

export default function RolePage() {
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
      toast.error(err.message || "加载角色列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMenuTree = React.useCallback(async () => {
    try {
      const res = await apiClient.get<any[]>("/system/menu");
      const mapNode = (nodes: any[]): TreeNode[] => {
        return nodes.map((n) => ({
          id: n.id,
          title: n.title,
          type: n.type,
          children: n.children ? mapNode(n.children) : undefined,
        }));
      };
      setMenuTree(mapNode(res));
    } catch (err: any) {
      toast.error("加载菜单失败");
    }
  }, []);

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
        toast.success("角色更新成功");
      } else {
        const res = await apiClient.post<any>("/system/role", {
          name: data.name,
          code: data.code,
          description: data.description,
          status: data.status || "enabled",
        });
        roleId = res.id;
        toast.success("角色新增成功");
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
      toast.error(err.message || "保存失败");
    }
  };

  const handleDelete = async () => {
    if (delId == null) return;
    try {
      await apiClient.delete(`/system/role/${delId}`);
      toast.success("已删除该角色");
      setDelId(null);
      await fetchList();
    } catch (err: any) {
      toast.error(err.message || "删除角色失败");
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
      toast.success("分配权限成功");
      setPermOpen(false);
      await fetchList();
    } catch (err: any) {
      toast.error(err.message || "分配权限失败");
    }
  };

  const columns: Column<any>[] = [
    { key: "id", title: "编号", width: 70, render: (r) => <span className="text-muted-foreground">{r.id}</span> },
    {
      key: "name",
      title: "角色名称",
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
    { key: "description", title: "描述" },
    {
      key: "dataScope",
      title: "数据范围",
      render: (r) => <Badge variant="outline">{dataScopeLabels[r.dataScope] || r.dataScope}</Badge>,
    },
    {
      key: "status",
      title: "状态",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions",
      title: "操作",
      width: 220,
      align: "right",
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
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
            编辑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-purple-600"
            onClick={() => openPerm(r)}
          >
            <Settings2 className="h-3.5 w-3.5" />
            权限
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => setDelId(r.id)}
            disabled={r.id === 1}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="角色管理" description="维护系统角色，配置菜单与数据权限">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          新增角色
        </Button>
      </PageHeader>

      <CrudTable
        columns={columns}
        data={list}
        loading={loading}
        searchFields={[
          { key: "name", label: "角色名称", placeholder: "请输入角色名称" },
          { key: "code", label: "角色编码", placeholder: "请输入编码" },
          {
            key: "status",
            label: "状态",
            type: "select",
            options: [
              { label: "启用", value: "enabled" },
              { label: "停用", value: "disabled" },
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
              分配权限 · {permTarget?.name}
            </SheetTitle>
            <SheetDescription>
              勾选菜单与按钮权限，保存后即时生效
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
            已选 <span className="font-medium text-foreground">{checkedKeys.size}</span> 项
          </div>
          <div className="mt-6 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setPermOpen(false)}>
              取消
            </Button>
            <Button className="flex-1" onClick={handleSavePerm}>
              保存权限
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={delId != null}
        onOpenChange={(v) => !v && setDelId(null)}
        title="删除角色"
        description="删除后，该角色下的用户将失去对应权限。确定继续吗？"
        confirmText="确认删除"
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
      toast.error("请填写角色名称与编码");
      return;
    }
    onSave(form, Array.from(checkedDepts).map(Number));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑角色" : "新增角色"}</DialogTitle>
          <DialogDescription>
            {editing ? `修改角色 ${editing.name}` : "创建一个新的系统角色"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>角色名称 *</Label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如：管理员"
              />
            </div>
            <div className="space-y-2">
              <Label>角色编码 *</Label>
              <Input
                value={form.code ?? ""}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="如：admin"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>数据范围</Label>
            <Select
              value={form.dataScope ?? "self"}
              onValueChange={(v) => setForm({ ...form, dataScope: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部数据</SelectItem>
                <SelectItem value="dept_and_below">本部门及以下</SelectItem>
                <SelectItem value="dept">仅本部门</SelectItem>
                <SelectItem value="self">仅本人</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.dataScope === "custom" && (
            <div className="space-y-2 rounded-lg border p-3">
              <Label className="mb-2 block">选择自定义部门</Label>
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
            <Label>状态</Label>
            <Select
              value={form.status ?? "enabled"}
              onValueChange={(v) => setForm({ ...form, status: v })}
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
          <div className="space-y-2">
            <Label>描述</Label>
            <Textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="角色职责说明"
              rows={3}
            />
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
