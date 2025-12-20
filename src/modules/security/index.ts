/**
 * Security Module
 * Comprehensive security features for the application
 */

// Sanitization
export {
  escapeHtml,
  stripDangerousHtml,
  sanitizeString,
  sanitizeObject,
  sanitizeSqlPatterns,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeForJson,
  containsDangerousContent,
  type SanitizeOptions,
  type SanitizeMiddlewareOptions,
} from './sanitize.js';

// Middleware
export {
  sanitizeInput,
  csrfProtection,
  generateCsrfToken,
  hppProtection,
  securityHeaders,
  requestSizeLimit,
  suspiciousActivityDetection,
  registerSecurityMiddlewares,
} from './security.middleware.js';

// Security Audit
export {
  SecurityAuditService,
  getSecurityAuditService,
  type SecurityEvent,
  type SecurityEventType,
  type SecurityEventInput,
} from './security-audit.service.js';
