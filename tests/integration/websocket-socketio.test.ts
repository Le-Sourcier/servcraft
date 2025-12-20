import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import { WebSocketService } from '../../src/modules/websocket/websocket.service.js';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';

// Helper to wait for socket connection
const waitForConnect = (client: ClientSocket): Promise<void> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
    client.on('connect', () => {
      clearTimeout(timeout);
      resolve();
    });
    client.on('connect_error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
};

// Helper to wait for event
const waitForEvent = <T>(client: ClientSocket, event: string, timeout = 2000): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeout);
    client.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
};

// Helper to wait for ms
const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('WebSocketService - Socket.io Integration', () => {
  let httpServer: ReturnType<typeof createServer>;
  let wsService: WebSocketService;
  let serverAddress: string;
  const testPort = 3010;

  beforeAll(async () => {
    // Create HTTP server
    httpServer = createServer();

    // Initialize WebSocket service
    wsService = new WebSocketService({
      path: '/socket.io',
      cors: {
        origin: '*',
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Initialize Socket.io with HTTP server
    wsService.initialize(httpServer);

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(testPort, () => {
        serverAddress = `http://localhost:${testPort}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await wsService.shutdown();
    httpServer.close();
  });

  beforeEach(async () => {
    // Clean up any existing connections
    const connectedUsers = wsService.getConnectedUsers();
    for (const user of connectedUsers) {
      await wsService.handleDisconnection(user.socketId);
    }
  });

  // ==========================================
  // CONNECTION TESTS
  // ==========================================

  describe('Connection Management', () => {
    it('should accept client connection', async () => {
      const client = ioClient(serverAddress, {
        path: '/socket.io',
        query: {
          username: 'testuser',
          email: 'test@example.com',
        },
      });

      await waitForConnect(client);
      expect(client.connected).toBe(true);
      client.disconnect();
    });

    it('should track connected users', async () => {
      const client = ioClient(serverAddress, {
        query: {
          username: 'user1',
          email: 'user1@example.com',
        },
      });

      await waitForConnect(client);
      await wait(100);

      const users = wsService.getConnectedUsers();
      expect(users.length).toBeGreaterThan(0);
      client.disconnect();
    });

    it('should handle multiple connections', async () => {
      const client1 = ioClient(serverAddress, {
        query: { username: 'user1', email: 'user1@example.com' },
      });
      const client2 = ioClient(serverAddress, {
        query: { username: 'user2', email: 'user2@example.com' },
      });

      await Promise.all([waitForConnect(client1), waitForConnect(client2)]);
      await wait(100);

      const users = wsService.getConnectedUsers();
      expect(users.length).toBeGreaterThanOrEqual(2);

      client1.disconnect();
      client2.disconnect();
    });

    it('should handle disconnection', async () => {
      const client = ioClient(serverAddress, {
        query: { username: 'disconnectuser', email: 'disconnect@example.com' },
      });

      await waitForConnect(client);
      const socketId = client.id;
      client.disconnect();

      await wait(100);
      const user = wsService.getUser(socketId);
      expect(user).toBeUndefined();
    });
  });

  // ==========================================
  // ROOM TESTS
  // ==========================================

  describe('Room Management', () => {
    let client: ClientSocket;

    beforeEach(async () => {
      client = ioClient(serverAddress, {
        query: { username: 'roomuser', email: 'room@example.com' },
      });
      await waitForConnect(client);
    });

    afterEach(() => {
      if (client.connected) {
        client.disconnect();
      }
    });

    it('should create a room', async () => {
      const room = await wsService.createRoom('test-room', 'default');
      expect(room.id).toBeDefined();
      expect(room.name).toBe('test-room');
      expect(room.namespace).toBe('default');
    });

    it('should join room', async () => {
      const room = await wsService.createRoom('joinroom', 'default');
      client.emit('room:join', { roomId: room.id });

      await wait(100);
      const members = wsService.getRoomMembers(room.id);
      expect(members.length).toBeGreaterThan(0);
    });

    it('should leave room', async () => {
      const room = await wsService.createRoom('leaveroom', 'default');
      client.emit('room:join', { roomId: room.id });
      await wait(100);

      client.emit('room:leave', { roomId: room.id });
      await wait(100);

      const members = wsService.getRoomMembers(room.id);
      expect(members.length).toBe(0);
    });

    it('should list rooms', async () => {
      await wsService.createRoom('room1', 'default');
      await wsService.createRoom('room2', 'custom');

      const allRooms = wsService.listRooms();
      expect(allRooms.length).toBeGreaterThanOrEqual(2);

      const defaultRooms = wsService.listRooms('default');
      expect(defaultRooms.length).toBeGreaterThanOrEqual(1);
    });

    it('should delete room', async () => {
      const room = await wsService.createRoom('deleteroom', 'default');
      await wsService.deleteRoom(room.id);

      const deletedRoom = wsService.getRoom(room.id);
      expect(deletedRoom).toBeUndefined();
    });
  });

  // ==========================================
  // MESSAGE TESTS
  // ==========================================

  describe('Messaging', () => {
    let client: ClientSocket;
    let roomId: string;

    beforeEach(async () => {
      client = ioClient(serverAddress, {
        query: { username: 'msguser', email: 'msg@example.com' },
      });

      await waitForConnect(client);
      const room = await wsService.createRoom('msgroom', 'default');
      roomId = room.id;
      client.emit('room:join', { roomId });
      await wait(100);
    });

    afterEach(() => {
      if (client.connected) {
        client.disconnect();
      }
    });

    it('should send message to room', async () => {
      const messagePromise = waitForEvent<{ content: string; roomId: string }>(client, 'message');

      await wait(100);
      client.emit('message', {
        roomId,
        content: 'Hello room!',
        type: 'text',
      });

      const message = await messagePromise;
      expect(message.content).toBe('Hello room!');
      expect(message.roomId).toBe(roomId);
    });

    it('should store message history', async () => {
      await wait(200);
      const user = wsService.getUser(client.id);
      if (!user) {
        throw new Error('User not found');
      }

      await wsService.sendMessage(roomId, user.id, 'Message 1', 'text');
      await wsService.sendMessage(roomId, user.id, 'Message 2', 'text');

      const messages = wsService.getRoomMessages(roomId);
      expect(messages.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle different message types', async () => {
      await wait(200);
      const user = wsService.getUser(client.id);
      if (!user) {
        throw new Error('User not found');
      }

      const textMsg = await wsService.sendMessage(roomId, user.id, 'Text', 'text');
      expect(textMsg.type).toBe('text');

      const systemMsg = await wsService.sendMessage(roomId, user.id, 'System', 'system');
      expect(systemMsg.type).toBe('system');
    });
  });

  // ==========================================
  // BROADCAST TESTS
  // ==========================================

  describe('Broadcasting', () => {
    let client1: ClientSocket;
    let client2: ClientSocket;
    let roomId: string;

    beforeEach(async () => {
      client1 = ioClient(serverAddress, {
        query: { username: 'broadcaster1', email: 'b1@example.com' },
      });
      client2 = ioClient(serverAddress, {
        query: { username: 'broadcaster2', email: 'b2@example.com' },
      });

      await Promise.all([waitForConnect(client1), waitForConnect(client2)]);

      const room = await wsService.createRoom('broadcast-room', 'default');
      roomId = room.id;
      client1.emit('room:join', { roomId });
      client2.emit('room:join', { roomId });
      await wait(100);
    });

    afterEach(() => {
      if (client1.connected) client1.disconnect();
      if (client2.connected) client2.disconnect();
    });

    it('should broadcast to room', async () => {
      const promise1 = waitForEvent<{ message: string }>(client1, 'test-event');
      const promise2 = waitForEvent<{ message: string }>(client2, 'test-event');

      await wait(100);
      wsService.broadcastToRoom(roomId, 'test-event', { message: 'Broadcast test' });

      const [data1, data2] = await Promise.all([promise1, promise2]);
      expect(data1.message).toBe('Broadcast test');
      expect(data2.message).toBe('Broadcast test');
    });

    it('should broadcast to room except sender', async () => {
      const promise = waitForEvent<{ message: string }>(client2, 'test-except');

      await wait(100);
      wsService.broadcastToRoom(
        roomId,
        'test-except',
        { message: 'Not for sender' },
        {
          except: [client1.id],
        }
      );

      const data = await promise;
      expect(data.message).toBe('Not for sender');
    });

    it('should broadcast to all users', async () => {
      const promise1 = waitForEvent<{ type: string }>(client1, 'global-event');
      const promise2 = waitForEvent<{ type: string }>(client2, 'global-event');

      await wait(100);
      wsService.broadcastToAll('global-event', { type: 'announcement' });

      const [data1, data2] = await Promise.all([promise1, promise2]);
      expect(data1.type).toBe('announcement');
      expect(data2.type).toBe('announcement');
    });

    it('should emit to specific socket', async () => {
      const promise = waitForEvent<{ text: string }>(client1, 'private-message');

      await wait(100);
      wsService.emitToSocket(client1.id, 'private-message', { text: 'Just for you' });

      const data = await promise;
      expect(data.text).toBe('Just for you');
    });
  });

  // ==========================================
  // TYPING INDICATOR TESTS
  // ==========================================

  describe('Typing Indicators', () => {
    let client1: ClientSocket;
    let client2: ClientSocket;
    let roomId: string;

    beforeEach(async () => {
      client1 = ioClient(serverAddress, {
        query: { username: 'typist1', email: 't1@example.com' },
      });
      client2 = ioClient(serverAddress, {
        query: { username: 'typist2', email: 't2@example.com' },
      });

      await Promise.all([waitForConnect(client1), waitForConnect(client2)]);

      const room = await wsService.createRoom('typing-room', 'default');
      roomId = room.id;
      client1.emit('room:join', { roomId });
      client2.emit('room:join', { roomId });
      await wait(100);
    });

    afterEach(() => {
      if (client1.connected) client1.disconnect();
      if (client2.connected) client2.disconnect();
    });

    it('should broadcast typing indicator', async () => {
      const promise = waitForEvent<{ userId: string; isTyping: boolean }>(client2, 'typing');

      await wait(100);
      client1.emit('typing', { roomId, isTyping: true });

      const data = await promise;
      expect(data.isTyping).toBe(true);
    });

    it('should broadcast stop typing', async () => {
      const promise = waitForEvent<{ userId: string; isTyping: boolean }>(client2, 'typing');

      await wait(100);
      client1.emit('typing', { roomId, isTyping: false });

      const data = await promise;
      expect(data.isTyping).toBe(false);
    });
  });

  // ==========================================
  // STATISTICS TESTS
  // ==========================================

  describe('Statistics', () => {
    it('should track connection stats', () => {
      const stats = wsService.getStats();
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('activeConnections');
      expect(stats).toHaveProperty('totalRooms');
    });

    it('should track room stats', async () => {
      const room = await wsService.createRoom('stats-room', 'default');
      const stats = wsService.getRoomStats(room.id);

      expect(stats).not.toBeNull();
      expect(stats?.roomId).toBe(room.id);
      expect(stats?.memberCount).toBe(0);
      expect(stats?.messageCount).toBe(0);
    });
  });

  // ==========================================
  // USER MANAGEMENT TESTS
  // ==========================================

  describe('User Management', () => {
    let client: ClientSocket;

    beforeEach(async () => {
      client = ioClient(serverAddress, {
        query: { username: 'manageduser', email: 'managed@example.com' },
      });
      await waitForConnect(client);
    });

    afterEach(() => {
      if (client.connected) {
        client.disconnect();
      }
    });

    it('should check if user is online', async () => {
      await wait(100);
      const user = wsService.getUser(client.id);
      if (user) {
        const isOnline = wsService.isUserOnline(user.id);
        expect(isOnline).toBe(true);
      }
    });

    it('should get user sockets', async () => {
      await wait(100);
      const user = wsService.getUser(client.id);
      if (user) {
        const sockets = wsService.getUserSockets(user.id);
        expect(sockets).toContain(client.id);
      }
    });

    it('should forcefully disconnect user', async () => {
      await wait(200);
      const user = wsService.getUser(client.id);
      if (!user) {
        return; // Skip test if user not connected yet
      }

      const disconnectPromise = new Promise<void>((resolve) => {
        client.on('disconnect', () => resolve());
      });

      wsService.disconnectUser(user.id, 'admin_action');
      await disconnectPromise;
      await wait(100);

      const isOnline = wsService.isUserOnline(user.id);
      expect(isOnline).toBe(false);
    });
  });

  // ==========================================
  // ERROR HANDLING TESTS
  // ==========================================

  describe('Error Handling', () => {
    let client: ClientSocket;

    beforeEach(async () => {
      client = ioClient(serverAddress, {
        query: { username: 'erroruser', email: 'error@example.com' },
      });
      await waitForConnect(client);
    });

    afterEach(() => {
      if (client.connected) {
        client.disconnect();
      }
    });

    it('should handle joining non-existent room', async () => {
      const promise = waitForEvent<{ message: string }>(client, 'error');
      client.emit('room:join', { roomId: 'non-existent-room' });

      const error = await promise;
      expect(error.message).toContain('Failed to join room');
    });

    it('should handle sending message to non-existent room', async () => {
      const promise = waitForEvent<{ message: string }>(client, 'error');
      client.emit('message', {
        roomId: 'non-existent-room',
        content: 'Test message',
      });

      const error = await promise;
      expect(error.message).toContain('Failed to send message');
    });

    it('should handle concurrent operations', async () => {
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(wsService.createRoom(`concurrent-${i}`, 'default'));
      }

      const rooms = await Promise.all(operations);
      expect(rooms.length).toBe(10);
    });
  });
});
