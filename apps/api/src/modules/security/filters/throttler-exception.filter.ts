import { Catch, ExceptionFilter, ArgumentsHost } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import type { Response } from "express";
import type { ApiResponse } from "@sekiro/shared";

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(_exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const payload: ApiResponse<null> = {
      code: 429,
      message: "请求过于频繁，请稍后再试",
      data: null,
    };
    response.status(200).json(payload);
  }
}
