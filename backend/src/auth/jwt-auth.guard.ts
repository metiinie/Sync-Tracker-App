import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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
        jwt.decode(token, { complete: true });
      } catch (e) {
        // Silently fail decoding for debug purposes in the guard
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
