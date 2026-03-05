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
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwksClient } from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({ cors: { origin: '*' } })
export class SyncGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SyncGateway.name);
  private jwksClient: JwksClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    this.jwksClient = new JwksClient({
      jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      cache: true,
      cacheMaxEntries: 10,
      cacheMaxAge: 10 * 60 * 60 * 1000, // 10 hours
      rateLimit: true,
      jwksRequestsPerMinute: 20,
    });
  }

  /**
   * Authenticate every new WebSocket connection.
   * Expects the Supabase JWT token in `auth.token` or `Authorization` header.
   * Unauthenticated clients are immediately disconnected.
   */
  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake?.auth?.token ||
        client.handshake?.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`WS connection rejected: no token provided (${client.id})`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect(true);
        return;
      }

      // Decode the token header to get the key ID (kid)
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string' || !decoded.header?.kid) {
        this.logger.warn(`WS connection rejected: invalid token format (${client.id})`);
        client.emit('error', { message: 'Invalid token format' });
        client.disconnect(true);
        return;
      }

      // Fetch the public key from Supabase JWKS
      const signingKey = await this.jwksClient.getSigningKey(decoded.header.kid);
      const publicKey = signingKey.getPublicKey();

      // Verify the token signature and expiration
      const payload = jwt.verify(token, publicKey, {
        algorithms: ['ES256'],
      }) as any;

      // Attach the verified user payload to the socket for later use
      (client as any).user = payload;
      this.logger.log(`WS authenticated: user=${payload.sub} (${client.id})`);
    } catch (error) {
      this.logger.warn(`WS connection rejected: ${error.message} (${client.id})`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WS disconnected: ${client.id}`);
  }

  // ─── Helper: get the authenticated user from a socket ──────────────────────
  private getAuthUser(client: Socket): any | null {
    return (client as any).user || null;
  }

  // Join a single task room
  @SubscribeMessage('joinTask')
  handleJoinTask(
    @MessageBody() data: { taskId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.getAuthUser(client);
    if (!user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }
    client.join(`task_${data.taskId}`);
  }

  // Join multiple task rooms at once
  @SubscribeMessage('joinTasks')
  handleJoinTasks(
    @MessageBody() data: { taskIds: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.getAuthUser(client);
    if (!user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }
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
  // Enforces that a user can only join their OWN room
  @SubscribeMessage('joinUser')
  handleJoinUser(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.getAuthUser(client);
    if (!user) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Enforce ownership: users can only join their own notification room
    if (user.sub !== data.userId) {
      this.logger.warn(`User ${user.sub} tried to join room for user ${data.userId}`);
      client.emit('error', { message: 'Cannot join another user\'s room' });
      return;
    }

    client.join(`user:${data.userId}`);
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
