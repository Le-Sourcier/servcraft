export interface WebSocketConfig {
  /** CORS origin */
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
  /** Path for socket.io */
  path?: string;
  /** Redis adapter for scaling */
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  /** Enable ping timeout */
  pingTimeout?: number;
  /** Ping interval */
  pingInterval?: number;
  /** Max payload size */
  maxHttpBufferSize?: number;
}

export interface SocketUser {
  id: string;
  socketId: string;
  username?: string;
  email?: string;
  roles?: string[];
  metadata?: Record<string, unknown>;
  connectedAt: Date;
  lastActivity: Date;
}

export interface Room {
  id: string;
  name: string;
  namespace: string;
  members: Set<string>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  createdBy?: string;
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  username?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  metadata?: Record<string, unknown>;
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
}

export interface PresenceStatus {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  metadata?: Record<string, unknown>;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

export interface TypingIndicator {
  userId: string;
  username?: string;
  roomId: string;
  timestamp: Date;
}

export interface WebSocketEvent {
  event: string;
  data: unknown;
  timestamp: Date;
  userId?: string;
  socketId?: string;
  roomId?: string;
}

export interface BroadcastOptions {
  /** Target room */
  room?: string;
  /** Target namespace */
  namespace?: string;
  /** Exclude specific socket IDs */
  except?: string[];
  /** Only send to specific user IDs */
  users?: string[];
  /** Include metadata */
  metadata?: Record<string, unknown>;
}

export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  totalRooms: number;
  messagesPerMinute: number;
  bytesPerMinute: number;
  avgLatency: number;
}

export interface RoomStats {
  roomId: string;
  memberCount: number;
  messageCount: number;
  createdAt: Date;
  lastActivity: Date;
}

// Event types
export type SocketEventType =
  | 'connection'
  | 'disconnect'
  | 'message'
  | 'typing'
  | 'presence'
  | 'notification'
  | 'room:join'
  | 'room:leave'
  | 'room:create'
  | 'error';

// Socket.io event handlers
export interface SocketHandlers {
  onConnection?: (socket: SocketUser) => void | Promise<void>;
  onDisconnect?: (socket: SocketUser, reason: string) => void | Promise<void>;
  onMessage?: (message: Message) => void | Promise<void>;
  onError?: (error: Error, socket?: SocketUser) => void | Promise<void>;
}

// Middleware types
export interface SocketMiddleware {
  (socket: unknown, next: (err?: Error) => void): void | Promise<void>;
}

export interface AuthenticatedSocket {
  id: string;
  userId?: string;
  user?: SocketUser;
  rooms: Set<string>;
  handshake: {
    auth: Record<string, unknown>;
    headers: Record<string, string>;
    query: Record<string, string>;
  };
  emit: (event: string, ...args: unknown[]) => boolean;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  join: (room: string) => void;
  leave: (room: string) => void;
  disconnect: (close?: boolean) => void;
}

export interface ChatMessage extends Message {
  replyTo?: string;
  mentions?: string[];
  attachments?: Array<{
    type: string;
    url: string;
    name: string;
    size: number;
  }>;
}

export interface LiveEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: Date;
  source?: string;
}
