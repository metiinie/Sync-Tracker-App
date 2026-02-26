import { Strategy } from 'passport-microsoft';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
declare const MicrosoftStrategy_base: new (...args: [options: import("passport-microsoft").MicrosoftStrategyOptionsWithRequest] | [options: import("passport-microsoft").MicrosoftStrategyOptions]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class MicrosoftStrategy extends MicrosoftStrategy_base {
    private authService;
    constructor(configService: ConfigService, authService: AuthService);
    validate(accessToken: string, refreshToken: string, profile: any, done: any): Promise<any>;
}
export {};
