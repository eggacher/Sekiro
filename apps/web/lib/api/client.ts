import type { ApiResponse } from "@sekiro/shared";
import { ResultCode, RESULT_MESSAGES, STORAGE_KEYS } from "@sekiro/shared";

/**
 * 后端 API 基础地址
 * 接入真实后端时，通过环境变量配置：NEXT_PUBLIC_API_BASE_URL
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

/**
 * 统一请求封装
 *
 * 当前为原型阶段，调用方仍使用 lib/mock/* 的本地数据。
 * 当 apps/api 就绪后，业务页面把 mock 调用替换为这里的方法即可，
 * 返回值类型已与 @sekiro/shared 对齐，前端无需改动组件层。
 */
export async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEYS.TOKEN) ?? ""
      : "";

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json: ApiResponse<T> = await res.json();

  // 统一处理业务码
  if (json.code !== ResultCode.SUCCESS) {
    // 401: 清理凭证，跳转登录
    if (json.code === ResultCode.UNAUTHORIZED && typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      window.location.href = "/login";
    }
    throw new Error(json.message || RESULT_MESSAGES[json.code]);
  }

  return json.data;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
