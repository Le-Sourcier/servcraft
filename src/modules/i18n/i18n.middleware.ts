import type { Request, Response, NextFunction } from 'express';
import type { I18nService } from './i18n.service.js';
import type { I18nMiddlewareOptions, LocaleDetectionResult, Locale } from './types.js';

/**
 * Request with i18n properties
 */
export interface I18nRequest extends Request {
  locale?: Locale;
  t?: (key: string, options?: Record<string, unknown>) => string;
  localeDetection?: LocaleDetectionResult;
}

/**
 * Create i18n middleware
 */
export function createI18nMiddleware(
  i18nService: I18nService,
  options: I18nMiddlewareOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const {
    queryParam = 'lang',
    cookieName = 'locale',
    headerName = 'Accept-Language',
    detectFromHeader = true,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const i18nReq = req as I18nRequest;

    // Detect locale
    const detection = detectLocale(req, i18nService, {
      queryParam,
      cookieName,
      headerName,
      detectFromHeader,
    });

    i18nReq.locale = detection.locale;
    i18nReq.localeDetection = detection;

    // Add translation function to request
    i18nReq.t = (key: string, options?: Record<string, unknown>) => {
      return i18nService.t(key, {
        ...options,
        locale: i18nReq.locale,
      });
    };

    // Set Content-Language header
    res.setHeader('Content-Language', detection.locale);

    next();
  };
}

/**
 * Detect locale from request
 */
export function detectLocale(
  req: Request,
  i18nService: I18nService,
  options: I18nMiddlewareOptions = {}
): LocaleDetectionResult {
  const {
    queryParam = 'lang',
    cookieName = 'locale',
    headerName = 'Accept-Language',
    detectFromHeader = true,
  } = options;

  // 1. Check query parameter
  if (queryParam && req.query[queryParam]) {
    const locale = req.query[queryParam] as string;
    if (i18nService.isLocaleSupported(locale)) {
      return {
        locale,
        source: 'query',
        confidence: 1.0,
      };
    }
  }

  // 2. Check cookie
  if (cookieName && req.cookies && req.cookies[cookieName]) {
    const locale = req.cookies[cookieName] as string;
    if (i18nService.isLocaleSupported(locale)) {
      return {
        locale,
        source: 'cookie',
        confidence: 0.9,
      };
    }
  }

  // 3. Check Accept-Language header
  if (detectFromHeader && headerName) {
    const acceptLanguage = req.headers[headerName.toLowerCase()] as string | undefined;
    if (acceptLanguage) {
      const detectedLocale = parseAcceptLanguage(acceptLanguage, i18nService);
      if (detectedLocale) {
        return {
          locale: detectedLocale.locale,
          source: 'header',
          confidence: detectedLocale.quality,
        };
      }
    }
  }

  // 4. Use default locale
  return {
    locale: i18nService.getSupportedLocales()[0],
    source: 'default',
    confidence: 0.5,
  };
}

/**
 * Parse Accept-Language header
 */
function parseAcceptLanguage(
  header: string,
  i18nService: I18nService
): { locale: Locale; quality: number } | null {
  const languages = header
    .split(',')
    .map((lang) => {
      const parts = lang.trim().split(';');
      const locale = parts[0].split('-')[0]; // Get base language (e.g., 'en' from 'en-US')
      const qMatch = parts[1]?.match(/q=([\d.]+)/);
      const quality = qMatch ? parseFloat(qMatch[1]) : 1.0;

      return { locale, quality };
    })
    .sort((a, b) => b.quality - a.quality);

  // Find first supported locale
  for (const lang of languages) {
    if (i18nService.isLocaleSupported(lang.locale)) {
      return lang;
    }
  }

  return null;
}

/**
 * Locale switcher middleware
 */
export function localeSwitcher(
  i18nService: I18nService,
  cookieName = 'locale'
): (req: Request, res: Response) => void {
  return (req: Request, res: Response): void => {
    const { locale } = req.body as { locale?: string };

    if (!locale) {
      res.status(400).json({ error: 'Locale is required' });
      return;
    }

    if (!i18nService.isLocaleSupported(locale)) {
      res.status(400).json({
        error: 'Unsupported locale',
        supportedLocales: i18nService.getSupportedLocales(),
      });
      return;
    }

    // Set cookie
    res.cookie(cookieName, locale, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      sameSite: 'lax',
    });

    res.json({
      success: true,
      locale,
    });
  };
}
