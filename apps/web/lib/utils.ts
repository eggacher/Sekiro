import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 简单分页（前端 Mock 用）
 */
export function paginate<T>(
  list: T[],
  page: number,
  pageSize: number
): { list: T[]; total: number } {
  const start = (page - 1) * pageSize;
  return { list: list.slice(start, start + pageSize), total: list.length };
}

/**
 * 延时，用于模拟请求
 */
export function sleep(ms = 200) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatDate(date: Date | string | number) {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
