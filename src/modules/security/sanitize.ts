/**
 * Input Sanitization Module
 * Prevents XSS attacks by sanitizing user input
 */

// HTML entities to escape
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

// Regex patterns for dangerous content
const SCRIPT_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_HANDLER_PATTERN = /\s*on\w+\s*=\s*(['"])[^'"]*\1/gi;
const JAVASCRIPT_URL_PATTERN = /javascript\s*:/gi;
const DATA_URL_PATTERN = /data\s*:/gi;
const EXPRESSION_PATTERN = /expression\s*\(/gi;
const VBSCRIPT_PATTERN = /vbscript\s*:/gi;

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Remove dangerous HTML tags and attributes
 */
export function stripDangerousHtml(str: string): string {
  if (typeof str !== 'string') return str;

  return str
    .replace(SCRIPT_PATTERN, '')
    .replace(EVENT_HANDLER_PATTERN, '')
    .replace(JAVASCRIPT_URL_PATTERN, '')
    .replace(DATA_URL_PATTERN, '')
    .replace(EXPRESSION_PATTERN, '')
    .replace(VBSCRIPT_PATTERN, '');
}

/**
 * Sanitize a string for safe output
 */
export function sanitizeString(str: string, options: SanitizeOptions = {}): string {
  if (typeof str !== 'string') return str;

  const { escapeHtmlChars = true, stripScripts = true, trim = true, maxLength } = options;

  let result = str;

  if (trim) {
    result = result.trim();
  }

  if (stripScripts) {
    result = stripDangerousHtml(result);
  }

  if (escapeHtmlChars) {
    result = escapeHtml(result);
  }

  if (maxLength && result.length > maxLength) {
    result = result.substring(0, maxLength);
  }

  return result;
}

/**
 * Sanitize an object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: SanitizeOptions = {}
): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (typeof item === 'string') {
        return sanitizeString(item, options);
      }
      if (typeof item === 'object' && item !== null) {
        return sanitizeObject(item as Record<string, unknown>, options);
      }
      return item;
    }) as unknown as T;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Sanitize the key as well (prevent prototype pollution)
    const safeKey = sanitizeString(key, { escapeHtmlChars: false, stripScripts: true });

    // Skip dangerous keys
    if (safeKey === '__proto__' || safeKey === 'constructor' || safeKey === 'prototype') {
      continue;
    }

    if (typeof value === 'string') {
      sanitized[safeKey] = sanitizeString(value, options);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[safeKey] = sanitizeObject(value as Record<string, unknown>, options);
    } else {
      sanitized[safeKey] = value;
    }
  }

  return sanitized as T;
}

/**
 * Sanitize SQL-like patterns (additional protection layer)
 * Note: Prisma already handles SQL injection, this is defense-in-depth
 */
export function sanitizeSqlPatterns(str: string): string {
  if (typeof str !== 'string') return str;

  return str
    .replace(/--/g, '')
    .replace(/;/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/xp_/gi, '')
    .replace(/union\s+select/gi, '')
    .replace(/insert\s+into/gi, '')
    .replace(/drop\s+table/gi, '')
    .replace(/delete\s+from/gi, '');
}

/**
 * Sanitize for safe URL usage
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') return '';

  const sanitized = url.trim().toLowerCase();

  // Block dangerous protocols
  if (
    sanitized.startsWith('javascript:') ||
    sanitized.startsWith('data:') ||
    sanitized.startsWith('vbscript:')
  ) {
    return '';
  }

  return url;
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') return '';

  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe chars with underscore
    .replace(/\.{2,}/g, '.') // Remove multiple dots
    .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
    .substring(0, 255); // Limit length
}

/**
 * Sanitize for JSON output (prevent JSON injection)
 */
export function sanitizeForJson(str: string): string {
  if (typeof str !== 'string') return str;

  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Check if a string contains potentially dangerous content
 */
export function containsDangerousContent(str: string): boolean {
  if (typeof str !== 'string') return false;

  return (
    SCRIPT_PATTERN.test(str) ||
    EVENT_HANDLER_PATTERN.test(str) ||
    JAVASCRIPT_URL_PATTERN.test(str) ||
    /<iframe/i.test(str) ||
    /<object/i.test(str) ||
    /<embed/i.test(str) ||
    /<form/i.test(str)
  );
}

export interface SanitizeOptions {
  /** Escape HTML characters (default: true) */
  escapeHtmlChars?: boolean;
  /** Strip script tags and event handlers (default: true) */
  stripScripts?: boolean;
  /** Trim whitespace (default: true) */
  trim?: boolean;
  /** Maximum length of string */
  maxLength?: number;
}

export interface SanitizeMiddlewareOptions extends SanitizeOptions {
  /** Fields to skip sanitization */
  skipFields?: string[];
  /** Only sanitize these fields */
  onlyFields?: string[];
}
