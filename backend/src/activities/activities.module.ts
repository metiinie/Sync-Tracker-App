import { Module } from '@nestjs/common';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { DbModule } from '../db/db.module';

@Module({
    imports: [DbModule],
    controllers: [ActivitiesController],
    providers: [ActivitiesService],
    exports: [ActivitiesService]
})
export class ActivitiesModule { }
