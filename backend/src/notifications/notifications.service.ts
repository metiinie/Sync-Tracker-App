import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { SyncGateway } from '../sync/sync.gateway';

@Injectable()
export class NotificationsService {
    constructor(
        @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
        private syncGateway: SyncGateway,
    ) { }

    async create(userId: string, taskId: string | null, type: string, content: string) {
        const [notification] = await this.db.insert(schema.notifications).values({
            userId,
            taskId,
            type,
            content,
            isRead: 'false',
        }).returning();

        // Emit realtime notification to the specific user
        this.syncGateway.server.to(`user:${userId}`).emit('notification:new', notification);

        return notification;
    }

    async findAllForUser(userId: string) {
        return this.db.query.notifications.findMany({
            where: eq(schema.notifications.userId, userId),
            orderBy: [desc(schema.notifications.createdAt)],
            with: {
                task: true,
            },
            limit: 50,
        });
    }

    async markAsRead(notificationId: string, userId: string) {
        const [notification] = await this.db.update(schema.notifications)
            .set({ isRead: 'true' })
            .where(eq(schema.notifications.id, notificationId))
            .returning();

        return notification;
    }
}
