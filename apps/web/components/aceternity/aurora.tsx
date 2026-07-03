"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * 渐变光斑背景（Aceternity 风格）
 */
export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-500/30 blur-3xl animate-aurora" />
      <div className="absolute top-20 -right-40 h-96 w-96 rounded-full bg-purple-500/30 blur-3xl animate-aurora" />
      <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl animate-aurora" />
      <div className="absolute inset-0 bg-grid opacity-[0.15]" />
    </div>
  );
}

/**
 * 数字滚动动画
 */
export function CountUp({
  value,
  duration = 1.2,
  decimals = 0,
  prefix = "",
  suffix = "",
}: {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.span
        initial={{ y: 8, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration }}
      >
        <Counter value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </motion.span>
    </motion.span>
  );
}

import { useEffect, useRef, useState } from "react";

function Counter({
  value,
  decimals,
  prefix,
  suffix,
}: {
  value: number;
  decimals: number;
  prefix: string;
  suffix: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const t = Math.min((now - start) / 1200, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(value * eased);
            if (t < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return (
    <span ref={ref}>
      {prefix}
      {display.toLocaleString("zh-CN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
