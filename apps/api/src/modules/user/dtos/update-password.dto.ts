import { IsString, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdatePasswordDto {
  @ApiProperty({ type: String, required: true, description: "当前密码", example: "oldPass123" })
  @IsString({ message: "当前密码必须是字符串" })
  oldPassword!: string;

  @ApiProperty({ type: String, required: true, description: "新密码，6-32 位", example: "newPass123" })
  @IsString({ message: "新密码必须是字符串" })
  @Length(6, 32, { message: "新密码长度必须 6-32 位" })
  newPassword!: string;
}
