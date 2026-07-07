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
import { useTranslation } from "@/lib/i18n";

export default function OnlineUserPage() {
  const { t } = useTranslation();
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [forceOut, setForceOut] = React.useState<string | null>(null);

  const fetchList = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any[]>("/monitor/online");
      setList(res);
    } catch (err: any) {
      toast.error(err.message || t("monitor.online.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleForceOut = async () => {
    if (forceOut == null) return;
    try {
      await apiClient.delete(`/monitor/online/${forceOut}`);
      toast.success(t("monitor.online.forceOutSuccess"));
      setForceOut(null);
      await fetchList();
    } catch (err: any) {
      toast.error(err.message || t("monitor.online.forceOutFailed"));
    }
  };

  const columns: Column<any>[] = [
    {
      key: "username",
      title: t("monitor.online.column.user"),
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
      title: t("monitor.online.column.ipLocation"),
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
      title: t("monitor.online.column.browserOs"),
      render: (r) => (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Monitor className="h-3.5 w-3.5" />
          {r.browser} · {r.os}
        </div>
      ),
    },
    {
      key: "loginTime",
      title: t("monitor.online.column.loginTime"),
      render: (r) => <span className="text-muted-foreground">{new Date(r.loginTime).toLocaleString()}</span>,
    },
    {
      key: "lastActive",
      title: t("monitor.online.column.lastActive"),
      render: (r) => (
        <Badge variant="success" className="gap-1">
          <Clock className="h-3 w-3" />
          {r.lastActive}
        </Badge>
      ),
    },
    {
      key: "actions",
      title: t("monitor.online.column.actions"),
      width: 130,
      align: "right",
      render: (r) => (
        <Button variant="outline" size="sm" className="h-8 gap-1 text-destructive hover:text-destructive"
          onClick={() => setForceOut(r.id)}>
          <LogOut className="h-3.5 w-3.5" />
          {t("monitor.online.forceOut")}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t("monitor.online.title")} description={t("monitor.online.description", { count: list.length })}>
        <Badge variant="success" className="gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          {t("monitor.online.realtime")}
        </Badge>
      </PageHeader>

      {loading ? (
        <div className="flex h-[300px] items-center justify-center text-muted-foreground">{t("monitor.online.loading")}</div>
      ) : (
        <CrudTable columns={columns} data={list}
          searchFields={[
            { key: "username", label: t("monitor.online.search.username"), placeholder: t("monitor.online.search.usernamePlaceholder") },
            { key: "ip", label: t("monitor.online.search.ip"), placeholder: t("monitor.online.search.ipPlaceholder") },
          ]} />
      )}

      <ConfirmDialog open={forceOut != null} onOpenChange={(v) => !v && setForceOut(null)}
        title={t("monitor.online.forceOutTitle")} description={t("monitor.online.forceOutDescription")}
        confirmText={t("monitor.online.forceOutConfirm")} onConfirm={handleForceOut} />
    </div>
  );
}
