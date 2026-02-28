import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const supabaseUrl = configService.getOrThrow<string>('SUPABASE_URL');
    const jwksUri = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;

    console.log('JwtStrategy: Initializing with JWKS URI:', jwksUri);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: jwksUri,
      }),
      algorithms: ['ES256'],
    });
  }

  async validate(payload: any) {
    try {
      const user = await this.authService.getOrCreateUser(payload);
      return {
        userId: user.id,
        email: user.email,
        name: user.name,
      };
    } catch (error) {
      console.error('JWT Strategy Validate - Error:', error);
      throw error;
    }
  }
}
