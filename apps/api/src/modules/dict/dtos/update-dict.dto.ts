import { IsString, IsOptional, Length, IsIn } from "class-validator";

export class UpdateDictDto {
  @IsString()
  @Length(1, 32)
  name!: string;

  @IsString()
  @IsIn(["enabled", "disabled"])
  status!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  remark?: string;
}
