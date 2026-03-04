import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';
import { DbModule } from '../db/db.module';

@Module({
    imports: [CloudinaryModule, DbModule],
    controllers: [UploadController],
})
export class UploadModule { }
