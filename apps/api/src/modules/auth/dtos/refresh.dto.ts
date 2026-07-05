import { IsString } from 'class-validator';
import type { RefreshRequest, RefreshResponse } from '@sekiro/shared';

/**
 * 令牌刷新请求 DTO
 * 实现 @sekiro/shared 中的 RefreshRequest 接口
 */
export class RefreshDto implements RefreshRequest {
  @IsString({ message: '刷新令牌必须是字符串' })
  refreshToken: string;
}

// 重导出刷新令牌响应类型，供 controller 使用
export { RefreshResponse };
