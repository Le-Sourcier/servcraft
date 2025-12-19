import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
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
 * Now using real Socket.io with Redis adapter for multi-instance support.
 */
export class WebSocketService extends EventEmitter {
  private config: WebSocketConfig;
  private io: Server | null = null;
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;
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
   * Pass an HTTP server instance to enable WebSocket support
   */
  initialize(httpServer?: HTTPServer): void {
    if (!httpServer) {
      logger.warn('No HTTP server provided - WebSocket service running in mock mode');
      return;
    }

    try {
      // Create Socket.io server
      this.io = new Server(httpServer, {
        path: this.config.path,
        pingTimeout: this.config.pingTimeout,
        pingInterval: this.config.pingInterval,
        maxHttpBufferSize: this.config.maxHttpBufferSize,
        cors: this.config.cors || {
          origin: '*',
          credentials: true,
        },
      });

      // Setup Redis adapter if configured
      if (this.config.redis) {
        this.setupRedisAdapter();
      }

      // Setup connection handlers
      this.setupConnectionHandlers();

      logger.info({ path: this.config.path }, 'Socket.io server initialized');
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize Socket.io server');
      throw error;
    }
  }

  /**
   * Setup Redis adapter for multi-instance support
   */
  private setupRedisAdapter(): void {
    if (!this.config.redis || !this.io) {
      return;
    }

    try {
      const redisConfig = this.config.redis;

      // Create pub/sub Redis clients
      this.pubClient = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      });

      this.subClient = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
      });

      // Setup event handlers
      this.pubClient.on('connect', () => {
        logger.info('Socket.io Redis pub client connected');
      });

      this.pubClient.on('error', (error: Error) => {
        logger.error({ err: error }, 'Socket.io Redis pub client error');
      });

      this.subClient.on('connect', () => {
        logger.info('Socket.io Redis sub client connected');
      });

      this.subClient.on('error', (error: Error) => {
        logger.error({ err: error }, 'Socket.io Redis sub client error');
      });

      // Attach Redis adapter to Socket.io
      this.io.adapter(createAdapter(this.pubClient, this.subClient));

      logger.info(
        { host: redisConfig.host, port: redisConfig.port },
        'Socket.io Redis adapter configured'
      );
    } catch (error) {
      logger.error({ err: error }, 'Failed to setup Redis adapter');
    }
  }

  /**
   * Setup Socket.io connection handlers
   */
  private setupConnectionHandlers(): void {
    if (!this.io) {
      return;
    }

    this.io.on('connection', (socket) => {
      const authenticatedSocket = socket as unknown as AuthenticatedSocket;

      // Handle connection
      this.handleConnection(authenticatedSocket).catch((error) => {
        logger.error({ err: error, socketId: socket.id }, 'Error handling connection');
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.handleDisconnection(socket.id, reason).catch((error) => {
          logger.error({ err: error, socketId: socket.id }, 'Error handling disconnection');
        });
      });

      // Handle room join
      socket.on('room:join', async (data: { roomId: string }) => {
        try {
          await this.joinRoom(socket.id, data.roomId);
          socket.join(data.roomId);
        } catch (error) {
          logger.error({ err: error, socketId: socket.id }, 'Error joining room');
          socket.emit('error', { message: 'Failed to join room' });
        }
      });

      // Handle room leave
      socket.on('room:leave', async (data: { roomId: string }) => {
        try {
          await this.leaveRoom(socket.id, data.roomId);
          socket.leave(data.roomId);
        } catch (error) {
          logger.error({ err: error, socketId: socket.id }, 'Error leaving room');
        }
      });

      // Handle message
      socket.on(
        'message',
        async (data: {
          roomId: string;
          content: string;
          type?: Message['type'];
          metadata?: Record<string, unknown>;
        }) => {
          try {
            const user = this.getUser(socket.id);
            if (!user) {
              socket.emit('error', { message: 'User not found' });
              return;
            }

            const message = await this.sendMessage(
              data.roomId,
              user.id,
              data.content,
              data.type,
              data.metadata
            );

            // Broadcast to room
            this.io?.to(data.roomId).emit('message', message);
          } catch (error) {
            logger.error({ err: error, socketId: socket.id }, 'Error sending message');
            socket.emit('error', { message: 'Failed to send message' });
          }
        }
      );

      // Handle typing indicator
      socket.on('typing', (data: { roomId: string; isTyping: boolean }) => {
        const user = this.getUser(socket.id);
        if (user) {
          socket.to(data.roomId).emit('typing', {
            userId: user.id,
            username: user.username,
            roomId: data.roomId,
            isTyping: data.isTyping,
            timestamp: new Date(),
          });
        }
      });
    });

    logger.info('Socket.io connection handlers configured');
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
    data: unknown,
    options?: BroadcastOptions
  ): Promise<void> {
    const room = rooms.get(roomId);

    if (!room) {
      throw new Error('Room not found');
    }

    if (this.io) {
      // Use Socket.io room broadcasting
      const except = options?.except || [];
      if (except.length > 0) {
        // Emit to room except specific sockets
        for (const socketId of room.members) {
          if (!except.includes(socketId)) {
            this.io.to(socketId).emit(event, data);
          }
        }
      } else {
        // Emit to entire room
        this.io.to(roomId).emit(event, data);
      }

      logger.debug({ event, roomId, memberCount: room.members.size }, 'Broadcast to room');
    } else {
      logger.debug({ event, roomId }, 'WebSocket not initialized - skipping broadcast');
    }
  }

  /**
   * Broadcast to specific users
   */
  async broadcastToUsers(userIds: string[], event: string, data: unknown): Promise<void> {
    if (this.io) {
      for (const userId of userIds) {
        const socketIds = userSockets.get(userId);

        if (socketIds) {
          for (const socketId of socketIds) {
            this.io.to(socketId).emit(event, data);
            logger.debug({ socketId, userId, event }, 'Broadcasting to user');
          }
        }
      }

      logger.debug({ event, userCount: userIds.length }, 'Broadcast to users');
    } else {
      logger.debug(
        { event, userCount: userIds.length },
        'WebSocket not initialized - skipping broadcast'
      );
    }
  }

  /**
   * Broadcast to all connected users
   */
  async broadcastToAll(event: string, data: unknown, options?: BroadcastOptions): Promise<void> {
    if (this.io) {
      const except = options?.except || [];

      if (except.length > 0) {
        // Emit to all except specific sockets
        for (const socketId of connectedUsers.keys()) {
          if (!except.includes(socketId)) {
            this.io.to(socketId).emit(event, data);
          }
        }
      } else {
        // Emit to all connected sockets
        this.io.emit(event, data);
      }

      logger.debug({ event, totalUsers: connectedUsers.size }, 'Broadcast to all users');
    } else {
      logger.debug({ event }, 'WebSocket not initialized - skipping broadcast');
    }
  }

  /**
   * Emit event to specific socket
   */
  async emitToSocket(socketId: string, event: string, data: unknown): Promise<void> {
    if (this.io) {
      this.io.to(socketId).emit(event, data);
      logger.debug({ socketId, event }, 'Emit to socket');
    } else {
      logger.debug({ socketId, event }, 'WebSocket not initialized - skipping emit');
    }
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

    if (socketIds && this.io) {
      for (const socketId of socketIds) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
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

    // Close Redis clients
    if (this.pubClient) {
      await this.pubClient.quit();
      this.pubClient = null;
    }

    if (this.subClient) {
      await this.subClient.quit();
      this.subClient = null;
    }

    // Close Socket.io server
    if (this.io) {
      await new Promise<void>((resolve) => {
        this.io?.close(() => {
          resolve();
        });
      });
      this.io = null;
    }

    logger.info('WebSocket service shut down');
  }
}
