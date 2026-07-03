// 接入 @sekiro/shared：mock 数据与后端共享同一套类型/枚举
import type { CommonStatus, DataScopeType, MenuType } from "@sekiro/shared";

/**
 * @deprecated 历史别名，新代码请用 @sekiro/shared 的 CommonStatus
 */
export type UserStatus = CommonStatus;

export type MockUser = {
  id: number;
  username: string;
  nickname: string;
  email: string;
  phone: string;
  dept: string;
  roles: string[];
  status: CommonStatus;
  lastLogin: string;
  createdAt: string;
};

export const mockUsers: MockUser[] = [
  { id: 1, username: "admin", nickname: "超级管理员", email: "admin@sekiro.com", phone: "13800138000", dept: "研发中心", roles: ["超级管理员"], status: "enabled", lastLogin: "2026-07-04 09:12:33", createdAt: "2024-01-01 10:00:00" },
  { id: 2, username: "zhangsan", nickname: "张三", email: "zhangsan@sekiro.com", phone: "13800138001", dept: "研发中心", roles: ["管理员"], status: "enabled", lastLogin: "2026-07-04 08:45:21", createdAt: "2024-03-12 14:20:00" },
  { id: 3, username: "lisi", nickname: "李四", email: "lisi@sekiro.com", phone: "13800138002", dept: "财务部", roles: ["财务专员"], status: "enabled", lastLogin: "2026-07-03 18:33:11", createdAt: "2024-04-22 09:15:00" },
  { id: 4, username: "wangwu", nickname: "王五", email: "wangwu@sekiro.com", phone: "13800138003", dept: "运营部", roles: ["运营专员"], status: "enabled", lastLogin: "2026-07-03 14:22:08", createdAt: "2024-05-08 11:30:00" },
  { id: 5, username: "zhaoliu", nickname: "赵六", email: "zhaoliu@sekiro.com", phone: "13800138004", dept: "市场部", roles: ["市场专员"], status: "disabled", lastLogin: "2026-06-28 10:11:45", createdAt: "2024-06-15 16:40:00" },
  { id: 6, username: "qianqi", nickname: "钱七", email: "qianqi@sekiro.com", phone: "13800138005", dept: "客服部", roles: ["客服专员"], status: "enabled", lastLogin: "2026-07-04 07:55:30", createdAt: "2024-07-01 08:00:00" },
  { id: 7, username: "sunba", nickname: "孙八", email: "sunba@sekiro.com", phone: "13800138006", dept: "研发中心", roles: ["管理员", "开发"], status: "enabled", lastLogin: "2026-07-02 22:18:00", createdAt: "2024-08-19 13:25:00" },
  { id: 8, username: "zhoujiu", nickname: "周九", email: "zhoujiu@sekiro.com", phone: "13800138007", dept: "人事部", roles: ["HR"], status: "enabled", lastLogin: "2026-07-04 09:01:14", createdAt: "2024-09-03 10:10:00" },
  { id: 9, username: "wushi", nickname: "吴十", email: "wushi@sekiro.com", phone: "13800138008", dept: "财务部", roles: ["财务专员"], status: "disabled", lastLogin: "2026-06-15 17:44:20", createdAt: "2024-10-21 15:55:00" },
  { id: 10, username: "zhengshi", nickname: "郑十一", email: "zhengshi@sekiro.com", phone: "13800138009", dept: "运营部", roles: ["运营专员"], status: "enabled", lastLogin: "2026-07-03 20:33:50", createdAt: "2024-11-07 09:45:00" },
  { id: 11, username: "wangshier", nickname: "王十二", email: "wang12@sekiro.com", phone: "13800138010", dept: "市场部", roles: ["市场专员"], status: "enabled", lastLogin: "2026-07-04 06:20:00", createdAt: "2024-12-01 11:00:00" },
  { id: 12, username: "liushisan", nickname: "刘十三", email: "liu13@sekiro.com", phone: "13800138011", dept: "客服部", roles: ["客服专员"], status: "enabled", lastLogin: "2026-07-01 16:12:33", createdAt: "2025-01-14 14:30:00" },
];

export type MockRole = {
  id: number;
  name: string;
  code: string;
  description: string;
  dataScope: DataScopeType;
  status: CommonStatus;
  userCount: number;
  createdAt: string;
};

export const mockRoles: MockRole[] = [
  { id: 1, name: "超级管理员", code: "super_admin", description: "拥有系统全部权限", dataScope: "all", status: "enabled", userCount: 1, createdAt: "2024-01-01 10:00:00" },
  { id: 2, name: "管理员", code: "admin", description: "业务管理员，可管理用户与配置", dataScope: "dept_and_below", status: "enabled", userCount: 2, createdAt: "2024-01-05 11:00:00" },
  { id: 3, name: "财务专员", code: "finance", description: "财务相关业务", dataScope: "dept", status: "enabled", userCount: 3, createdAt: "2024-02-10 09:30:00" },
  { id: 4, name: "运营专员", code: "operation", description: "运营相关业务", dataScope: "dept", status: "enabled", userCount: 2, createdAt: "2024-02-15 14:00:00" },
  { id: 5, name: "市场专员", code: "marketing", description: "市场推广业务", dataScope: "self", status: "enabled", userCount: 2, createdAt: "2024-03-01 10:20:00" },
  { id: 6, name: "客服专员", code: "service", description: "客户服务", dataScope: "self", status: "enabled", userCount: 2, createdAt: "2024-03-20 16:00:00" },
  { id: 7, name: "开发", code: "developer", description: "开发人员只读权限", dataScope: "self", status: "disabled", userCount: 0, createdAt: "2024-04-01 09:00:00" },
];

export type MockMenu = {
  id: number;
  title: string;
  type: MenuType;
  path?: string;
  icon?: string;
  permission?: string;
  sort: number;
  status: CommonStatus;
  children?: MockMenu[];
};

export const mockMenus: MockMenu[] = [
  {
    id: 1, title: "工作台", type: "menu", path: "/", icon: "LayoutDashboard", sort: 1, status: "enabled",
  },
  {
    id: 2, title: "系统管理", type: "directory", icon: "Settings", sort: 2, status: "enabled",
    children: [
      {
        id: 21, title: "用户管理", type: "menu", path: "/system/user", icon: "Users", sort: 1, status: "enabled",
        children: [
          { id: 211, title: "新增", type: "button", permission: "system:user:create", sort: 1, status: "enabled" },
          { id: 212, title: "编辑", type: "button", permission: "system:user:update", sort: 2, status: "enabled" },
          { id: 213, title: "删除", type: "button", permission: "system:user:delete", sort: 3, status: "enabled" },
        ],
      },
      { id: 22, title: "角色管理", type: "menu", path: "/system/role", icon: "ShieldCheck", sort: 2, status: "enabled" },
      { id: 23, title: "菜单管理", type: "menu", path: "/system/menu", icon: "Menu", sort: 3, status: "enabled" },
      { id: 24, title: "部门管理", type: "menu", path: "/system/dept", icon: "Building2", sort: 4, status: "enabled" },
      { id: 25, title: "岗位管理", type: "menu", path: "/system/position", icon: "Briefcase", sort: 5, status: "enabled" },
      { id: 26, title: "数据字典", type: "menu", path: "/system/dict", icon: "BookMarked", sort: 6, status: "enabled" },
    ],
  },
  {
    id: 3, title: "系统监控", type: "directory", icon: "MonitorDot", sort: 3, status: "enabled",
    children: [
      { id: 31, title: "在线用户", type: "menu", path: "/monitor/online", icon: "Users", sort: 1, status: "enabled" },
      { id: 32, title: "登录日志", type: "menu", path: "/monitor/login-log", icon: "LogIn", sort: 2, status: "enabled" },
      { id: 33, title: "操作日志", type: "menu", path: "/monitor/operation-log", icon: "FileClock", sort: 3, status: "enabled" },
      { id: 34, title: "服务监控", type: "menu", path: "/monitor/server", icon: "ServerCog", sort: 4, status: "enabled" },
    ],
  },
];

export type MockDept = {
  id: number;
  name: string;
  leader: string;
  phone: string;
  sort: number;
  status: CommonStatus;
  children?: MockDept[];
};

export const mockDepts: MockDept[] = [
  {
    id: 100, name: "Sekiro 科技", leader: "创始人", phone: "13800000000", sort: 1, status: "enabled",
    children: [
      {
        id: 101, name: "研发中心", leader: "张三", phone: "13800138001", sort: 1, status: "enabled",
        children: [
          { id: 1011, name: "前端组", leader: "孙八", phone: "13800138006", sort: 1, status: "enabled" },
          { id: 1012, name: "后端组", leader: "周九", phone: "13800138007", sort: 2, status: "enabled" },
          { id: 1013, name: "测试组", leader: "吴十", phone: "13800138008", sort: 3, status: "enabled" },
        ],
      },
      { id: 102, name: "财务部", leader: "李四", phone: "13800138002", sort: 2, status: "enabled" },
      { id: 103, name: "运营部", leader: "王五", phone: "13800138003", sort: 3, status: "enabled" },
      { id: 104, name: "市场部", leader: "赵六", phone: "13800138004", sort: 4, status: "enabled" },
      { id: 105, name: "客服部", leader: "钱七", phone: "13800138005", sort: 5, status: "enabled" },
      { id: 106, name: "人事部", leader: "周九", phone: "13800138007", sort: 6, status: "enabled" },
    ],
  },
];

export type MockPosition = {
  id: number;
  name: string;
  code: string;
  sort: number;
  status: CommonStatus;
  createdAt: string;
};

export const mockPositions: MockPosition[] = [
  { id: 1, name: "董事长", code: "ceo", sort: 1, status: "enabled", createdAt: "2024-01-01 10:00:00" },
  { id: 2, name: "项目经理", code: "pm", sort: 2, status: "enabled", createdAt: "2024-01-05 11:00:00" },
  { id: 3, name: "技术总监", code: "cto", sort: 3, status: "enabled", createdAt: "2024-02-01 09:00:00" },
  { id: 4, name: "高级工程师", code: "senior_dev", sort: 4, status: "enabled", createdAt: "2024-02-15 14:00:00" },
  { id: 5, name: "工程师", code: "dev", sort: 5, status: "enabled", createdAt: "2024-03-01 10:00:00" },
  { id: 6, name: "实习生", code: "intern", sort: 6, status: "disabled", createdAt: "2024-04-01 09:00:00" },
];

export type MockDict = {
  id: number;
  name: string;
  code: string;
  status: CommonStatus;
  remark: string;
  items: { label: string; value: string; sort: number; status: CommonStatus }[];
  createdAt: string;
};

export const mockDicts: MockDict[] = [
  {
    id: 1, name: "用户性别", code: "sys_user_sex", status: "enabled", remark: "用户性别字典", createdAt: "2024-01-01 10:00:00",
    items: [
      { label: "男", value: "0", sort: 1, status: "enabled" },
      { label: "女", value: "1", sort: 2, status: "enabled" },
      { label: "未知", value: "2", sort: 3, status: "enabled" },
    ],
  },
  {
    id: 2, name: "菜单状态", code: "sys_show_hide", status: "enabled", remark: "菜单显示状态", createdAt: "2024-01-02 10:00:00",
    items: [
      { label: "显示", value: "0", sort: 1, status: "enabled" },
      { label: "隐藏", value: "1", sort: 2, status: "enabled" },
    ],
  },
  {
    id: 3, name: "系统状态", code: "sys_normal_disable", status: "enabled", remark: "通用启用/停用", createdAt: "2024-01-03 10:00:00",
    items: [
      { label: "启用", value: "0", sort: 1, status: "enabled" },
      { label: "停用", value: "1", sort: 2, status: "enabled" },
    ],
  },
  {
    id: 4, name: "是否", code: "sys_yes_no", status: "enabled", remark: "是否类字典", createdAt: "2024-01-04 10:00:00",
    items: [
      { label: "是", value: "Y", sort: 1, status: "enabled" },
      { label: "否", value: "N", sort: 2, status: "enabled" },
    ],
  },
];
