"use client";

import * as React from "react";
import { CheckCircle2, XCircle, Globe, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { CrudTable, type Column } from "@/components/shared/crud-table";
import { apiClient } from "@/lib/api/client";
import { useTranslation } from "@/lib/i18n";
import type { PageResult } from "@sekiro/shared";

export default function LoginLogPage() {
  const { t } = useTranslation();
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<PageResult<any>>("/monitor/login-log?page=1&pageSize=1000");
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
    { key: "id", title: t("monitor.loginLog.column.id"), width: 70, render: (r) => <span className="text-muted-foreground">{r.id}</span> },
    { key: "username", title: t("monitor.loginLog.column.user"), render: (r) => <span className="font-medium">{r.username}</span> },
    {
      key: "ip",
      title: t("monitor.loginLog.column.ipLocation"),
      render: (r) => (
        <div>
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-sm">{r.ip}</span>
          </div>
          <span className="text-xs text-muted-foreground">{r.location || t("monitor.loginLog.unknown")}</span>
        </div>
      ),
    },
    {
      key: "browser",
      title: t("monitor.loginLog.column.browserOs"),
      render: (r) => (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Monitor className="h-3.5 w-3.5" />
          {r.browser || t("monitor.loginLog.unknown")} · {r.os || t("monitor.loginLog.unknown")}
        </div>
      ),
    },
    {
      key: "status",
      title: t("monitor.loginLog.column.status"),
      width: 120,
      render: (r) =>
        r.result === "success" ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> {t("monitor.loginLog.status.success")}
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" /> {t("monitor.loginLog.status.fail")}
          </Badge>
        ),
    },
    { key: "message", title: t("monitor.loginLog.column.message"), render: (r) => <span className="text-muted-foreground">{r.message}</span> },
    { key: "time", title: t("monitor.loginLog.column.time"), width: 180, render: (r) => <span className="text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span> },
  ];

  return (
    <div>
      <PageHeader title={t("monitor.loginLog.title")} description={t("monitor.loginLog.description")} />
      {loading ? (
        <div className="flex h-[300px] items-center justify-center text-muted-foreground">{t("monitor.loginLog.loading")}</div>
      ) : (
        <CrudTable columns={columns} data={list}
          searchFields={[
            { key: "username", label: t("monitor.loginLog.search.username"), placeholder: t("monitor.loginLog.search.usernamePlaceholder") },
            { key: "ip", label: t("monitor.loginLog.search.ip"), placeholder: t("monitor.loginLog.search.ipPlaceholder") },
            { key: "result", label: t("monitor.loginLog.search.status"), type: "select",
              options: [{ label: t("monitor.loginLog.status.success"), value: "success" }, { label: t("monitor.loginLog.status.fail"), value: "fail" }] },
          ]}
        />
      )}
    </div>
  );
}
