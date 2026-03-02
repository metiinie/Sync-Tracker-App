import { Injectable, Inject } from '@nestjs/common';
import * as schema from '../db/schema';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../db/db.module';

@Injectable()
export class WorkspaceSettingsService {
    constructor(
        @Inject(DRIZZLE)
        private readonly db: NodePgDatabase<typeof schema>,
    ) { }

    async getSettings() {
        const settings = await this.db.query.workspaceSettings.findFirst();

        // Fallback if no settings exist (should be seeded)
        if (!settings) {
            return {
                staleThresholdHours: '24',
                allowResponsibilityTransfer: true,
                enableHelperRole: true,
            };
        }

        return settings;
    }
}
