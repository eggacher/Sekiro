import { IsString, IsOptional, IsInt, IsBoolean, Min, Length, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateMenuDto {
  @ApiProperty({ type: Number, required: false, description: "父菜单 ID，为空表示顶级菜单", example: 0 })
  @IsOptional()
  @IsInt()
  parentId?: number | null;

  @ApiProperty({ type: String, required: true, description: "菜单标题，1-32 位", example: "系统管理" })
  @IsString()
  @Length(1, 32)
  title!: string;

  @ApiProperty({ type: String, required: false, description: "路由路径", example: "/system/user" })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiProperty({ type: String, required: false, description: "组件路径", example: "system/user/index" })
  @IsOptional()
  @IsString()
  component?: string;

  @ApiProperty({ type: String, required: false, description: "菜单图标", example: "Settings" })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ type: String, required: false, description: "权限标识", example: "system:user:list" })
  @IsOptional()
  @IsString()
  permission?: string;

  @ApiProperty({ type: Number, required: false, description: "排序，最小 0", example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @ApiProperty({ type: Boolean, required: false, description: "是否可见", example: true })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @ApiProperty({ type: Boolean, required: false, description: "是否缓存", example: true })
  @IsOptional()
  @IsBoolean()
  cache?: boolean;

  @ApiProperty({ type: String, required: false, description: "菜单状态：enabled 启用、disabled 禁用", example: "enabled" })
  @IsOptional()
  @IsString()
  @IsIn(["enabled", "disabled"])
  status?: string;
}
