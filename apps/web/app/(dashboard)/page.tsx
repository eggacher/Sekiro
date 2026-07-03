"use client";

import { motion } from "framer-motion";
import {
  Users,
  ShoppingCart,
  DollarSign,
  Activity,
  Plus,
  FileEdit,
  Trash2,
  LogIn,
  Cog,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  dashboardStats,
  weeklyActiveTrend,
  monthlyRevenue,
  trafficSources,
  recentActivities,
} from "@/lib/mock/dashboard";

const activityIconMap = {
  create: { icon: Plus, color: "text-success" },
  update: { icon: FileEdit, color: "text-blue-500" },
  delete: { icon: Trash2, color: "text-destructive" },
  login: { icon: LogIn, color: "text-purple-500" },
  system: { icon: Cog, color: "text-muted-foreground" },
} as const;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* 欢迎横幅 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-primary/10 via-purple-500/10 to-cyan-500/10 p-6"
      >
        <div className="bg-grid absolute inset-0 opacity-20" />
        <div className="relative">
          <h1 className="text-2xl font-bold">早上好，Admin 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            今日有 <span className="font-semibold text-primary">12</span> 项待办，
            <span className="font-semibold text-primary">3</span> 条系统通知
          </p>
        </div>
      </motion.div>

      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="用户总数"
          value={dashboardStats.totalUsers}
          icon={Users}
          growth={dashboardStats.growthRates.users}
          index={0}
          accent="blue"
        />
        <StatCard
          title="今日活跃"
          value={dashboardStats.todayActive}
          icon={Activity}
          growth={dashboardStats.growthRates.active}
          index={1}
          accent="cyan"
        />
        <StatCard
          title="订单总数"
          value={dashboardStats.totalOrders}
          icon={ShoppingCart}
          growth={dashboardStats.growthRates.orders}
          index={2}
          accent="purple"
        />
        <StatCard
          title="总营收"
          value={dashboardStats.totalRevenue}
          prefix="¥"
          icon={DollarSign}
          growth={dashboardStats.growthRates.revenue}
          index={3}
          accent="amber"
        />
      </div>

      {/* 图表区 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 营收趋势 */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">营收与订单趋势</CardTitle>
            <Badge variant="secondary">近 12 个月</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar
                    dataKey="revenue"
                    name="营收(万)"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    animationDuration={900}
                  />
                  <Bar
                    dataKey="orders"
                    name="订单"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                    animationDuration={1100}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 流量来源 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">流量来源</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={trafficSources}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    animationDuration={900}
                  >
                    {trafficSources.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {trafficSources.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="ml-auto font-medium">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 下半区 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 活跃趋势 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">近 7 天活跃趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyActiveTrend}>
                  <defs>
                    <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="活跃用户"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#colorActive)"
                    animationDuration={1200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 最近动态 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">最近动态</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivities.map((a, i) => {
              const { icon: Icon, color } = activityIconMap[a.type as keyof typeof activityIconMap];
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-start gap-3"
                >
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted ${color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="leading-snug">
                      <span className="font-medium">{a.user}</span>
                      <span className="text-muted-foreground"> {a.action} </span>
                      {a.target && <span className="font-medium">{a.target}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
