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
      body.priority,
    );
  }

  @Patch(':id/accept')
  async accept(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.accept(id, req.user.userId);
  }

  @Patch(':id/sync')
  async updateSync(
    @Param('id') id: string,
    @Body() body: { syncState: any; note?: string },
    @Request() req: any,
  ) {
    return this.tasksService.updateSyncState(id, req.user.userId, body.syncState, body.note);
  }

  // ─── Transfer Flow (3-step) ─────────────────────────────────────────────────
  @Patch(':id/transfer')
  async initiateTransfer(
    @Param('id') id: string,
    @Body() body: { newOwnerId: string; note?: string },
    @Request() req: any,
  ) {
    return this.tasksService.transfer(id, req.user.userId, body.newOwnerId, body.note);
  }

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
  // ───────────────────────────────────────────────────────────────────────────

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

  @Delete(':id/participants/:userId')
  async removeParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    return this.tasksService.removeParticipant(id, userId, req.user.userId);
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

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.tasksService.update(id, req.user.userId, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.delete(id, req.user.userId);
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
  // ───────────────────────────────────────────────────────────────────────────

  @Post(':id/nudge')
  async nudge(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.nudge(id, req.user.userId);
  }

  @Patch(':id/complete')
  async complete(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.complete(id, req.user.userId);
  }
}

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
      body.priority,
    );
  }

  @Patch(':id/accept')
  async accept(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.accept(id, req.user.userId);
  }

  @Patch(':id/sync')
  async updateSync(
    @Param('id') id: string,
    @Body() body: { syncState: any; note?: string },
    @Request() req: any,
  ) {
    return this.tasksService.updateSyncState(id, req.user.userId, body.syncState, body.note);
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

  @Delete(':id/participants/:userId')
  async removeParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    return this.tasksService.removeParticipant(id, userId, req.user.userId);
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

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.tasksService.update(id, req.user.userId, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.delete(id, req.user.userId);
  }

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

  @Post(':id/nudge')
  async nudge(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.nudge(id, req.user.userId);
  }

  @Patch(':id/complete')
  async complete(@Param('id') id: string, @Request() req: any) {
    return this.tasksService.complete(id, req.user.userId);
  }
}
