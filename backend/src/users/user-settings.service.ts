import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class UserSettingsService {
    constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) { }

    async getSettings(userId: string) {
        try {
            console.log(`[UserSettingsService] Querying settings for userId: ${userId}`);
            let settings = await this.db.query.userSettings.findFirst({
                where: eq(schema.userSettings.userId, userId),
            });

            if (!settings) {
                console.log(`[UserSettingsService] No settings found for userId: ${userId}, creating defaults...`);
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
                console.log(`[UserSettingsService] Successfully created settings for userId: ${userId}`);
                settings = newSettings;
            } else {
                console.log(`[UserSettingsService] Found existing settings for userId: ${userId}`);
            }

            return settings;
        } catch (error) {
            console.error(`[UserSettingsService] Critical error in getSettings for userId: ${userId}:`, error);
            throw error;
        }
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
