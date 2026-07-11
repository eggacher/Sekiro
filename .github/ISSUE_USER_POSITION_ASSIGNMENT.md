## Story: 在用户管理中查看和分配岗位

### 背景

目前系统已经实现了：
- 岗位（Position）基础 CRUD 管理页面 `/system/position`
- 后端接口 `PUT /api/system/user/:id/positions` 可以给用户分配岗位
- 数据库表 `position` 和 `user_position` 已就绪

但**用户管理页面 `/system/user` 无法查看用户所属岗位，也无法给用户分配岗位**。岗位数据只存在于独立的岗位管理模块，没有与用户管理打通。

### 目标

在用户管理模块中支持：
1. **用户列表展示岗位信息**：在 `/system/user` 列表中显示每个用户关联的岗位名称
2. **新增/编辑用户时分配岗位**：在用户表单中增加岗位选择器（多选），支持给用户分配一个或多个岗位
3. **用户详情展示岗位**：在用户详情抽屉/弹窗中展示已分配岗位

### 验收标准

#### AC1: 用户列表展示岗位
- 在 `/system/user` 列表中新增一列「岗位」
- 显示该用户关联的所有岗位名称，多个岗位用逗号或标签形式展示
- 如果没有岗位，显示 `-` 或「未分配」

#### AC2: 新增用户时分配岗位
- 点击「新增用户」打开表单
- 表单中增加「岗位」字段，使用多选下拉框（Select/MultiSelect）
- 可选项来自 `/api/system/position?pageSize=1000` 启用的岗位列表
- 保存时调用现有接口 `POST /api/system/user` 创建用户，然后调用 `PUT /api/system/user/:id/positions` 分配岗位

#### AC3: 编辑用户时修改岗位
- 编辑用户表单中同样展示岗位多选框
- 打开编辑时回填当前用户的岗位
- 保存时更新用户基本信息和岗位关联

#### AC4: 后端接口验证
- 确保 `PUT /api/system/user/:id/positions` 接口在前端能正常工作
- 如果接口有参数校验问题，一并修复

### 技术提示

- 后端已有 `UserService.assignPositions(id, positionIds)` 方法
- 后端接口路径：`PUT /api/system/user/:id/positions`，请求体 `{ "positionIds": [1, 2] }`
- 前端用户管理页面：`apps/web/app/(dashboard)/system/user/page.tsx`
- 岗位类型来自 `@sekiro/shared` 的 `Position`
- 参考现有「分配角色」Sheet/Dialog 的交互方式实现岗位分配

### 优先级

P1 — 补齐用户管理与岗位模块的关联，让岗位数据产生实际业务价值。

### 相关文件

- `apps/web/app/(dashboard)/system/user/page.tsx`
- `apps/api/src/modules/user/user.controller.ts`
- `apps/api/src/modules/user/services/user.service.ts`
- `apps/api/src/modules/user/repositories/user.repository.ts`
- `apps/api/prisma/schema.prisma`
