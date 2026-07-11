"use client";

import * as React from "react";
import {
  Cpu, MemoryStick, HardDrive, Globe, Activity, Server, Network,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { apiClient } from "@/lib/api/client";
import { useTranslation } from "@/lib/i18n";

function Gauge({ value, label, icon: Icon, color }: {
  value: number; label: string; icon: typeof Cpu; color: string;
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-32 w-32">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
          <motion.circle
            cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="round" strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="mb-1 h-4 w-4" style={{ color }} />
          <span className="text-2xl font-bold">{value.toFixed(1)}%</span>
        </div>
      </div>
      <span className="mt-2 text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default function ServerMonitorPage() {
  const { t } = useTranslation();
  const [info, setInfo] = React.useState<any>(null);

  const fetchInfo = React.useCallback(async () => {
    try {
      const res = await apiClient.get<any>("/monitor/server");
      setInfo(res);
    } catch {}
  }, []);

  React.useEffect(() => {
    fetchInfo();
    const interval = setInterval(fetchInfo, 2000);
    return () => clearInterval(interval);
  }, [fetchInfo]);

  if (!info) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        {t("monitor.server.loading")}
      </div>
    );
  }

  const memUsage = (info.memoryUsed / info.memoryTotal) * 100;
  const diskUsage = (info.diskUsed / info.diskTotal) * 100;
  const jvmUsage = (info.jvmMemoryUsed / info.jvmMemoryMax) * 100;

  return (
    <div className="space-y-6">
      <PageHeader title={t("monitor.server.title")} description={t("monitor.server.description")}>
        <Badge variant="success" className="gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          {t("monitor.server.running", { uptime: info.uptime })}
        </Badge>
      </PageHeader>

      {/* 仪表盘 */}
      <div className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2 lg:grid-cols-4">
        <Gauge value={info.cpuUsage} label={t("monitor.server.gauge.cpu")} icon={Cpu} color="#3b82f6" />
        <Gauge value={memUsage} label={t("monitor.server.gauge.memory")} icon={MemoryStick} color="#8b5cf6" />
        <Gauge value={diskUsage} label={t("monitor.server.gauge.disk")} icon={HardDrive} color="#06b6d4" />
        <Gauge value={jvmUsage} label={t("monitor.server.gauge.node")} icon={Activity} color="#f59e0b" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* CPU/内存趋势 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              {t("monitor.server.trend.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={info.cpuTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
                      borderRadius: "8px", fontSize: "12px",
                    }}
                  />
                  <Line type="monotone" dataKey="cpu" name={t("monitor.server.chart.cpu")} stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="memory" name={t("monitor.server.chart.memory")} stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 服务器信息 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="h-4 w-4 text-primary" />
              {t("monitor.server.info.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow label={t("monitor.server.info.hostname")} value={info.hostname} />
            <InfoRow label={t("monitor.server.info.os")} value={info.os} />
            <InfoRow label={t("monitor.server.info.arch")} value={info.arch} />
            <InfoRow label={t("monitor.server.info.cpuCores")} value={`${info.cpuCores} ${t("monitor.server.unit.cores")}`} />
            <InfoRow label={t("monitor.server.info.memory")} value={`${(info.memoryUsed / 1024).toFixed(1)} / ${(info.memoryTotal / 1024).toFixed(0)} ${t("monitor.server.unit.gb")}`} />
            <InfoRow label={t("monitor.server.info.disk")} value={`${info.diskUsed} / ${info.diskTotal} ${t("monitor.server.unit.gb")}`} />
            <InfoRow label={t("monitor.server.info.nodeVersion")} value={info.jvmVersion} />
          </CardContent>
        </Card>
      </div>

      {/* 网络流量 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="h-4 w-4 text-success" />
            {t("monitor.server.network.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("monitor.server.network.inbound")}</div>
                <div className="text-xl font-bold">{info.networkRx} <span className="text-sm font-normal text-muted-foreground">{t("monitor.server.network.rate")}</span></div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-500">
                <Network className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t("monitor.server.network.outbound")}</div>
                <div className="text-xl font-bold">{info.networkTx} <span className="text-sm font-normal text-muted-foreground">{t("monitor.server.network.rate")}</span></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
