# 详细设计规格 - 数据权限控制 (Data Scope)

本设计文档阐述了 Sekiro 系统中数据权限控制（Data Scope）的设计与实现细节。该功能是权限系统的核心组成部分，决定了不同角色下的用户在访问“业务数据”（如用户列表、部门列表）时的视野范围。

---

## 1. 业务定义与规则

系统中的角色（Role）定义了数据权限范围属性 `dataScope`，取值如下：

| dataScope 取值 | 含义 | 后台实现过滤规则 |
| :--- | :--- | :--- |
| **`all`** | 全部数据权限 | 不注入任何部门过滤条件。 |
| **`dept_and_below`** | 本部门及以下数据权限 | 过滤条件限制为 `dept_id IN (当前用户所属部门ID + 所有子孙部门ID)`。 |
| **`dept`** | 仅本部门数据权限 | 过滤条件限制为 `dept_id = 当前用户所属部门ID`。 |
| **`self`** | 仅本人数据权限 | 用户管理列表中仅可见自身记录（即 `id = 当前用户ID`）。 |
| **`custom`** | 自定义部门数据权限 | 过滤条件限制为 `dept_id IN (当前角色绑定的自定义部门ID列表)`。 |

### 1.1 并集与降级不变量
* **最宽并集原则**：当一个用户拥有多个角色时，其最终的数据权限应当是所有角色数据权限的**并集（即取最宽权限）**。
  * 例如：角色 A 拥有 `self` 权限，角色 B 拥有 `dept` 权限，该用户最终拥有 `dept` 权限。
  * 若任何一个启用中的角色配置了 `all` 权限，则该用户直接享有全部数据权限。
* **安全防线降级**：如果用户没有任何角色，或所有角色被停用，则默认降级为 `self` 仅本人权限。

---

## 2. 后台设计与实现 (NestJS)

设计采用解耦的数据权限计算机制，封装为 NestJS 的拦截器与服务。

### 2.1 数据结构

定义通用数据结构 `UserDataScope`：

```typescript
export interface UserDataScope {
  isAll: boolean;      // 是否为全局全部数据权限
  isSelf: boolean;     // 是否仅本人权限
  deptIds: number[];   // 允许访问的部门 ID 列表 (合并去重后的并集)
}
```

### 2.2 服务层设计 (`DataScopeService`)

创建 `DataScopeService` 提供核心的权限计算逻辑：

```typescript
@Injectable()
export class DataScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 计算指定用户的数据权限范围
   */
  async calculateScope(userId: number): Promise<UserDataScope>;
}
```

#### 计算过程细节：
1. **超级管理员处理**：若 `userId === 1`，直接返回 `{ isAll: true, isSelf: false, deptIds: [] }`。
2. **读取用户信息**：查询当前用户及所属的 `deptId`。
3. **读取角色与关联部门**：查询用户绑定的所有启用状态角色的 `dataScope`，如果是 `custom` 范围，则读取 `role_dept` 表中关联的 `dept_id`。
4. **并集计算**：
   * 若包含 `all`，直接返回 `isAll: true`。
   * 建立 `allowedDeptIds` 集合。
   * 若包含 `dept`，将用户自身的 `deptId` 加入集合。
   * 若包含 `custom`，将关联的自定义部门 ID 加入集合。
   * 若包含 `dept_and_below`：
     * 如果用户拥有 `deptId`，首先将自身 `deptId` 加入集合。
     * 加载当前所有未软删除的部门，在内存中递归查出该部门下的所有子孙部门 ID 并加入集合。
   * 收集 `isSelf` 标记。
5. **结果返回**：
   * 若 `allowedDeptIds` 集合大小大于 0，返回 `{ isAll: false, isSelf: false, deptIds: [...allowedDeptIds] }`。
   * 否则，返回 `{ isAll: false, isSelf: true, deptIds: [] }`。

### 2.3 拦截器与参数装饰器设计

#### 拦截器 `DataScopeInterceptor`
用于拦截标注了需要数据权限的路由，异步计算该用户的数据权限，并将结果挂载到 `request.dataScope` 属性上。

#### 装饰器 `@UserScope()`
用于在 Controller 中方便地获取挂载在 Request 上的数据权限对象。

```typescript
export const UserScope = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserDataScope => {
    const request = ctx.switchToHttp().getRequest();
    return request.dataScope || { isAll: false, isSelf: true, deptIds: [] };
  },
);
```

### 2.4 控制器与仓储层过滤集成

#### 1. 用户管理列表 (`GET /system/user`)
* **Controller 侧**：
  ```typescript
  @Get()
  @UseInterceptors(DataScopeInterceptor)
  async getPage(
    @Query() query: QueryUserDto,
    @UserScope() scope: UserDataScope,
  ) {
    return this.userService.getPage(query, scope);
  }
  ```
* **Repository 侧**：
  在 `UserRepository.findPage` 中运用 `UserDataScope` 进行过滤裁剪：
  ```typescript
  if (scope.isSelf) {
    where.id = currentUser.id;
  } else if (!scope.isAll) {
    const allowedDepts = scope.deptIds;
    if (query.deptId) {
      // 客户端指定了部门 ID，须校验该部门是否在允许的范围内
      where.deptId = allowedDepts.includes(query.deptId) ? query.deptId : -1;
    } else {
      where.deptId = { in: allowedDepts };
    }
  } else if (query.deptId) {
    where.deptId = query.deptId;
  }
  ```

#### 2. 部门管理树/列表 (`GET /system/dept`)
* **Controller 侧**：注入 `DataScopeInterceptor` 与 `@UserScope()`。
* **Repository 侧**：在 `DeptRepository.findAll` 中，若 `!scope.isAll`：
  - 如果 `scope.isSelf`，仅能看到自身所属部门：`where.id = currentUser.deptId`。
  - 如果 `scope.deptIds` 不为空：限制范围为 `where.id = { in: scope.deptIds }`。

---

## 3. 前端交互设计 (Next.js)

### 3.1 角色编辑弹窗中的部门树展示
* **动态呈现**：在角色编辑/新增表单中，当用户在“数据范围”下拉选择框中选择“自定义数据权限”（`custom`）时，在表单中动态渲染树状勾选组件 `CheckableTree`（数据源为部门树）。
* **数据收集**：用户勾选后，记录选中部门 ID 列表 `customDeptIds`。在保存角色时，将该数组一并提交给后台。

### 3.2 角色权限保存接口的适配
* 后台接口 `PUT /system/role/:id` 或专门设置数据权限的接口需要接收 `dataScope` 字段与 `customDeptIds: number[]` 数组，在数据库事务中首先更新角色的数据范围字段，然后清空旧的 `role_dept` 关系，并重新写入最新的关联。
