import { IsString, IsInt, IsIn, Length, Min } from "class-validator";

export class UpdateDictItemDto {
  @IsString()
  @Length(1, 64)
  label!: string;

  @IsString()
  @Length(1, 64)
  value!: string;

  @IsInt()
  @Min(0)
  sort!: number;

  @IsString()
  @IsIn(["enabled", "disabled"])
  status!: string;
}
