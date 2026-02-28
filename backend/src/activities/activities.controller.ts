import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
    constructor(private readonly activitiesService: ActivitiesService) { }

    @Get()
    async getActivities(
        @CurrentUser() user: any,
        @Query('scope') scope: 'my_tasks' | 'delegated' = 'my_tasks',
    ) {
        return this.activitiesService.getActivities(user.sub, scope);
    }
}
