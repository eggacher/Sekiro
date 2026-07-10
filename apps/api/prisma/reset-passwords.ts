import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";
import { createHash } from "crypto";
import pg from "pg";

const { Pool } = pg;

// 1. 初始化数据库连接（使用与 seed.ts 相同的数据源连接池适配器）
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ 错误：环境变量 DATABASE_URL 未设置");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 2. 计算 32 位小写 MD5 哈希
function md5(text: string): string {
  return createHash("md5").update(text).digest("hex");
}

// 3. 复合加密：bcrypt(md5(明文))
async function hashPassword(password: string, cost = 10): Promise<string> {
  return bcrypt.hash(md5(password), cost);
}

async function main() {
  console.log("🚀 开始重置数据库用户密码...");
  
  // 4. 查询所有未删除的用户
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
  });
  
  console.log(`📋 找到 ${users.length} 个活跃用户，正在重新计算密码哈希...`);

  let successCount = 0;
  for (const user of users) {
    // admin 重置为 admin123，其他用户重置为 sekiro123
    const plainPassword = user.username === "admin" ? "admin123" : "sekiro123";
    const newPasswordHash = await hashPassword(plainPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        loginFailCount: 0, // 顺便清除登录失败锁定状态
        lockedUntil: null,
      },
    });

    console.log(`✅ 已重置用户: ${user.username} (ID: ${user.id}) -> 密码已重置为: ${plainPassword}`);
    successCount++;
  }

  console.log(`🎉 密码重置完成，成功更新 ${successCount} 个用户。`);
}

main()
  .catch((e) => {
    console.error("❌ 密码重置过程中发生错误:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
