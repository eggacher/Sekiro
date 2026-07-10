import MD5 from "crypto-js/md5";

/**
 * 计算字符串的 32 位小写 MD5 哈希
 * 用于前端提交密码前做单向哈希，避免明文传输
 */
export function md5(text: string): string {
  return MD5(text).toString();
}
