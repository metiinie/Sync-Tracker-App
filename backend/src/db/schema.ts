import { pgTable, uuid, text, timestamp, pgEnum, foreignKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', ['contributor', 'helper', 'reviewer', 'observer']);
export const taskStatusEnum = pgEnum('task_status', ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED']);
export const syncStateEnum = pgEnum('sync_state', ['IN_SYNC', 'NEEDS_UPDATE', 'BLOCKED', 'HELP_REQUESTED']);

export const users = pgTable('users', {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').unique().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
    tasksAssigned: many(tasks, { relationName: 'assignedBy' }),
    tasksResponsible: many(tasks, { relationName: 'responsibleOwner' }),
    participations: many(taskParticipants),
}));

export const tasks = pgTable('tasks', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    assignedBy: uuid('assigned_by').references(() => users.id).notNull(),
    responsibleOwner: uuid('responsible_owner').references(() => users.id).notNull(),
    status: taskStatusEnum('status').default('PENDING').notNull(),
    syncState: syncStateEnum('sync_state').default('IN_SYNC').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tasksRelations = relations(tasks, ({ one, many }) => ({
    assigner: one(users, {
        fields: [tasks.assignedBy],
        references: [users.id],
        relationName: 'assignedBy',
    }),
    owner: one(users, {
        fields: [tasks.responsibleOwner],
        references: [users.id],
        relationName: 'responsibleOwner',
    }),
    participants: many(taskParticipants),
    logs: many(syncLogs),
}));

export const taskParticipants = pgTable('task_participants', {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').references(() => tasks.id).notNull(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    role: userRoleEnum('role').default('contributor').notNull(),
    syncState: syncStateEnum('sync_state').default('IN_SYNC').notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    lastUpdatedAt: timestamp('last_updated_at').defaultNow().notNull(),
});

export const taskParticipantsRelations = relations(taskParticipants, ({ one }) => ({
    task: one(tasks, {
        fields: [taskParticipants.taskId],
        references: [tasks.id],
    }),
    user: one(users, {
        fields: [taskParticipants.userId],
        references: [users.id],
    }),
}));

export const syncLogs = pgTable('sync_logs', {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').references(() => tasks.id).notNull(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    action: text('action').notNull(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const syncLogsRelations = relations(syncLogs, ({ one }) => ({
    task: one(tasks, {
        fields: [syncLogs.taskId],
        references: [tasks.id],
    }),
    user: one(users, {
        fields: [syncLogs.userId],
        references: [users.id],
    }),
}));
