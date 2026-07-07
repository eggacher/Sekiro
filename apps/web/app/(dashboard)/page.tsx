"use client";

import { useState } from "react";
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
import { useTranslation } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/types";
const activityIconMap = {
  create: { icon: Plus, color: "text-success" },
  update: { icon: FileEdit, color: "text-blue-500" },
  delete: { icon: Trash2, color: "text-destructive" },
  login: { icon: LogIn, color: "text-purple-500" },
  system: { icon: Cog, color: "text-muted-foreground" },
} as const;

export default function DashboardPage() {
  const { t } = useTranslation();
  const [dashboardStats] = useState({
    totalUsers: 12846,
    todayActive: 3842,
    totalOrders: 87213,
    totalRevenue: 1284600,
    growthRates: {
      users: 12.5,
      active: 8.3,
      orders: -2.1,
      revenue: 23.8,
    },
  });

  const [weeklyActiveTrend] = useState([
    { name: "mon", value: 2400 },
    { name: "tue", value: 3100 },
    { name: "wed", value: 2800 },
    { name: "thu", value: 3900 },
    { name: "fri", value: 4200 },
    { name: "sat", value: 3600 },
    { name: "sun", value: 3842 },
  ]);

  const [monthlyRevenue] = useState([
    { name: "jan", revenue: 86, orders: 6200 },
    { name: "feb", revenue: 72, orders: 5400 },
    { name: "mar", revenue: 95, orders: 7100 },
    { name: "apr", revenue: 108, orders: 7800 },
    { name: "may", revenue: 124, orders: 8500 },
    { name: "jun", revenue: 118, orders: 8200 },
    { name: "jul", revenue: 132, orders: 8900 },
    { name: "aug", revenue: 145, orders: 9400 },
    { name: "sep", revenue: 138, orders: 9100 },
    { name: "oct", revenue: 156, orders: 9800 },
    { name: "nov", revenue: 168, orders: 10200 },
    { name: "dec", revenue: 175, orders: 10800 },
  ]);

  const [trafficSources] = useState([
    { key: "direct", value: 4200, color: "#3b82f6" },
    { key: "search", value: 3100, color: "#8b5cf6" },
    { key: "social", value: 1800, color: "#06b6d4" },
    { key: "referral", value: 900, color: "#f59e0b" },
  ]);

  const [recentActivities] = useState([
    {
      id: 1,
      userKey: "zhangSan",
      actionKey: "updated",
      targetKey: "userManagement",
      roleKey: "admin",
      time: { key: "minutesAgo", params: { count: 2 } },
      type: "update",
    },
    {
      id: 2,
      userKey: "liSi",
      actionKey: "created",
      targetKey: "financeDept",
      roleKey: "admin",
      time: { key: "minutesAgo", params: { count: 12 } },
      type: "create",
    },
    {
      id: 3,
      userKey: "wangWu",
      actionKey: "deleted",
      targetKey: "testAccount",
      roleKey: "admin",
      time: { key: "hoursAgo", params: { count: 1 } },
      type: "delete",
    },
    {
      id: 4,
      userKey: "zhaoLiu",
      actionKey: "loggedIn",
      targetKey: null,
      roleKey: "user",
      time: { key: "hoursAgo", params: { count: 3 } },
      type: "login",
    },
    {
      id: 5,
      userKey: "system",
      actionKey: "completedTask",
      targetKey: "dataBackup",
      roleKey: "system",
      time: { key: "todayAt", params: { time: "06:00" } },
      type: "system",
    },
  ]);

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
          <h1 className="text-2xl font-bold">{t("dashboard.greeting")}, Admin 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("dashboard.todo", { count: 12 })}，
            {t("dashboard.notifications", { count: 3 })}
          </p>
        </div>
      </motion.div>

      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("dashboard.totalUsers")}
          value={dashboardStats.totalUsers}
          icon={Users}
          growth={dashboardStats.growthRates.users}
          index={0}
          accent="blue"
        />
        <StatCard
          title={t("dashboard.todayActive")}
          value={dashboardStats.todayActive}
          icon={Activity}
          growth={dashboardStats.growthRates.active}
          index={1}
          accent="cyan"
        />
        <StatCard
          title={t("dashboard.totalOrders")}
          value={dashboardStats.totalOrders}
          icon={ShoppingCart}
          growth={dashboardStats.growthRates.orders}
          index={2}
          accent="purple"
        />
        <StatCard
          title={t("dashboard.totalRevenue")}
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
            <CardTitle className="text-base">{t("dashboard.revenueTrend")}</CardTitle>
            <Badge variant="secondary">{t("dashboard.recent12Months")}</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickFormatter={(value) => t(`dashboard.month.${value}` as TranslationKey)}
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
                    name={t("dashboard.revenue")}
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    animationDuration={900}
                  />
                  <Bar
                    dataKey="orders"
                    name={t("dashboard.orders")}
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
            <CardTitle className="text-base">{t("dashboard.trafficSources")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={trafficSources.map((s) => ({
                      ...s,
                      name: t(`dashboard.traffic.${s.key}` as TranslationKey),
                    }))}
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
                      <Cell key={entry.key} fill={entry.color} />
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
                <div key={s.key} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="text-muted-foreground">{t(`dashboard.traffic.${s.key}` as TranslationKey)}</span>
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
            <CardTitle className="text-base">{t("dashboard.weeklyActive")}</CardTitle>
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
                    tickFormatter={(value) => t(`dashboard.day.${value}` as TranslationKey)}
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
                    name={t("dashboard.activeUsers")}
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
            <CardTitle className="text-base">{t("dashboard.recentActivities")}</CardTitle>
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
                      <span className="font-medium">{t(`dashboard.activity.user.${a.userKey}` as TranslationKey)}</span>
                      <span className="text-muted-foreground"> {t(`dashboard.activity.action.${a.actionKey}` as TranslationKey)} </span>
                      {a.targetKey && (
                        <span className="font-medium">{t(`dashboard.activity.target.${a.targetKey}` as TranslationKey)}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`dashboard.activity.time.${a.time.key}` as TranslationKey, a.time.params as unknown as Record<string, string | number>)}
                    </p>
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
