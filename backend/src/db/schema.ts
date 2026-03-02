import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  foreignKey,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const userRoleEnum = pgEnum('user_role', [
  'contributor',
  'helper',
  'reviewer',
  'observer',
]);
export const taskStatusEnum = pgEnum('task_status', [
  'PENDING',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'FROZEN',
]);
export const taskPriorityEnum = pgEnum('task_priority', [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
]);
export const syncStateEnum = pgEnum('sync_state', [
  'IN_SYNC',
  'NEEDS_UPDATE',
  'BLOCKED',
  'HELP_REQUESTED',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  isSuspended: boolean('is_suspended').default(false).notNull(),
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
  assignedBy: uuid('assigned_by')
    .references(() => users.id)
    .notNull(),
  responsibleOwner: uuid('responsible_owner')
    .references(() => users.id)
    .notNull(),
  status: taskStatusEnum('status').default('PENDING').notNull(),
  priority: taskPriorityEnum('priority').default('MEDIUM').notNull(),
  syncState: syncStateEnum('sync_state').default('IN_SYNC').notNull(),
  lastUpdatedAt: timestamp('last_updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
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
  syncLogs: many(syncLogs),
  milestones: many(milestones),
  timeLogs: many(timeLogs),
  comments: many(taskComments),
}));

export const taskParticipants = pgTable('task_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .references(() => tasks.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  role: userRoleEnum('role').default('contributor').notNull(),
  syncState: syncStateEnum('sync_state').default('IN_SYNC').notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  lastUpdatedAt: timestamp('last_updated_at').defaultNow().notNull(),
});

export const taskParticipantsRelations = relations(
  taskParticipants,
  ({ one }) => ({
    task: one(tasks, {
      fields: [taskParticipants.taskId],
      references: [tasks.id],
    }),
    user: one(users, {
      fields: [taskParticipants.userId],
      references: [users.id],
    }),
  }),
);

export const syncLogs = pgTable('sync_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => tasks.id),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  action: text('action').notNull(),
  metadata: jsonb('metadata'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => ({
  taskIdx: index('sync_logs_task_idx').on(table.taskId),
  userIdx: index('sync_logs_user_idx').on(table.userId),
  timeIdx: index('sync_logs_time_idx').on(table.timestamp),
}));

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

export const milestones = pgTable('milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .references(() => tasks.id)
    .notNull(),
  title: text('title').notNull(),
  isCompleted: text('is_completed').default('false').notNull(),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const milestonesRelations = relations(milestones, ({ one }) => ({
  task: one(tasks, {
    fields: [milestones.taskId],
    references: [tasks.id],
  }),
}));

export const timeLogs = pgTable('time_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .references(() => tasks.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  durationMinutes: text('duration_minutes').notNull(),
  description: text('description'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const timeLogsRelations = relations(timeLogs, ({ one }) => ({
  task: one(tasks, {
    fields: [timeLogs.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [timeLogs.userId],
    references: [users.id],
  }),
}));

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  taskId: uuid('task_id').references(() => tasks.id),
  activityId: uuid('activity_id').references(() => syncLogs.id),
  type: text('type').notNull(), // ASSIGNED, PARTICIPANT_ADDED, HELP_REQUESTED, TRANSFER_INITIATED, MILESTONE_COMPLETED
  content: text('content').notNull(),
  isRead: text('is_read').default('false').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('notifications_user_idx').on(table.userId),
  createdIdx: index('notifications_created_idx').on(table.createdAt),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [notifications.taskId],
    references: [tasks.id],
  }),
  activity: one(syncLogs, {
    fields: [notifications.activityId],
    references: [syncLogs.id],
  }),
}));

export const workspaceSettings = pgTable('workspace_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  staleThresholdHours: text('stale_threshold_hours').default('24').notNull(),
  allowResponsibilityTransfer: boolean('allow_responsibility_transfer')
    .default(true)
    .notNull(),
  enableHelperRole: boolean('enable_helper_role').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const taskComments = pgTable('task_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id')
    .references(() => tasks.id)
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskComments.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskComments.userId],
    references: [users.id],
  }),
}));

export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id),
  theme: text('theme').default('light').notNull(),
  inAppNotif: boolean('in_app_notif').default(true).notNull(),
  emailDigest: boolean('email_digest').default(false).notNull(),
  realTimeSync: boolean('real_time_sync').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

