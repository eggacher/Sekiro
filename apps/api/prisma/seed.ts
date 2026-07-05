import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * 生成密码哈希
 * @param password 明文密码
 * @param cost bcrypt cost 因子，默认 10
 */
async function hashPassword(password: string, cost = 10): Promise<string> {
  return bcrypt.hash(password, cost);
}

/**
 * 生成随机密码（12位）
 */
function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function main() {
  console.log('🌱 开始种子数据导入...');

  try {
    // TODO: Step 1 清空表
    // TODO: Step 2 插入 Dept（部门树）
    // TODO: Step 3 插入 Position（岗位）
    // TODO: Step 4 插入 DictType + DictItem（字典）
    // TODO: Step 5 插入 User（用户）
    // TODO: Step 6 插入 Role（角色）
    // TODO: Step 7 插入 Menu（菜单树）
    // TODO: Step 8 插入 UserRole（用户-角色关联）
    // TODO: Step 9 插入 UserPosition（用户-岗位关联）
    // TODO: Step 10 插入 RoleMenu（角色-菜单关联）
    // TODO: Step 11 插入 LoginLog（登录日志）
    // TODO: Step 12 插入 OperationLog（操作日志）

    console.log('✅ 种子数据导入完成');
  } catch (error) {
    console.error('❌ 导入失败:', error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
