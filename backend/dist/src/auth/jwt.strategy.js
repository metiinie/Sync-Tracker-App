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
        const supabaseUrl = configService.get('SUPABASE_URL');
        super({
            jwtFromRequest: (req) => {
                const token = passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken()(req);
                if (token) {
                    const payload = (0, jsonwebtoken_1.decode)(token);
                    const timestamp = new Date().toLocaleTimeString();
                    console.log(`[${timestamp}] [Auth Guard] Token Payload:`, JSON.stringify(payload));
                }
                return token;
            },
            secretOrKeyProvider: (request, rawJwtToken, done) => {
                try {
                    (0, jsonwebtoken_1.verify)(rawJwtToken, secretBuffer);
                    return done(null, secretBuffer);
                }
                catch (e) {
                    try {
                        (0, jsonwebtoken_1.verify)(rawJwtToken, secret);
                        console.warn('[Auth Guard] Diagnostic: Signature VALID with RAW secret');
                        return done(null, secret);
                    }
                    catch (e2) {
                        console.error('[Auth Guard] Diagnostic: Signature INVALID with both secrets');
                        return done(e2);
                    }
                }
            },
            ignoreExpiration: false,
            audience: 'authenticated',
            issuer: supabaseUrl ? `${supabaseUrl}/auth/v1` : undefined,
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