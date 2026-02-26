"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const admin_guard_1 = require("../auth/admin.guard");
let AdminController = class AdminController {
    adminService;
    constructor(adminService) {
        this.adminService = adminService;
    }
    async getDashboardData() {
        const [metrics, highRiskTasks, transferAlerts, activityPulse] = await Promise.all([
            this.adminService.getGlobalMetrics(),
            this.adminService.getHighRiskTasks(),
            this.adminService.getTransferAlerts(),
            this.adminService.getActivityPulse(),
        ]);
        return {
            metrics,
            highRiskTasks,
            transferAlerts,
            activityPulse,
        };
    }
    async getAllTasks(query) {
        return await this.adminService.findAllTasks(query);
    }
    async forceClose(id, reason, req) {
        return await this.adminService.forceCloseTask(id, reason, req.user.userId);
    }
    async freeze(id, reason, req) {
        return await this.adminService.freezeTask(id, reason, req.user.userId);
    }
    async reopen(id, reason, req) {
        return await this.adminService.reopenTask(id, reason, req.user.userId);
    }
    async removeParticipant(taskId, userId, reason, req) {
        return await this.adminService.removeParticipant(taskId, userId, reason, req.user.userId);
    }
    async getAllUsers() {
        return await this.adminService.findAllUsers();
    }
    async getUserDetails(id) {
        return await this.adminService.getUserDetails(id);
    }
    async updateRole(id, role, reason, req) {
        return await this.adminService.updateUserRole(id, role, reason, req.user.userId);
    }
    async suspend(id, reason, req) {
        return await this.adminService.suspendUser(id, reason, req.user.userId);
    }
    async reactivate(id, reason, req) {
        return await this.adminService.reactivateUser(id, reason, req.user.userId);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getDashboardData", null);
__decorate([
    (0, common_1.Get)('tasks'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllTasks", null);
__decorate([
    (0, common_1.Post)('tasks/:id/force-close'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "forceClose", null);
__decorate([
    (0, common_1.Post)('tasks/:id/freeze'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "freeze", null);
__decorate([
    (0, common_1.Post)('tasks/:id/reopen'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "reopen", null);
__decorate([
    (0, common_1.Delete)('tasks/:id/participants/:userId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)('reason')),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "removeParticipant", null);
__decorate([
    (0, common_1.Get)('users'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAllUsers", null);
__decorate([
    (0, common_1.Get)('users/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUserDetails", null);
__decorate([
    (0, common_1.Post)('users/:id/role'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('role')),
    __param(2, (0, common_1.Body)('reason')),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateRole", null);
__decorate([
    (0, common_1.Post)('users/:id/suspend'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "suspend", null);
__decorate([
    (0, common_1.Post)('users/:id/reactivate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "reactivate", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map