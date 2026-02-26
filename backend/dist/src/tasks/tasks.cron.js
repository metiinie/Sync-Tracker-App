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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TasksCron_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksCron = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const db_module_1 = require("../db/db.module");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema = __importStar(require("../db/schema"));
const drizzle_orm_1 = require("drizzle-orm");
const sync_gateway_1 = require("../sync/sync.gateway");
let TasksCron = TasksCron_1 = class TasksCron {
    db;
    syncGateway;
    logger = new common_1.Logger(TasksCron_1.name);
    constructor(db, syncGateway) {
        this.db = db;
        this.syncGateway = syncGateway;
    }
    async handleSyncDecay() {
        this.logger.debug('Running sync decay check');
        const threshold = new Date();
        threshold.setHours(threshold.getHours() - 24);
        const staleParticipants = await this.db.query.taskParticipants.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.lt)(schema.taskParticipants.lastUpdatedAt, threshold), (0, drizzle_orm_1.eq)(schema.taskParticipants.syncState, 'IN_SYNC')),
        });
        for (const participant of staleParticipants) {
            await this.db.update(schema.taskParticipants)
                .set({ syncState: 'NEEDS_UPDATE', lastUpdatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema.taskParticipants.id, participant.id));
            this.syncGateway.emitToTask(participant.taskId, 'sync:update', {
                userId: participant.userId,
                syncState: 'NEEDS_UPDATE',
                reason: 'Auto-decay (no update in 24h)',
            });
            this.logger.log(`Marked participant ${participant.userId} as NEEDS_UPDATE for task ${participant.taskId}`);
        }
    }
};
exports.TasksCron = TasksCron;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TasksCron.prototype, "handleSyncDecay", null);
exports.TasksCron = TasksCron = TasksCron_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(db_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        sync_gateway_1.SyncGateway])
], TasksCron);
//# sourceMappingURL=tasks.cron.js.map