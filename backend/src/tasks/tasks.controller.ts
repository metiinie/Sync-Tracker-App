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

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPORTANT: Static routes MUST be declared before parameterized `:id` routes.
  // NestJS matches routes in declaration order. If `:id` comes first,
  // paths like `transfers/pending` would match with id='transfers'.
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Static Routes (no :id param) ──────────────────────────────────────────

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

  // ─── Transfers (static paths — must be before :id) ─────────────────────────

  @Get('transfers/pending')
  async getPendingTransfers(@Request() req: any) {
    return this.tasksService.getPendingTransfers(req.user.userId);
  }

  @Patch('transfers/:tid/accept')
  async acceptTransfer(@Param('tid') tid: string, @Request() req: any) {
    return this.tasksService.acceptTransfer(tid, req.user.userId);
  }

  @Patch('transfers/:tid/reject')
  async rejectTransfer(@Param('tid') tid: string, @Request() req: any) {
    return this.tasksService.rejectTransfer(tid, req.user.userId);
  }

  // ─── Sync (static path — must be before :id) ──────────────────────────────

  @Patch('sync-all')
  async syncAll(@Request() req: any) {
    return this.tasksService.syncAll(req.user.userId);
  }

  // ─── Milestones (static paths — must be before :id) ────────────────────────

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

  // ─── Comments (static path — must be before :id) ──────────────────────────

  @Delete('comments/:commentId')
  async deleteComment(@Param('commentId') commentId: string, @Request() req: any) {
    return this.tasksService.deleteComment(commentId, req.user.userId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Parameterized :id routes below — these match ANY /tasks/:id pattern
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Task CRUD ─────────────────────────────────────────────────────────────

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

  // ─── Responsibility ───────────────────────────────────────────────────────

  @Patch(':id/accept')
  async accept(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.accept(id, req.user.userId);
  }

  @Patch(':id/complete')
  async complete(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.complete(id, req.user.userId);
  }

  // ─── Transfer (per-task) ──────────────────────────────────────────────────

  @Patch(':id/transfer')
  async initiateTransfer(
    @Param('id') id: string,
    @Body() body: { newOwnerId: string; note?: string },
    @Request() req: any,
  ) {
    return this.tasksService.transfer(id, req.user.userId, body.newOwnerId, body.note);
  }

  @Get(':id/transfers')
  async getTaskTransfers(@Param('id') id: string) {
    return this.tasksService.getTaskTransfers(id);
  }

  // ─── Sync (per-task) ──────────────────────────────────────────────────────

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

  @Patch(':id/sync-participant')
  async syncParticipant(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.syncParticipant(id, req.user.userId);
  }

  // ─── Participants ─────────────────────────────────────────────────────────

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

  // ─── Milestones (per-task) ────────────────────────────────────────────────

  @Post(':id/milestones')
  async addMilestone(
    @Param('id') id: string,
    @Body() body: { title: string; dueDate?: string },
    @Request() req: any,
  ) {
    return this.tasksService.addMilestone(id, body.title, req.user.userId, body.dueDate);
  }

  // ─── Time Logs ────────────────────────────────────────────────────────────

  @Post(':id/time-logs')
  async logTime(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.tasksService.logTime(id, req.user.userId, body.durationMinutes, body.description);
  }

  // ─── Comments (per-task) ──────────────────────────────────────────────────

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

  // ─── Misc ─────────────────────────────────────────────────────────────────

  @Post(':id/nudge')
  async nudge(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.nudge(id, req.user.userId);
  }
}
