import { IsString, IsOptional, IsInt, Matches, Length, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreatePositionDto {
  @ApiProperty({ type: String, required: true, description: "岗位名称，1-32 位", example: "Java 工程师" })
  @IsString()
  @Length(1, 32)
  name!: string;

  @ApiProperty({ type: String, required: true, description: "岗位编码，小写字母开头，可包含小写字母、数字、下划线", example: "java_engineer" })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, { message: "岗位编码只能包含小写字母、数字和下划线，且以字母开头" })
  code!: string;

  @ApiProperty({ type: Number, required: false, description: "排序", example: 0 })
  @IsOptional()
  @IsInt()
  sort?: number;

  @ApiProperty({ type: String, required: false, description: "岗位状态：enabled 启用、disabled 禁用", example: "enabled" })
  @IsOptional()
  @IsString()
  @IsIn(["enabled", "disabled"])
  status?: string;
}
