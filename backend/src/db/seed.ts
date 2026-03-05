import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { randomUUID } from 'crypto';

// Connection string from .env
const DATABASE_URL =
  'postgresql://neondb_owner:npg_m60etzgfAHXR@ep-plain-fog-aithzseg-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=verify-full';

async function seed() {
  console.log('🌱 Seeding database...');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(pool, { schema });

  try {
    // 1. Seed Users
    console.log('Creating users...');
    const ownerId = randomUUID();
    const user1Id = randomUUID();
    const user2Id = randomUUID();
    const user3Id = randomUUID();

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

    // 2. Seed Workspace Settings
    console.log('Creating workspace settings...');
    await db.insert(schema.workspaceSettings).values({
      staleThresholdHours: '48',
      allowResponsibilityTransfer: true,
      enableHelperRole: true,
    });

    // 3. Seed Tasks
    console.log('Creating tasks...');
    const task1Id = randomUUID();
    const task2Id = randomUUID();
    const task3Id = randomUUID();

    await db.insert(schema.tasks).values([
      {
        id: task1Id,
        title: 'Implement Core API',
        description:
          'Build the foundational REST endpoints for the sync tracker.',
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

    // 4. Seed Task Participants
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

    // 5. Seed Milestones
    console.log('Adding milestones...');
    await db.insert(schema.milestones).values([
      {
        taskId: task1Id,
        title: 'Auth Endpoints Done',
        isCompleted: true,
      },
      {
        taskId: task1Id,
        title: 'Task Endpoints Done',
        isCompleted: false,
      },
      {
        taskId: task2Id,
        title: 'Color Palette Decided',
        isCompleted: true,
      },
    ]);

    // 6. Seed Time Logs
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

    // 7. Seed Sync Logs
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

    // 8. Seed Notifications
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
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await pool.end();
  }
}

seed();
