import { Router } from 'express';
import type { Request, Response } from 'express';
import type { I18nService } from './i18n.service.js';
import { localeSwitcher } from './i18n.middleware.js';
import type { I18nRequest } from './i18n.middleware.js';

/**
 * Create i18n routes
 */
export function createI18nRoutes(i18nService: I18nService): Router {
  const router = Router();

  /**
   * Get supported locales
   * GET /locales
   */
  router.get('/locales', (_req: Request, res: Response) => {
    const locales = i18nService.getSupportedLocales().map((locale) => {
      const info = i18nService.getLocaleInfo(locale);
      return {
        code: locale,
        name: info?.name || locale,
        englishName: info?.englishName,
        direction: info?.direction || 'ltr',
      };
    });

    res.json({ locales });
  });

  /**
   * Get current locale
   * GET /locale
   */
  router.get('/locale', (req: Request, res: Response) => {
    const i18nReq = req as I18nRequest;

    res.json({
      locale: i18nReq.locale,
      detection: i18nReq.localeDetection,
      info: i18nService.getLocaleInfo(i18nReq.locale || ''),
    });
  });

  /**
   * Switch locale
   * POST /locale
   * Body: { locale: 'en' }
   */
  router.post('/locale', localeSwitcher(i18nService));

  /**
   * Get translations for a namespace
   * GET /translations/:namespace?locale=en
   */
  router.get('/translations/:namespace', (req: Request, res: Response) => {
    const { namespace } = req.params;
    const locale = (req.query.locale as string) || (req as I18nRequest).locale || 'en';

    if (!i18nService.isLocaleSupported(locale)) {
      res.status(400).json({ error: 'Unsupported locale' });
      return;
    }

    const translations = i18nService.exportTranslations(locale, namespace);

    if (!translations) {
      res.status(404).json({ error: 'Translations not found' });
      return;
    }

    res.json({
      locale,
      namespace,
      translations,
    });
  });

  /**
   * Get translation metadata
   * GET /translations/:namespace/metadata?locale=en
   */
  router.get('/translations/:namespace/metadata', async (req: Request, res: Response) => {
    const { namespace } = req.params;
    const locale = (req.query.locale as string) || (req as I18nRequest).locale || 'en';

    if (!i18nService.isLocaleSupported(locale)) {
      res.status(400).json({ error: 'Unsupported locale' });
      return;
    }

    const metadata = await i18nService.getTranslationMetadata(locale, namespace);

    res.json({
      locale,
      namespace,
      metadata,
    });
  });

  /**
   * Get missing translations
   * GET /translations/:namespace/missing?base=en&target=fr
   */
  router.get('/translations/:namespace/missing', (req: Request, res: Response) => {
    const { namespace } = req.params;
    const { base, target } = req.query;

    if (!base || !target) {
      res.status(400).json({ error: 'Base and target locales are required' });
      return;
    }

    if (!i18nService.isLocaleSupported(base as string)) {
      res.status(400).json({ error: 'Unsupported base locale' });
      return;
    }

    if (!i18nService.isLocaleSupported(target as string)) {
      res.status(400).json({ error: 'Unsupported target locale' });
      return;
    }

    const missing = i18nService.getMissingTranslations(base as string, target as string, namespace);

    res.json({
      base,
      target,
      namespace,
      missingKeys: missing,
      count: missing.length,
    });
  });

  /**
   * Translate a key
   * POST /translate
   * Body: { key: 'welcome.message', locale: 'en', variables: { name: 'John' } }
   */
  router.post('/translate', (req: Request, res: Response) => {
    const { key, locale, variables, namespace, defaultValue, count } = req.body as {
      key: string;
      locale?: string;
      variables?: Record<string, string | number>;
      namespace?: string;
      defaultValue?: string;
      count?: number;
    };

    if (!key) {
      res.status(400).json({ error: 'Translation key is required' });
      return;
    }

    const targetLocale = locale || (req as I18nRequest).locale || 'en';

    if (!i18nService.isLocaleSupported(targetLocale)) {
      res.status(400).json({ error: 'Unsupported locale' });
      return;
    }

    const translation = i18nService.t(key, {
      locale: targetLocale,
      namespace,
      variables,
      defaultValue,
      count,
    });

    res.json({
      key,
      locale: targetLocale,
      translation,
    });
  });

  /**
   * Clear translation cache
   * POST /cache/clear
   */
  router.post('/cache/clear', (_req: Request, res: Response) => {
    i18nService.clearCache();

    res.json({
      success: true,
      message: 'Translation cache cleared',
    });
  });

  return router;
}
