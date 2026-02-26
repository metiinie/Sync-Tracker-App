import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TasksCron } from './tasks.cron';

@Module({
    providers: [TasksService, TasksCron],
    controllers: [TasksController],
    exports: [TasksService],
})
export class TasksModule { }
