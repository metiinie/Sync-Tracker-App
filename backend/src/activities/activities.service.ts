import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../db/db.module';
import * as schema from '../db/schema';
import { eq, or, desc, and, ne, sql, ilike } from 'drizzle-orm';

@Injectable()
export class ActivitiesService {
    constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) { }

    async getActivities(userId: string, scope: 'my_tasks' | 'delegated' | 'all' | 'workspace', limit = 200, search?: string) {
        // Determine the tasks in scope
        let taskIdsQuery: string[] | null = [];

        if (scope === 'my_tasks') {
            const owned = await this.db.query.tasks.findMany({
                where: eq(schema.tasks.responsibleOwner, userId),
                columns: { id: true }
            });
            const participated = await this.db.query.taskParticipants.findMany({
                where: eq(schema.taskParticipants.userId, userId),
                columns: { taskId: true }
            });

            const ids = [...owned.map(t => t.id), ...participated.map(p => p.taskId)];
            taskIdsQuery = [...new Set(ids)];
        } else if (scope === 'delegated') {
            const delegated = await this.db.query.tasks.findMany({
                where: eq(schema.tasks.assignedBy, userId),
                columns: { id: true }
            });
            taskIdsQuery = delegated.map(t => t.id);
        } else if (scope === 'all') {
            const owned = await this.db.query.tasks.findMany({
                where: or(
                    eq(schema.tasks.responsibleOwner, userId),
                    eq(schema.tasks.assignedBy, userId)
                ),
                columns: { id: true }
            });
            const participated = await this.db.query.taskParticipants.findMany({
                where: eq(schema.taskParticipants.userId, userId),
                columns: { taskId: true }
            });
            const ids = [...owned.map(t => t.id), ...participated.map(p => p.taskId)];
            taskIdsQuery = [...new Set(ids)];
        } else {
            // scope === 'workspace' - show everything
            taskIdsQuery = null;
        }

        if (taskIdsQuery !== null && taskIdsQuery.length === 0) return [];

        const logs = await this.db.query.syncLogs.findMany({
            where: (l, { and, sql }) => {
                const conditions: any[] = [];
                if (taskIdsQuery) {
                    conditions.push(sql`${l.taskId} = ANY(${taskIdsQuery})`);
                }
                if (search) {
                    conditions.push(ilike(l.action, `%${search}%`));
                }
                return conditions.length > 0 ? and(...conditions) : undefined;
            },
            with: {
                task: {
                    with: {
                        participants: true,
                        owner: true,
                        assigner: true,
                    }
                },
                user: true,
            },
            orderBy: [desc(schema.syncLogs.timestamp)],
            limit: limit,
        });

        return logs.map(log => {
            // Determine Event Type based on action string
            let type = 'Sync Updates';
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
                stateBadge = 'PENDING';
            } else if (actionLower.includes('milestone')) {
                type = 'Milestones';
                stateBadge = 'MILESTONE';
            } else if (actionLower.includes('logged') || actionLower.includes('mins')) {
                type = 'Time Logged';
                stateBadge = 'TIME';
            } else if (actionLower.includes('accepted')) {
                type = 'Responsibility Accepted';
                stateBadge = 'ACTIVE';
            } else if (actionLower.includes('comment')) {
                type = 'Communication';
                stateBadge = 'COMMENT';
            } else if (actionLower.includes('nudge')) {
                type = 'Communication';
                stateBadge = 'NUDGE';
            } else if (actionLower.includes('added') || actionLower.includes('removed') || actionLower.includes('participant')) {
                type = 'Team';
                stateBadge = 'PARTICIPANT';
            } else if (actionLower.includes('created')) {
                type = 'Sync Updates';
                stateBadge = 'PENDING';
            }

            // Sync state badge fallback to current task state if it's a general sync update
            if (type === 'Sync Updates' && log.task) {
                stateBadge = log.task.syncState;
            }

            // determine your role in this task
            let role = 'Contributor';
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

            // Extract detail from action string (anything after a colon)
            let detail = '';
            if (log.action.includes(':')) {
                detail = log.action.split(':').slice(1).join(':').trim();
            } else if (log.action.toLowerCase().includes('milestone')) {
                // fallback for milestone added if not colon-formatted (though it usually is)
                const parts = log.action.split(' ');
                if (parts.length > 2) detail = parts.slice(2).join(' ');
            }

            return {
                id: log.id,
                taskId: log.taskId,
                actorId: log.userId,
                actorName: log.user.name,
                action: log.action,
                detail,
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
