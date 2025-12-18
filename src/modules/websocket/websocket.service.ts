import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { logger } from '../../core/logger.js';
import type {
  WebSocketConfig,
  SocketUser,
  Room,
  Message,
  BroadcastOptions,
  ConnectionStats,
  RoomStats,
  AuthenticatedSocket,
} from './types.js';

// In-memory storage (replace with Redis in production)
const connectedUsers = new Map<string, SocketUser>();
const rooms = new Map<string, Room>();
const messages = new Map<string, Message[]>();
const userSockets = new Map<string, Set<string>>();

/**
 * WebSocket Service
 * Manages real-time connections with Socket.io
 *
 * Note: This is a simplified implementation.
 * For production, integrate with Socket.io and use Redis adapter for scaling.
 */
export class WebSocketService extends EventEmitter {
  private config: WebSocketConfig;
  private io: unknown | null = null;
  private stats: ConnectionStats = {
    totalConnections: 0,
    activeConnections: 0,
    totalRooms: 0,
    messagesPerMinute: 0,
    bytesPerMinute: 0,
    avgLatency: 0,
  };

  constructor(config?: WebSocketConfig) {
    super();
    this.config = {
      path: '/socket.io',
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6,
      ...config,
    };

    logger.info('WebSocket service initialized');
  }

  /**
   * Initialize Socket.io server
   * In production, pass an HTTP server instance
   */
  initialize(_httpServer?: unknown): void {
    // Mock initialization
    // In production: this.io = new Server(_httpServer, this.config);
    this.io = { initialized: true };

    logger.info('WebSocket server initialized');
  }

  /**
   * Handle user connection
   */
  async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    const userId = socket.userId || socket.id;

    const user: SocketUser = {
      id: userId,
      socketId: socket.id,
      username: socket.handshake.query.username as string,
      email: socket.handshake.query.email as string,
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    connectedUsers.set(socket.id, user);

    // Track user sockets
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    this.stats.totalConnections++;
    this.stats.activeConnections++;

    this.emit('connection', user);

    logger.info({ userId, socketId: socket.id, username: user.username }, 'User connected');
  }

  /**
   * Handle user disconnection
   */
  async handleDisconnection(socketId: string, reason?: string): Promise<void> {
    const user = connectedUsers.get(socketId);

    if (user) {
      connectedUsers.delete(socketId);

      // Remove from user sockets
      const sockets = userSockets.get(user.id);
      if (sockets) {
        sockets.delete(socketId);
        if (sockets.size === 0) {
          userSockets.delete(user.id);
        }
      }

      this.stats.activeConnections--;

      this.emit('disconnect', user, reason);

      logger.info(
        { userId: user.id, socketId, username: user.username, reason },
        'User disconnected'
      );
    }
  }

  /**
   * Get connected user
   */
  getUser(socketId: string): SocketUser | undefined {
    return connectedUsers.get(socketId);
  }

  /**
   * Get all connected users
   */
  getConnectedUsers(): SocketUser[] {
    return Array.from(connectedUsers.values());
  }

  /**
   * Get user by ID (may have multiple sockets)
   */
  getUserSockets(userId: string): string[] {
    return Array.from(userSockets.get(userId) || []);
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return userSockets.has(userId) && userSockets.get(userId)!.size > 0;
  }

  /**
   * Create a room
   */
  async createRoom(
    name: string,
    namespace = 'default',
    createdBy?: string,
    metadata?: Record<string, unknown>
  ): Promise<Room> {
    const room: Room = {
      id: randomUUID(),
      name,
      namespace,
      members: new Set(),
      metadata,
      createdAt: new Date(),
      createdBy,
    };

    rooms.set(room.id, room);
    messages.set(room.id, []);
    this.stats.totalRooms++;

    logger.info({ roomId: room.id, name, namespace }, 'Room created');

    return room;
  }

  /**
   * Get room
   */
  getRoom(roomId: string): Room | undefined {
    return rooms.get(roomId);
  }

  /**
   * List rooms
   */
  listRooms(namespace?: string): Room[] {
    const allRooms = Array.from(rooms.values());

    if (namespace) {
      return allRooms.filter((room) => room.namespace === namespace);
    }

    return allRooms;
  }

  /**
   * Join room
   */
  async joinRoom(socketId: string, roomId: string): Promise<void> {
    const user = connectedUsers.get(socketId);
    const room = rooms.get(roomId);

    if (!user || !room) {
      throw new Error('User or room not found');
    }

    room.members.add(socketId);

    this.emit('room:join', { user, room });

    logger.info({ userId: user.id, socketId, roomId, roomName: room.name }, 'User joined room');
  }

  /**
   * Leave room
   */
  async leaveRoom(socketId: string, roomId: string): Promise<void> {
    const user = connectedUsers.get(socketId);
    const room = rooms.get(roomId);

    if (!user || !room) {
      return;
    }

    room.members.delete(socketId);

    this.emit('room:leave', { user, room });

    logger.info({ userId: user.id, socketId, roomId, roomName: room.name }, 'User left room');
  }

  /**
   * Delete room
   */
  async deleteRoom(roomId: string): Promise<void> {
    const room = rooms.get(roomId);

    if (room) {
      rooms.delete(roomId);
      messages.delete(roomId);
      this.stats.totalRooms--;

      logger.info({ roomId, roomName: room.name }, 'Room deleted');
    }
  }

  /**
   * Get room members
   */
  getRoomMembers(roomId: string): SocketUser[] {
    const room = rooms.get(roomId);

    if (!room) {
      return [];
    }

    return Array.from(room.members)
      .map((socketId) => connectedUsers.get(socketId))
      .filter((user): user is SocketUser => user !== undefined);
  }

  /**
   * Send message to room
   */
  async sendMessage(
    roomId: string,
    userId: string,
    content: string,
    type: Message['type'] = 'text',
    metadata?: Record<string, unknown>
  ): Promise<Message> {
    const room = rooms.get(roomId);

    if (!room) {
      throw new Error('Room not found');
    }

    const user = Array.from(connectedUsers.values()).find((u) => u.id === userId);

    const message: Message = {
      id: randomUUID(),
      roomId,
      userId,
      username: user?.username,
      content,
      type,
      metadata,
      timestamp: new Date(),
    };

    const roomMessages = messages.get(roomId) || [];
    roomMessages.push(message);
    messages.set(roomId, roomMessages);

    this.emit('message', message);

    logger.debug({ messageId: message.id, roomId, userId }, 'Message sent');

    return message;
  }

  /**
   * Get room messages
   */
  getRoomMessages(roomId: string, limit = 50, offset = 0): Message[] {
    const roomMessages = messages.get(roomId) || [];

    return roomMessages.slice(-limit - offset, offset > 0 ? -offset : undefined).reverse();
  }

  /**
   * Broadcast event to room
   */
  async broadcastToRoom(
    roomId: string,
    event: string,
    _data: unknown,
    options?: BroadcastOptions
  ): Promise<void> {
    const room = rooms.get(roomId);

    if (!room) {
      throw new Error('Room not found');
    }

    const except = new Set(options?.except || []);

    for (const socketId of room.members) {
      if (!except.has(socketId)) {
        // In production: io.to(socketId).emit(event, data);
        logger.debug({ socketId, event, roomId }, 'Broadcasting to socket');
      }
    }

    logger.debug({ event, roomId, memberCount: room.members.size }, 'Broadcast to room');
  }

  /**
   * Broadcast to specific users
   */
  async broadcastToUsers(userIds: string[], event: string, _data: unknown): Promise<void> {
    for (const userId of userIds) {
      const socketIds = userSockets.get(userId);

      if (socketIds) {
        for (const socketId of socketIds) {
          // In production: io.to(socketId).emit(event, data);
          logger.debug({ socketId, userId, event }, 'Broadcasting to user');
        }
      }
    }

    logger.debug({ event, userCount: userIds.length }, 'Broadcast to users');
  }

  /**
   * Broadcast to all connected users
   */
  async broadcastToAll(event: string, _data: unknown, options?: BroadcastOptions): Promise<void> {
    const except = new Set(options?.except || []);

    for (const socketId of connectedUsers.keys()) {
      if (!except.has(socketId)) {
        // In production: io.to(socketId).emit(event, data);
        logger.debug({ socketId, event }, 'Broadcasting to all');
      }
    }

    logger.debug({ event, totalUsers: connectedUsers.size }, 'Broadcast to all users');
  }

  /**
   * Emit event to specific socket
   */
  async emitToSocket(socketId: string, event: string, _data: unknown): Promise<void> {
    // In production: io.to(socketId).emit(event, _data);
    logger.debug({ socketId, event }, 'Emit to socket');
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Get room statistics
   */
  getRoomStats(roomId: string): RoomStats | null {
    const room = rooms.get(roomId);
    const roomMessages = messages.get(roomId);

    if (!room) {
      return null;
    }

    const lastMessage = roomMessages?.[roomMessages.length - 1];

    return {
      roomId: room.id,
      memberCount: room.members.size,
      messageCount: roomMessages?.length || 0,
      createdAt: room.createdAt,
      lastActivity: lastMessage?.timestamp || room.createdAt,
    };
  }

  /**
   * Disconnect user
   */
  async disconnectUser(userId: string, reason?: string): Promise<void> {
    const socketIds = userSockets.get(userId);

    if (socketIds) {
      for (const socketId of socketIds) {
        // In production: io.sockets.sockets.get(socketId)?.disconnect(true);
        await this.handleDisconnection(socketId, reason);
      }
    }

    logger.info({ userId, reason }, 'User forcefully disconnected');
  }

  /**
   * Cleanup inactive connections
   */
  async cleanup(inactiveMinutes = 30): Promise<number> {
    const cutoff = new Date(Date.now() - inactiveMinutes * 60 * 1000);
    let cleaned = 0;

    for (const [socketId, user] of connectedUsers.entries()) {
      if (user.lastActivity < cutoff) {
        await this.handleDisconnection(socketId, 'inactive');
        cleaned++;
      }
    }

    logger.info({ cleaned, inactiveMinutes }, 'Cleaned up inactive connections');

    return cleaned;
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    // Disconnect all users
    for (const socketId of connectedUsers.keys()) {
      await this.handleDisconnection(socketId, 'server_shutdown');
    }

    // Close Socket.io
    // In production: await this.io?.close();

    logger.info('WebSocket service shut down');
  }
}
