import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private authService: AuthService,
    ) {
        const secret = configService.getOrThrow<string>('SUPABASE_JWT_SECRET');
        // Handle base64 secrets if present (common in Supabase setup)
        const secretOrKey = secret.includes('+') || secret.includes('/') || secret.endsWith('=')
            ? Buffer.from(secret, 'base64')
            : secret;

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: true, // Temporarily ignore for debugging
            secretOrKey: secretOrKey,
        });
    }

    async validate(payload: any) {
        console.log('JWT Strategy Validate - Payload:', JSON.stringify(payload, null, 2));
        try {
            const user = await this.authService.getOrCreateUser(payload);
            console.log('JWT Strategy Validate - User found/created:', user.id);
            return { userId: user.id, email: user.email, name: user.name, systemRole: user.systemRole };
        } catch (error) {
            console.error('JWT Strategy Validate - Error:', error);
            throw error;
        }
    }
}
