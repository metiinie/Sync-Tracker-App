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
  BadRequestException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) { }

  // ─── Task CRUD ──────────────────────────────────────────────────────────────

  @Post()
  async create(@Body() body: any, @Request() req: any) {
    return this.tasksService.create(
      body.title,
      body.description,
      req.user.userId,
      body.responsibleOwner,
      body.participants,
      body.milestones,
      body.priority,
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

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.tasksService.update(id, req.user.userId, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.delete(id, req.user.userId);
  }

  // ─── Responsibility ─────────────────────────────────────────────────────────

  @Patch(':id/accept')
  async accept(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.accept(id, req.user.userId);
  }

  @Patch(':id/complete')
  async complete(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.complete(id, req.user.userId);
  }

  // ─── 3-Step Transfer Flow ───────────────────────────────────────────────────

  @Patch(':id/transfer')
  async initiateTransfer(
    @Param('id') id: string,
    @Body() body: { newOwnerId: string; note?: string },
    @Request() req: any,
  ) {
    return this.tasksService.transfer(id, req.user.userId, body.newOwnerId, body.note);
  }

  // NOTE: these routes must be before ":id/*" routes to avoid param capture
  @Patch('transfers/:tid/accept')
  async acceptTransfer(@Param('tid') tid: string, @Request() req: any) {
    return this.tasksService.acceptTransfer(tid, req.user.userId);
  }

  @Patch('transfers/:tid/reject')
  async rejectTransfer(@Param('tid') tid: string, @Request() req: any) {
    return this.tasksService.rejectTransfer(tid, req.user.userId);
  }

  @Get('transfers/pending')
  async getPendingTransfers(@Request() req: any) {
    return this.tasksService.getPendingTransfers(req.user.userId);
  }

  @Get(':id/transfers')
  async getTaskTransfers(@Param('id') id: string) {
    return this.tasksService.getTaskTransfers(id);
  }

  // ─── Sync ───────────────────────────────────────────────────────────────────

  @Patch(':id/sync')
  async updateSync(
    @Param('id') id: string,
    @Body() body: { syncState?: any; state?: any; note?: string },
    @Request() req: any,
  ) {
    const state = body.syncState || body.state;
    if (!state) {
      throw new BadRequestException('syncState or state is required');
    }
    return this.tasksService.updateSyncState(id, req.user.userId, state, body.note);
  }

  @Patch('sync-all')
  async syncAll(@Request() req: any) {
    return this.tasksService.syncAll(req.user.userId);
  }

  @Patch(':id/sync-participant')
  async syncParticipant(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.syncParticipant(id, req.user.userId);
  }

  // ─── Participants ───────────────────────────────────────────────────────────

  @Post(':id/participants')
  async addParticipant(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.tasksService.addParticipant(id, body.userId, body.role, req.user.userId);
  }

  @Delete(':id/participants/:userId')
  async removeParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    return this.tasksService.removeParticipant(id, userId, req.user.userId);
  }

  // ─── Milestones ─────────────────────────────────────────────────────────────

  @Post(':id/milestones')
  async addMilestone(
    @Param('id') id: string,
    @Body() body: { title: string; dueDate?: string },
    @Request() req: any,
  ) {
    return this.tasksService.addMilestone(id, body.title, req.user.userId, body.dueDate);
  }

  @Patch('milestones/:mid')
  async updateMilestone(@Param('mid') mid: string, @Body() body: any, @Request() req: any) {
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

  // ─── Time Logs ──────────────────────────────────────────────────────────────

  @Post(':id/time-logs')
  async logTime(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.tasksService.logTime(id, req.user.userId, body.durationMinutes, body.description);
  }

  // ─── Comments ───────────────────────────────────────────────────────────────

  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @Body('content') content: string,
    @Request() req: any,
  ) {
    return this.tasksService.addComment(id, req.user.userId, content);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    return this.tasksService.getComments(id);
  }

  @Delete('comments/:commentId')
  async deleteComment(@Param('commentId') commentId: string, @Request() req: any) {
    return this.tasksService.deleteComment(commentId, req.user.userId);
  }

  // ─── Misc ────────────────────────────────────────────────────────────────────

  @Post(':id/nudge')
  async nudge(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.nudge(id, req.user.userId);
  }
}
