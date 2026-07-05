import { IsString, IsOptional, IsInt, IsBoolean, Min, Length, IsIn } from "class-validator";

export class CreateMenuDto {
  @IsOptional()
  @IsInt()
  parentId?: number;

  @IsString()
  @Length(1, 32)
  title!: string;

  @IsString()
  @IsIn(["directory", "menu", "button"])
  type!: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  component?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  permission?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @IsOptional()
  @IsBoolean()
  cache?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(["enabled", "disabled"])
  status?: string;
}
