import { IsString, IsOptional, IsInt, Length, IsIn } from "class-validator";

export class UpdatePositionDto {
  @IsString()
  @Length(1, 32)
  name!: string;

  @IsOptional()
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsString()
  @IsIn(["enabled", "disabled"])
  status?: string;
}
