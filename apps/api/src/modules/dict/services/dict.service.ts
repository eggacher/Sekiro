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
