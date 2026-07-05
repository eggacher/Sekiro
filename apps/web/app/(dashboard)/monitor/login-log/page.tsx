"use client";

import * as React from "react";
import { CheckCircle2, XCircle, Globe, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { CrudTable, type Column } from "@/components/shared/crud-table";
import { apiClient } from "@/lib/api/client";
import type { PageResult } from "@sekiro/shared";

export default function LoginLogPage() {
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
    { key: "id", title: "编号", width: 70, render: (r) => <span className="text-muted-foreground">{r.id}</span> },
    { key: "username", title: "用户", render: (r) => <span className="font-medium">{r.username}</span> },
    {
      key: "ip",
      title: "IP / 地点",
      render: (r) => (
        <div>
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-sm">{r.ip}</span>
          </div>
          <span className="text-xs text-muted-foreground">{r.location || "未知"}</span>
        </div>
      ),
    },
    {
      key: "browser",
      title: "浏览器 / 系统",
      render: (r) => (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Monitor className="h-3.5 w-3.5" />
          {r.browser || "Unknown"} · {r.os || "Unknown"}
        </div>
      ),
    },
    {
      key: "status",
      title: "状态",
      width: 120,
      render: (r) =>
        r.result === "success" ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> 成功
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" /> 失败
          </Badge>
        ),
    },
    { key: "message", title: "消息", render: (r) => <span className="text-muted-foreground">{r.message}</span> },
    { key: "time", title: "时间", width: 180, render: (r) => <span className="text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span> },
  ];

  return (
    <div>
      <PageHeader title="登录日志" description="记录所有用户的登录与登出行为，可用于安全审计" />
      {loading ? (
        <div className="flex h-[300px] items-center justify-center text-muted-foreground">加载中...</div>
      ) : (
        <CrudTable columns={columns} data={list}
          searchFields={[
            { key: "username", label: "用户名", placeholder: "请输入用户名" },
            { key: "ip", label: "IP", placeholder: "请输入 IP" },
            { key: "result", label: "状态", type: "select",
              options: [{ label: "成功", value: "success" }, { label: "失败", value: "fail" }] },
          ]}
        />
      )}
    </div>
  );
}
