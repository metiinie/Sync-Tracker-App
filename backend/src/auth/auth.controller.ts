import { Controller, Post, Body, UnauthorizedException, HttpCode, HttpStatus, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('register')
    async register(@Body() body: any) {
        return this.authService.register(body.name, body.email, body.password);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() body: any) {
        const user = await this.authService.validateUser(body.email, body.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user);
    }

    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth(@Req() req) { }

    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthRedirect(@Req() req, @Res() res) {
        const result = await this.authService.login(req.user);
        // In a real app, you'd redirect to a deep link or web page with the token
        return res.json(result);
    }

    @Get('microsoft')
    @UseGuards(AuthGuard('microsoft'))
    async microsoftAuth(@Req() req) { }

    @Get('microsoft/callback')
    @UseGuards(AuthGuard('microsoft'))
    async microsoftAuthRedirect(@Req() req, @Res() res) {
        const result = await this.authService.login(req.user);
        return res.json(result);
    }
}
