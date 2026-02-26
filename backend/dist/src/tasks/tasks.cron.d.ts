import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { SyncGateway } from '../sync/sync.gateway';
export declare class TasksCron {
    private db;
    private syncGateway;
    private readonly logger;
    constructor(db: NodePgDatabase<typeof schema>, syncGateway: SyncGateway);
    handleSyncDecay(): Promise<void>;
}
