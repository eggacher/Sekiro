"use client";

import { Plus, Edit2, Trash2, Download, Settings, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { CrudTable, type Column } from "@/components/shared/crud-table";
import { mockOperationLogs, type MockOperationLog } from "@/lib/mock/monitor";

const typeMeta: Record<MockOperationLog["type"], { label: string; icon: typeof Plus; color: string }> = {
  create: { label: "新增", icon: Plus, color: "text-success" },
  update: { label: "修改", icon: Edit2, color: "text-blue-500" },
  delete: { label: "删除", icon: Trash2, color: "text-destructive" },
  export: { label: "导出", icon: Download, color: "text-purple-500" },
  other: { label: "其他", icon: Settings, color: "text-muted-foreground" },
};

export default function OperationLogPage() {
  const columns: Column<MockOperationLog>[] = [
    { key: "id", title: "编号", width: 70, render: (r) => <span className="text-muted-foreground">{r.id}</span> },
    { key: "operator", title: "操作人", render: (r) => <span className="font-medium">{r.operator}</span> },
    { key: "module", title: "模块", render: (r) => <Badge variant="secondary">{r.module}</Badge> },
    {
      key: "type",
      title: "操作类型",
      width: 110,
      render: (r) => {
        const meta = typeMeta[r.type];
        const Icon = meta.icon;
        return (
          <span className={`flex items-center gap-1 text-sm ${meta.color}`}>
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
          </span>
        );
      },
    },
    { key: "description", title: "描述" },
    {
      key: "method",
      title: "请求",
      width: 140,
      render: (r) => (
        <div>
          <Badge variant="outline" className="mr-1 font-mono text-[10px]">{r.method}</Badge>
          <div className="mt-0.5 max-w-[180px] truncate text-xs text-muted-foreground">{r.url}</div>
        </div>
      ),
    },
    { key: "ip", title: "IP", width: 130, render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.ip}</span> },
    {
      key: "cost",
      title: "耗时",
      width: 90,
      align: "center",
      render: (r) => (
        <Badge variant={r.cost > 1000 ? "warning" : "outline"} className="font-mono">
          {r.cost}ms
        </Badge>
      ),
    },
    {
      key: "status",
      title: "状态",
      width: 90,
      render: (r) =>
        r.status === "success" ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        ),
    },
    { key: "time", title: "时间", width: 180, render: (r) => <span className="text-muted-foreground">{r.time}</span> },
  ];

  return (
    <div>
      <PageHeader title="操作日志" description="记录用户的增删改等关键操作，支持审计追溯" />
      <CrudTable columns={columns} data={mockOperationLogs}
        searchFields={[
          { key: "operator", label: "操作人", placeholder: "请输入操作人" },
          { key: "module", label: "模块", placeholder: "请输入模块" },
          { key: "type", label: "类型", type: "select",
            options: Object.entries(typeMeta).map(([v, m]) => ({ label: m.label, value: v })) },
        ]} />
    </div>
  );
}
