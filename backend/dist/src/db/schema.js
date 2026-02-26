"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRelations = exports.notifications = exports.timeLogsRelations = exports.timeLogs = exports.milestonesRelations = exports.milestones = exports.syncLogsRelations = exports.syncLogs = exports.taskParticipantsRelations = exports.taskParticipants = exports.tasksRelations = exports.tasks = exports.usersRelations = exports.users = exports.syncStateEnum = exports.taskStatusEnum = exports.systemRoleEnum = exports.userRoleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
exports.userRoleEnum = (0, pg_core_1.pgEnum)('user_role', ['contributor', 'helper', 'reviewer', 'observer']);
exports.systemRoleEnum = (0, pg_core_1.pgEnum)('system_role', ['ADMIN', 'USER']);
exports.taskStatusEnum = (0, pg_core_1.pgEnum)('task_status', ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'FROZEN']);
exports.syncStateEnum = (0, pg_core_1.pgEnum)('sync_state', ['IN_SYNC', 'NEEDS_UPDATE', 'BLOCKED', 'HELP_REQUESTED']);
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').primaryKey(),
    name: (0, pg_core_1.text)('name').notNull(),
    email: (0, pg_core_1.text)('email').unique().notNull(),
    systemRole: (0, exports.systemRoleEnum)('system_role').default('USER').notNull(),
    isSuspended: (0, pg_core_1.boolean)('is_suspended').default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ many }) => ({
    tasksAssigned: many(exports.tasks, { relationName: 'assignedBy' }),
    tasksResponsible: many(exports.tasks, { relationName: 'responsibleOwner' }),
    participations: many(exports.taskParticipants),
}));
exports.tasks = (0, pg_core_1.pgTable)('tasks', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description'),
    assignedBy: (0, pg_core_1.uuid)('assigned_by').references(() => exports.users.id).notNull(),
    responsibleOwner: (0, pg_core_1.uuid)('responsible_owner').references(() => exports.users.id).notNull(),
    status: (0, exports.taskStatusEnum)('status').default('PENDING').notNull(),
    syncState: (0, exports.syncStateEnum)('sync_state').default('IN_SYNC').notNull(),
    lastUpdatedAt: (0, pg_core_1.timestamp)('last_updated_at').defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.tasksRelations = (0, drizzle_orm_1.relations)(exports.tasks, ({ one, many }) => ({
    assigner: one(exports.users, {
        fields: [exports.tasks.assignedBy],
        references: [exports.users.id],
        relationName: 'assignedBy',
    }),
    owner: one(exports.users, {
        fields: [exports.tasks.responsibleOwner],
        references: [exports.users.id],
        relationName: 'responsibleOwner',
    }),
    participants: many(exports.taskParticipants),
    logs: many(exports.syncLogs),
    milestones: many(exports.milestones),
    timeLogs: many(exports.timeLogs),
}));
exports.taskParticipants = (0, pg_core_1.pgTable)('task_participants', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    taskId: (0, pg_core_1.uuid)('task_id').references(() => exports.tasks.id).notNull(),
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id).notNull(),
    role: (0, exports.userRoleEnum)('role').default('contributor').notNull(),
    syncState: (0, exports.syncStateEnum)('sync_state').default('IN_SYNC').notNull(),
    joinedAt: (0, pg_core_1.timestamp)('joined_at').defaultNow().notNull(),
    lastUpdatedAt: (0, pg_core_1.timestamp)('last_updated_at').defaultNow().notNull(),
});
exports.taskParticipantsRelations = (0, drizzle_orm_1.relations)(exports.taskParticipants, ({ one }) => ({
    task: one(exports.tasks, {
        fields: [exports.taskParticipants.taskId],
        references: [exports.tasks.id],
    }),
    user: one(exports.users, {
        fields: [exports.taskParticipants.userId],
        references: [exports.users.id],
    }),
}));
exports.syncLogs = (0, pg_core_1.pgTable)('sync_logs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    taskId: (0, pg_core_1.uuid)('task_id').references(() => exports.tasks.id),
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id).notNull(),
    action: (0, pg_core_1.text)('action').notNull(),
    timestamp: (0, pg_core_1.timestamp)('timestamp').defaultNow().notNull(),
});
exports.syncLogsRelations = (0, drizzle_orm_1.relations)(exports.syncLogs, ({ one }) => ({
    task: one(exports.tasks, {
        fields: [exports.syncLogs.taskId],
        references: [exports.tasks.id],
    }),
    user: one(exports.users, {
        fields: [exports.syncLogs.userId],
        references: [exports.users.id],
    }),
}));
exports.milestones = (0, pg_core_1.pgTable)('milestones', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    taskId: (0, pg_core_1.uuid)('task_id').references(() => exports.tasks.id).notNull(),
    title: (0, pg_core_1.text)('title').notNull(),
    isCompleted: (0, pg_core_1.text)('is_completed').default('false').notNull(),
    dueDate: (0, pg_core_1.timestamp)('due_date'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.milestonesRelations = (0, drizzle_orm_1.relations)(exports.milestones, ({ one }) => ({
    task: one(exports.tasks, {
        fields: [exports.milestones.taskId],
        references: [exports.tasks.id],
    }),
}));
exports.timeLogs = (0, pg_core_1.pgTable)('time_logs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    taskId: (0, pg_core_1.uuid)('task_id').references(() => exports.tasks.id).notNull(),
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id).notNull(),
    durationMinutes: (0, pg_core_1.text)('duration_minutes').notNull(),
    description: (0, pg_core_1.text)('description'),
    timestamp: (0, pg_core_1.timestamp)('timestamp').defaultNow().notNull(),
});
exports.timeLogsRelations = (0, drizzle_orm_1.relations)(exports.timeLogs, ({ one }) => ({
    task: one(exports.tasks, {
        fields: [exports.timeLogs.taskId],
        references: [exports.tasks.id],
    }),
    user: one(exports.users, {
        fields: [exports.timeLogs.userId],
        references: [exports.users.id],
    }),
}));
exports.notifications = (0, pg_core_1.pgTable)('notifications', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id).notNull(),
    taskId: (0, pg_core_1.uuid)('task_id').references(() => exports.tasks.id),
    type: (0, pg_core_1.text)('type').notNull(),
    content: (0, pg_core_1.text)('content').notNull(),
    isRead: (0, pg_core_1.text)('is_read').default('false').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.notificationsRelations = (0, drizzle_orm_1.relations)(exports.notifications, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.notifications.userId],
        references: [exports.users.id],
    }),
    task: one(exports.tasks, {
        fields: [exports.notifications.taskId],
        references: [exports.tasks.id],
    }),
}));
//# sourceMappingURL=schema.js.map