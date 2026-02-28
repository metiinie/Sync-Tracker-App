import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwksClient } from 'jwks-rsa';

@Injectable()
export class WsJwtGuard implements CanActivate {
    private client: JwksClient;

    constructor(private jwtService: JwtService, private configService: ConfigService) {
        const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
        this.client = new JwksClient({
            jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
            cache: true,
            rateLimit: true,
            jwksRequestsPerMinute: 5,
        });
    }

    private getKey = async (header: any): Promise<string> => {
        const key = await this.client.getSigningKey(header.kid);
        return key.getPublicKey();
    };

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client = context.switchToWs().getClient();
            const token = client.handshake?.auth?.token || client.handshake?.headers?.authorization?.split(' ')[1];
            if (!token) return false;

            const decoded = this.jwtService.decode(token, { complete: true });
            if (!decoded || typeof decoded === 'string' || !decoded.header) {
                return false;
            }

            const publicKey = await this.getKey(decoded.header);

            const payload = await this.jwtService.verifyAsync(token, {
                secret: publicKey,
                algorithms: ['ES256'],
            });
            client.user = payload;
            return true;
        } catch (error) {
            console.error('WsJwtGuard Auth Failure:', error.message);
            return false;
        }
    }
}
