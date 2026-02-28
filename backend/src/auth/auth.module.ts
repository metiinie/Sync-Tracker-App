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
                const secret = configService.getOrThrow<string>('SUPABASE_JWT_SECRET');
                const secretOrKey = secret.includes('+') || secret.includes('/') || secret.endsWith('=')
                    ? Buffer.from(secret, 'base64')
                    : secret;
                return {
                    secret: secretOrKey,
                    // Temporarily ignore expiration for debugging as per instruction
                    ignoreExpiration: true,
                };
            },
        }),
    ],
    providers: [AuthService, JwtStrategy],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule { }
