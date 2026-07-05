import { IsString, IsOptional, IsInt, Matches, Length, IsIn } from "class-validator";

export class CreatePositionDto {
  @IsString()
  @Length(1, 32)
  name!: string;

  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, { message: "岗位编码只能包含小写字母、数字和下划线，且以字母开头" })
  code!: string;

  @IsOptional()
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsString()
  @IsIn(["enabled", "disabled"])
  status?: string;
}
