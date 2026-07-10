import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { MfaService } from './services/mfa.service';
import { DataScopeService } from './services/data-scope.service';
import { JwtProvider } from './providers/jwt.provider';
import { RedisSessionProvider } from './providers/redis-session.provider';
import { LoginFailureProvider } from './providers/login-failure.provider';
import { MfaProvider } from './providers/mfa.provider';
import { MfaCryptoProvider } from './providers/mfa-crypto.provider';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET || 'your-secret-key' }),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    MfaService,
    JwtProvider,
    RedisSessionProvider,
    LoginFailureProvider,
    MfaProvider,
    MfaCryptoProvider,
    JwtAuthGuard,
    DataScopeService,
  ],
  exports: [
    AuthService,
    MfaService,
    JwtProvider,
    RedisSessionProvider,
    JwtAuthGuard,
    DataScopeService,
  ],
})
export class AuthModule {}
