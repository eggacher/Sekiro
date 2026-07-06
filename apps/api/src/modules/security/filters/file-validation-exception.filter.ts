import { Catch, ExceptionFilter, ArgumentsHost } from "@nestjs/common";
import { Response } from "express";
import type { ApiResponse } from "@sekiro/shared";
import { FileValidationException } from "../exceptions/file-validation.exception";

@Catch(FileValidationException)
export class FileValidationExceptionFilter implements ExceptionFilter {
  catch(exception: FileValidationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const payload: ApiResponse<Array<{ field: string; message: string }>> = {
      code: 422,
      message: exception.message,
      data: [{ field: "file", message: exception.message }],
    };

    response.status(200).json(payload);
  }
}
