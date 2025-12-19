import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../../core/logger.js';
import type {
  I18nConfig,
  Locale,
  Translation,
  TranslationData,
  TranslationOptions,
  LocaleInfo,
  TranslationMetadata,
  DateFormatOptions,
  NumberFormatOptions,
} from './types.js';

/**
 * I18n Service
 * Multi-language support with translation management
 */
export class I18nService {
  private config: I18nConfig;
  private translations = new Map<string, TranslationData>();
  private localeInfos = new Map<Locale, LocaleInfo>();
  private cache = new Map<string, string>();

  constructor(config: I18nConfig) {
    this.config = {
      fallbackLocale: config.defaultLocale,
      cache: true,
      debug: false,
      ...config,
    };

    this.initializeDefaultLocales();

    logger.info(
      {
        defaultLocale: this.config.defaultLocale,
        supportedLocales: this.config.supportedLocales,
      },
      'I18n service initialized'
    );
  }

  /**
   * Initialize default locale information
   */
  private initializeDefaultLocales(): void {
    const defaultLocales: LocaleInfo[] = [
      {
        code: 'en',
        name: 'English',
        englishName: 'English',
        direction: 'ltr',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: 'hh:mm A',
        currency: 'USD',
      },
      {
        code: 'fr',
        name: 'Français',
        englishName: 'French',
        direction: 'ltr',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        currency: 'EUR',
      },
      {
        code: 'es',
        name: 'Español',
        englishName: 'Spanish',
        direction: 'ltr',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        currency: 'EUR',
      },
      {
        code: 'de',
        name: 'Deutsch',
        englishName: 'German',
        direction: 'ltr',
        dateFormat: 'DD.MM.YYYY',
        timeFormat: 'HH:mm',
        currency: 'EUR',
      },
      {
        code: 'ar',
        name: 'العربية',
        englishName: 'Arabic',
        direction: 'rtl',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        currency: 'SAR',
      },
      {
        code: 'zh',
        name: '中文',
        englishName: 'Chinese',
        direction: 'ltr',
        dateFormat: 'YYYY/MM/DD',
        timeFormat: 'HH:mm',
        currency: 'CNY',
      },
      {
        code: 'ja',
        name: '日本語',
        englishName: 'Japanese',
        direction: 'ltr',
        dateFormat: 'YYYY/MM/DD',
        timeFormat: 'HH:mm',
        currency: 'JPY',
      },
    ];

    for (const locale of defaultLocales) {
      this.localeInfos.set(locale.code, locale);
    }
  }

  /**
   * Load translations from file
   */
  async loadTranslations(locale: Locale, namespace = 'common'): Promise<void> {
    if (!this.config.translationsDir) {
      if (this.config.debug) {
        logger.warn('Translations directory not configured');
      }
      return;
    }

    try {
      const filePath = path.join(this.config.translationsDir, locale, `${namespace}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content) as TranslationData;

      const key = this.getTranslationKey(locale, namespace);
      this.translations.set(key, data);

      logger.debug({ locale, namespace }, 'Translations loaded');
    } catch (error) {
      logger.error({ locale, namespace, error }, 'Failed to load translations');
    }
  }

  /**
   * Add translations programmatically
   */
  addTranslations(translation: Translation): void {
    const key = this.getTranslationKey(translation.locale, translation.namespace);
    const existing = this.translations.get(key) || {};

    this.translations.set(key, {
      ...existing,
      ...translation.data,
    });

    logger.debug(
      { locale: translation.locale, namespace: translation.namespace },
      'Translations added'
    );
  }

  /**
   * Translate a key
   */
  t(
    key: string,
    options: TranslationOptions & { locale?: Locale; namespace?: string } = {}
  ): string {
    const locale = options.locale || this.config.defaultLocale;
    const namespace = options.namespace || 'common';

    // Check cache
    if (this.config.cache && !options.variables && !options.count) {
      const cacheKey = `${locale}:${namespace}:${key}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Get translation
    let translation = this.getTranslation(locale, namespace, key);

    // Try fallback locale
    if (!translation && this.config.fallbackLocale && locale !== this.config.fallbackLocale) {
      translation = this.getTranslation(this.config.fallbackLocale, namespace, key);
    }

    // Use default value or key
    if (!translation) {
      translation = options.defaultValue || key;

      if (this.config.debug) {
        logger.warn({ locale, namespace, key }, 'Translation missing');
      }
    }

    // Handle pluralization
    if (options.count !== undefined) {
      translation = this.handlePluralization(translation, options.count, locale);
    }

    // Interpolate variables
    if (options.variables) {
      translation = this.interpolate(translation, options.variables);
    }

    // Cache result
    if (this.config.cache && !options.variables && !options.count) {
      const cacheKey = `${locale}:${namespace}:${key}`;
      this.cache.set(cacheKey, translation);
    }

    return translation;
  }

  /**
   * Get translation value
   */
  private getTranslation(locale: Locale, namespace: string, key: string): string | null {
    const translationKey = this.getTranslationKey(locale, namespace);
    const translations = this.translations.get(translationKey);

    if (!translations) {
      return null;
    }

    // Handle nested keys (e.g., "user.profile.title")
    const keys = key.split('.');
    let value: string | TranslationData | undefined = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }

    return typeof value === 'string' ? value : null;
  }

  /**
   * Handle pluralization
   */
  private handlePluralization(translation: string, count: number, locale: Locale): string {
    // Simple plural rules (can be extended with Intl.PluralRules)
    const pluralRules = new Intl.PluralRules(locale);
    const rule = pluralRules.select(count);

    // Parse plural syntax: "{{count}} item{s}"
    // Or object syntax with keys: zero, one, other
    if (typeof translation === 'object') {
      const pluralObj = translation as unknown as Record<string, string>;
      return pluralObj[rule] || pluralObj['other'] || String(translation);
    }

    // Simple {s} syntax
    if (count === 1) {
      return translation.replace(/\{s\}/g, '');
    } else {
      return translation.replace(/\{s\}/g, 's');
    }
  }

  /**
   * Interpolate variables
   */
  private interpolate(text: string, variables: Record<string, string | number>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
      return variables[key]?.toString() || '';
    });
  }

  /**
   * Format date
   */
  formatDate(date: Date, locale: Locale, options?: DateFormatOptions): string {
    try {
      return new Intl.DateTimeFormat(locale, options).format(date);
    } catch (error) {
      logger.error({ locale, error }, 'Date formatting failed');
      return date.toISOString();
    }
  }

  /**
   * Format number
   */
  formatNumber(value: number, locale: Locale, options?: NumberFormatOptions): string {
    try {
      return new Intl.NumberFormat(locale, options).format(value);
    } catch (error) {
      logger.error({ locale, error }, 'Number formatting failed');
      return value.toString();
    }
  }

  /**
   * Format currency
   */
  formatCurrency(value: number, locale: Locale, currency?: string): string {
    const localeInfo = this.localeInfos.get(locale);
    const currencyCode = currency || localeInfo?.currency || 'USD';

    return this.formatNumber(value, locale, {
      style: 'currency',
      currency: currencyCode,
    });
  }

  /**
   * Format relative time
   */
  formatRelativeTime(date: Date, locale: Locale): string {
    try {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      const now = new Date();
      const diffInSeconds = Math.floor((date.getTime() - now.getTime()) / 1000);

      if (Math.abs(diffInSeconds) < 60) {
        return rtf.format(diffInSeconds, 'second');
      } else if (Math.abs(diffInSeconds) < 3600) {
        return rtf.format(Math.floor(diffInSeconds / 60), 'minute');
      } else if (Math.abs(diffInSeconds) < 86400) {
        return rtf.format(Math.floor(diffInSeconds / 3600), 'hour');
      } else if (Math.abs(diffInSeconds) < 2592000) {
        return rtf.format(Math.floor(diffInSeconds / 86400), 'day');
      } else if (Math.abs(diffInSeconds) < 31536000) {
        return rtf.format(Math.floor(diffInSeconds / 2592000), 'month');
      } else {
        return rtf.format(Math.floor(diffInSeconds / 31536000), 'year');
      }
    } catch (error) {
      logger.error({ locale, error }, 'Relative time formatting failed');
      return date.toLocaleDateString(locale);
    }
  }

  /**
   * Get locale info
   */
  getLocaleInfo(locale: Locale): LocaleInfo | undefined {
    return this.localeInfos.get(locale);
  }

  /**
   * Add or update locale info
   */
  setLocaleInfo(info: LocaleInfo): void {
    this.localeInfos.set(info.code, info);
  }

  /**
   * Get supported locales
   */
  getSupportedLocales(): Locale[] {
    return this.config.supportedLocales;
  }

  /**
   * Check if locale is supported
   */
  isLocaleSupported(locale: Locale): boolean {
    return this.config.supportedLocales.includes(locale);
  }

  /**
   * Get translation metadata
   */
  async getTranslationMetadata(locale: Locale, namespace = 'common'): Promise<TranslationMetadata> {
    const key = this.getTranslationKey(locale, namespace);
    const translations = this.translations.get(key);

    if (!translations) {
      return {
        totalKeys: 0,
        translatedKeys: 0,
        completionPercentage: 0,
      };
    }

    const keys = this.flattenKeys(translations);
    const totalKeys = keys.length;
    const translatedKeys = keys.filter((k) => translations[k]).length;

    return {
      totalKeys,
      translatedKeys,
      completionPercentage: (translatedKeys / totalKeys) * 100,
    };
  }

  /**
   * Get missing translations
   */
  getMissingTranslations(baseLocale: Locale, targetLocale: Locale, namespace = 'common'): string[] {
    const baseKey = this.getTranslationKey(baseLocale, namespace);
    const targetKey = this.getTranslationKey(targetLocale, namespace);

    const baseTranslations = this.translations.get(baseKey);
    const targetTranslations = this.translations.get(targetKey);

    if (!baseTranslations) {
      return [];
    }

    const baseKeys = this.flattenKeys(baseTranslations);
    const targetKeys = targetTranslations ? this.flattenKeys(targetTranslations) : [];

    return baseKeys.filter((key) => !targetKeys.includes(key));
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('Translation cache cleared');
  }

  /**
   * Export translations
   */
  exportTranslations(locale: Locale, namespace = 'common'): TranslationData | null {
    const key = this.getTranslationKey(locale, namespace);
    return this.translations.get(key) || null;
  }

  /**
   * Get translation key
   */
  private getTranslationKey(locale: Locale, namespace: string): string {
    return `${locale}:${namespace}`;
  }

  /**
   * Flatten nested keys
   */
  private flattenKeys(obj: TranslationData, prefix = ''): string[] {
    const keys: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null) {
        keys.push(...this.flattenKeys(value as TranslationData, fullKey));
      } else {
        keys.push(fullKey);
      }
    }

    return keys;
  }
}
