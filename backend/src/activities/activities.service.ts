import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../db/db.module';
import * as schema from '../db/schema';
import { eq, or, desc, and, ne, sql, ilike, inArray } from 'drizzle-orm';

@Injectable()
export class ActivitiesService {
    constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) { }

    async getActivities(userId: string, scope: 'my_tasks' | 'delegated' | 'all' | 'workspace' | 'owned' | 'participated' | 'personal', limit = 200, search?: string) {
        // Determine the tasks in scope
        let taskIdsQuery: string[] | null = [];

        if (scope === 'my_tasks' || scope === 'owned') {
            // Tasks I am responsible for
            const owned = await this.db.query.tasks.findMany({
                where: eq(schema.tasks.responsibleOwner, userId),
                columns: { id: true }
            });
            taskIdsQuery = owned.map(t => t.id);
        } else if (scope === 'delegated') {
            // Tasks I assigned to OTHERS
            const delegated = await this.db.query.tasks.findMany({
                where: and(
                    eq(schema.tasks.assignedBy, userId),
                    ne(schema.tasks.responsibleOwner, userId)
                ),
                columns: { id: true }
            });
            taskIdsQuery = delegated.map(t => t.id);
        } else if (scope === 'participated') {
            // Tasks where I am a participant but NOT the owner or assigner
            const participated = await this.db.query.taskParticipants.findMany({
                where: eq(schema.taskParticipants.userId, userId),
                with: {
                    task: true
                }
            });
            taskIdsQuery = participated
                .filter(p => p.task.responsibleOwner !== userId && p.task.assignedBy !== userId)
                .map(p => p.taskId);
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
        } else if (scope === 'personal') {
            taskIdsQuery = null; // Will filter by log.userId instead
        } else {
            // scope === 'workspace' - show everything
            taskIdsQuery = null;
        }

        if (taskIdsQuery !== null && taskIdsQuery.length === 0) return [];

        const logs = await this.db.query.syncLogs.findMany({
            where: (l, { and, sql, eq }) => {
                const conditions: any[] = [];
                if (scope === 'personal') {
                    conditions.push(sql`${l.userId} = ${userId}`);
                } else if (taskIdsQuery) {
                    conditions.push(inArray(l.taskId, taskIdsQuery));
                }

                if (search) {
                    const searchPattern = `%${search}%`;
                    conditions.push(or(
                        ilike(l.action, searchPattern),
                        sql`EXISTS (SELECT 1 FROM ${schema.tasks} t WHERE t.id = ${l.taskId} AND t.title ILIKE ${searchPattern})`
                    ));
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
            const metadata = log.metadata as any;
            let type = 'Sync Updates';
            let stateBadge = 'IN_SYNC';
            let actionText = '';
            let detail = '';

            const actionLower = log.action.toLowerCase();

            // 1. Determine Type & Badge (Keep existing logic as fallback)
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

            if (type === 'Sync Updates' && log.task) {
                stateBadge = log.task.syncState;
            }

            // 2. Natural Language Action Text using Metadata
            if (metadata && metadata.type) {
                switch (metadata.type) {
                    case 'TASK_CREATED':
                        actionText = `created the track and assigned it to ${metadata.responsibleOwner === userId ? 'you' : 'someone'}`;
                        break;
                    case 'MILESTONE_ADDED':
                        actionText = `added a new milestone: ${metadata.milestoneTitle}`;
                        detail = metadata.dueDate ? `Due: ${metadata.dueDate}` : '';
                        break;
                    case 'MILESTONE_UPDATED':
                        const isToggle = metadata.data && metadata.data.isCompleted !== undefined;
                        actionText = isToggle
                            ? `${metadata.data.isCompleted ? 'completed' : 'reopened'} the milestone: ${metadata.milestoneTitle}`
                            : `updated the milestone: ${metadata.milestoneTitle}`;
                        break;
                    case 'TIME_LOGGED':
                        actionText = `logged ${metadata.durationMinutes} mins of work`;
                        detail = metadata.description;
                        break;
                    case 'TASK_ACCEPTED':
                        actionText = `accepted responsibility for the track`;
                        break;
                    case 'TASK_COMPLETED':
                        actionText = `marked the entire track as COMPLETED`;
                        break;
                    case 'NUDGE':
                        actionText = `sent a nudge to the responsible owner`;
                        break;
                    case 'COMMENT_ADDED':
                    case 'comment': // fallback from older logs
                        actionText = `added a new comment`;
                        detail = metadata.snippet || metadata.content || '';
                        break;
                    case 'PARTICIPANT_ADDED':
                        actionText = `added a new ${metadata.role} to the team`;
                        break;
                    case 'PARTICIPANT_REMOVED':
                        actionText = `removed a participant from the track`;
                        break;
                    case 'TRANSFER_INITIATED':
                        actionText = `initiated a responsibility transfer`;
                        break;
                    case 'TRANSFER_RECEIVED':
                        actionText = `received a responsibility transfer request`;
                        break;
                    case 'TASK_UPDATED':
                        actionText = `updated the track details`;
                        break;
                    case 'SYNC_QUICK':
                        actionText = `perfomed a quick-sync as ${metadata.role}`;
                        break;
                    case 'SYNC_GLOBAL':
                        actionText = `synced all their responsible tracks to IN SYNC`;
                        break;
                }
            }

            // Fallback for actionText if no metadata or unrecognized
            if (!actionText) {
                if (actionLower.includes('sync state updated to')) {
                    const newState = actionLower.split('updated to ')[1]?.split(':')[0]?.trim() || '';
                    actionText = `updated the sync state to ${newState.toUpperCase()}`;
                } else {
                    actionText = log.action;
                }
            }

            // Fallback for detail extraction
            if (!detail && log.action.includes(':')) {
                detail = log.action.split(':').slice(1).join(':').trim();
            }

            // determine your role
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

            return {
                id: log.id,
                taskId: log.taskId,
                actorId: log.userId,
                actorName: log.user.name,
                action: log.action, // keep original
                actionText,
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
