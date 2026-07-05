import { Injectable, Inject, UnprocessableEntityException, NotFoundException } from "@nestjs/common";
import { PositionRepository } from "../repositories/position.repository";
import { CreatePositionDto, UpdatePositionDto, QueryPositionDto } from "../dtos";

@Injectable()
export class PositionService {
  constructor(
    @Inject(PositionRepository) private readonly positionRepo: PositionRepository,
  ) {}

  async getPage(query: QueryPositionDto) {
    return this.positionRepo.findPage(query);
  }

  async getDetail(id: number) {
    const position = await this.positionRepo.findById(id);
    if (!position) {
      throw new NotFoundException("岗位不存在");
    }
    return position;
  }

  async create(data: CreatePositionDto) {
    const existingCode = await this.positionRepo.findByCode(data.code);
    if (existingCode) {
      throw new UnprocessableEntityException("岗位编码已存在");
    }
    const existingName = await this.positionRepo.findByName(data.name);
    if (existingName) {
      throw new UnprocessableEntityException("岗位名称已存在");
    }
    return this.positionRepo.create(data);
  }

  async update(id: number, data: UpdatePositionDto) {
    const position = await this.positionRepo.findById(id);
    if (!position) {
      throw new NotFoundException("岗位不存在");
    }

    const existingName = await this.positionRepo.findByName(data.name);
    if (existingName && existingName.id !== id) {
      throw new UnprocessableEntityException("岗位名称已存在");
    }

    return this.positionRepo.update(id, data);
  }

  async delete(id: number) {
    const position = await this.positionRepo.findById(id);
    if (!position) {
      throw new NotFoundException("岗位不存在");
    }

    const userCount = await this.positionRepo.countActiveUsers(id);
    if (userCount > 0) {
      throw new UnprocessableEntityException("该岗位有分配给活跃用户，不能删除");
    }

    return this.positionRepo.softDelete(id);
  }
}
