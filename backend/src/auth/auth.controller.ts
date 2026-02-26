import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }
    // Supabase handles login/register on the frontend.
    // Backend verifies JWT per request via JwtAuthGuard.
}
