import { IsString, Length } from "class-validator";

export class UpdatePasswordDto {
  @IsString({ message: "当前密码必须是字符串" })
  oldPassword!: string;

  @IsString({ message: "新密码必须是字符串" })
  @Length(6, 32, { message: "新密码长度必须 6-32 位" })
  newPassword!: string;
}
