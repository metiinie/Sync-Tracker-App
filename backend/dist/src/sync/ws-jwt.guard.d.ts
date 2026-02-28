import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
export declare class WsJwtGuard implements CanActivate {
    private jwtService;
    private configService;
    private client;
    constructor(jwtService: JwtService, configService: ConfigService);
    private getKey;
    canActivate(context: ExecutionContext): Promise<boolean>;
}
