import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
        const req = context.switchToHttp().getRequest();
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.decode(token, { complete: true });
                console.log('JWT Debug - Header:', JSON.stringify(decoded?.header, null, 2));
                console.log('JWT Debug - Algorithm from Token:', decoded?.header?.alg);
            } catch (e) {
                console.error('JWT Debug - Failed to decode token header:', e.message);
            }
        }

        if (err || !user) {
            console.error('JWT Auth Guard Failure:', {
                error: err?.message,
                info: info?.message,
                // stack: info?.stack
            });
            throw err || new UnauthorizedException(info?.message || 'Unauthorized');
        }
        return user;
    }
}
