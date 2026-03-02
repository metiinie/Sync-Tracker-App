import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class UserSettingsService {
    constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) { }

    async getSettings(userId: string) {
        let settings = await this.db.query.userSettings.findFirst({
            where: eq(schema.userSettings.userId, userId),
        });

        if (!settings) {
            // Create default settings if they don't exist
            const [newSettings] = await this.db
                .insert(schema.userSettings)
                .values({
                    userId,
                    theme: 'light',
                    inAppNotif: true,
                    emailDigest: false,
                    realTimeSync: true,
                })
                .returning();
            settings = newSettings;
        }

        return settings;
    }

    async updateSettings(userId: string, data: Partial<typeof schema.userSettings.$inferInsert>) {
        const [updated] = await this.db
            .update(schema.userSettings)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(schema.userSettings.userId, userId))
            .returning();

        if (!updated) {
            // Fallback create if somehow missing
            const [newSettings] = await this.db
                .insert(schema.userSettings)
                .values({
                    userId,
                    theme: data.theme || 'light',
                    inAppNotif: data.inAppNotif ?? true,
                    emailDigest: data.emailDigest ?? false,
                    realTimeSync: data.realTimeSync ?? true,
                })
                .returning();
            return newSettings;
        }

        return updated;
    }
}
