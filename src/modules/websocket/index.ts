/**
 * WebSocket/Real-time Module
 *
 * Provides real-time communication with Socket.io:
 * - Real-time chat with typing indicators
 * - User presence tracking (online/offline)
 * - Live notifications
 * - Room management
 * - Live events broadcasting
 * - Authentication & authorization middlewares
 *
 * @example
 * ```typescript
 * import {
 *   WebSocketService,
 *   ChatFeature,
 *   PresenceFeature,
 *   NotificationFeature,
 *   authMiddleware
 * } from './modules/websocket';
 *
 * // Create WebSocket service
 * const wsService = new WebSocketService({
 *   cors: { origin: 'http://localhost:3000' },
 *   redis: { host: 'localhost', port: 6379 }
 * });
 *
 * // Initialize with HTTP server
 * wsService.initialize(httpServer);
 *
 * // Create features
 * const chat = new ChatFeature(wsService);
 * const presence = new PresenceFeature(wsService);
 * const notifications = new NotificationFeature(wsService);
 *
 * // Send chat message
 * await chat.sendMessage('room-123', 'user-456', 'Hello!', {
 *   mentions: ['user-789']
 * });
 *
 * // Send notification
 * await notifications.send(
 *   'user-123',
 *   'message',
 *   'New Message',
 *   'You have a new message from John'
 * );
 *
 * // Broadcast live event
 * await wsService.broadcastToAll('analytics:update', {
 *   metric: 'active_users',
 *   value: 1250
 * });
 * ```
 *
 * ## Client-side Integration
 *
 * ```typescript
 * import { io } from 'socket.io-client';
 *
 * const socket = io('http://localhost:3000', {
 *   auth: { token: 'your-jwt-token' },
 *   query: { username: 'john', namespace: 'chat' }
 * });
 *
 * // Listen for events
 * socket.on('chat:message', (message) => {
 *   console.log('New message:', message);
 * });
 *
 * socket.on('presence:status', (status) => {
 *   console.log('User status changed:', status);
 * });
 *
 * socket.on('notification:new', (notification) => {
 *   console.log('New notification:', notification);
 * });
 * ```
 */

// Types
export * from './types.js';

// Service
export { WebSocketService } from './websocket.service.js';

// Features
export {
  ChatFeature,
  PresenceFeature,
  NotificationFeature,
  LiveEventsFeature,
} from './features.js';

// Middlewares
export {
  authMiddleware,
  rateLimitMiddleware,
  corsMiddleware,
  loggingMiddleware,
  validationMiddleware,
  roleMiddleware,
  namespaceMiddleware,
  throttleMiddleware,
  errorMiddleware,
} from './middlewares.js';
