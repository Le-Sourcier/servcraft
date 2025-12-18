export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'register'
  | 'password_change'
  | 'password_reset'
  | 'email_verify'
  | 'role_change'
  | 'status_change'
  | 'settings_change';

export interface AuditLogEntry {
  userId?: string;
  action: AuditAction | string;
  resource: string;
  resourceId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogQuery {
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}
