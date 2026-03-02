import { Controller, Get, UseGuards } from '@nestjs/common';
import { WorkspaceSettingsService } from './workspace.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('workspace')
@UseGuards(JwtAuthGuard)
export class WorkspaceSettingsController {
    constructor(private readonly workspaceService: WorkspaceSettingsService) { }

    @Get('settings')
    async getSettings() {
        return this.workspaceService.getSettings();
    }
}
