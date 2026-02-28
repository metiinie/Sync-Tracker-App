import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
    constructor(private jwtService: JwtService, private configService: ConfigService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client = context.switchToWs().getClient();
            const token = client.handshake?.auth?.token || client.handshake?.headers?.authorization?.split(' ')[1];
            if (!token) return false;

            const secret = this.configService.getOrThrow<string>('SUPABASE_JWT_SECRET');
            const secretOrKey = secret.includes('+') || secret.includes('/') || secret.endsWith('=')
                ? Buffer.from(secret, 'base64')
                : secret;

            const payload = await this.jwtService.verifyAsync(token, {
                secret: secretOrKey,
            });
            client.user = payload;
            return true;
        } catch (error) {
            console.error('WsJwtGuard Auth Failure:', error.message);
            return false;
        }
    }
}
