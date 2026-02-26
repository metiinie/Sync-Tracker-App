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
        });
    }

    async validate(payload: any) {
        // Automatically sync Supabase user to local DB
        const user = await this.authService.getOrCreateUser(payload);
        return { userId: user.id, email: user.email, name: user.name, systemRole: user.systemRole };
    }
}
