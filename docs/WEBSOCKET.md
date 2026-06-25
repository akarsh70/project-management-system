# WebSocket Real-Time System — Hindlish mein

## Overview

**Socket.IO 4** use kar rahe hain real-time bidirectional communication ke liye. Organization-based rooms ensure karte hain ki tenant isolation maintain ho.

---

## Connection Architecture

```
Frontend (React)                     Backend (NestJS)
    │                                     │
    │── connect({ auth: { token } }) ────►│
    │                                     │── JWT verify
    │                                     │── User load from DB
    │                                     │── Redis HSET presence
    │◄── { connected: true, userId } ────│
    │                                     │
    │── emit('join_org', { orgId }) ─────►│
    │                                     │── socket.join('org:{orgId}')
    │◄── emit('joined_org', { orgId }) ──│
    │                                     │
    │         ... time passes ...         │
    │                                     │
    │         [Someone creates project]   │
    │                                     │── ProjectsService.create()
    │                                     │── BullMQ job
    │                                     │── [Async] ProjectEventsProcessor
    │                                     │── server.to('org:{orgId}').emit()
    │◄── emit('project_created', data) ──│
    │                                     │
    │── disconnect ───────────────────────►│
    │                                     │── Redis HDEL presence
```

---

## Gateway Implementation

```typescript
@WebSocketGateway({
  cors: { origin: configService.get('app.corsOrigin'), credentials: true },
  namespace: '/',
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    try {
      // Token extract aur verify karo
      const token = client.handshake.auth?.token?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('jwt.secret'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub, isActive: true },
      });

      if (!user) {
        client.disconnect();
        return;
      }

      // Socket par user attach karo
      client.data.userId = user.id;
      client.data.user = user;

      // Presence track karo
      await this.redisService.hset('presence', user.id, client.id);

      client.emit('connected', { userId: user.id });
    } catch (err) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      await this.redisService.hdel('presence', userId);
    }
  }

  @SubscribeMessage('join_org')
  async handleJoinOrg(
    client: Socket,
    payload: { orgId: string },
  ) {
    const { orgId } = payload;
    const userId = client.data.userId;

    // Verify membership before joining room
    const membership = await this.membershipRepository.findOne({
      where: { userId, organizationId: orgId, isActive: true },
    });

    if (!membership) {
      client.emit('error', { message: 'Not a member of this organization' });
      return;
    }

    await client.join(`org:${orgId}`);
    client.emit('joined_org', { orgId });
  }

  @SubscribeMessage('leave_org')
  async handleLeaveOrg(client: Socket, payload: { orgId: string }) {
    await client.leave(`org:${payload.orgId}`);
    client.emit('left_org', { orgId: payload.orgId });
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    client.emit('pong', { timestamp: Date.now() });
  }

  // Ye method doosre services use karte hain
  broadcastToOrg(orgId: string, event: string, data: unknown) {
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
```

---

## Events Reference

### Client → Server (emit)

| Event | Payload | Description |
|-------|---------|-------------|
| `join_org` | `{ orgId: string }` | Org room mein join karo |
| `leave_org` | `{ orgId: string }` | Org room se leave karo |
| `ping` | — | Connection alive check |

### Server → Client (listen)

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ userId: string }` | Connection successful |
| `joined_org` | `{ orgId: string }` | Room join successful |
| `left_org` | `{ orgId: string }` | Room leave confirmation |
| `project_created` | `{ projectId, orgId, ... }` | Naya project bana |
| `project_updated` | `{ projectId, ... }` | Project update hua |
| `project_deleted` | `{ projectId, ... }` | Project delete hua |
| `task_created` | `{ taskId, projectId, ... }` | Naya task bana |
| `task_updated` | `{ taskId, status, ... }` | Task update hua |
| `task_assigned` | `{ taskId, assignedTo, ... }` | Task assign hua |
| `notification_new` | `{ notification }` | Naya notification |
| `pong` | `{ timestamp: number }` | Ping response |
| `error` | `{ message: string }` | Error (e.g., unauthorized) |

---

## Frontend Client (useSocket Hook)

```typescript
// frontend/src/hooks/useSocket.ts
export function useSocket() {
  const dispatch = useDispatch();
  const { accessToken } = useSelector(state => state.auth);
  const { currentOrg } = useSelector(state => state.organization);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    // Connection banao
    const socket = io(import.meta.env.VITE_API_URL, {
      auth: { token: `Bearer ${accessToken}` },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('connected', ({ userId }) => {
      // Agar org selected hai to join karo
      if (currentOrg) {
        socket.emit('join_org', { orgId: currentOrg.id });
      }
    });

    // Real-time project updates
    socket.on('project_created', (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    });

    // Real-time notifications
    socket.on('notification_new', (notification) => {
      dispatch(addNotification(notification));
      dispatch(incrementUnreadCount());
      enqueueSnackbar(notification.title, { variant: 'info' });
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  // Org switch par room change karo
  useEffect(() => {
    if (!socketRef.current?.connected || !currentOrg) return;
    socketRef.current.emit('join_org', { orgId: currentOrg.id });
  }, [currentOrg?.id]);

  return socketRef.current;
}
```

---

## Organization Room Isolation

```
Org A Room: 'org:aaa-uuid'
  ├── Alice (socket: s1)
  └── Carol (socket: s2)

Org B Room: 'org:bbb-uuid'
  ├── Bob (socket: s3)
  └── Dave (socket: s4)

Project created in Org A:
  server.to('org:aaa-uuid').emit('project_created', data)
  → Alice receives ✅
  → Carol receives ✅
  → Bob does NOT receive ✅ (different room)
  → Dave does NOT receive ✅ (different room)
```

---

## Presence Tracking

```
Redis Hash: "presence"
  user-uuid-alice → socket-id-s1
  user-uuid-carol → socket-id-s2
  user-uuid-bob   → socket-id-s3

Get online users for Org A:
  1. Redis HGETALL presence
     → {alice: s1, carol: s2, bob: s3}
  2. Socket.IO room 'org:aaa-uuid' members
     → Set{s1, s2}
  3. Filter: presence entries whose socketId is in room
     → [alice (s1 ∈ Set), carol (s2 ∈ Set)]
     → bob NOT included (s3 ∉ Set)
```

---

## Scaling WebSockets (Production)

Single server par Socket.IO fine kaam karta hai. Multiple servers ke liye:

```typescript
// Redis adapter for Socket.IO (horizontal scaling)
import { createAdapter } from '@socket.io/redis-adapter';

const pubClient = new Redis({ host, port });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

Ab sab WebSocket servers same Redis pub/sub channel se communicate karte hain — `broadcastToOrg()` sab servers ke clients tak pahunchega.
