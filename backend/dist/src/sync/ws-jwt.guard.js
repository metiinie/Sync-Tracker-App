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
const jwks_rsa_1 = require("jwks-rsa");
let WsJwtGuard = class WsJwtGuard {
    jwtService;
    configService;
    client;
    constructor(jwtService, configService) {
        this.jwtService = jwtService;
        this.configService = configService;
        const supabaseUrl = this.configService.getOrThrow('SUPABASE_URL');
        this.client = new jwks_rsa_1.JwksClient({
            jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
            cache: true,
            rateLimit: true,
            jwksRequestsPerMinute: 5,
        });
    }
    getKey = async (header) => {
        const key = await this.client.getSigningKey(header.kid);
        return key.getPublicKey();
    };
    async canActivate(context) {
        try {
            const client = context.switchToWs().getClient();
            const token = client.handshake?.auth?.token ||
                client.handshake?.headers?.authorization?.split(' ')[1];
            if (!token)
                return false;
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
        }
        catch (error) {
            console.error('WsJwtGuard Auth Failure:', error.message);
            return false;
        }
    }
};
exports.WsJwtGuard = WsJwtGuard;
exports.WsJwtGuard = WsJwtGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], WsJwtGuard);
//# sourceMappingURL=ws-jwt.guard.js.map