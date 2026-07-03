# @sekiro/api

> 后端服务占位包。技术栈确定后在此实现，结构已按领域建模预设好。

## 当前状态

**待接入**。本目录仅提供骨架与约定，不含可运行代码。

## 目录结构（已按 `DOMAIN_MODEL.md` 预设）

```
apps/api/
├── src/
│   ├── modules/              # 按领域划分（对应 DOMAIN_MODEL §3.1）
│   │   ├── auth/             # 通用域：登录/登出/会话/Token
│   │   ├── user/             # 核心域：用户管理（CRUD + 分配角色）
│   │   ├── role/             # 核心域：角色 + 权限分配 + 数据范围
│   │   ├── menu/             # 核心域：菜单/权限树
│   │   ├── dept/             # 核心域：部门树
│   │   ├── position/         # 核心域：岗位
│   │   ├── dict/             # 支撑域：数据字典
│   │   ├── config/           # 支撑域：系统参数
│   │   └── log/              # 通用域：登录日志 + 操作日志
│   ├── common/               # 统一响应、全局异常、参数校验、拦截器、装饰器
│   └── config/               # 多环境配置
├── prisma/                   # ORM schema + 迁移（若选 Prisma）
└── package.json
```

每个 `module/` 内部的建议结构（以 NestJS 为例）：

```
modules/user/
├── user.controller.ts        # 路由 + 接口契约
├── user.service.ts           # 业务编排
├── user.repository.ts        # 数据访问
├── dto/                      # 入参/出参（引用 @sekiro/shared 的类型）
└── user.module.ts
```

## 关键约定

### 1. 共享类型来自 `@sekiro/shared`
所有 DTO、枚举、常量**不要在后端重复定义**，统一从 `@sekiro/shared` 导入：

```ts
import type { User, ApiResponse, PageResult } from "@sekiro/shared";
import { ResultCode, CommonStatus } from "@sekiro/shared";
```

### 2. 统一响应结构
所有接口返回 `ApiResponse<T>`（见 `@sekiro/shared`）：

```json
{ "code": 0, "message": "操作成功", "data": { ... } }
```

### 3. 模块边界对齐领域模型
后端模块划分严格对应 `DOMAIN_MODEL.md` 的核心域/支撑域/通用域，需求变更时改动是局部的。

## 技术栈选型（待决策）

下表对应 `PRD.md` 附录 B 的待确认问题 Q1：

| 选项 | 优点 | 与 `@sekiro/shared` 的衔接 |
| --- | --- | --- |
| **NestJS (Node)** | 同语言，类型共享最丝滑 | 直接 import，零成本 |
| **Spring Boot (Java)** | 企业级成熟 | 通过 OpenAPI 生成 TS 类型 |
| **Go (Gin/Go-Zero)** | 性能好、部署轻 | 通过 buf/protobuf 共享 |

确定后在此实现第一个跑通的真实接口（建议从 `auth/login` 开始）。

## 下一步

1. 确定技术栈
2. 实现 `modules/auth` 的登录接口作为样板
3. 用 `docker-compose.yml`（在仓库根）起数据库
4. 前端 `apps/web` 把 `lib/mock/auth` 替换为真实 API 调用
