### Task 3: 业务服务层 (Services) 与业务规则逻辑开发 (TDD 准备)

**Files:**
- Create: `apps/api/src/modules/dict/services/dict.service.ts`
- Create: `apps/api/src/modules/dict/__tests__/dict.service.spec.ts`

**Interfaces:**
- Consumes: `DictTypeRepository`, `DictItemRepository`
- Produces: `DictService` 类及其业务规则检测逻辑。

- [ ] **Step 1: 编写单元测试用例 `dict.service.spec.ts` (TDD 失败测试)**
  ```typescript
  // apps/api/src/modules/dict/__tests__/dict.service.spec.ts
  import { describe, it, expect, beforeEach, vi } from "vitest";
  import { DictService } from "../services/dict.service";
  import { UnprocessableEntityException, NotFoundException } from "@nestjs/common";

  describe("DictService", () => {
    let service: DictService;
    let typeRepo: any;
    let itemRepo: any;

    beforeEach(() => {
      typeRepo = {
        findById: vi.fn(),
        findByCode: vi.fn(),
        findPage: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        softDelete: vi.fn(),
      };
      itemRepo = {
        findById: vi.fn(),
        findByValue: vi.fn(),
        findPage: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        softDelete: vi.fn(),
        findActiveItemsByCode: vi.fn(),
      };
      service = new DictService(typeRepo, itemRepo);
    });

    it("创建字典类型 - code 已存在抛出 422 异常", async () => {
      typeRepo.findByCode.mockResolvedValue({ id: 1, code: "sys_user_sex" });
      await expect(
        service.createType({ name: "性别", code: "sys_user_sex" }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it("创建字典项 - 同一类型下 value 已存在 (INV-8) 抛出 422 异常", async () => {
      itemRepo.findByValue.mockResolvedValue({ id: 10, typeId: 1, value: "1" });
      await expect(
        service.createItem({ typeId: 1, label: "男", value: "1" }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it("修改字典项 - 修改后的 value 已存在于同类型中抛出异常", async () => {
      itemRepo.findById.mockResolvedValue({ id: 10, typeId: 1, value: "1" });
      itemRepo.findByValue.mockResolvedValue({ id: 11, typeId: 1, value: "2" });
      await expect(
        service.updateItem(10, { label: "女", value: "2", sort: 1, status: "enabled" }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it("修改字典项 - 字典项不存在抛出 404", async () => {
      itemRepo.findById.mockResolvedValue(null);
      await expect(
        service.updateItem(999, { label: "女", value: "2", sort: 1, status: "enabled" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("删除字典类型 - 触发级联删除", async () => {
      typeRepo.findById.mockResolvedValue({ id: 1, name: "性别" });
      typeRepo.softDelete.mockResolvedValue(undefined);
      await service.deleteType(1);
      expect(typeRepo.softDelete).toHaveBeenCalledWith(1);
    });
  });
  ```

- [ ] **Step 2: 运行测试并验证其报错失败 (TDD 失败周期)**
  运行：`pnpm --filter @sekiro/api test`
  预期结果：测试无法运行或因缺少 `dict.service.ts` 文件直接报错失败。

- [ ] **Step 3: 实现 `dict.service.ts` 业务逻辑以通过测试**
  ```typescript
  // apps/api/src/modules/dict/services/dict.service.ts
  import { Injectable, Inject, UnprocessableEntityException, NotFoundException } from "@nestjs/common";
  import { DictTypeRepository } from "../repositories/dict-type.repository";
  import { DictItemRepository } from "../repositories/dict-item.repository";
  import {
    CreateDictDto, UpdateDictDto, QueryDictDto,
    CreateDictItemDto, UpdateDictItemDto, QueryDictItemDto,
  } from "../dtos";

  @Injectable()
  export class DictService {
    constructor(
      @Inject(DictTypeRepository) private readonly typeRepo: DictTypeRepository,
      @Inject(DictItemRepository) private readonly itemRepo: DictItemRepository,
    ) {}

    // ─────────────── 字典类型业务 ───────────────

    async getTypePage(query: QueryDictDto) {
      return this.typeRepo.findPage(query);
    }

    async getTypeDetail(id: number) {
      const type = await this.typeRepo.findById(id);
      if (!type) {
        throw new NotFoundException("字典类型不存在");
      }
      return type;
    }

    async createType(data: CreateDictDto) {
      const existing = await this.typeRepo.findByCode(data.code);
      if (existing) {
        throw new UnprocessableEntityException("字典编码已存在");
      }
      return this.typeRepo.create(data);
    }

    async updateType(id: number, data: UpdateDictDto) {
      const type = await this.typeRepo.findById(id);
      if (!type) {
        throw new NotFoundException("字典类型不存在");
      }
      return this.typeRepo.update(id, data);
    }

    async deleteType(id: number) {
      const type = await this.typeRepo.findById(id);
      if (!type) {
        throw new NotFoundException("字典类型不存在");
      }
      return this.typeRepo.softDelete(id);
    }

    // ─────────────── 字典项业务 ───────────────

    async getItemPage(query: QueryDictItemDto) {
      return this.itemRepo.findPage(query);
    }

    async getItemDetail(id: number) {
      const item = await this.itemRepo.findById(id);
      if (!item) {
        throw new NotFoundException("字典项不存在");
      }
      return item;
    }

    async createItem(data: CreateDictItemDto) {
      // 检查字典类型是否存在
      const type = await this.typeRepo.findById(data.typeId);
      if (!type) {
        throw new NotFoundException("字典类型不存在");
      }
      // INV-8: 同一类型下值唯一
      const existing = await this.itemRepo.findByValue(data.typeId, data.value);
      if (existing) {
        throw new UnprocessableEntityException("当前字典类型下已存在该字典值");
      }
      return this.itemRepo.create(data);
    }

    async updateItem(id: number, data: UpdateDictItemDto) {
      const item = await this.itemRepo.findById(id);
      if (!item) {
        throw new NotFoundException("字典项不存在");
      }
      // INV-8: 同一类型下值唯一
      if (item.value !== data.value) {
        const existing = await this.itemRepo.findByValue(item.typeId, data.value);
        if (existing && existing.id !== id) {
          throw new UnprocessableEntityException("当前字典类型下已存在该字典值");
        }
      }
      return this.itemRepo.update(id, data);
    }

    async deleteItem(id: number) {
      const item = await this.itemRepo.findById(id);
      if (!item) {
        throw new NotFoundException("字典项不存在");
      }
      return this.itemRepo.softDelete(id);
    }

    async getActiveItemsByCode(code: string) {
      return this.itemRepo.findActiveItemsByCode(code);
    }
  }
  ```

- [ ] **Step 4: 重新运行单元测试验证其通过**
  运行：`pnpm --filter @sekiro/api test`
  预期结果：全量测试通过。

- [ ] **Step 5: 提交代码**
  ```bash
  git add apps/api/src/modules/dict/services apps/api/src/modules/dict/__tests__
  git commit -m "feat(dict): implement DictService and pass unit tests"
  ```

---

