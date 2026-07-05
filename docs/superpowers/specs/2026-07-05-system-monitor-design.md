# 系统监控与日志设计规范 (STORY #19)

**相关 Issue**：Story #19（系统监控与日志）
**里程碑**：v0.5 生产就绪

---

## 1. 概述与业务边界

系统监控与日志是生产就绪管理后台必不可少的部分，用于在线会话控制、安全审计、排障诊断。本设计包括：
1. **在线用户管理**：展示当前系统的活跃会话（基于 Redis），支持“强制下线”操作。
2. **审计日志管理**：
   - 登录日志：记录系统内的每次成功和失败登录，提供安全排查记录。
   - 操作日志：以非侵入拦截器方式记录 `POST/PUT/DELETE` 修改行为。
3. **服务监控**：展示 Node.js 运行时及服务器物理硬件指标（CPU、内存、磁盘及流量趋势）。

---

## 2. 数据库与 Redis 模型设计

### 2.1 数据库结构
使用 `schema.prisma` 中已有的 `LoginLog` 与 `OperationLog` 模型：

```prisma
model LoginLog {
  id        Int      @id @default(autoincrement())
  username  String   @db.VarChar(32)
  ip        String   @db.VarChar(64)
  location  String?  @db.VarChar(128)
  browser   String?  @db.VarChar(64)
  os        String?  @db.VarChar(64)
  result    String   @db.VarChar(16) // success | fail
  message   String   @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at")

  @@index([username])
  @@index([createdAt])
  @@map("login_log")
}

model OperationLog {
  id          Int      @id @default(autoincrement())
  operator    String   @db.VarChar(32)
  module      String   @db.VarChar(64)
  type        String   @db.VarChar(16) // create | update | delete | export | other
  description String   @db.VarChar(255)
  method      String   @db.VarChar(8)
  url         String   @db.VarChar(255)
  ip          String   @db.VarChar(64)
  cost        Int      // 耗时毫秒
  status      String   @db.VarChar(16) // success | fail
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([operator])
  @@index([createdAt])
  @@map("operation_log")
}
```

### 2.2 Redis 在线会话
在线用户状态直接映射为 Redis 中符合 `sekiro:session:*` 模式的会话记录。

---

## 3. 接口契约定义

所有接口均需携带 `Authorization: Bearer <token>` 请求头。

### 3.1 在线用户接口
- **获取在线用户列表**：`GET /api/monitor/online`
  - 查询参数：`username?: string`, `ip?: string`
  - 返回数据：
    ```json
    {
      "code": 0,
      "message": "查询成功",
      "data": [
        {
          "id": "session-uuid",
          "username": "admin",
          "nickname": "超级管理员",
          "ip": "192.168.1.100",
          "location": "内网",
          "browser": "Chrome 126",
          "os": "macOS",
          "loginTime": "2026-07-04 09:12:33",
          "lastActive": "刚刚"
        }
      ]
    }
    ```
- **强制下线**：`DELETE /api/monitor/online/:id` (其中 `:id` 为 sessionId)
  - 返回数据：`{ "code": 0, "message": "已强制下线", "data": null }`

### 3.2 登录日志接口
- **条件分页获取**：`GET /api/monitor/login-log`
  - 参数：`page: number`, `pageSize: number`, `username?: string`, `ip?: string`, `status?: "success" | "fail"`
  - 返回：符合 `PageResult<LoginLog>` 结构的包装 JSON。

### 3.3 操作日志接口
- **条件分页获取**：`GET /api/monitor/operation-log`
  - 参数：`page: number`, `pageSize: number`, `operator?: string`, `module?: string`, `type?: string`
  - 返回：符合 `PageResult<OperationLog>` 结构的包装 JSON。

### 3.4 服务监控接口
- **获取监控指标**：`GET /api/monitor/server`
  - 返回数据：
    ```json
    {
      "code": 0,
      "message": "获取成功",
      "data": {
        "hostname": "sekiro-prod-01",
        "os": "macOS Sonoma",
        "arch": "arm64",
        "cpuCores": 8,
        "cpuUsage": 12.5,
        "memoryTotal": 16384,
        "memoryUsed": 8192,
        "diskTotal": 500,
        "diskUsed": 213,
        "jvmVersion": "Node.js v20.14.0",
        "jvmMemoryMax": 4096,
        "jvmMemoryUsed": 312,
        "uptime": "1 天 2 小时 3 分钟",
        "networkRx": 1.2,
        "networkTx": 0.6,
        "cpuTrend": [
          { "time": "21:00:00", "cpu": 15, "memory": 50 }
        ]
      }
    }
    ```

---

## 4. 后端核心逻辑设计

### 4.1 操作日志自动拦截器 (`OperationLogInterceptor`)
全局装配在 NestJS 管道中：
- 识别 HTTP Method：忽略 `GET`，仅处理 `POST`, `PUT`, `DELETE`。
- 注解判定：如果方法被修饰有 `@AuditLog({ module, description, type })`，则优先取注解内容；否则使用降级方案：根据 Controller 类名与路由提取模块和操作描述。
- 异常捕获：使用 `catchError` 记录失败状态，记录完毕后将异常原样扔出。

### 4.2 服务指标与近 60 秒 CPU / 内存趋势
- **物理指标获取**：
  - CPU：使用 `os.cpus()` 计算用户态与空闲态 tick 的差值。
  - 物理内存：`os.totalmem()` 与 `os.freemem()`。
  - 磁盘：执行 `df -k /` 解析真实根路径占用，Windows/环境出错时使用 500GB/213GB 降级模拟。
  - Node运行时：映射给字段 `jvmVersion`, `jvmMemoryMax`, `jvmMemoryUsed`。
- **60 秒滑动窗口**：
  - `ServerService` 每 2 秒将新状态压入数组，并保持最多 30 个点。
  - 服务启动时用随机平滑指标填充数组，避免启动阶段折线图显示空白。

---

## 5. 前端 对接重构计划

- **网络代理修改**：
  - 替换 `apps/web/app/(dashboard)/monitor/` 下的在线用户、登录日志、操作日志、服务监控页面引入，改为 apiClient 接口获取数据。
- **文本自适应**：
  - 将 `/monitor/server` 页面渲染的“JVM”相关文字修改为“Node 运行时”，内存指标对齐为 Node.js 内存显示。
