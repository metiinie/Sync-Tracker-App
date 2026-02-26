import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('dashboard')
    async getDashboardData() {
        const [metrics, highRiskTasks, transferAlerts, activityPulse] = await Promise.all([
            this.adminService.getGlobalMetrics(),
            this.adminService.getHighRiskTasks(),
            this.adminService.getTransferAlerts(),
            this.adminService.getActivityPulse(),
        ]);

        return {
            metrics,
            highRiskTasks,
            transferAlerts,
            activityPulse,
        };
    }

    @Get('tasks')
    async getAllTasks(@Query() query: any) {
        return await this.adminService.findAllTasks(query);
    }

    @Post('tasks/:id/force-close')
    async forceClose(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
        return await this.adminService.forceCloseTask(id, reason, req.user.userId);
    }

    @Post('tasks/:id/freeze')
    async freeze(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
        return await this.adminService.freezeTask(id, reason, req.user.userId);
    }

    @Post('tasks/:id/reopen')
    async reopen(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
        return await this.adminService.reopenTask(id, reason, req.user.userId);
    }

    @Delete('tasks/:id/participants/:userId')
    async removeParticipant(
        @Param('id') taskId: string,
        @Param('userId') userId: string,
        @Body('reason') reason: string,
        @Request() req: any
    ) {
        return await this.adminService.removeParticipant(taskId, userId, reason, req.user.userId);
    }

    @Get('users')
    async getAllUsers() {
        return await this.adminService.findAllUsers();
    }

    @Get('users/:id')
    async getUserDetails(@Param('id') id: string) {
        return await this.adminService.getUserDetails(id);
    }

    @Post('users/:id/role')
    async updateRole(@Param('id') id: string, @Body('role') role: 'ADMIN' | 'USER', @Body('reason') reason: string, @Request() req: any) {
        return await this.adminService.updateUserRole(id, role, reason, req.user.userId);
    }

    @Post('users/:id/suspend')
    async suspend(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
        return await this.adminService.suspendUser(id, reason, req.user.userId);
    }

    @Post('users/:id/reactivate')
    async reactivate(@Param('id') id: string, @Body('reason') reason: string, @Request() req: any) {
        return await this.adminService.reactivateUser(id, reason, req.user.userId);
    }

    @Get('settings')
    async getSettings() {
        return await this.adminService.getSettings();
    }

    @Patch('settings')
    async updateSettings(@Body() data: any) {
        return await this.adminService.updateSettings(data);
    }

    @Get('audit-logs')
    async getAuditLogs(
        @Query('userId') userId?: string,
        @Query('taskId') taskId?: string,
        @Query('action') action?: string,
        @Query('limit') limit?: number
    ) {
        return await this.adminService.getGlobalAuditLogs({ userId, taskId, action, limit: Number(limit) || 100 });
    }

    @Get('snapshot')
    async getSnapshot() {
        return await this.adminService.getSystemSnapshot();
    }
}
