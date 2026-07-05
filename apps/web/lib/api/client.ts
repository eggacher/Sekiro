import type { ApiResponse } from "@sekiro/shared";
import { ResultCode, RESULT_MESSAGES, STORAGE_KEYS } from "@sekiro/shared";
import { toast } from "sonner";

export type ApiFieldError = { field: string; message: string };

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public code: number,
    public fieldErrors?: ApiFieldError[]
  ) {
    super(message);
  }
}

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

  if (json.code !== ResultCode.SUCCESS) {
    if (json.code === ResultCode.UNAUTHORIZED && typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      window.location.href = "/login";
      throw new ApiError(json.message || RESULT_MESSAGES[json.code], json.code);
    }

    if (json.code === ResultCode.FORBIDDEN) {
      toast.error(json.message || "无权限访问");
      throw new ApiError(json.message || RESULT_MESSAGES[json.code], json.code);
    }

    if (json.code === ResultCode.VALIDATION_ERROR && Array.isArray(json.data)) {
      const fieldErrors = json.data as ApiFieldError[];
      throw new ApiError(json.message || "参数校验失败", json.code, fieldErrors);
    }

    throw new ApiError(json.message || RESULT_MESSAGES[json.code], json.code);
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
