import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { DataScopeService } from './services/data-scope.service';
import { JwtProvider } from './providers/jwt.provider';
import { RedisSessionProvider } from './providers/redis-session.provider';
import { LoginFailureProvider } from './providers/login-failure.provider';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET || 'your-secret-key' }),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtProvider, RedisSessionProvider, LoginFailureProvider, JwtAuthGuard, DataScopeService],
  exports: [AuthService, JwtProvider, RedisSessionProvider, JwtAuthGuard, DataScopeService],
})
export class AuthModule {}
