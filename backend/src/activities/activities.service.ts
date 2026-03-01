import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../db/db.module';
import * as schema from '../db/schema';
import { eq, or, desc, and, ne, sql } from 'drizzle-orm';

@Injectable()
export class ActivitiesService {
    constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) { }

    async getActivities(userId: string, scope: 'my_tasks' | 'delegated') {
        // Determine the tasks in scope
        let taskIdsQuery;

        if (scope === 'my_tasks') {
            const owned = await this.db.query.tasks.findMany({
                where: eq(schema.tasks.responsibleOwner, userId),
                columns: { id: true }
            });
            const assigned = await this.db.query.tasks.findMany({
                where: and(eq(schema.tasks.assignedBy, userId), ne(schema.tasks.responsibleOwner, userId)),
                columns: { id: true }
            });
            const participated = await this.db.query.taskParticipants.findMany({
                where: eq(schema.taskParticipants.userId, userId),
                columns: { taskId: true }
            });

            const ids = [...owned.map(t => t.id), ...assigned.map(t => t.id), ...participated.map(p => p.taskId)];
            taskIdsQuery = [...new Set(ids)];
        } else {
            // delegated by me
            const delegated = await this.db.query.tasks.findMany({
                where: and(
                    eq(schema.tasks.assignedBy, userId),
                    ne(schema.tasks.responsibleOwner, userId)
                ),
                columns: { id: true }
            });
            taskIdsQuery = delegated.map(t => t.id);
        }

        if (taskIdsQuery.length === 0) return [];

        // Query syncLogs, along with tasks and users
        // drizzle doesn't easily support 'in' for empty arrays so we checked above
        const stmt = sql`${schema.syncLogs.taskId} IN ${taskIdsQuery}`;

        const logs = await this.db.query.syncLogs.findMany({
            where: (logs, { sql }) => sql`${logs.taskId} = ANY(${taskIdsQuery})`,
            with: {
                task: {
                    with: {
                        participants: true
                    }
                },
                user: true,
            },
            orderBy: [desc(schema.syncLogs.timestamp)],
            limit: 100,
        });

        return logs.map(log => {
            // Determine Event Type based on action string
            let type = 'ALL';
            let stateBadge = 'IN_SYNC';

            const actionLower = log.action.toLowerCase();

            if (actionLower.includes('blocked')) {
                type = 'Blocked';
                stateBadge = 'BLOCKED';
            } else if (actionLower.includes('help requested') || actionLower.includes('help')) {
                type = 'Help Requested';
                stateBadge = 'HELP_REQUESTED';
            } else if (actionLower.includes('transfer')) {
                type = 'Transfers';
                stateBadge = 'PENDING_TRANSFER'; // custom badge
            } else if (actionLower.includes('milestone')) {
                type = 'Milestones';
                stateBadge = 'MILESTONE'; // custom
            } else if (actionLower.includes('logged') || actionLower.includes('mins')) {
                type = 'Time Logged';
                stateBadge = 'TIME'; // custom
            } else if (actionLower.includes('accepted')) {
                type = 'Responsibility Accepted';
                stateBadge = 'ACTIVE';
            } else if (actionLower.includes('sync state updated to')) {
                type = 'Sync Updates';
                if (log.action.includes('NEEDS_UPDATE')) stateBadge = 'NEEDS_UPDATE';
                if (log.action.includes('IN_SYNC')) stateBadge = 'IN_SYNC';
            } else {
                type = 'Sync Updates';
            }

            // determine role
            let role = 'Observer';
            if (log.task) {
                if (log.task.responsibleOwner === userId) role = 'Responsible';
                else if (log.task.assignedBy === userId) role = 'Assigner';
                else {
                    const participant = log.task.participants.find(p => p.userId === userId);
                    if (participant) {
                        role = participant.role.charAt(0).toUpperCase() + participant.role.slice(1);
                    }
                }
            }

            return {
                id: log.id,
                taskId: log.taskId,
                actorName: log.user.name,
                actionRaw: log.action,
                taskTitle: log.task ? log.task.title : 'Deleted Task',
                taskState: log.task ? log.task.syncState : 'UNKNOWN',
                timestamp: log.timestamp,
                type,
                stateBadge,
                userRole: role
            };
        });
    }
}
