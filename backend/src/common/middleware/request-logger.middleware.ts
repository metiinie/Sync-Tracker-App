import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const { method, originalUrl } = req;
        const authHeader = req.headers.authorization || 'No Auth';
        const maskedAuth = authHeader !== 'No Auth' ? `${authHeader.substring(0, 15)}...` : 'None';

        res.on('finish', () => {
            const { statusCode } = res;
            console.log(`[Request] ${method} ${originalUrl} ${statusCode} | Auth: ${maskedAuth}`);
        });
        next();
    }
}
