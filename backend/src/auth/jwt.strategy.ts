import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { decode, verify } from 'jsonwebtoken';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private authService: AuthService,
    ) {
        const secret = configService.getOrThrow<string>('SUPABASE_JWT_SECRET');
        const secretBuffer = Buffer.from(secret, 'base64');
        const supabaseUrl = configService.get<string>('SUPABASE_URL');

        super({
            jwtFromRequest: (req) => {
                const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
                if (token) {
                    const payload = decode(token);
                    const timestamp = new Date().toLocaleTimeString();
                    console.log(`[${timestamp}] [Auth Guard] Token Payload:`, JSON.stringify(payload));
                }
                return token;
            },
            secretOrKeyProvider: (request, rawJwtToken, done) => {
                // Try Base64 buffer first (Standard for Supabase)
                try {
                    verify(rawJwtToken, secretBuffer);
                    return done(null, secretBuffer);
                } catch (e) {
                    // Try raw string next
                    try {
                        verify(rawJwtToken, secret);
                        console.warn('[Auth Guard] Diagnostic: Signature VALID with RAW secret');
                        return done(null, secret);
                    } catch (e2) {
                        console.error('[Auth Guard] Diagnostic: Signature INVALID with both secrets');
                        return done(e2);
                    }
                }
            },
            ignoreExpiration: false,
            // Dynamic claims check
            audience: 'authenticated',
            issuer: supabaseUrl ? `${supabaseUrl}/auth/v1` : undefined,
        });
    }

    async validate(payload: any) {
        console.log('[Auth Guard] JWT payload successfully verified by Passport.');
        console.log('[Auth Guard] Subject (sub):', payload.sub);

        try {
            const user = await this.authService.getOrCreateUser(payload);
            console.log('[Auth Guard] Local user sync success:', user.email);
            return { userId: user.id, email: user.email, name: user.name, systemRole: user.systemRole };
        } catch (error) {
            console.error('[Auth Guard] Error in validate() after successful JWT check:', error.message);
            throw error;
        }
    }
}
