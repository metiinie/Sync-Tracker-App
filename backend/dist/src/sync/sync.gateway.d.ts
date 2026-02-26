import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class SyncGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinTask(data: {
        taskId: string;
    }, client: Socket): void;
    handleLeaveTask(data: {
        taskId: string;
    }, client: Socket): void;
    emitToTask(taskId: string, event: string, payload: any): void;
}
