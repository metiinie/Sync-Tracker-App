import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from '../tasks/tasks.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly tasksService: TasksService,
    ) { }

    @Get('stats')
    async getStats(@Request() req: any) {
        return this.tasksService.getUserStats(req.user.userId);
    }

    @Get('search')
    async search(@Query('q') query: string) {
        return this.usersService.search(query || '');
    }

    @Get()
    async findAll() {
        return this.usersService.findAll();
    }
}
