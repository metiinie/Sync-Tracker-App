import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { decode } from 'jsonwebtoken';

@Injectable()
export class WsJwtGuard implements CanActivate {
    constructor(private jwtService: JwtService, private configService: ConfigService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client = context.switchToWs().getClient();
            const token = client.handshake?.auth?.token || client.handshake?.headers?.authorization?.split(' ')[1];
            if (!token) return false;

            const payload = decode(token);
            console.log(`[Socket Guard] Token received (first 10 chars): ${token.substring(0, 10)}...`);
            console.log(`[Socket Guard] Unverified Payload:`, JSON.stringify(payload));

            const secret = this.configService.getOrThrow<string>('SUPABASE_JWT_SECRET');
            const secretBuffer = Buffer.from(secret, 'base64');

            try {
                await this.jwtService.verifyAsync(token, { secret: secretBuffer });
                console.log('[Socket Guard] Signature VALID (Base64 Buffer)');
            } catch (err) {
                try {
                    await this.jwtService.verifyAsync(token, { secret: secret });
                    console.warn('[Socket Guard] Signature VALID (RAW string)');
                } catch (err2) {
                    console.error('[Socket Guard] Signature INVALID with both secrets');
                }
                throw err;
            }

            client.user = payload;
            return true;
        } catch (e) {
            console.error('[Socket Guard] Connection Denied:', e.message);
            return false;
        }
    }
}
