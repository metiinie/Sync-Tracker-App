import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SyncGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinTask')
  handleJoinTask(
    @MessageBody() data: { taskId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`task_${data.taskId}`);
  }

  @SubscribeMessage('joinTasks')
  handleJoinTasks(
    @MessageBody() data: { taskIds: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    data.taskIds.forEach(id => {
      client.join(`task_${id}`);
    });
  }

  @SubscribeMessage('leaveTask')
  handleLeaveTask(
    @MessageBody() data: { taskId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`task_${data.taskId}`);
  }

  // Helper method to emit events to specific task rooms
  emitToTask(taskId: string, event: string, payload: any) {
    this.server.to(`task_${taskId}`).emit(event, payload);
  }
}
