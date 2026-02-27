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
exports.JwtStrategy = void 0;
const passport_jwt_1 = require("passport-jwt");
const passport_1 = require("@nestjs/passport");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
const jsonwebtoken_1 = require("jsonwebtoken");
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    configService;
    authService;
    constructor(configService, authService) {
        const secret = configService.getOrThrow('SUPABASE_JWT_SECRET');
        const secretBuffer = Buffer.from(secret, 'base64');
        super({
            jwtFromRequest: (req) => {
                const token = passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken()(req);
                if (token) {
                    const payload = (0, jsonwebtoken_1.decode)(token);
                    console.log(`[Auth Guard] Raw token received (first 10 chars): ${token.substring(0, 10)}...`);
                    console.log(`[Auth Guard] Unverified Payload:`, JSON.stringify(payload));
                    try {
                        (0, jsonwebtoken_1.verify)(token, secretBuffer);
                        console.log('[Auth Guard] Diagnostic: Signature VALID with Base64 Decoded secret');
                    }
                    catch (err) {
                        try {
                            (0, jsonwebtoken_1.verify)(token, secret);
                            console.warn('[Auth Guard] Diagnostic: Signature VALID with RAW secret (NOT Base64 Decoded)');
                        }
                        catch (err2) {
                            console.error('[Auth Guard] Diagnostic: Signature INVALID with both RAW and Base64 secrets');
                            console.error('[Auth Guard] Diagnostic: Raw Secret Error:', err2.message);
                            console.error('[Auth Guard] Diagnostic: Base64 Secret Error:', err.message);
                        }
                    }
                }
                else {
                    console.warn('[Auth Guard] No token found in request headers');
                }
                return token;
            },
            ignoreExpiration: false,
            secretOrKey: secretBuffer,
        });
        this.configService = configService;
        this.authService = authService;
    }
    async validate(payload) {
        console.log('[Auth Guard] JWT payload successfully verified by Passport.');
        console.log('[Auth Guard] Subject (sub):', payload.sub);
        try {
            const user = await this.authService.getOrCreateUser(payload);
            console.log('[Auth Guard] Local user sync success:', user.email);
            return { userId: user.id, email: user.email, name: user.name, systemRole: user.systemRole };
        }
        catch (error) {
            console.error('[Auth Guard] Error in validate() after successful JWT check:', error.message);
            throw error;
        }
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        auth_service_1.AuthService])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map