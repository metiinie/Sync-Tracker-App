"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema = __importStar(require("./schema"));
const crypto_1 = require("crypto");
const DATABASE_URL = 'postgresql://neondb_owner:npg_m60etzgfAHXR@ep-plain-fog-aithzseg-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=verify-full';
async function seed() {
    console.log('🌱 Seeding database...');
    const pool = new pg_1.Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
    const db = (0, node_postgres_1.drizzle)(pool, { schema });
    try {
        console.log('Creating users...');
        const ownerId = (0, crypto_1.randomUUID)();
        const user1Id = (0, crypto_1.randomUUID)();
        const user2Id = (0, crypto_1.randomUUID)();
        const user3Id = (0, crypto_1.randomUUID)();
        await db.insert(schema.users).values([
            {
                id: ownerId,
                name: 'Workspace Owner',
                email: 'owner@tracker.com',
            },
            {
                id: user1Id,
                name: 'John Contributor',
                email: 'john@tracker.com',
            },
            {
                id: user2Id,
                name: 'Sarah Helper',
                email: 'sarah@tracker.com',
            },
            {
                id: user3Id,
                name: 'Mike Reviewer',
                email: 'mike@tracker.com',
            },
        ]);
        console.log('Creating workspace settings...');
        await db.insert(schema.workspaceSettings).values({
            staleThresholdHours: '48',
            allowResponsibilityTransfer: true,
            enableHelperRole: true,
        });
        console.log('Creating tasks...');
        const task1Id = (0, crypto_1.randomUUID)();
        const task2Id = (0, crypto_1.randomUUID)();
        const task3Id = (0, crypto_1.randomUUID)();
        await db.insert(schema.tasks).values([
            {
                id: task1Id,
                title: 'Implement Core API',
                description: 'Build the foundational REST endpoints for the sync tracker.',
                assignedBy: ownerId,
                responsibleOwner: user1Id,
                status: 'ACTIVE',
                syncState: 'IN_SYNC',
            },
            {
                id: task2Id,
                title: 'Design Mobile UI',
                description: 'Create high-fidelity mockups for the task dashboard.',
                assignedBy: ownerId,
                responsibleOwner: user2Id,
                status: 'ACTIVE',
                syncState: 'BLOCKED',
            },
            {
                id: task3Id,
                title: 'Setup Database Migrations',
                description: 'Configure Drizzle and Neon for automated schema updates.',
                assignedBy: ownerId,
                responsibleOwner: user3Id,
                status: 'COMPLETED',
                syncState: 'IN_SYNC',
            },
        ]);
        console.log('Adding participants...');
        await db.insert(schema.taskParticipants).values([
            {
                taskId: task1Id,
                userId: user2Id,
                role: 'helper',
                syncState: 'IN_SYNC',
            },
            {
                taskId: task1Id,
                userId: user3Id,
                role: 'reviewer',
                syncState: 'IN_SYNC',
            },
            {
                taskId: task2Id,
                userId: user1Id,
                role: 'contributor',
                syncState: 'NEEDS_UPDATE',
            },
        ]);
        console.log('Adding milestones...');
        await db.insert(schema.milestones).values([
            {
                taskId: task1Id,
                title: 'Auth Endpoints Done',
                isCompleted: 'true',
            },
            {
                taskId: task1Id,
                title: 'Task Endpoints Done',
                isCompleted: 'false',
            },
            {
                taskId: task2Id,
                title: 'Color Palette Decided',
                isCompleted: 'true',
            },
        ]);
        console.log('Adding time logs...');
        await db.insert(schema.timeLogs).values([
            {
                taskId: task1Id,
                userId: user1Id,
                durationMinutes: '120',
                description: 'Integrated JWT authentication.',
            },
            {
                taskId: task3Id,
                userId: user3Id,
                durationMinutes: '45',
                description: 'Verified migration scripts.',
            },
        ]);
        console.log('Adding sync logs...');
        await db.insert(schema.syncLogs).values([
            {
                taskId: task1Id,
                userId: user1Id,
                action: 'Status updated to ACTIVE',
            },
            {
                taskId: task2Id,
                userId: user2Id,
                action: 'Sync state changed to BLOCKED (Waiting for UX assets)',
            },
        ]);
        console.log('Adding notifications...');
        await db.insert(schema.notifications).values([
            {
                userId: user1Id,
                taskId: task1Id,
                type: 'ASSIGNED',
                content: 'You have been assigned to: Implement Core API',
            },
            {
                userId: user2Id,
                taskId: task2Id,
                type: 'HELP_REQUESTED',
                content: 'Help requested on: Design Mobile UI',
            },
        ]);
        console.log('✅ Seeding completed successfully!');
    }
    catch (error) {
        console.error('❌ Seeding failed:', error);
    }
    finally {
        await pool.end();
    }
}
seed();
//# sourceMappingURL=seed.js.map