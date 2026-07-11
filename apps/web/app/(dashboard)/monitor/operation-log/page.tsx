"use client";

import * as React from "react";
import { Plus, Edit2, Trash2, Download, Settings, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { CrudTable, type Column } from "@/components/shared/crud-table";
import { apiClient } from "@/lib/api/client";
import { useTranslation } from "@/lib/i18n";
import type { PageResult } from "@sekiro/shared";

export default function OperationLogPage() {
  const { t } = useTranslation();

  const typeMeta: Record<string, { label: string; icon: typeof Plus; color: string }> = {
    create: { label: t("monitor.operationLog.type.create"), icon: Plus, color: "text-success" },
    update: { label: t("monitor.operationLog.type.update"), icon: Edit2, color: "text-blue-500" },
    delete: { label: t("monitor.operationLog.type.delete"), icon: Trash2, color: "text-destructive" },
    export: { label: t("monitor.operationLog.type.export"), icon: Download, color: "text-purple-500" },
    other: { label: t("monitor.operationLog.type.other"), icon: Settings, color: "text-muted-foreground" },
  };

  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<PageResult<any>>("/monitor/operation-log?page=1&pageSize=1000");
      setList(res.list);
    } catch (err) {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns: Column<any>[] = [
    { key: "id", title: t("monitor.operationLog.column.id"), width: 70, render: (r) => <span className="text-muted-foreground">{r.id}</span> },
    { key: "operator", title: t("monitor.operationLog.column.operator"), render: (r) => <span className="font-medium">{r.operator}</span> },
    { key: "module", title: t("monitor.operationLog.column.module"), render: (r) => <Badge variant="secondary">{r.module}</Badge> },
    {
      key: "type",
      title: t("monitor.operationLog.column.type"),
      width: 110,
      render: (r) => {
        const meta = typeMeta[r.type] || typeMeta.other;
        const Icon = meta.icon;
        return (
          <span className={`flex items-center gap-1 text-sm ${meta.color}`}>
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
          </span>
        );
      },
    },
    { key: "description", title: t("monitor.operationLog.column.description"), render: (r) => <span>{r.description}</span> },
    {
      key: "method",
      title: t("monitor.operationLog.column.request"),
      width: 140,
      render: (r) => (
        <div>
          <Badge variant="outline" className="mr-1 font-mono text-[10px]">{r.method}</Badge>
          <div className="mt-0.5 max-w-[180px] truncate text-xs text-muted-foreground">{r.url}</div>
        </div>
      ),
    },
    { key: "ip", title: t("monitor.operationLog.column.ip"), width: 130, render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.ip}</span> },
    {
      key: "cost",
      title: t("monitor.operationLog.column.cost"),
      width: 90,
      align: "center",
      render: (r) => (
        <Badge variant={r.cost > 1000 ? "warning" : "outline"} className="font-mono">
          {t("monitor.operationLog.costValue", { ms: r.cost })}
        </Badge>
      ),
    },
    {
      key: "status",
      title: t("monitor.operationLog.column.status"),
      width: 90,
      render: (r) =>
        r.status === "success" ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        ),
    },
    { key: "time", title: t("monitor.operationLog.column.time"), width: 180, render: (r) => <span className="text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span> },
  ];

  return (
    <div>
      <PageHeader title={t("monitor.operationLog.title")} description={t("monitor.operationLog.description")} />
      {loading ? (
        <div className="flex h-[300px] items-center justify-center text-muted-foreground">{t("monitor.operationLog.loading")}</div>
      ) : (
        <CrudTable columns={columns} data={list}
          searchFields={[
            { key: "operator", label: t("monitor.operationLog.search.operator"), placeholder: t("monitor.operationLog.search.operatorPlaceholder") },
            { key: "module", label: t("monitor.operationLog.search.module"), placeholder: t("monitor.operationLog.search.modulePlaceholder") },
            { key: "type", label: t("monitor.operationLog.search.type"), type: "select",
              options: Object.entries(typeMeta).map(([v, m]) => ({ label: m.label, value: v })) },
          ]}
        />
      )}
    </div>
  );
}
