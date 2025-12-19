export { I18nService } from './i18n.service.js';
export { createI18nMiddleware, detectLocale, localeSwitcher } from './i18n.middleware.js';
export { createI18nRoutes } from './i18n.routes.js';
export type { I18nRequest } from './i18n.middleware.js';
export type {
  I18nConfig,
  Locale,
  Translation,
  TranslationData,
  TranslationOptions,
  LocaleInfo,
  TranslationMetadata,
  I18nMiddlewareOptions,
  DateFormatOptions,
  NumberFormatOptions,
  LocaleDetectionResult,
  PluralRules,
} from './types.js';
