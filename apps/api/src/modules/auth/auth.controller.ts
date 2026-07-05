import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  Inject,
} from "@nestjs/common";
import { AuthService } from "./services/auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { LoginDto, LoginResponse, RefreshDto, RefreshResponse } from "./dtos";
import type { ApiResponse } from "@sekiro/shared";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private authService: AuthService) {}

  /**
   * 登录接口
   * POST /auth/login
   *
   * 请求体：
   * {
   *   "username": "admin",
   *   "password": "admin123",
   *   "remember": false
   * }
   *
   * 响应：
   * {
   *   "code": 0,
   *   "message": "登录成功",
   *   "data": {
   *     "token": "eyJhbGc...",
   *     "refreshToken": "eyJhbGc...",
   *     "expiresIn": 7200,
   *     "user": { ... },
   *     "permissions": [ ... ],
   *     "menus": [ ... ]
   *   }
   * }
   */
  @Post("login")
  @HttpCode(200)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: any,
  ): Promise<ApiResponse<any>> {
    const ipAddress = req.ip || "0.0.0.0";
    const userAgent = req.headers["user-agent"] || "";
    const result = await this.authService.login(loginDto, ipAddress, userAgent);

    if ("data" in result) {
      return {
        code: 0,
        message: "登录成功",
        data: result.data,
      };
    }
    return {
      code: result.code,
      message: result.message,
      data: null,
    };
  }

  /**
   * 刷新 Token 接口
   * POST /auth/refresh
   *
   * 请求体：
   * {
   *   "refreshToken": "eyJhbGc..."
   * }
   *
   * 响应：
   * {
   *   "code": 0,
   *   "message": "Token 刷新成功",
   *   "data": {
   *     "token": "eyJhbGc...",
   *     "expiresIn": 7200
   *   }
   * }
   */
  @Post("refresh")
  @HttpCode(200)
  async refresh(@Body() refreshDto: RefreshDto): Promise<ApiResponse<any>> {
    const result = await this.authService.refresh(refreshDto.refreshToken);

    if ("data" in result) {
      return {
        code: 0,
        message: "Token 刷新成功",
        data: result.data,
      };
    }
    return {
      code: result.code,
      message: result.message,
      data: null,
    };
  }

  /**
   * 登出接口（需认证）
   * POST /auth/logout
   *
   * 请求头：
   * Authorization: Bearer <token>
   *
   * 响应：
   * {
   *   "code": 0,
   *   "message": "登出成功",
   *   "data": null
   * }
   */
  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(@Req() req: any): Promise<ApiResponse<any>> {
    const userId = req.user?.sub;
    const sessionId = req.user?.sid;
    await this.authService.logout(userId, sessionId);
    return {
      code: 0,
      message: "登出成功",
      data: null,
    };
  }
}
