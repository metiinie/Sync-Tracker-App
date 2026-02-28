import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { DbModule } from '../db/db.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [DbModule, SyncModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
