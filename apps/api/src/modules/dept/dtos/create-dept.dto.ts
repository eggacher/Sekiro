import { IsString, IsOptional, IsInt, Matches, Length, IsIn } from "class-validator";

export class CreateDeptDto {
  @IsOptional()
  @IsInt()
  parentId?: number;

  @IsString()
  @Length(1, 32)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 32)
  leader?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: "手机号必须为 11 位数字" })
  phone?: string;

  @IsOptional()
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsString()
  @IsIn(["enabled", "disabled"])
  status?: string;
}
