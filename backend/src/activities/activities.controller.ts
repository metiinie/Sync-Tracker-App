import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
    constructor(private readonly activitiesService: ActivitiesService) { }

    @Get()
    async getActivities(
        @Request() req: any,
        @Query('scope') scope: 'my_tasks' | 'delegated' | 'all' | 'workspace' = 'workspace',
        @Query('limit') limit?: number,
        @Query('search') search?: string,
    ) {
        return this.activitiesService.getActivities(req.user.sub, scope, limit ? Number(limit) : 200, search);
    }
}
