import {
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
    UseGuards,
    Req,
    Param,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DRIZZLE } from '../db/db.module';
import { Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
    constructor(
        private readonly cloudinaryService: CloudinaryService,
        @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    ) { }

    @Post('avatar')
    @UseInterceptors(FileInterceptor('file'))
    async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        const result = await this.cloudinaryService.uploadFile(file);
        if ('url' in result) {
            await this.db
                .update(schema.users)
                .set({ avatarUrl: result.secure_url })
                .where(eq(schema.users.id, req.user.userId));
            return { url: result.secure_url };
        }
        throw new BadRequestException('Upload failed');
    }

    @Post('task-attachment/:taskId')
    @UseInterceptors(FileInterceptor('file'))
    async uploadTaskAttachment(
        @Param('taskId') taskId: string,
        @UploadedFile() file: Express.Multer.File,
        @Req() req,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        const result = await this.cloudinaryService.uploadFile(file);
        if ('url' in result) {
            const [attachment] = await this.db
                .insert(schema.taskAttachments)
                .values({
                    taskId,
                    userId: req.user.userId,
                    url: result.secure_url,
                    fileName: file.originalname,
                    fileType: file.mimetype.split('/')[0],
                })
                .returning();
            return attachment;
        }
        throw new BadRequestException('Upload failed');
    }
}
