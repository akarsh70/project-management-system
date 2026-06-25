import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody,
  ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';

interface AuthenticatedSocket extends Socket {
  userId: string;
  email: string;
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/',
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token?.replace('Bearer ', '') ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) throw new UnauthorizedException('No token provided');

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      client.userId = payload.sub;
      client.email = payload.email;

      await this.redisService.hset('presence', client.userId, client.id);

      this.logger.log(`Client connected: ${client.userId} (${client.id})`);
      client.emit('connected', { userId: client.userId });
    } catch (err) {
      this.logger.warn(`Connection rejected: ${err.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      await this.redisService.hdel('presence', client.userId);
      this.logger.log(`Client disconnected: ${client.userId} (${client.id})`);
    }
  }

  @SubscribeMessage('join_org')
  async handleJoinOrg(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orgId: string },
  ) {
    const room = `org:${data.orgId}`;
    await client.join(room);
    this.logger.log(`User ${client.userId} joined room ${room}`);
    client.emit('joined_org', { orgId: data.orgId });
  }

  @SubscribeMessage('leave_org')
  async handleLeaveOrg(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orgId: string },
  ) {
    const room = `org:${data.orgId}`;
    await client.leave(room);
    this.logger.log(`User ${client.userId} left room ${room}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: Date.now() });
  }

  // Methods called by other services to broadcast events
  broadcastToOrg(orgId: string, event: string, data: any) {
    this.server.to(`org:${orgId}`).emit(event, data);
  }

  async getOnlineUsers(orgId: string): Promise<string[]> {
    const presence = await this.redisService.hgetall('presence');
    const room = this.server.sockets.adapter.rooms.get(`org:${orgId}`);
    if (!room) return [];

    return Object.entries(presence)
      .filter(([, socketId]) => room.has(socketId))
      .map(([userId]) => userId);
  }
}
