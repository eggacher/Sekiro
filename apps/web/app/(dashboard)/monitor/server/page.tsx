"use client";

import {
  Cpu, MemoryStick, HardDrive, Globe, Activity, Clock, Server, Network,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { serverInfo, cpuTrend } from "@/lib/mock/monitor";

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
  const memUsage = (serverInfo.memoryUsed / serverInfo.memoryTotal) * 100;
  const diskUsage = (serverInfo.diskUsed / serverInfo.diskTotal) * 100;
  const jvmUsage = (serverInfo.jvmMemoryUsed / serverInfo.jvmMemoryMax) * 100;

  return (
    <div className="space-y-6">
      <PageHeader title="服务监控" description="实时监控服务器与运行时的核心指标">
        <Badge variant="success" className="gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          运行中 · {serverInfo.uptime}
        </Badge>
      </PageHeader>

      {/* 仪表盘 */}
      <div className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2 lg:grid-cols-4">
        <Gauge value={serverInfo.cpuUsage} label="CPU 使用率" icon={Cpu} color="#3b82f6" />
        <Gauge value={memUsage} label="内存使用率" icon={MemoryStick} color="#8b5cf6" />
        <Gauge value={diskUsage} label="磁盘使用率" icon={HardDrive} color="#06b6d4" />
        <Gauge value={jvmUsage} label="JVM 内存" icon={Activity} color="#f59e0b" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* CPU/内存趋势 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              CPU / 内存趋势（近 60s）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cpuTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
                      borderRadius: "8px", fontSize: "12px",
                    }}
                  />
                  <Line type="monotone" dataKey="cpu" name="CPU%" stroke="#3b82f6" strokeWidth={2} dot={false} animationDuration={800} />
                  <Line type="monotone" dataKey="memory" name="内存%" stroke="#8b5cf6" strokeWidth={2} dot={false} animationDuration={1000} />
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
              服务器信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <InfoRow label="主机名" value={serverInfo.hostname} />
            <InfoRow label="操作系统" value={serverInfo.os} />
            <InfoRow label="架构" value={serverInfo.arch} />
            <InfoRow label="CPU 核数" value={`${serverInfo.cpuCores} 核`} />
            <InfoRow label="内存" value={`${(serverInfo.memoryUsed / 1024).toFixed(1)} / ${(serverInfo.memoryTotal / 1024).toFixed(0)} GB`} />
            <InfoRow label="磁盘" value={`${serverInfo.diskUsed} / ${serverInfo.diskTotal} GB`} />
            <InfoRow label="JVM" value={serverInfo.jvmVersion} />
          </CardContent>
        </Card>
      </div>

      {/* 网络流量 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="h-4 w-4 text-success" />
            网络流量
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">入站流量</div>
                <div className="text-xl font-bold">{serverInfo.networkRx} <span className="text-sm font-normal text-muted-foreground">MB/s</span></div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-500">
                <Network className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">出站流量</div>
                <div className="text-xl font-bold">{serverInfo.networkTx} <span className="text-sm font-normal text-muted-foreground">MB/s</span></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
