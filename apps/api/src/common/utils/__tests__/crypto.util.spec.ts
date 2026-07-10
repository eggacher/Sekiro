import { describe, it, expect } from "vitest";
import { md5 } from "../crypto.util";

describe("crypto.util", () => {
  it("md5 应返回 32 位小写十六进制字符串", () => {
    expect(md5("admin123")).toBe("0192023a7bbd73250516f069df18b500");
    expect(md5("sekiro123")).toBe("044ffcca3aa3054a9fc675388adb5bc4");
    expect(md5("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
  });

  it("md5 应对中文字符稳定", () => {
    const once = md5("中文密码123");
    const twice = md5("中文密码123");
    expect(once).toBe(twice);
    expect(once).toHaveLength(32);
  });
});
