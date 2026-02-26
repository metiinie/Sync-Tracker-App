import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getDashboardData(): Promise<{
        metrics: {
            totalActiveTasks: number;
            blockedTasks: number;
            helpRequests: number;
            pendingAcceptance: number;
            staleSyncTasks: number;
        };
        highRiskTasks: {
            id: string;
            title: string;
            description: string | null;
            createdAt: Date;
            assignedBy: string;
            responsibleOwner: string;
            status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
            syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
            lastUpdatedAt: Date;
            assigner: {
                id: string;
                name: string;
                email: string;
                systemRole: "ADMIN" | "USER";
                isSuspended: boolean;
                createdAt: Date;
            };
            owner: {
                id: string;
                name: string;
                email: string;
                systemRole: "ADMIN" | "USER";
                isSuspended: boolean;
                createdAt: Date;
            };
        }[];
        transferAlerts: {
            id: string;
            title: string;
            description: string | null;
            createdAt: Date;
            assignedBy: string;
            responsibleOwner: string;
            status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
            syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
            lastUpdatedAt: Date;
            assigner: {
                id: string;
                name: string;
                email: string;
                systemRole: "ADMIN" | "USER";
                isSuspended: boolean;
                createdAt: Date;
            };
            owner: {
                id: string;
                name: string;
                email: string;
                systemRole: "ADMIN" | "USER";
                isSuspended: boolean;
                createdAt: Date;
            };
        }[];
        activityPulse: {
            id: string;
            taskId: string | null;
            userId: string;
            action: string;
            timestamp: Date;
            task: {
                id: string;
                title: string;
                description: string | null;
                createdAt: Date;
                assignedBy: string;
                responsibleOwner: string;
                status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
                syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
                lastUpdatedAt: Date;
            } | null;
            user: {
                id: string;
                name: string;
                email: string;
                systemRole: "ADMIN" | "USER";
                isSuspended: boolean;
                createdAt: Date;
            };
        }[];
    }>;
    getAllTasks(query: any): Promise<{
        id: string;
        title: string;
        description: string | null;
        createdAt: Date;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        assigner: {
            id: string;
            name: string;
            email: string;
            systemRole: "ADMIN" | "USER";
            isSuspended: boolean;
            createdAt: Date;
        };
        owner: {
            id: string;
            name: string;
            email: string;
            systemRole: "ADMIN" | "USER";
            isSuspended: boolean;
            createdAt: Date;
        };
        participants: {
            id: string;
            syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
            lastUpdatedAt: Date;
            taskId: string;
            userId: string;
            role: "contributor" | "helper" | "reviewer" | "observer";
            joinedAt: Date;
            user: {
                id: string;
                name: string;
                email: string;
                systemRole: "ADMIN" | "USER";
                isSuspended: boolean;
                createdAt: Date;
            };
        }[];
    }[]>;
    forceClose(id: string, reason: string, req: any): Promise<{
        id: string;
        title: string;
        description: string | null;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        createdAt: Date;
    }>;
    freeze(id: string, reason: string, req: any): Promise<{
        id: string;
        title: string;
        description: string | null;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        createdAt: Date;
    }>;
    reopen(id: string, reason: string, req: any): Promise<{
        id: string;
        title: string;
        description: string | null;
        assignedBy: string;
        responsibleOwner: string;
        status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
        syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
        lastUpdatedAt: Date;
        createdAt: Date;
    }>;
    removeParticipant(taskId: string, userId: string, reason: string, req: any): Promise<{
        success: boolean;
    }>;
    getAllUsers(): Promise<{
        metrics: {
            activeTasks: number;
            blockedTasks: number;
            lastActivity: Date;
        };
        id: string;
        name: string;
        email: string;
        systemRole: "ADMIN" | "USER";
        isSuspended: boolean;
        createdAt: Date;
    }[]>;
    getUserDetails(id: string): Promise<{
        tasksAsOwner: {
            id: string;
            title: string;
            description: string | null;
            createdAt: Date;
            assignedBy: string;
            responsibleOwner: string;
            status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
            syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
            lastUpdatedAt: Date;
        }[];
        tasksParticipating: {
            id: string;
            syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
            lastUpdatedAt: Date;
            taskId: string;
            userId: string;
            role: "contributor" | "helper" | "reviewer" | "observer";
            joinedAt: Date;
            task: {
                id: string;
                title: string;
                description: string | null;
                createdAt: Date;
                assignedBy: string;
                responsibleOwner: string;
                status: "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "FROZEN";
                syncState: "IN_SYNC" | "NEEDS_UPDATE" | "BLOCKED" | "HELP_REQUESTED";
                lastUpdatedAt: Date;
            };
        }[];
        totalTimeLogged: number;
        syncStats: {
            IN_SYNC: number;
            NEEDS_UPDATE: number;
            BLOCKED: number;
            HELP_REQUESTED: number;
        };
        id: string;
        name: string;
        email: string;
        systemRole: "ADMIN" | "USER";
        isSuspended: boolean;
        createdAt: Date;
    } | null>;
    updateRole(id: string, role: 'ADMIN' | 'USER', reason: string, req: any): Promise<{
        id: string;
        name: string;
        email: string;
        systemRole: "ADMIN" | "USER";
        isSuspended: boolean;
        createdAt: Date;
    }>;
    suspend(id: string, reason: string, req: any): Promise<{
        id: string;
        name: string;
        email: string;
        systemRole: "ADMIN" | "USER";
        isSuspended: boolean;
        createdAt: Date;
    }>;
    reactivate(id: string, reason: string, req: any): Promise<{
        id: string;
        name: string;
        email: string;
        systemRole: "ADMIN" | "USER";
        isSuspended: boolean;
        createdAt: Date;
    }>;
  