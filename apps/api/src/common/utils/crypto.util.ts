import { createHash } from "crypto";

/**
 * 计算字符串的 32 位小写 MD5 哈希
 * 前后端使用同一算法，保证前端提交的密码哈希可被后端校验
 */
export function md5(text: string): string {
  return createHash("md5").update(text).digest("hex");
}
