"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CountUp } from "@/components/aceternity/aurora";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  icon: Icon,
  growth,
  index = 0,
  accent = "blue",
}: {
  title: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  growth: number;
  index?: number;
  accent?: "blue" | "purple" | "cyan" | "amber";
}) {
  const accentMap = {
    blue: "from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400",
    purple: "from-purple-500/20 to-purple-500/5 text-purple-600 dark:text-purple-400",
    cyan: "from-cyan-500/20 to-cyan-500/5 text-cyan-600 dark:text-cyan-400",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400",
  } as const;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold tracking-tight">
                <CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
              </p>
            </div>
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br",
                accentMap[accent]
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs">
            <span
              className={cn(
                "flex items-center gap-0.5 font-medium",
                growth >= 0 ? "text-success" : "text-destructive"
              )}
            >
              {growth >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(growth)}%
            </span>
            <span className="text-muted-foreground">较上周</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
