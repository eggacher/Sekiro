import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./services/auth.service";
import { MfaService } from "./services/mfa.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import {
  LoginDto,
  RefreshDto,
  RefreshResponse,
  MfaVerifyDto,
  MfaDisableDto,
  MfaLoginVerifyDto,
} from "./dtos";
import type { ApiResponse as ApiResponseType } from "@sekiro/shared";

@ApiTags('Auth')
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService) private authService: AuthService,
    @Inject(MfaService) private mfaService: MfaService,
  ) {}

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
  @Throttle({ default: { limit: 5, ttl: 60 * 1000 } })
  @ApiBody({ type: LoginDto })
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: any,
  ): Promise<ApiResponseType<any>> {
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
   * 获取当前登录用户信息
   * GET /auth/me
   *
   * 请求头：
   * Authorization: Bearer <token>
   *
   * 响应：
   * {
   *   "code": 0,
   *   "message": "获取成功",
   *   "data": {
   *     "user": { ... },
   *     "permissions": [ ... ],
   *     "menus": [ ... ]
   *   }
   * }
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前登录用户信息' })
  @ApiResponse({ status: 200, description: '成功' })
  async getMe(@Req() req: any): Promise<ApiResponseType<any>> {
    const result = await this.authService.getMe(req.user.sub);
    return {
      code: 0,
      message: '获取成功',
      data: result,
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
  @ApiBody({ type: RefreshDto })
  @ApiOperation({ summary: '刷新 Token' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async refresh(@Body() refreshDto: RefreshDto): Promise<ApiResponseType<any>> {
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
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户登出' })
  @ApiResponse({ status: 200, description: '成功' })
  async logout(@Req() req: any): Promise<ApiResponseType<any>> {
    const userId = req.user?.sub;
    const sessionId = req.user?.sid;
    await this.authService.logout(userId, sessionId);
    return {
      code: 0,
      message: "登出成功",
      data: null,
    };
  }

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '生成 MFA 绑定信息' })
  async mfaSetup(@Req() req: any): Promise<ApiResponseType<any>> {
    const { sub, username } = req.user;
    const result = await this.mfaService.setup(sub, username);
    return { code: 0, message: '生成成功', data: result };
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '验证并启用 MFA' })
  async mfaVerify(
    @Req() req: any,
    @Body() dto: MfaVerifyDto,
  ): Promise<ApiResponseType<any>> {
    const result = await this.mfaService.verifyAndEnable(req.user.sub, dto.code);
    return { code: 0, message: '启用成功', data: result };
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '关闭 MFA' })
  async mfaDisable(
    @Req() req: any,
    @Body() dto: MfaDisableDto,
  ): Promise<ApiResponseType<any>> {
    const result = await this.mfaService.disable(req.user.sub, dto.code);
    return { code: 0, message: '关闭成功', data: result };
  }

  @Post('mfa/login-verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  @ApiOperation({ summary: 'MFA 登录验证' })
  async mfaLoginVerify(
    @Body() dto: MfaLoginVerifyDto,
    @Req() req: any,
  ): Promise<ApiResponseType<any>> {
    const ipAddress = req.ip || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || '';
    const result = await this.authService.loginWithMfa(
      dto.mfaToken,
      dto.code,
      ipAddress,
      userAgent,
    );

    if ('data' in result) {
      return { code: 0, message: '登录成功', data: result.data };
    }
    return { code: result.code, message: result.message, data: null };
  }
}
