// Dashboard mock 数据

export const dashboardStats = {
  totalUsers: 12846,
  todayActive: 3842,
  totalOrders: 87213,
  totalRevenue: 1284600,
  growthRates: {
    users: 12.5,
    active: 8.3,
    orders: -2.1,
    revenue: 23.8,
  },
};

// 近 7 天活跃趋势
export const weeklyActiveTrend = [
  { name: "周一", value: 2400 },
  { name: "周二", value: 3100 },
  { name: "周三", value: 2800 },
  { name: "周四", value: 3900 },
  { name: "周五", value: 4200 },
  { name: "周六", value: 3600 },
  { name: "周日", value: 3842 },
];

// 近 12 个月营收（万）
export const monthlyRevenue = [
  { name: "1月", revenue: 86, orders: 6200 },
  { name: "2月", revenue: 72, orders: 5400 },
  { name: "3月", revenue: 95, orders: 7100 },
  { name: "4月", revenue: 108, orders: 7800 },
  { name: "5月", revenue: 124, orders: 8500 },
  { name: "6月", revenue: 118, orders: 8200 },
  { name: "7月", revenue: 132, orders: 8900 },
  { name: "8月", revenue: 145, orders: 9400 },
  { name: "9月", revenue: 138, orders: 9100 },
  { name: "10月", revenue: 156, orders: 9800 },
  { name: "11月", revenue: 168, orders: 10200 },
  { name: "12月", revenue: 175, orders: 10800 },
];

// 流量来源
export const trafficSources = [
  { name: "直接访问", value: 4200, color: "#3b82f6" },
  { name: "搜索引擎", value: 3100, color: "#8b5cf6" },
  { name: "社交媒体", value: 1800, color: "#06b6d4" },
  { name: "外部链接", value: 900, color: "#f59e0b" },
];

// 待办与动态
export const recentActivities = [
  {
    id: 1,
    user: "张三",
    action: "更新了",
    target: "用户管理",
    role: "管理员",
    time: "2 分钟前",
    type: "update",
  },
  {
    id: 2,
    user: "李四",
    action: "新增了",
    target: "财务部",
    role: "管理员",
    time: "12 分钟前",
    type: "create",
  },
  {
    id: 3,
    user: "王五",
    action: "删除了",
    target: "test 账号",
    role: "管理员",
    time: "1 小时前",
    type: "delete",
  },
  {
    id: 4,
    user: "赵六",
    action: "登录了系统",
    target: "",
    role: "普通用户",
    time: "3 小时前",
    type: "login",
  },
  {
    id: 5,
    user: "系统",
    action: "完成定时任务",
    target: "数据备份",
    role: "system",
    time: "今天 06:00",
    type: "system",
  },
];
