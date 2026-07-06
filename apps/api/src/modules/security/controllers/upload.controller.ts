import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  HttpCode,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { ValidatedFile } from "../decorators/validated-file.decorator";
import type { ApiResponse as ApiResponseType } from "@sekiro/shared";

@ApiTags('Upload')
@Controller("system/upload")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  @Post()
  @HttpCode(200)
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: '文件上传（示例）' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '文件校验失败' })
  async upload(
    @ValidatedFile({
      maxSize: 5 * 1024 * 1024,
      allowedExtensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"],
      allowedTypes: ["image/*", "application/pdf"],
    })
    file: Express.Multer.File,
  ): Promise<ApiResponseType<{ filename: string; size: number }>> {
    return {
      code: 0,
      message: "上传成功",
      data: {
        filename: file.originalname,
        size: file.size,
      },
    };
  }
}
