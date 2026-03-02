import { Controller, Get, Query, UseGuards, Request, Patch, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from '../tasks/tasks.service';
import { UserSettingsService } from './user-settings.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly tasksService: TasksService,
    private readonly settingsService: UserSettingsService,
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

  @Get('settings')
  async getSettings(@Request() req: any) {
    return this.settingsService.getSettings(req.user.userId);
  }

  @Patch('settings')
  async updateSettings(@Request() req: any, @Body() data: any) {
    return this.settingsService.updateSettings(req.user.userId, data);
  }
}
