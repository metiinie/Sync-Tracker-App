import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserSettingsService } from './user-settings.service';
import { UsersController } from './users.controller';
import { DbModule } from '../db/db.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [DbModule, TasksModule],
  controllers: [UsersController],
  providers: [UsersService, UserSettingsService],
  exports: [UsersService, UserSettingsService],
})
export class UsersModule { }
