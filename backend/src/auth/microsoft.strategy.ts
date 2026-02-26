import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
    constructor(
        configService: ConfigService,
        private authService: AuthService,
    ) {
        super({
            clientID: configService.get<string>('MICROSOFT_CLIENT_ID') || 'dummy',
            clientSecret: configService.get<string>('MICROSOFT_CLIENT_SECRET') || 'dummy',
            callbackURL: 'http://localhost:3000/api/v1/auth/microsoft/callback',
            scope: ['user.read'],
            tenant: 'common',
        });
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: any): Promise<any> {
        // Map Microsoft profile to standard profile
        const standardProfile = {
            emails: [{ value: profile.emails[0]?.value || profile.userPrincipalName }],
            displayName: profile.displayName,
            id: profile.id,
            provider: 'microsoft',
        };
        const user = await this.authService.validateOAuthUser(standardProfile);
        done(null, user);
    }
}
