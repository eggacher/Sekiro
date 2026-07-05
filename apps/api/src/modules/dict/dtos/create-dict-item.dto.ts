import { IsString, IsInt, IsOptional, Length, Min, IsIn } from "class-validator";

export class CreateDictItemDto {
  @IsInt()
  @Min(1)
  typeId!: number;

  @IsString()
  @Length(1, 64)
  label!: string;

  @IsString()
  @Length(1, 64)
  value!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @IsOptional()
  @IsString()
  @IsIn(["enabled", "disabled"])
  status?: string;
}
