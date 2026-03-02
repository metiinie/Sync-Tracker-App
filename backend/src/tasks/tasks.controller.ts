import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) { }

  @Post()
  async create(@Body() body: any, @Request() req: any) {
    return this.tasksService.create(
      body.title,
      body.description,
      req.user.userId,
      body.responsibleOwner,
      body.participants,
      body.milestones,
    );
  }

  @Patch(':id/accept')
  async accept(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.accept(id, req.user.userId);
  }

  @Patch(':id/sync')
  async updateSync(
    @Param('id') id: string,
    @Body('syncState') syncState: any,
    @Request() req: any,
  ) {
    return this.tasksService.updateSyncState(id, req.user.userId, syncState);
  }

  @Patch(':id/transfer')
  async transfer(
    @Param('id') id: string,
    @Body('newOwnerId') newOwnerId: string,
    @Request() req: any,
  ) {
    return this.tasksService.transfer(id, req.user.userId, newOwnerId);
  }

  @Post(':id/participants')
  async addParticipant(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.tasksService.addParticipant(
      id,
      body.userId,
      body.role,
      req.user.userId,
    );
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.tasksService.findAllForUser(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post(':id/milestones')
  async addMilestone(
    @Param('id') id: string,
    @Body() body: { title: string; dueDate?: string },
    @Request() req: any,
  ) {
    return this.tasksService.addMilestone(id, body.title, req.user.userId, body.dueDate);
  }

  @Patch('milestones/:mid')
  async updateMilestone(
    @Param('mid') mid: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.tasksService.updateMilestone(mid, body, req.user.userId);
  }

  @Delete('milestones/:mid')
  async deleteMilestone(@Param('mid') mid: string, @Request() req: any) {
    return this.tasksService.deleteMilestone(mid, req.user.userId);
  }

  @Patch('milestones/:mid/toggle')
  async toggleMilestone(
    @Param('mid') mid: string,
    @Body('isCompleted') isCompleted: boolean,
    @Request() req: any,
  ) {
    return this.tasksService.toggleMilestone(mid, isCompleted, req.user.userId);
  }

  @Post(':id/time-logs')
  async logTime(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.tasksService.logTime(
      id,
      req.user.userId,
      body.durationMinutes,
      body.description,
    );
  }

  @Patch('sync-all')
  async syncAll(@Request() req: any) {
    return this.tasksService.syncAll(req.user.userId);
  }

  @Patch(':id/sync-participant')
  async syncParticipant(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.syncParticipant(id, req.user.userId);
  }

  @Post(':id/nudge')
  async nudge(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.nudge(id, req.user.userId);
  }
}
