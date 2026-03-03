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

@WebSocketGateway({ cors: { origin: '*' } })
export class SyncGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  // Join a single task room
  @SubscribeMessage('joinTask')
  handleJoinTask(
    @MessageBody() data: { taskId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`task_${data.taskId}`);
  }

  // Join multiple task rooms at once
  @SubscribeMessage('joinTasks')
  handleJoinTasks(
    @MessageBody() data: { taskIds: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    data.taskIds.forEach(id => client.join(`task_${id}`));
  }

  @SubscribeMessage('leaveTask')
  handleLeaveTask(
    @MessageBody() data: { taskId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`task_${data.taskId}`);
  }

  // ─── Join personal user room (for notifications + transfers) ────────────────
  @SubscribeMessage('joinUser')
  handleJoinUser(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`user:${data.userId}`);
    console.log(`Client ${client.id} joined user room: user:${data.userId}`);
  }

  @SubscribeMessage('leaveUser')
  handleLeaveUser(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`user:${data.userId}`);
  }

  // Helper to emit to a task room
  emitToTask(taskId: string, event: string, payload: any) {
    this.server.to(`task_${taskId}`).emit(event, payload);
  }
}
