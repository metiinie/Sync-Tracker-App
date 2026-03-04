import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common'; // Added for ExecutionContext type

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        // For ES256 with JwtModule, we'd traditionally need the public key string.
        // However, since we primarily use JwtStrategy for REST,
        // we'll keep this simple and rely on JwtStrategy for verification.
        // This part is mainly for when JwtService.verify() is called.
        return {
          verifyOptions: {
            algorithms: ['ES256'],
          },
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule { }
