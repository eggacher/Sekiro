# 数据字典管理设计规范 (STORY #18)

本文档定义了 Sekiro 系统中数据字典管理模块的工程实现规格，涵盖数据库设计约束、后端 RESTful 接口、参数校验规则、业务不变量以及前端对接细节。

---

## 1. 数据模型与约束

数据模型已在 `schema.prisma` 中定义。主要为 `DictType`（字典类型表）与 `DictItem`（字典项表）。

### 1.1 DictType (字典类型)
* `id`: Int, 主键, 自增
* `name`: String, 唯一, 长度上限 32 字符 (例如: "用户性别")
* `code`: String, 唯一, 长度上限 64 字符 (例如: "sys_user_sex")
* `remark`: String, 可空, 长度上限 255 字符
* `status`: String, 默认 "enabled" ("enabled" / "disabled")
* `createdAt` / `updatedAt` / `deletedAt`: 标准生命周期审计字段

### 1.2 DictItem (字典项)
* `id`: Int, 主键, 自增
* `typeId`: Int, 外键指向 `DictType.id` (外键约束 onDelete: Cascade)
* `label`: String, 长度上限 64 字符 (例如: "男")
* `value`: String, 长度上限 64 字符 (例如: "1")
* `sort`: Int, 默认 0 (非负整数)
* `status`: String, 默认 "enabled" ("enabled" / "disabled")
* `createdAt` / `updatedAt` / `deletedAt`: 标准生命周期审计字段

#### 联合约束
* **INV-8**: `@@unique([typeId, value])` —— 同一字典类型下，字典项的值不能重复。

---

## 2. 后端接口规格 (RESTful APIs)

### 2.1 字典类型管理 (`/system/dict`)

| 方法 | 路径 | 说明 |
| :--- | :--- | :--- |
| `GET` | `/system/dict` | 分页条件查询字典类型 |
| `GET` | `/system/dict/:id` | 获取字典类型详情 |
| `POST` | `/system/dict` | 创建字典类型 |
| `PUT` | `/system/dict/:id` | 修改字典类型 (不可修改 `code`) |
| `DELETE` | `/system/dict/:id` | 级联逻辑删除字典类型及关联字典项 |
| `GET` | `/system/dict/:code/items` | 根据字典 `code` 获取启用的字典项列表 (前端下拉菜单用) |

### 2.2 字典项管理 (`/system/dict-item`)

| 方法 | 路径 | 说明 |
| :--- | :--- | :--- |
| `GET` | `/system/dict-item` | 条件分页查询字典项 |
| `GET` | `/system/dict-item/:id` | 获取字典项详情 |
| `POST` | `/system/dict-item` | 创建字典项 |
| `PUT` | `/system/dict-item/:id` | 修改字典项 |
| `DELETE` | `/system/dict-item/:id` | 逻辑删除单个字典项 |

---

## 3. 参数校验与不变量约束 (Service 层)

### 3.1 DTO 校验规则
* **CreateDictDto**:
  * `name`: `IsString()`, `Length(1, 32)`
  * `code`: `IsString()`, `Length(1, 64)`, `Matches(/^[a-z][a-z0-9_]*$/)`
  * `status`: `IsOptional()`, `IsIn(["enabled", "disabled"])`
  * `remark`: `IsOptional()`, `IsString()`, `Length(0, 255)`
* **UpdateDictDto**:
  * `name`: `IsString()`, `Length(1, 32)`
  * `status`: `IsIn(["enabled", "disabled"])`
  * `remark`: `IsOptional()`, `IsString()`, `Length(0, 255)`
* **CreateDictItemDto**:
  * `typeId`: `IsInt()`, `Min(1)`
  * `label`: `IsString()`, `Length(1, 64)`
  * `value`: `IsString()`, `Length(1, 64)`
  * `sort`: `IsOptional()`, `IsInt()`, `Min(0)`
  * `status`: `IsOptional()`, `IsIn(["enabled", "disabled"])`
* **UpdateDictItemDto**:
  * `label`: `IsString()`, `Length(1, 64)`
  * `value`: `IsString()`, `Length(1, 64)`
  * `sort`: `IsInt()`, `Min(0)`
  * `status`: `IsIn(["enabled", "disabled"])`

### 3.2 业务不变量守护 (Exception 触发)
1. **字典类型 Code 唯一**：在创建字典类型时校验 `code` 唯一性（过滤已逻辑删除的数据），冲突则抛出 `UnprocessableEntityException("字典编码已存在")`。
2. **字典项值唯一 (INV-8)**：在创建或修改字典项值时，查询同一 `typeId` 下是否存在相同的 `value`（且 `deletedAt` 为 null）。如果冲突，抛出 `UnprocessableEntityException("当前字典类型下已存在该字典值")`。
3. **级联逻辑删除**：在删除字典类型时，启动 Prisma 数据库事务：
   * 将 `DictType` 的 `deletedAt` 更新为当前时间。
   * 将该 `typeId` 下的所有 `DictItem` 的 `deletedAt` 也更新为当前时间。

---

## 4. 前端对接细节

前端模块位于 `apps/web/app/(dashboard)/system/dict/page.tsx`。
* **数据流向调整**：移除对本地 `mockDicts` 的状态修改逻辑，改用 `apiClient` 异步请求。
* **首次加载**：进入页面时拉取所有字典类型，默认设置选中首个类型的 ID 为 `activeId`。
* **字典类型变更**：当选中的类型 `activeId` 改变时，发起 API 请求加载该类型关联的所有字典项到表格中展示。
* **下拉选框复用接口**：对于下拉组件，前端将统一调用 `GET /system/dict/:code/items` 获取特定类型下的已启用字典项，不需要走分页。

---

## 5. 验收测试用例

* **TC-DICT-01**: 创建重复 `code` 的字典类型，预期返回 422 状态码，报 "字典编码已存在"。
* **TC-DICT-02**: 修改字典类型，尝试更新已存在的字典类型，但不能通过接口改变其 `code`。
* **TC-DICT-03**: 删除字典类型后，检查数据库确认该类型与它所拥有的字典项都被打上了 `deletedAt` 时间戳。
* **TC-DICT-04**: 在同一字典类型下创建重复 `value` 的字典项，预期返回 422 状态码，报 "当前字典类型下已存在该字典值"。
* **TC-DICT-05**: 调用 `/system/dict/:code/items` 获取字典项，且只返回 `status = "enabled"` 且 `deletedAt = null` 的项，按 `sort` 顺序排列。
