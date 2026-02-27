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

        super({
            jwtFromRequest: (req) => {
                const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
                if (token) {
                    const payload = decode(token);
                    console.log(`[Auth Guard] Raw token received (first 10 chars): ${token.substring(0, 10)}...`);
                    console.log(`[Auth Guard] Unverified Payload:`, JSON.stringify(payload));

                    // Diagnostic verification
                    try {
                        verify(token as string, secretBuffer);
                        console.log('[Auth Guard] Diagnostic: Signature VALID with Base64 Decoded secret');
                    } catch (err) {
                        try {
                            verify(token as string, secret);
                            console.warn('[Auth Guard] Diagnostic: Signature VALID with RAW secret (NOT Base64 Decoded)');
                        } catch (err2) {
                            console.error('[Auth Guard] Diagnostic: Signature INVALID with both RAW and Base64 secrets');
                            console.error('[Auth Guard] Diagnostic: Raw Secret Error:', err2.message);
                            console.error('[Auth Guard] Diagnostic: Base64 Secret Error:', err.message);
                        }
                    }
                } else {
                    console.warn('[Auth Guard] No token found in request headers');
                }
                return token;
            },
            ignoreExpiration: false,
            secretOrKey: secretBuffer, // We'll keep this as default but diagnostic tells us the truth
            // Disable strict claims check to find the culprit
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
