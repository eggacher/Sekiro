import { IsString, IsOptional, IsInt, Matches, Length, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateDeptDto {
  @ApiProperty({ type: Number, required: false, description: "父部门 ID，顶级部门为空", example: 0 })
  @IsOptional()
  @IsInt()
  parentId?: number;

  @ApiProperty({ type: String, required: true, description: "部门名称，1-32 位", example: "研发部" })
  @IsString()
  @Length(1, 32)
  name!: string;

  @ApiProperty({ type: String, required: false, description: "负责人姓名，1-32 位", example: "张三" })
  @IsOptional()
  @IsString()
  @Length(1, 32)
  leader?: string;

  @ApiProperty({ type: String, required: false, description: "负责人手机号，11 位数字", example: "13800138000" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: "手机号必须为 11 位数字" })
  phone?: string;

  @ApiProperty({ type: Number, required: false, description: "排序", example: 0 })
  @IsOptional()
  @IsInt()
  sort?: number;

  @ApiProperty({ type: String, required: false, description: "部门状态：enabled 启用、disabled 禁用", example: "enabled" })
  @IsOptional()
  @IsString()
  @IsIn(["enabled", "disabled"])
  status?: string;
}
