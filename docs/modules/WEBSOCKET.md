# WebSocket Module Documentation

## Overview

The WebSocket module provides real-time bidirectional communication using Socket.io with Redis adapter support for multi-instance deployments. It manages connections, rooms, messages, and broadcasting capabilities.

## Features

- ✅ Real Socket.io integration (HTTP server required)
- ✅ Redis adapter for multi-instance support
- ✅ Connection lifecycle management
- ✅ Room-based communication
- ✅ Message history storage
- ✅ Broadcasting (to rooms, users, all)
- ✅ Typing indicators
- ✅ User presence tracking
- ✅ Connection statistics
- ✅ Graceful shutdown

## Configuration

### Basic Setup (Single Instance)

```typescript
import { createServer } from 'http';
import { WebSocketService } from './modules/websocket/websocket.service.js';

const httpServer = createServer();

const wsService = new WebSocketService({
  path: '/socket.io',
  cors: {
    origin: '*',
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
});

// Initialize Socket.io with HTTP server
wsService.initialize(httpServer);

httpServer.listen(3000);
```

### Multi-Instance Setup (with Redis)

```typescript
const wsService = new WebSocketService({
  path: '/socket.io',
  cors: {
    origin: ['https://example.com', 'https://www.example.com'],
    credentials: true,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

wsService.initialize(httpServer);
```

## API Reference

### Initialization

#### `initialize(httpServer: HTTPServer): void`

Initialize Socket.io server with an HTTP server instance.

```typescript
wsService.initialize(httpServer);
```

**Important**: Without an HTTP server, the service runs in mock mode (logs only).

### Connection Management

#### `handleConnection(socket: AuthenticatedSocket): Promise<void>`

Handle new client connection. Called automatically by Socket.io.

```typescript
// Automatically handled on 'connection' event
```

#### `handleDisconnection(socketId: string, reason?: string): Promise<void>`

Handle client disconnection.

```typescript
await wsService.handleDisconnection(socketId, 'client_disconnect');
```

#### `getUser(socketId: string): SocketUser | undefined`

Get connected user by socket ID.

```typescript
const user = wsService.getUser(socketId);
if (user) {
  console.log(user.username, user.email);
}
```

#### `getConnectedUsers(): SocketUser[]`

Get all connected users.

```typescript
const users = wsService.getConnectedUsers();
console.log(`${users.length} users online`);
```

#### `isUserOnline(userId: string): boolean`

Check if user is online.

```typescript
if (wsService.isUserOnline(userId)) {
  console.log('User is online');
}
```

#### `getUserSockets(userId: string): string[]`

Get all socket IDs for a user (multiple tabs/devices).

```typescript
const sockets = wsService.getUserSockets(userId);
console.log(`User has ${sockets.length} active connections`);
```

### Room Management

#### `createRoom(name: string, namespace?: string, createdBy?: string, metadata?: object): Promise<Room>`

Create a new room.

```typescript
const room = await wsService.createRoom('general-chat', 'default', userId, {
  topic: 'General Discussion',
  public: true,
});
```

#### `getRoom(roomId: string): Room | undefined`

Get room by ID.

```typescript
const room = wsService.getRoom(roomId);
if (room) {
  console.log(room.name, room.members.size);
}
```

#### `listRooms(namespace?: string): Room[]`

List all rooms, optionally filtered by namespace.

```typescript
const allRooms = wsService.listRooms();
const chatRooms = wsService.listRooms('chat');
```

#### `joinRoom(socketId: string, roomId: string): Promise<void>`

Add user to room.

```typescript
await wsService.joinRoom(socketId, roomId);
```

**Note**: Client should also call `socket.join(roomId)` on Socket.io side.

#### `leaveRoom(socketId: string, roomId: string): Promise<void>`

Remove user from room.

```typescript
await wsService.leaveRoom(socketId, roomId);
```

#### `deleteRoom(roomId: string): Promise<void>`

Delete a room.

```typescript
await wsService.deleteRoom(roomId);
```

#### `getRoomMembers(roomId: string): SocketUser[]`

Get all members in a room.

```typescript
const members = wsService.getRoomMembers(roomId);
members.forEach((user) => console.log(user.username));
```

### Messaging

#### `sendMessage(roomId: string, userId: string, content: string, type?: MessageType, metadata?: object): Promise<Message>`

Send message to room and store in history.

```typescript
const message = await wsService.sendMessage(
  roomId,
  userId,
  'Hello everyone!',
  'text',
  { edited: false }
);
```

**Message types**: `'text'`, `'image'`, `'file'`, `'system'`

#### `getRoomMessages(roomId: string, limit?: number, offset?: number): Message[]`

Get room message history.

```typescript
const recentMessages = wsService.getRoomMessages(roomId, 50); // Last 50 messages
const older = wsService.getRoomMessages(roomId, 50, 50); // 50 messages, skip last 50
```

### Broadcasting

#### `broadcastToRoom(roomId: string, event: string, data: unknown, options?: BroadcastOptions): Promise<void>`

Broadcast event to all users in a room.

```typescript
await wsService.broadcastToRoom('room-123', 'user:joined', {
  username: 'Alice',
  timestamp: new Date(),
});

// Exclude specific sockets
await wsService.broadcastToRoom('room-123', 'message', messageData, {
  except: [senderSocketId],
});
```

#### `broadcastToUsers(userIds: string[], event: string, data: unknown): Promise<void>`

Broadcast to specific users (all their sockets).

```typescript
await wsService.broadcastToUsers(
  [userId1, userId2, userId3],
  'notification',
  { type: 'friend_request', from: 'Alice' }
);
```

#### `broadcastToAll(event: string, data: unknown, options?: BroadcastOptions): Promise<void>`

Broadcast to all connected users.

```typescript
await wsService.broadcastToAll('system:announcement', {
  message: 'Server maintenance in 5 minutes',
});

// Exclude certain sockets
await wsService.broadcastToAll('update', data, {
  except: [adminSocketId],
});
```

#### `emitToSocket(socketId: string, event: string, data: unknown): Promise<void>`

Emit event to specific socket.

```typescript
await wsService.emitToSocket(socketId, 'private:message', {
  from: 'Admin',
  content: 'Welcome!',
});
```

### Statistics

#### `getStats(): ConnectionStats`

Get connection statistics.

```typescript
const stats = wsService.getStats();
console.log(`
  Total connections: ${stats.totalConnections}
  Active connections: ${stats.activeConnections}
  Total rooms: ${stats.totalRooms}
`);
```

#### `getRoomStats(roomId: string): RoomStats | null`

Get room statistics.

```typescript
const stats = wsService.getRoomStats(roomId);
if (stats) {
  console.log(`
    Members: ${stats.memberCount}
    Messages: ${stats.messageCount}
    Created: ${stats.createdAt}
    Last activity: ${stats.lastActivity}
  `);
}
```

### Maintenance

#### `disconnectUser(userId: string, reason?: string): Promise<void>`

Forcefully disconnect all user's sockets.

```typescript
await wsService.disconnectUser(userId, 'violation_of_terms');
```

#### `cleanup(inactiveMinutes?: number): Promise<number>`

Clean up inactive connections.

```typescript
const cleaned = await wsService.cleanup(30); // Remove connections inactive for 30+ minutes
console.log(`Cleaned ${cleaned} inactive connections`);
```

#### `shutdown(): Promise<void>`

Gracefully shutdown WebSocket service.

```typescript
await wsService.shutdown();
```

## Client-Side Usage

### Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  path: '/socket.io',
  query: {
    username: 'Alice',
    email: 'alice@example.com',
  },
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});
```

### Joining Rooms

```typescript
socket.emit('room:join', { roomId: 'room-123' });

socket.on('error', (error) => {
  console.error('Error:', error.message);
});
```

### Sending Messages

```typescript
socket.emit('message', {
  roomId: 'room-123',
  content: 'Hello everyone!',
  type: 'text',
});

socket.on('message', (message) => {
  console.log(`${message.username}: ${message.content}`);
});
```

### Typing Indicators

```typescript
// Start typing
socket.emit('typing', { roomId: 'room-123', isTyping: true });

// Stop typing
socket.emit('typing', { roomId: 'room-123', isTyping: false });

// Listen for others typing
socket.on('typing', (data) => {
  if (data.isTyping) {
    console.log(`${data.username} is typing...`);
  } else {
    console.log(`${data.username} stopped typing`);
  }
});
```

### Listening to Events

```typescript
// Room events
socket.on('user:joined', (data) => {
  console.log(`${data.username} joined the room`);
});

socket.on('user:left', (data) => {
  console.log(`${data.username} left the room`);
});

// Notifications
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});

// System announcements
socket.on('system:announcement', (data) => {
  alert(data.message);
});
```

## Server-Side Events

The WebSocket service emits events via EventEmitter:

```typescript
wsService.on('connection', (user) => {
  console.log(`User connected: ${user.username}`);
});

wsService.on('disconnect', (user, reason) => {
  console.log(`User disconnected: ${user.username} (${reason})`);
});

wsService.on('message', (message) => {
  console.log(`Message in ${message.roomId}: ${message.content}`);
});

wsService.on('room:join', ({ user, room }) => {
  console.log(`${user.username} joined ${room.name}`);
});

wsService.on('room:leave', ({ user, room }) => {
  console.log(`${user.username} left ${room.name}`);
});
```

## Architecture

### Single Instance

```
Client <--> Socket.io Server <--> WebSocketService
                                       |
                                  In-Memory Storage
```

### Multi-Instance (with Redis)

```
Client 1 <--> Socket.io Server 1 <--\
                                     |
Client 2 <--> Socket.io Server 2 <--+-> Redis Pub/Sub <-> WebSocketService
                                     |
Client 3 <--> Socket.io Server 3 <--/
                                       |
                                  In-Memory Storage (per instance)
```

## Use Cases

### Chat Application

```typescript
// Server
const chatRoom = await wsService.createRoom('chat-general', 'chat');

// Client joins
socket.emit('room:join', { roomId: chatRoom.id });

// Send message
socket.emit('message', {
  roomId: chatRoom.id,
  content: 'Hello chat!',
  type: 'text',
});

// Everyone in room receives
socket.on('message', (msg) => {
  displayMessage(msg);
});
```

### Real-Time Notifications

```typescript
// Server: Send notification to specific user
await wsService.broadcastToUsers([userId], 'notification', {
  type: 'friend_request',
  from: 'Alice',
  timestamp: new Date(),
});

// Client
socket.on('notification', (notification) => {
  showNotification(notification);
});
```

### Live Presence

```typescript
// Track user status
socket.on('user:status', (data) => {
  updateUserPresence(data.userId, data.status); // online, away, offline
});

// Server broadcast status changes
await wsService.broadcastToAll('user:status', {
  userId: user.id,
  status: 'online',
});
```

### Collaborative Editing

```typescript
// Broadcast changes to room
socket.emit('document:edit', {
  roomId: documentId,
  changes: delta,
  cursor: cursorPosition,
});

// Receive others' changes
socket.on('document:edit', (data) => {
  applyChanges(data.changes);
  updateCursor(data.userId, data.cursor);
});
```

## Environment Variables

```bash
# Redis Configuration (for multi-instance)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Socket.io Configuration
WEBSOCKET_PATH=/socket.io
WEBSOCKET_PING_TIMEOUT=60000
WEBSOCKET_PING_INTERVAL=25000
```

## Migration from Mock Implementation

**Before (v0.1.0):**
```typescript
// Placeholder Socket.io - not actually connected
wsService.initialize(); // No HTTP server needed
// Broadcasts only logged, not actually sent
```

**After (v0.2.0):**
```typescript
// Real Socket.io connection
wsService.initialize(httpServer); // HTTP server required
// Full Socket.io functionality with real-time communication
```

## Performance Considerations

### Memory Usage

- **In-memory storage**: Connection and room data stored in Map structures
- **Message history**: Limited by retention policy (default: unlimited, configure manually)
- **Redis adapter**: Adds pub/sub overhead but enables horizontal scaling

### Scaling

| Aspect | Single Instance | Multi-Instance (Redis) |
|--------|----------------|------------------------|
| Max connections | ~10,000 | Unlimited (horizontal) |
| Message latency | <1ms | ~5-10ms (Redis pub/sub) |
| Memory per connection | ~1KB | ~1KB + Redis overhead |
| Cross-instance events | No | Yes |

### Best Practices

1. **Limit message history**: Clean up old messages periodically
2. **Use rooms efficiently**: Group users logically, avoid too many small rooms
3. **Monitor connections**: Use `getStats()` to track active connections
4. **Set reasonable timeouts**: Adjust `pingTimeout` and `pingInterval` for your use case
5. **Enable Redis for production**: Always use Redis adapter for multi-instance deployments
6. **Clean up inactive connections**: Run `cleanup()` periodically (e.g., every hour)

## Troubleshooting

### Socket.io not working

**Problem**: Clients can't connect.

**Solution**:
1. Ensure HTTP server is passed to `initialize(httpServer)`
2. Check CORS configuration matches client origin
3. Verify path matches client configuration
4. Check firewall allows WebSocket connections

### Messages not reaching all instances

**Problem**: In multi-instance setup, messages only reach users on same server.

**Solution**:
1. Ensure Redis is configured in `WebSocketConfig`
2. Verify Redis pub/sub clients are connected (check logs)
3. Check Redis host/port/password are correct
4. Ensure all instances use same Redis server

### High memory usage

**Problem**: Memory grows over time.

**Solution**:
- Run `cleanup()` periodically to remove inactive connections
- Limit message history retention
- Monitor room count and clean up unused rooms

### Connection drops

**Problem**: Users frequently disconnected.

**Solution**:
- Increase `pingTimeout` (default 60s)
- Adjust `pingInterval` (default 25s)
- Check network stability
- Verify client reconnection logic

## Testing

Run WebSocket integration tests:

```bash
# Ensure HTTP server available
npm test tests/integration/websocket-socketio.test.ts
```

**Note**: Tests create HTTP server on port 3010 automatically.

## Related Modules

- **Auth Module**: Authenticate WebSocket connections
- **User Module**: Track user presence and status
- **Notification Module**: Send real-time notifications

## Changelog

### v0.2.0 (2025-12-19)

**WEBSOCKET-001 Completed:**
- ✅ Connected real Socket.io with HTTP server
- ✅ Implemented Redis adapter for multi-instance support
- ✅ Replaced all placeholder broadcasts with real Socket.io emits
- ✅ Added connection lifecycle handlers (connect, disconnect)
- ✅ Added event handlers (room:join, room:leave, message, typing)
- ✅ Implemented graceful shutdown with Redis cleanup
- ✅ Added 26 comprehensive integration tests
- ✅ Added this documentation

### v0.1.0 (Initial)

- Mock Socket.io implementation
- In-memory storage only
- No real WebSocket connections
- Placeholder broadcasts (logged only)
