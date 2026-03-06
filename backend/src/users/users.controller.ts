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
    try {
      console.log(`[UsersController] Fetching settings for user: ${req.user?.userId}`);
      const settings = await this.settingsService.getSettings(req.user.userId);
      console.log(`[UsersController] Successfully fetched settings for user: ${req.user?.userId}`);
      return settings;
    } catch (error) {
      console.error(`[UsersController] Error fetching settings for user ${req.user?.userId}:`, error);
      throw error;
    }
  }

  @Patch('settings')
  async updateSettings(@Request() req: any, @Body() data: any) {
    return this.settingsService.updateSettings(req.user.userId, data);
  }

  @Patch('profile')
  async updateProfile(@Request() req: any, @Body() data: { name?: string }) {
    return this.usersService.updateProfile(req.user.userId, data);
  }
}
