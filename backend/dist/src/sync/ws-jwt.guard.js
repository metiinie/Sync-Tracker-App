"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsJwtGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const jsonwebtoken_1 = require("jsonwebtoken");
let WsJwtGuard = class WsJwtGuard {
    jwtService;
    configService;
    constructor(jwtService, configService) {
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async canActivate(context) {
        try {
            const client = context.switchToWs().getClient();
            const token = client.handshake?.auth?.token || client.handshake?.headers?.authorization?.split(' ')[1];
            if (!token)
                return false;
            const payload = (0, jsonwebtoken_1.decode)(token);
            console.log(`[Socket Guard] Token received (first 10 chars): ${token.substring(0, 10)}...`);
            console.log(`[Socket Guard] Unverified Payload:`, JSON.stringify(payload));
            const secret = this.configService.getOrThrow('SUPABASE_JWT_SECRET');
            const secretBuffer = Buffer.from(secret, 'base64');
            try {
                await this.jwtService.verifyAsync(token, { secret: secretBuffer });
                console.log('[Socket Guard] Signature VALID (Base64 Buffer)');
            }
            catch (err) {
                try {
                    await this.jwtService.verifyAsync(token, { secret: secret });
                    console.warn('[Socket Guard] Signature VALID (RAW string)');
                }
                catch (err2) {
                    console.error('[Socket Guard] Signature INVALID with both secrets');
                }
                throw err;
            }
            client.user = payload;
            return true;
        }
        catch (e) {
            console.error('[Socket Guard] Connection Denied:', e.message);
            return false;
        }
    }
};
exports.WsJwtGuard = WsJwtGuard;
exports.WsJwtGuard = WsJwtGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService, config_1.ConfigService])
], WsJwtGuard);
//# sourceMappingURL=ws-jwt.guard.js.map