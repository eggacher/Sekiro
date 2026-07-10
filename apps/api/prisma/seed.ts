import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";
import { createHash } from "crypto";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

/**
 * 计算字符串的 32 位小写 MD5 哈希
 * 与 apps/api/src/common/utils/crypto.util.ts 保持逻辑一致
 */
function md5(text: string): string {
  return createHash("md5").update(text).digest("hex");
}

/**
 * 生成密码哈希
 * 约定：数据库存储的是 bcrypt(md5(明文密码))，前端提交时已做 MD5
 * @param password 明文密码
 * @param cost bcrypt cost 因子，默认 10
 */
async function hashPassword(password: string, cost = 10): Promise<string> {
  return bcrypt.hash(md5(password), cost);
}

/**
 * 生成随机密码（12位）
 */
function generateRandomPassword(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ============ 数据常量定义 ============

// 1. 部门数据
// ============ 数据常量定义 ============

// 1. 部门数据
const deptData = [
  {
    id: 100,
    name: "Sekiro 科技",
    leader: "创始人",
    phone: "13800000000",
    sort: 1,
    status: "enabled" as const,
    parentId: null,
  },
  {
    id: 101,
    name: "研发中心",
    leader: "张三",
    phone: "13800138001",
    sort: 1,
    status: "enabled" as const,
    parentId: 100,
  },
  {
    id: 1011,
    name: "前端组",
    leader: "孙八",
    phone: "13800138006",
    sort: 1,
    status: "enabled" as const,
    parentId: 101,
  },
  {
    id: 1012,
    name: "后端组",
    leader: "周九",
    phone: "13800138007",
    sort: 2,
    status: "enabled" as const,
    parentId: 101,
  },
  {
    id: 1013,
    name: "测试组",
    leader: "吴十",
    phone: "13800138008",
    sort: 3,
    status: "enabled" as const,
    parentId: 101,
  },
  {
    id: 102,
    name: "财务部",
    leader: "李四",
    phone: "13800138002",
    sort: 2,
    status: "enabled" as const,
    parentId: 100,
  },
  {
    id: 103,
    name: "运营部",
    leader: "王五",
    phone: "13800138003",
    sort: 3,
    status: "enabled" as const,
    parentId: 100,
  },
  {
    id: 104,
    name: "市场部",
    leader: "赵六",
    phone: "13800138004",
    sort: 4,
    status: "enabled" as const,
    parentId: 100,
  },
  {
    id: 105,
    name: "客服部",
    leader: "钱七",
    phone: "13800138005",
    sort: 5,
    status: "enabled" as const,
    parentId: 100,
  },
  {
    id: 106,
    name: "人事部",
    leader: "周九",
    phone: "13800138007",
    sort: 6,
    status: "enabled" as const,
    parentId: 100,
  },
];

// 2. 岗位数据
const positionData = [
  { id: 1, name: "董事长", code: "ceo", sort: 1, status: "enabled" as const },
  { id: 2, name: "项目经理", code: "pm", sort: 2, status: "enabled" as const },
  { id: 3, name: "技术总监", code: "cto", sort: 3, status: "enabled" as const },
  {
    id: 4,
    name: "高级工程师",
    code: "senior_dev",
    sort: 4,
    status: "enabled" as const,
  },
  { id: 5, name: "工程师", code: "dev", sort: 5, status: "enabled" as const },
  {
    id: 6,
    name: "实习生",
    code: "intern",
    sort: 6,
    status: "disabled" as const,
  },
];

// 3. 数据字典
const dictTypeData = [
  {
    id: 1,
    name: "用户性别",
    code: "sys_user_sex",
    status: "enabled" as const,
    remark: "用户性别字典",
  },
  {
    id: 2,
    name: "菜单状态",
    code: "sys_show_hide",
    status: "enabled" as const,
    remark: "菜单显示状态",
  },
  {
    id: 3,
    name: "系统状态",
    code: "sys_normal_disable",
    status: "enabled" as const,
    remark: "通用启用/停用",
  },
  {
    id: 4,
    name: "是否",
    code: "sys_yes_no",
    status: "enabled" as const,
    remark: "是否类字典",
  },
];

const dictItemData = [
  // sys_user_sex
  {
    id: 1,
    typeId: 1,
    label: "男",
    value: "0",
    sort: 1,
    status: "enabled" as const,
  },
  {
    id: 2,
    typeId: 1,
    label: "女",
    value: "1",
    sort: 2,
    status: "enabled" as const,
  },
  {
    id: 3,
    typeId: 1,
    label: "未知",
    value: "2",
    sort: 3,
    status: "enabled" as const,
  },
  // sys_show_hide
  {
    id: 4,
    typeId: 2,
    label: "显示",
    value: "0",
    sort: 1,
    status: "enabled" as const,
  },
  {
    id: 5,
    typeId: 2,
    label: "隐藏",
    value: "1",
    sort: 2,
    status: "enabled" as const,
  },
  // sys_normal_disable
  {
    id: 6,
    typeId: 3,
    label: "启用",
    value: "0",
    sort: 1,
    status: "enabled" as const,
  },
  {
    id: 7,
    typeId: 3,
    label: "停用",
    value: "1",
    sort: 2,
    status: "enabled" as const,
  },
  // sys_yes_no
  {
    id: 8,
    typeId: 4,
    label: "是",
    value: "Y",
    sort: 1,
    status: "enabled" as const,
  },
  {
    id: 9,
    typeId: 4,
    label: "否",
    value: "N",
    sort: 2,
    status: "enabled" as const,
  },
];

// 4. 菜单树数据
const menuData = [
  {
    id: 1,
    title: "工作台",
    type: "menu" as const,
    path: "/",
    icon: "LayoutDashboard",
    sort: 1,
    status: "enabled" as const,
    parentId: null,
  },
  {
    id: 2,
    title: "系统管理",
    type: "directory" as const,
    icon: "Settings",
    sort: 2,
    status: "enabled" as const,
    parentId: null,
  },
  {
    id: 21,
    title: "用户管理",
    type: "menu" as const,
    path: "/system/user",
    icon: "Users",
    sort: 1,
    status: "enabled" as const,
    parentId: 2,
  },
  {
    id: 211,
    title: "新增",
    type: "button" as const,
    permission: "system:user:create",
    sort: 1,
    status: "enabled" as const,
    parentId: 21,
  },
  {
    id: 212,
    title: "编辑",
    type: "button" as const,
    permission: "system:user:update",
    sort: 2,
    status: "enabled" as const,
    parentId: 21,
  },
  {
    id: 213,
    title: "删除",
    type: "button" as const,
    permission: "system:user:delete",
    sort: 3,
    status: "enabled" as const,
    parentId: 21,
  },
  {
    id: 22,
    title: "角色管理",
    type: "menu" as const,
    path: "/system/role",
    icon: "ShieldCheck",
    sort: 2,
    status: "enabled" as const,
    parentId: 2,
  },
  {
    id: 23,
    title: "菜单管理",
    type: "menu" as const,
    path: "/system/menu",
    icon: "Menu",
    sort: 3,
    status: "enabled" as const,
    parentId: 2,
  },
  {
    id: 24,
    title: "部门管理",
    type: "menu" as const,
    path: "/system/dept",
    icon: "Building2",
    sort: 4,
    status: "enabled" as const,
    parentId: 2,
  },
  {
    id: 25,
    title: "岗位管理",
    type: "menu" as const,
    path: "/system/position",
    icon: "Briefcase",
    sort: 5,
    status: "enabled" as const,
    parentId: 2,
  },
  {
    id: 26,
    title: "数据字典",
    type: "menu" as const,
    path: "/system/dict",
    icon: "BookMarked",
    sort: 6,
    status: "enabled" as const,
    parentId: 2,
  },
  {
    id: 3,
    title: "系统监控",
    type: "directory" as const,
    icon: "MonitorDot",
    sort: 3,
    status: "enabled" as const,
    parentId: null,
  },
  {
    id: 31,
    title: "在线用户",
    type: "menu" as const,
    path: "/monitor/online",
    icon: "Users",
    sort: 1,
    status: "enabled" as const,
    parentId: 3,
  },
  {
    id: 32,
    title: "登录日志",
    type: "menu" as const,
    path: "/monitor/login-log",
    icon: "LogIn",
    sort: 2,
    status: "enabled" as const,
    parentId: 3,
  },
  {
    id: 33,
    title: "操作日志",
    type: "menu" as const,
    path: "/monitor/operation-log",
    icon: "FileClock",
    sort: 3,
    status: "enabled" as const,
    parentId: 3,
  },
  {
    id: 34,
    title: "服务监控",
    type: "menu" as const,
    path: "/monitor/server",
    icon: "ServerCog",
    sort: 4,
    status: "enabled" as const,
    parentId: 3,
  },
];

// 5. 角色数据
const roleData = [
  {
    id: 1,
    name: "超级管理员",
    code: "super_admin",
    description: "拥有系统全部权限",
    dataScope: "all" as const,
    status: "enabled" as const,
  },
  {
    id: 2,
    name: "管理员",
    code: "admin",
    description: "业务管理员，可管理用户与配置",
    dataScope: "dept_and_below" as const,
    status: "enabled" as const,
  },
  {
    id: 3,
    name: "财务专员",
    code: "finance",
    description: "财务相关业务",
    dataScope: "dept" as const,
    status: "enabled" as const,
  },
  {
    id: 4,
    name: "运营专员",
    code: "operation",
    description: "运营相关业务",
    dataScope: "dept" as const,
    status: "enabled" as const,
  },
  {
    id: 5,
    name: "市场专员",
    code: "marketing",
    description: "市场推广业务",
    dataScope: "self" as const,
    status: "enabled" as const,
  },
  {
    id: 6,
    name: "客服专员",
    code: "service",
    description: "客户服务",
    dataScope: "self" as const,
    status: "enabled" as const,
  },
  {
    id: 7,
    name: "开发",
    code: "developer",
    description: "开发人员只读权限",
    dataScope: "self" as const,
    status: "enabled" as const,
  },
];

// 6. 用户数据（密码稍后生成）
const userData = [
  {
    id: 1,
    username: "admin",
    nickname: "超级管理员",
    email: "admin@sekiro.com",
    phone: "13800138000",
    deptId: 101,
    status: "enabled" as const,
  },
  {
    id: 2,
    username: "zhangsan",
    nickname: "张三",
    email: "zhangsan@sekiro.com",
    phone: "13800138001",
    deptId: 101,
    status: "enabled" as const,
  },
  {
    id: 3,
    username: "lisi",
    nickname: "李四",
    email: "lisi@sekiro.com",
    phone: "13800138002",
    deptId: 102,
    status: "enabled" as const,
  },
  {
    id: 4,
    username: "wangwu",
    nickname: "王五",
    email: "wangwu@sekiro.com",
    phone: "13800138003",
    deptId: 103,
    status: "enabled" as const,
  },
  {
    id: 5,
    username: "zhaoliu",
    nickname: "赵六",
    email: "zhaoliu@sekiro.com",
    phone: "13800138004",
    deptId: 104,
    status: "disabled" as const,
  },
  {
    id: 6,
    username: "qianqi",
    nickname: "钱七",
    email: "qianqi@sekiro.com",
    phone: "13800138005",
    deptId: 105,
    status: "enabled" as const,
  },
  {
    id: 7,
    username: "sunba",
    nickname: "孙八",
    email: "sunba@sekiro.com",
    phone: "13800138006",
    deptId: 101,
    status: "enabled" as const,
  },
  {
    id: 8,
    username: "zhoujiu",
    nickname: "周九",
    email: "zhoujiu@sekiro.com",
    phone: "13800138007",
    deptId: 106,
    status: "enabled" as const,
  },
  {
    id: 9,
    username: "wushi",
    nickname: "吴十",
    email: "wushi@sekiro.com",
    phone: "13800138008",
    deptId: 102,
    status: "disabled" as const,
  },
  {
    id: 10,
    username: "zhengshi",
    nickname: "郑十一",
    email: "zhengshi@sekiro.com",
    phone: "13800138009",
    deptId: 103,
    status: "enabled" as const,
  },
  {
    id: 11,
    username: "wangshier",
    nickname: "王十二",
    email: "wang12@sekiro.com",
    phone: "13800138010",
    deptId: 104,
    status: "enabled" as const,
  },
  {
    id: 12,
    username: "liushisan",
    nickname: "刘十三",
    email: "liu13@sekiro.com",
    phone: "13800138011",
    deptId: 105,
    status: "enabled" as const,
  },
];

// 7. 登录日志
const loginLogData = [
  {
    id: 1,
    username: "admin",
    ip: "192.168.1.100",
    location: "内网",
    browser: "Chrome 126",
    os: "macOS",
    result: "success" as const,
    message: "登录成功",
    createdAt: new Date("2026-07-04T09:12:33"),
  },
  {
    id: 2,
    username: "zhangsan",
    ip: "10.0.12.45",
    location: "北京",
    browser: "Chrome 125",
    os: "Windows 11",
    result: "success" as const,
    message: "登录成功",
    createdAt: new Date("2026-07-04T08:45:21"),
  },
  {
    id: 3,
    username: "lisi",
    ip: "114.114.211.18",
    location: "上海",
    browser: "Safari 17",
    os: "macOS",
    result: "success" as const,
    message: "登录成功",
    createdAt: new Date("2026-07-04T09:01:14"),
  },
  {
    id: 4,
    username: "unknown",
    ip: "45.33.21.5",
    location: "海外",
    browser: "Chrome",
    os: "Unknown",
    result: "fail" as const,
    message: "用户名或密码错误",
    createdAt: new Date("2026-07-04T08:30:11"),
  },
  {
    id: 5,
    username: "qianqi",
    ip: "120.78.45.223",
    location: "杭州",
    browser: "Edge 126",
    os: "Windows 10",
    result: "success" as const,
    message: "登录成功",
    createdAt: new Date("2026-07-04T07:55:30"),
  },
  {
    id: 6,
    username: "admin",
    ip: "192.168.1.100",
    location: "内网",
    browser: "Chrome 126",
    os: "macOS",
    result: "fail" as const,
    message: "验证码错误",
    createdAt: new Date("2026-07-04T07:50:01"),
  },
  {
    id: 7,
    username: "wangwu",
    ip: "10.0.12.50",
    location: "深圳",
    browser: "Chrome 124",
    os: "Windows 11",
    result: "success" as const,
    message: "登录成功",
    createdAt: new Date("2026-07-03T22:18:00"),
  },
  {
    id: 8,
    username: "unknown",
    ip: "193.27.14.88",
    location: "海外",
    browser: "curl",
    os: "Unknown",
    result: "fail" as const,
    message: "账号不存在",
    createdAt: new Date("2026-07-03T21:45:33"),
  },
  {
    id: 9,
    username: "sunba",
    ip: "192.168.2.91",
    location: "内网",
    browser: "Firefox 127",
    os: "Ubuntu",
    result: "success" as const,
    message: "登录成功",
    createdAt: new Date("2026-07-03T18:33:11"),
  },
  {
    id: 10,
    username: "zhengshi",
    ip: "10.0.13.7",
    location: "广州",
    browser: "Chrome 125",
    os: "Windows 10",
    result: "success" as const,
    message: "登录成功",
    createdAt: new Date("2026-07-03T20:33:50"),
  },
  {
    id: 11,
    username: "admin",
    ip: "192.168.1.100",
    location: "内网",
    browser: "Chrome 126",
    os: "macOS",
    result: "success" as const,
    message: "退出成功",
    createdAt: new Date("2026-07-03T17:00:00"),
  },
  {
    id: 12,
    username: "lisi",
    ip: "114.114.211.18",
    location: "上海",
    browser: "Safari 17",
    os: "macOS",
    result: "success" as const,
    message: "登录成功",
    createdAt: new Date("2026-07-03T14:22:08"),
  },
];

// 8. 操作日志
const operationLogData = [
  {
    id: 1,
    operator: "admin",
    module: "用户管理",
    type: "create" as const,
    description: "新增用户：liushisan",
    method: "POST",
    url: "/api/system/user",
    ip: "192.168.1.100",
    cost: 86,
    status: "success" as const,
    createdAt: new Date("2026-07-04T09:30:11"),
  },
  {
    id: 2,
    operator: "zhangsan",
    module: "角色管理",
    type: "update" as const,
    description: "修改角色权限：管理员",
    method: "PUT",
    url: "/api/system/role/2/permission",
    ip: "10.0.12.45",
    cost: 124,
    status: "success" as const,
    createdAt: new Date("2026-07-04T09:25:45"),
  },
  {
    id: 3,
    operator: "admin",
    module: "菜单管理",
    type: "create" as const,
    description: "新增菜单：通知中心",
    method: "POST",
    url: "/api/system/menu",
    ip: "192.168.1.100",
    cost: 65,
    status: "success" as const,
    createdAt: new Date("2026-07-04T09:18:33"),
  },
  {
    id: 4,
    operator: "lisi",
    module: "用户管理",
    type: "export" as const,
    description: "导出用户列表",
    method: "GET",
    url: "/api/system/user/export",
    ip: "114.114.211.18",
    cost: 1450,
    status: "success" as const,
    createdAt: new Date("2026-07-04T09:05:22"),
  },
  {
    id: 5,
    operator: "admin",
    module: "部门管理",
    type: "delete" as const,
    description: "删除部门：测试组",
    method: "DELETE",
    url: "/api/system/dept/1013",
    ip: "192.168.1.100",
    cost: 92,
    status: "success" as const,
    createdAt: new Date("2026-07-04T08:50:11"),
  },
  {
    id: 6,
    operator: "wangwu",
    module: "字典管理",
    type: "update" as const,
    description: "修改字典项：用户性别",
    method: "PUT",
    url: "/api/system/dict/item",
    ip: "10.0.12.50",
    cost: 78,
    status: "success" as const,
    createdAt: new Date("2026-07-04T08:33:00"),
  },
  {
    id: 7,
    operator: "zhangsan",
    module: "用户管理",
    type: "update" as const,
    description: "停用账号：zhaoliu",
    method: "PUT",
    url: "/api/system/user/5/status",
    ip: "10.0.12.45",
    cost: 56,
    status: "success" as const,
    createdAt: new Date("2026-07-04T08:12:18"),
  },
  {
    id: 8,
    operator: "admin",
    module: "系统配置",
    type: "update" as const,
    description: "修改站点名称",
    method: "PUT",
    url: "/api/system/config",
    ip: "192.168.1.100",
    cost: 110,
    status: "fail" as const,
    createdAt: new Date("2026-07-04T07:45:30"),
  },
  {
    id: 9,
    operator: "lisi",
    module: "角色管理",
    type: "create" as const,
    description: "新增角色：审计员",
    method: "POST",
    url: "/api/system/role",
    ip: "114.114.211.18",
    cost: 134,
    status: "success" as const,
    createdAt: new Date("2026-07-03T22:01:55"),
  },
  {
    id: 10,
    operator: "admin",
    module: "用户管理",
    type: "delete" as const,
    description: "删除用户：test_account",
    method: "DELETE",
    url: "/api/system/user/99",
    ip: "192.168.1.100",
    cost: 70,
    status: "success" as const,
    createdAt: new Date("2026-07-03T21:30:00"),
  },
];

async function main() {
  console.log("🌱 开始种子数据导入...\n");

  try {
    // Step 1: 清空所有表（注意依赖顺序：先删关联表，再删主表）
    console.log("📦 Step 1: 清空数据...");
    await prisma.operationLog.deleteMany({});
    await prisma.loginLog.deleteMany({});
    await prisma.roleMenu.deleteMany({});
    await prisma.roleDept.deleteMany({});
    await prisma.userPosition.deleteMany({});
    await prisma.userRole.deleteMany({});
    await prisma.dictItem.deleteMany({});
    await prisma.dictType.deleteMany({});
    await prisma.menu.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.position.deleteMany({});
    await prisma.dept.deleteMany({});
    console.log("  ✅ 清空完成\n");

    // Step 2: 插入部门树
    console.log("📦 Step 2: 插入部门...");
    for (const dept of deptData) {
      await prisma.dept.create({
        data: {
          id: dept.id,
          name: dept.name,
          leader: dept.leader,
          phone: dept.phone,
          sort: dept.sort,
          status: dept.status,
          parentId: dept.parentId,
        },
      });
    }
    console.log("  ✅ 部门插入完成（共 10 条）\n");

    // Step 3: 插入岗位
    console.log("📦 Step 3: 插入岗位...");
    for (const position of positionData) {
      await prisma.position.create({
        data: {
          id: position.id,
          name: position.name,
          code: position.code,
          sort: position.sort,
          status: position.status,
        },
      });
    }
    console.log("  ✅ 岗位插入完成（共 6 条）\n");

    // Step 4: 插入数据字典
    console.log("📦 Step 4: 插入数据字典...");
    for (const dictType of dictTypeData) {
      await prisma.dictType.create({
        data: {
          id: dictType.id,
          name: dictType.name,
          code: dictType.code,
          status: dictType.status,
          remark: dictType.remark,
        },
      });
    }
    for (const dictItem of dictItemData) {
      await prisma.dictItem.create({
        data: {
          id: dictItem.id,
          typeId: dictItem.typeId,
          label: dictItem.label,
          value: dictItem.value,
          sort: dictItem.sort,
          status: dictItem.status,
        },
      });
    }
    console.log("  ✅ 字典插入完成（4 种类型，9 项）\n");

    // Step 5: 插入用户（含密码哈希）
    console.log("📦 Step 5: 插入用户...");
    const userPasswords: Record<string, string> = {}; // 记录密码供后续输出
    for (let i = 0; i < userData.length; i++) {
      const user = userData[i];
      // 超管用固定密码，其他用随机
      const password = user.id === 1 ? "admin123" : generateRandomPassword();
      const passwordHash = await hashPassword(password);
      userPasswords[user.username] = password;

      await prisma.user.create({
        data: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          email: user.email,
          phone: user.phone,
          deptId: user.deptId,
          status: user.status,
          passwordHash: passwordHash,
        },
      });
    }
    console.log("  ✅ 用户插入完成（共 12 条）\n");

    // Step 6: 插入角色
    console.log("📦 Step 6: 插入角色...");
    for (const role of roleData) {
      await prisma.role.create({
        data: {
          id: role.id,
          name: role.name,
          code: role.code,
          description: role.description,
          dataScope: role.dataScope,
          status: role.status,
        },
      });
    }
    console.log("  ✅ 角色插入完成（共 7 条）\n");

    // Step 7: 插入菜单树
    console.log("📦 Step 7: 插入菜单...");
    for (const menu of menuData) {
      await prisma.menu.create({
        data: {
          id: menu.id,
          title: menu.title,
          type: menu.type,
          path: menu.path || null,
          icon: menu.icon || null,
          permission: menu.permission || null,
          sort: menu.sort,
          status: menu.status,
          parentId: menu.parentId,
          visible: true,
          cache: true,
        },
      });
    }
    console.log("  ✅ 菜单插入完成（共 16 条，含按钮）\n");

    // Step 8: 插入用户-角色关联（UserRole）
    console.log("📦 Step 8: 插入用户-角色关联...");
    const userRoleMappings = [
      { userId: 1, roleIds: [1] }, // admin = 超级管理员
      { userId: 2, roleIds: [2] }, // zhangsan = 管理员
      { userId: 3, roleIds: [3] }, // lisi = 财务专员（删除副角色）
      { userId: 4, roleIds: [4] }, // wangwu = 运营专员
      { userId: 5, roleIds: [5] }, // zhaoliu = 市场专员
      { userId: 6, roleIds: [6] }, // qianqi = 客服专员
      { userId: 7, roleIds: [2, 7] }, // sunba = 管理员 + 开发（保留）
      { userId: 8, roleIds: [6] }, // zhoujiu = 客服专员（删除副角色）
      { userId: 9, roleIds: [3] }, // wushi = 财务专员（删除副角色）
      { userId: 10, roleIds: [4] }, // zhengshi = 运营专员
      { userId: 11, roleIds: [5] }, // wangshier = 市场专员
      { userId: 12, roleIds: [6] }, // liushisan = 客服专员
    ];
    let userRoleCount = 0;
    for (const mapping of userRoleMappings) {
      for (const roleId of mapping.roleIds) {
        await prisma.userRole.create({
          data: { userId: mapping.userId, roleId },
        });
        userRoleCount++;
      }
    }
    console.log(`  ✅ 用户-角色关联完成（共 ${userRoleCount} 条）\n`);

    // Step 9: 插入用户-岗位关联（UserPosition）
    console.log("📦 Step 9: 插入用户-岗位关联...");
    const userPositionMappings = [
      { userId: 1, positionId: 1 }, // admin = 董事长
      { userId: 2, positionId: 2 }, // zhangsan = 项目经理
      { userId: 7, positionId: 3 }, // sunba = 技术总监
      // 其他用户轮流分配 1-5（跳过 6"实习生"）
      { userId: 3, positionId: 4 }, // lisi
      { userId: 4, positionId: 5 }, // wangwu
      { userId: 5, positionId: 1 }, // zhaoliu
      { userId: 6, positionId: 2 }, // qianqi
      { userId: 8, positionId: 3 }, // zhoujiu
      { userId: 9, positionId: 4 }, // wushi
      { userId: 10, positionId: 5 }, // zhengshi
      { userId: 11, positionId: 1 }, // wangshier
      { userId: 12, positionId: 2 }, // liushisan
    ];
    for (const mapping of userPositionMappings) {
      await prisma.userPosition.create({
        data: { userId: mapping.userId, positionId: mapping.positionId },
      });
    }
    console.log(
      `  ✅ 用户-岗位关联完成（共 ${userPositionMappings.length} 条）\n`,
    );

    // Step 10: 插入角色-菜单关联（RoleMenu）
    console.log("📦 Step 10: 插入角色-菜单权限...");
    const roleMenuMappings = {
      // 超级管理员: 全部菜单 + 全部按钮 (16 条)
      1: [1, 2, 21, 211, 212, 213, 22, 23, 24, 25, 26, 3, 31, 32, 33, 34],

      // 管理员: 系统管理全部 + 用户操作按钮（无监控） (11 条)
      2: [1, 2, 21, 211, 212, 213, 22, 23, 24, 25, 26],

      // 财务专员: 工作台 + 系统管理（仅菜单无按钮） (6 条)
      3: [1, 2, 21, 24, 25, 26],

      // 运营专员: 工作台 + 系统管理部分 (4 条)
      4: [1, 2, 21, 26],

      // 市场专员: 工作台 + 数据字典 (3 条)
      5: [1, 2, 26],

      // 客服专员: 工作台 + 监控（在线用户 + 登录日志） (4 条)
      6: [1, 3, 31, 32],

      // 开发: 工作台 + 完整监控 (5 条)
      7: [1, 3, 31, 32, 33, 34],
    };
    let roleMenuCount = 0;
    for (const [roleId, menuIds] of Object.entries(roleMenuMappings)) {
      for (const menuId of menuIds) {
        await prisma.roleMenu.create({
          data: { roleId: parseInt(roleId), menuId },
        });
        roleMenuCount++;
      }
    }
    console.log(`  ✅ 角色-菜单权限完成（共 ${roleMenuCount} 条）\n`);

    // Step 11: 插入登录日志
    console.log("📦 Step 11: 插入登录日志...");
    for (const log of loginLogData) {
      await prisma.loginLog.create({
        data: {
          username: log.username,
          ip: log.ip,
          location: log.location,
          browser: log.browser,
          os: log.os,
          result: log.result,
          message: log.message,
          createdAt: log.createdAt,
        },
      });
    }
    console.log("  ✅ 登录日志插入完成（共 12 条）\n");

    // Step 12: 插入操作日志
    console.log("📦 Step 12: 插入操作日志...");
    for (const log of operationLogData) {
      await prisma.operationLog.create({
        data: {
          operator: log.operator,
          module: log.module,
          type: log.type,
          description: log.description,
          method: log.method,
          url: log.url,
          ip: log.ip,
          cost: log.cost,
          status: log.status,
          createdAt: log.createdAt,
        },
      });
    }
    console.log("  ✅ 操作日志插入完成（共 10 条）\n");

    // 完成统计
    console.log("═════════════════════════════════════════════");
    console.log("✅ 种子数据导入全部完成！");
    console.log("═════════════════════════════════════════════\n");
    console.log("📊 数据统计：");
    console.log("  - 部门：10 条");
    console.log("  - 岗位：6 条");
    console.log("  - 字典类型：4 种（9 项）");
    console.log("  - 用户：12 条");
    console.log("  - 角色：7 条");
    console.log("  - 菜单：16 条（含按钮）");
    console.log(`  - 用户-角色：${userRoleCount} 条`);
    console.log(`  - 用户-岗位：${userPositionMappings.length} 条`);
    console.log(`  - 角色-菜单：${roleMenuCount} 条`);
    console.log("  - 登录日志：12 条");
    console.log("  - 操作日志：10 条");
    console.log("\n🔑 测试账号密码（仅用于开发，生产环境不应留此脚本）：\n");
    console.log("┌─────────────────┬──────────────────────┐");
    console.log("│ username        │ password             │");
    console.log("├─────────────────┼──────────────────────┤");
    for (const [username, password] of Object.entries(userPasswords)) {
      console.log(`│ ${username.padEnd(15)} │ ${password.padEnd(20)} │`);
    }
    console.log("└─────────────────┴──────────────────────┘\n");
    console.log("💡 快速测试：用 admin / admin123 登录\n");
  } catch (error) {
    console.error("❌ 导入失败:", error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
