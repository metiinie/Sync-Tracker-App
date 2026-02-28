import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DRIZZLE } from '../db/db.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { lt, and, eq } from 'drizzle-orm';
import { SyncGateway } from '../sync/sync.gateway';

@Injectable()
export class TasksCron {
  private readonly logger = new Logger(TasksCron.name);

  constructor(
    @Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>,
    private syncGateway: SyncGateway,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleSyncDecay() {
    this.logger.debug('Running sync decay check');

    const threshold = new Date();
    threshold.setHours(threshold.getHours() - 24);

    const staleParticipants = await this.db.query.taskParticipants.findMany({
      where: and(
        lt(schema.taskParticipants.lastUpdatedAt, threshold),
        eq(schema.taskParticipants.syncState, 'IN_SYNC'),
      ),
    });

    for (const participant of staleParticipants) {
      await this.db
        .update(schema.taskParticipants)
        .set({ syncState: 'NEEDS_UPDATE', lastUpdatedAt: new Date() })
        .where(eq(schema.taskParticipants.id, participant.id));

      this.syncGateway.emitToTask(participant.taskId, 'sync:update', {
        userId: participant.userId,
        syncState: 'NEEDS_UPDATE',
        reason: 'Auto-decay (no update in 24h)',
      });

      this.logger.log(
        `Marked participant ${participant.userId} as NEEDS_UPDATE for task ${participant.taskId}`,
      );
    }
  }
}
