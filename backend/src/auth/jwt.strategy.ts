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
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('SUPABASE_JWT_SECRET'),
            audience: 'authenticated',
        });
    }

    async validate(payload: any) {
        console.log('[Auth Guard] Validating JWT payload:', { sub: payload.sub, email: payload.email });
        // Automatically sync Supabase user to local DB
        try {
            const user = await this.authService.getOrCreateUser(payload);
            console.log('[Auth Guard] Success for user:', user.email);
            return { userId: user.id, email: user.email, name: user.name, systemRole: user.systemRole };
        } catch (error) {
            console.error('[Auth Guard] Validation error:', error.message);
            throw error;
        }
    }
}
