import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 读 schema 文件做结构校证(不连 DB,纯静态)
const schema = readFileSync(resolve(__dirname, "schema.prisma"), "utf-8");

const requiredModels = [
  "User",
  "Role",
  "Menu",
  "Dept",
  "Position",
  "UserRole",
  "RoleMenu",
  "UserPosition",
  "RoleDept",
  "DictType",
  "DictItem",
  "SystemConfig",
  "LoginLog",
  "OperationLog",
];

describe("schema.prisma 结构校证 (spec §3)", () => {
  it("包含全部 model", () => {
    for (const m of requiredModels) {
      expect(schema).toMatch(new RegExp(`model ${m} \\{`));
    }
  });

  it("User 含 spec §3.2 全部字段", () => {
    const userBlock = schema.match(/model User \{[\s\S]*?\n\}/)![0];
    for (const f of [
      "username",
      "passwordHash",
      "nickname",
      "email",
      "phone",
      "avatar",
      "deptId",
      "status",
      "lockedUntil",
      "loginFailCount",
      "lastLoginAt",
      "mfaSecret",
      "mfaEnabled",
      "createdAt",
      "updatedAt",
      "deletedAt",
    ]) {
      expect(userBlock).toContain(f);
    }
  });

  it("INV-1: username 唯一", () => {
    expect(schema).toMatch(/username\s+String\s+@unique/);
  });

  it("INV-8: DictItem (typeId, value) 联合唯一", () => {
    const dictItemBlock = schema.match(/model DictItem \{[\s\S]*?\n\}/)![0];
    expect(dictItemBlock).toContain("@@unique([typeId, value])");
  });

  it("树: Menu/Dept 有 parentId 自关联", () => {
    for (const m of ["Menu", "Dept"]) {
      const block = schema.match(new RegExp(`model ${m} \\{[\\s\\S]*?\\n\\}`))![0];
      expect(block).toContain("parentId");
    }
  });

  it("命名: 业务表都映射 snake_case", () => {
    for (const [model, table] of [
      ["User", "user"],
      ["DictItem", "dict_item"],
      ["LoginLog", "login_log"],
      ["UserRole", "user_role"],
    ]) {
      const block = schema.match(new RegExp(`model ${model} \\{[\\s\\S]*?\\n\\}`))![0];
      expect(block).toContain(`@@map("${table}")`);
    }
  });

  it("密码字段: 仅 passwordHash(无独立 salt)", () => {
    const userBlock = schema.match(/model User \{[\s\S]*?\n\}/)![0];
    expect(userBlock).toContain("passwordHash");
    expect(userBlock).not.toMatch(/salt/i);
  });

  it("日志表无软删字段", () => {
    for (const m of ["LoginLog", "OperationLog"]) {
      const block = schema.match(new RegExp(`model ${m} \\{[\\s\\S]*?\\n\\}`))![0];
      expect(block).not.toContain("deletedAt");
    }
  });
});
