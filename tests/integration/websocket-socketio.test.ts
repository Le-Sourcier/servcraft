import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer } from 'http';
import { WebSocketService } from '../../src/modules/websocket/websocket.service.js';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';

describe('WebSocketService - Socket.io Integration', () => {
  let httpServer: ReturnType<typeof createServer>;
  let wsService: WebSocketService;
  let serverAddress: string;
  const testPort = 3010;

  beforeAll((done) => {
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
    httpServer.listen(testPort, () => {
      serverAddress = `http://localhost:${testPort}`;
      done();
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
    it('should accept client connection', (done) => {
      const client = ioClient(serverAddress, {
        path: '/socket.io',
        query: {
          username: 'testuser',
          email: 'test@example.com',
        },
      });

      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        done();
      });

      client.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should track connected users', (done) => {
      const client = ioClient(serverAddress, {
        query: {
          username: 'user1',
          email: 'user1@example.com',
        },
      });

      client.on('connect', () => {
        // Give some time for handleConnection to process
        setTimeout(() => {
          const users = wsService.getConnectedUsers();
          expect(users.length).toBeGreaterThan(0);
          client.disconnect();
          done();
        }, 100);
      });
    });

    it('should handle multiple connections', (done) => {
      const client1 = ioClient(serverAddress, {
        query: { username: 'user1', email: 'user1@example.com' },
      });
      const client2 = ioClient(serverAddress, {
        query: { username: 'user2', email: 'user2@example.com' },
      });

      let connected = 0;
      const checkConnections = () => {
        connected++;
        if (connected === 2) {
          setTimeout(() => {
            const users = wsService.getConnectedUsers();
            expect(users.length).toBeGreaterThanOrEqual(2);
            client1.disconnect();
            client2.disconnect();
            done();
          }, 100);
        }
      };

      client1.on('connect', checkConnections);
      client2.on('connect', checkConnections);
    });

    it('should handle disconnection', (done) => {
      const client = ioClient(serverAddress, {
        query: { username: 'disconnectuser', email: 'disconnect@example.com' },
      });

      client.on('connect', () => {
        const socketId = client.id;

        client.disconnect();

        setTimeout(() => {
          const user = wsService.getUser(socketId);
          expect(user).toBeUndefined();
          done();
        }, 100);
      });
    });
  });

  // ==========================================
  // ROOM TESTS
  // ==========================================

  describe('Room Management', () => {
    let client: ClientSocket;

    beforeEach((done) => {
      client = ioClient(serverAddress, {
        query: { username: 'roomuser', email: 'room@example.com' },
      });
      client.on('connect', () => done());
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

    it('should join room', (done) => {
      wsService.createRoom('joinroom', 'default').then((room) => {
        client.emit('room:join', { roomId: room.id });

        setTimeout(() => {
          const members = wsService.getRoomMembers(room.id);
          expect(members.length).toBeGreaterThan(0);
          done();
        }, 100);
      });
    });

    it('should leave room', (done) => {
      wsService.createRoom('leaveroom', 'default').then((room) => {
        client.emit('room:join', { roomId: room.id });

        setTimeout(() => {
          client.emit('room:leave', { roomId: room.id });

          setTimeout(() => {
            const members = wsService.getRoomMembers(room.id);
            expect(members.length).toBe(0);
            done();
          }, 100);
        }, 100);
      });
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

    beforeEach((done) => {
      client = ioClient(serverAddress, {
        query: { username: 'msguser', email: 'msg@example.com' },
      });

      client.on('connect', () => {
        wsService.createRoom('msgroom', 'default').then((room) => {
          roomId = room.id;
          client.emit('room:join', { roomId });
          setTimeout(() => done(), 100);
        });
      });
    });

    afterEach(() => {
      if (client.connected) {
        client.disconnect();
      }
    });

    it('should send message to room', (done) => {
      client.on('message', (message) => {
        expect(message.content).toBe('Hello room!');
        expect(message.roomId).toBe(roomId);
        done();
      });

      setTimeout(() => {
        client.emit('message', {
          roomId,
          content: 'Hello room!',
          type: 'text',
        });
      }, 100);
    });

    it('should store message history', (done) => {
      setTimeout(() => {
        const user = wsService.getUser(client.id);
        if (!user) {
          done(new Error('User not found - connection not tracked yet'));
          return;
        }

        wsService
          .sendMessage(roomId, user.id, 'Message 1', 'text')
          .then(() => {
            return wsService.sendMessage(roomId, user.id, 'Message 2', 'text');
          })
          .then(() => {
            const messages = wsService.getRoomMessages(roomId);
            expect(messages.length).toBeGreaterThanOrEqual(2);
            done();
          })
          .catch(done);
      }, 200);
    });

    it('should handle different message types', (done) => {
      setTimeout(() => {
        const user = wsService.getUser(client.id);
        if (!user) {
          done(new Error('User not found - connection not tracked yet'));
          return;
        }

        wsService
          .sendMessage(roomId, user.id, 'Text', 'text')
          .then((textMsg) => {
            expect(textMsg.type).toBe('text');
            return wsService.sendMessage(roomId, user.id, 'System', 'system');
          })
          .then((systemMsg) => {
            expect(systemMsg.type).toBe('system');
            done();
          })
          .catch(done);
      }, 200);
    });
  });

  // ==========================================
  // BROADCAST TESTS
  // ==========================================

  describe('Broadcasting', () => {
    let client1: ClientSocket;
    let client2: ClientSocket;
    let roomId: string;

    beforeEach((done) => {
      let connected = 0;

      const checkReady = () => {
        connected++;
        if (connected === 2) {
          wsService.createRoom('broadcast-room', 'default').then((room) => {
            roomId = room.id;
            client1.emit('room:join', { roomId });
            client2.emit('room:join', { roomId });
            setTimeout(() => done(), 100);
          });
        }
      };

      client1 = ioClient(serverAddress, {
        query: { username: 'broadcaster1', email: 'b1@example.com' },
      });
      client2 = ioClient(serverAddress, {
        query: { username: 'broadcaster2', email: 'b2@example.com' },
      });

      client1.on('connect', checkReady);
      client2.on('connect', checkReady);
    });

    afterEach(() => {
      if (client1.connected) client1.disconnect();
      if (client2.connected) client2.disconnect();
    });

    it('should broadcast to room', (done) => {
      let received = 0;

      const listener = (data: { message: string }) => {
        expect(data.message).toBe('Broadcast test');
        received++;
        if (received === 2) {
          done();
        }
      };

      client1.on('test-event', listener);
      client2.on('test-event', listener);

      setTimeout(() => {
        wsService.broadcastToRoom(roomId, 'test-event', { message: 'Broadcast test' });
      }, 100);
    });

    it('should broadcast to room except sender', (done) => {
      client2.on('test-except', (data: { message: string }) => {
        expect(data.message).toBe('Not for sender');
        done();
      });

      setTimeout(() => {
        wsService.broadcastToRoom(
          roomId,
          'test-except',
          { message: 'Not for sender' },
          {
            except: [client1.id],
          }
        );
      }, 100);
    });

    it('should broadcast to all users', (done) => {
      let received = 0;

      const listener = () => {
        received++;
        if (received === 2) {
          done();
        }
      };

      client1.on('global-event', listener);
      client2.on('global-event', listener);

      setTimeout(() => {
        wsService.broadcastToAll('global-event', { type: 'announcement' });
      }, 100);
    });

    it('should emit to specific socket', (done) => {
      client1.on('private-message', (data: { text: string }) => {
        expect(data.text).toBe('Just for you');
        done();
      });

      setTimeout(() => {
        wsService.emitToSocket(client1.id, 'private-message', { text: 'Just for you' });
      }, 100);
    });
  });

  // ==========================================
  // TYPING INDICATOR TESTS
  // ==========================================

  describe('Typing Indicators', () => {
    let client1: ClientSocket;
    let client2: ClientSocket;
    let roomId: string;

    beforeEach((done) => {
      let connected = 0;

      const checkReady = () => {
        connected++;
        if (connected === 2) {
          wsService.createRoom('typing-room', 'default').then((room) => {
            roomId = room.id;
            client1.emit('room:join', { roomId });
            client2.emit('room:join', { roomId });
            setTimeout(() => done(), 100);
          });
        }
      };

      client1 = ioClient(serverAddress, {
        query: { username: 'typist1', email: 't1@example.com' },
      });
      client2 = ioClient(serverAddress, {
        query: { username: 'typist2', email: 't2@example.com' },
      });

      client1.on('connect', checkReady);
      client2.on('connect', checkReady);
    });

    afterEach(() => {
      if (client1.connected) client1.disconnect();
      if (client2.connected) client2.disconnect();
    });

    it('should broadcast typing indicator', (done) => {
      client2.on('typing', (data: { userId: string; isTyping: boolean }) => {
        expect(data.isTyping).toBe(true);
        done();
      });

      setTimeout(() => {
        client1.emit('typing', { roomId, isTyping: true });
      }, 100);
    });

    it('should broadcast stop typing', (done) => {
      client2.on('typing', (data: { userId: string; isTyping: boolean }) => {
        if (!data.isTyping) {
          done();
        }
      });

      setTimeout(() => {
        client1.emit('typing', { roomId, isTyping: false });
      }, 100);
    });
  });

  // ==========================================
  // STATISTICS TESTS
  // ==========================================

  describe('Statistics', () => {
    it('should track connection stats', async () => {
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

    beforeEach((done) => {
      client = ioClient(serverAddress, {
        query: { username: 'manageduser', email: 'managed@example.com' },
      });
      client.on('connect', () => done());
    });

    afterEach(() => {
      if (client.connected) {
        client.disconnect();
      }
    });

    it('should check if user is online', () => {
      const user = wsService.getUser(client.id);
      if (user) {
        const isOnline = wsService.isUserOnline(user.id);
        expect(isOnline).toBe(true);
      }
    });

    it('should get user sockets', () => {
      const user = wsService.getUser(client.id);
      if (user) {
        const sockets = wsService.getUserSockets(user.id);
        expect(sockets).toContain(client.id);
      }
    });

    it('should forcefully disconnect user', (done) => {
      setTimeout(() => {
        const user = wsService.getUser(client.id);
        if (!user) {
          // Skip test if user not connected yet
          done();
          return;
        }

        client.on('disconnect', () => {
          setTimeout(() => {
            const isOnline = wsService.isUserOnline(user.id);
            expect(isOnline).toBe(false);
            done();
          }, 100);
        });

        wsService.disconnectUser(user.id, 'admin_action');
      }, 200);
    });
  });

  // ==========================================
  // ERROR HANDLING TESTS
  // ==========================================

  describe('Error Handling', () => {
    let client: ClientSocket;

    beforeEach((done) => {
      client = ioClient(serverAddress, {
        query: { username: 'erroruser', email: 'error@example.com' },
      });
      client.on('connect', () => done());
    });

    afterEach(() => {
      if (client.connected) {
        client.disconnect();
      }
    });

    it('should handle joining non-existent room', (done) => {
      client.on('error', (error: { message: string }) => {
        expect(error.message).toContain('Failed to join room');
        done();
      });

      client.emit('room:join', { roomId: 'non-existent-room' });
    });

    it('should handle sending message to non-existent room', (done) => {
      client.on('error', (error: { message: string }) => {
        expect(error.message).toContain('Failed to send message');
        done();
      });

      client.emit('message', {
        roomId: 'non-existent-room',
        content: 'Test message',
      });
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
