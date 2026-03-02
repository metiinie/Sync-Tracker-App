import { Module } from '@nestjs/common';
import { WorkspaceSettingsService } from './workspace.service';
import { WorkspaceSettingsController } from './workspace.controller';
import { DbModule } from '../db/db.module';

@Module({
    imports: [DbModule],
    controllers: [WorkspaceSettingsController],
    providers: [WorkspaceSettingsService],
    exports: [WorkspaceSettingsService],
})
export class WorkspaceSettingsModule { }
