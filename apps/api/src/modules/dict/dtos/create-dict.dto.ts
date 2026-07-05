import { IsString, IsOptional, Matches, Length, IsIn } from "class-validator";

export class CreateDictDto {
  @IsString()
  @Length(1, 32)
  name!: string;

  @IsString()
  @Length(1, 64)
  @Matches(/^[a-z][a-z0-9_]*$/, { message: "字典编码必须以小写字母开头，且只能包含小写字母、数字和下划线" })
  code!: string;

  @IsOptional()
  @IsString()
  @IsIn(["enabled", "disabled"])
  status?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  remark?: string;
}
