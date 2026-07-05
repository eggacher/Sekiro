### Task 4: 后端控制器层 (Controllers) 与模块装配

**Files:**
- Create: `apps/api/src/modules/dict/dict.controller.ts`
- Create: `apps/api/src/modules/dict/dict-item.controller.ts`
- Create: `apps/api/src/modules/dict/dict.module.ts`
- Create: `apps/api/src/modules/dict/index.ts`
- Modify: `apps/api/src/main.ts` (集成新模块)

**Interfaces:**
- Consumes: `DictService`
- Produces: 暴露 RESTful 路由。

- [ ] **Step 1: 创建 `dict.controller.ts`**
  ```typescript
  // apps/api/src/modules/dict/dict.controller.ts
  import {
    Controller, Get, Post, Put, Delete,
    Body, Query, Param, UseGuards,
    ParseIntPipe, HttpCode, Inject,
  } from "@nestjs/common";
  import { DictService } from "./services/dict.service";
  import { CreateDictDto, UpdateDictDto, QueryDictDto } from "./dtos";
  import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
  import { ApiResponse } from "@sekiro/shared";

  @Controller("system/dict")
  @UseGuards(JwtAuthGuard)
  export class DictController {
    constructor(
      @Inject(DictService) private readonly dictService: DictService,
    ) {}

    @Get()
    async getPage(@Query() query: QueryDictDto): Promise<ApiResponse<any>> {
      const data = await this.dictService.getTypePage(query);
      return { code: 0, message: "查询成功", data };
    }

    @Get(":id")
    async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
      const data = await this.dictService.getTypeDetail(id);
      return { code: 0, message: "查询成功", data };
    }

    @Post()
    @HttpCode(200)
    async create(@Body() createDto: CreateDictDto): Promise<ApiResponse<any>> {
      const data = await this.dictService.createType(createDto);
      return { code: 0, message: "创建成功", data };
    }

    @Put(":id")
    @HttpCode(200)
    async update(
      @Param("id", ParseIntPipe) id: number,
      @Body() updateDto: UpdateDictDto,
    ): Promise<ApiResponse<any>> {
      const data = await this.dictService.updateType(id, updateDto);
      return { code: 0, message: "更新成功", data };
    }

    @Delete(":id")
    @HttpCode(200)
    async delete(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
      await this.dictService.deleteType(id);
      return { code: 0, message: "删除成功", data: null };
    }

    @Get(":code/items")
    async getItemsByCode(@Param("code") code: string): Promise<ApiResponse<any>> {
      const data = await this.dictService.getActiveItemsByCode(code);
      return { code: 0, message: "查询成功", data };
    }
  }
  ```

- [ ] **Step 2: 创建 `dict-item.controller.ts`**
  ```typescript
  // apps/api/src/modules/dict/dict-item.controller.ts
  import {
    Controller, Get, Post, Put, Delete,
    Body, Query, Param, UseGuards,
    ParseIntPipe, HttpCode, Inject,
  } from "@nestjs/common";
  import { DictService } from "./services/dict.service";
  import { CreateDictItemDto, UpdateDictItemDto, QueryDictItemDto } from "./dtos";
  import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
  import { ApiResponse } from "@sekiro/shared";

  @Controller("system/dict-item")
  @UseGuards(JwtAuthGuard)
  export class DictItemController {
    constructor(
      @Inject(DictService) private readonly dictService: DictService,
    ) {}

    @Get()
    async getPage(@Query() query: QueryDictItemDto): Promise<ApiResponse<any>> {
      const data = await this.dictService.getItemPage(query);
      return { code: 0, message: "查询成功", data };
    }

    @Get(":id")
    async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
      const data = await this.dictService.getItemDetail(id);
      return { code: 0, message: "查询成功", data };
    }

    @Post()
    @HttpCode(200)
    async create(@Body() createDto: CreateDictItemDto): Promise<ApiResponse<any>> {
      const data = await this.dictService.createItem(createDto);
      return { code: 0, message: "创建成功", data };
    }

    @Put(":id")
    @HttpCode(200)
    async update(
      @Param("id", ParseIntPipe) id: number,
      @Body() updateDto: UpdateDictItemDto,
    ): Promise<ApiResponse<any>> {
      const data = await this.dictService.updateItem(id, updateDto);
      return { code: 0, message: "更新成功", data };
    }

    @Delete(":id")
    @HttpCode(200)
    async delete(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
      await this.dictService.deleteItem(id);
      return { code: 0, message: "删除成功", data: null };
    }
  }
  ```

- [ ] **Step 3: 创建 `dict.module.ts` 并装配依赖**
  ```typescript
  // apps/api/src/modules/dict/dict.module.ts
  import { Module } from "@nestjs/common";
  import { DictController } from "./dict.controller";
  import { DictItemController } from "./dict-item.controller";
  import { DictService } from "./services/dict.service";
  import { DictTypeRepository } from "./repositories/dict-type.repository";
  import { DictItemRepository } from "./repositories/dict-item.repository";

  @Module({
    controllers: [DictController, DictItemController],
    providers: [DictService, DictTypeRepository, DictItemRepository],
    exports: [DictService],
  })
  export class DictModule {}
  ```

- [ ] **Step 4: 创建 `index.ts` 导出模块**
  ```typescript
  // apps/api/src/modules/dict/index.ts
  export * from "./dict.module";
  export * from "./services/dict.service";
  ```

- [ ] **Step 5: 修改 `apps/api/src/main.ts` 以注册 `DictModule`**
  ```typescript
  // apps/api/src/main.ts
  // 查找 imports 数组并在其中添加 DictModule:
  import { DictModule } from "./modules/dict";
  ```
  *(注：将其追加到 imports: `[..., DeptModule, DictModule]`)*

- [ ] **Step 6: 检查后端构建状态与全局测试**
  运行：`pnpm --filter @sekiro/api typecheck && pnpm --filter @sekiro/api test`
  预期结果：编译通过且全部测试绿色通过。

- [ ] **Step 7: 提交代码**
  ```bash
  git add apps/api/src/modules/dict/dict.controller.ts apps/api/src/modules/dict/dict-item.controller.ts apps/api/src/modules/dict/dict.module.ts apps/api/src/modules/dict/index.ts apps/api/src/main.ts
  git commit -m "feat(dict): implement Controllers and register DictModule"
  ```

---

