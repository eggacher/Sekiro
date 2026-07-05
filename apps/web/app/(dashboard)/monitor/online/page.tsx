"use client";

import * as React from "react";
import { LogOut, Globe, Monitor, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shared/page-header";
import { CrudTable, type Column } from "@/components/shared/crud-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { apiClient } from "@/lib/api/client";

export default function OnlineUserPage() {
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [forceOut, setForceOut] = React.useState<string | null>(null);

  const fetchList = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any[]>("/monitor/online");
      setList(res);
    } catch (err: any) {
      toast.error(err.message || "加载在线用户失败");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleForceOut = async () => {
    if (forceOut == null) return;
    try {
      await apiClient.delete(`/monitor/online/${forceOut}`);
      toast.success("强退成功");
      setForceOut(null);
      await fetchList();
    } catch (err: any) {
      toast.error(err.message || "操作失败");
    }
  };

  const columns: Column<any>[] = [
    {
      key: "username",
      title: "用户",
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              {r.nickname.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{r.nickname}</div>
            <div className="text-xs text-muted-foreground">@{r.username}</div>
          </div>
        </div>
      ),
    },
    {
      key: "ip",
      title: "IP / 地点",
      render: (r) => (
        <div>
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono text-sm">{r.ip}</span>
          </div>
          <Badge variant="secondary" className="mt-1 text-[10px]">{r.location}</Badge>
        </div>
      ),
    },
    {
      key: "browser",
      title: "浏览器 / 系统",
      render: (r) => (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Monitor className="h-3.5 w-3.5" />
          {r.browser} · {r.os}
        </div>
      ),
    },
    {
      key: "loginTime",
      title: "登录时间",
      render: (r) => <span className="text-muted-foreground">{new Date(r.loginTime).toLocaleString()}</span>,
    },
    {
      key: "lastActive",
      title: "最后活跃",
      render: (r) => (
        <Badge variant="success" className="gap-1">
          <Clock className="h-3 w-3" />
          {r.lastActive}
        </Badge>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: 130,
      align: "right",
      render: (r) => (
        <Button variant="outline" size="sm" className="h-8 gap-1 text-destructive hover:text-destructive"
          onClick={() => setForceOut(r.id)}>
          <LogOut className="h-3.5 w-3.5" />
          强制下线
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="在线用户" description={`当前共有 ${list.length} 位用户在线`}>
        <Badge variant="success" className="gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          实时
        </Badge>
      </PageHeader>

      {loading ? (
        <div className="flex h-[300px] items-center justify-center text-muted-foreground">加载中...</div>
      ) : (
        <CrudTable columns={columns} data={list}
          searchFields={[
            { key: "username", label: "用户名", placeholder: "请输入用户名" },
            { key: "ip", label: "IP", placeholder: "请输入 IP 地址" },
          ]} />
      )}

      <ConfirmDialog open={forceOut != null} onOpenChange={(v) => !v && setForceOut(null)}
        title="强制下线" description="该用户的会话将立即失效，需要重新登录。确定继续吗？"
        confirmText="强制下线" onConfirm={handleForceOut} />
    </div>
  );
}
