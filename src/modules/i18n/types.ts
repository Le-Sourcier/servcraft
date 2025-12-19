export type Locale = string;

export interface I18nConfig {
  /** Default locale */
  defaultLocale: Locale;
  /** Supported locales */
  supportedLocales: Locale[];
  /** Fallback locale when translation is missing */
  fallbackLocale?: Locale;
  /** Directory for translation files */
  translationsDir?: string;
  /** Enable debugging */
  debug?: boolean;
  /** Cache translations */
  cache?: boolean;
}

export interface TranslationData {
  [key: string]: string | TranslationData;
}

export interface Translation {
  locale: Locale;
  namespace: string;
  data: TranslationData;
}

export interface TranslationOptions {
  /** Variables to interpolate */
  variables?: Record<string, string | number>;
  /** Default value if translation is missing */
  defaultValue?: string;
  /** Count for pluralization */
  count?: number;
  /** Context for contextual translations */
  context?: string;
}

export interface PluralRules {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export interface LocaleInfo {
  /** Locale code (e.g., 'en-US') */
  code: Locale;
  /** Native name (e.g., 'English') */
  name: string;
  /** English name */
  englishName?: string;
  /** Text direction */
  direction: 'ltr' | 'rtl';
  /** Date format */
  dateFormat?: string;
  /** Time format */
  timeFormat?: string;
  /** Currency code */
  currency?: string;
  /** Number format settings */
  numberFormat?: Intl.NumberFormatOptions;
}

export interface TranslationMetadata {
  /** Total number of keys */
  totalKeys: number;
  /** Number of translated keys */
  translatedKeys: number;
  /** Translation completion percentage */
  completionPercentage: number;
  /** Last updated timestamp */
  lastUpdated?: Date;
  /** List of missing keys */
  missingKeys?: string[];
}

export interface I18nMiddlewareOptions {
  /** Query parameter name for locale */
  queryParam?: string;
  /** Cookie name for locale */
  cookieName?: string;
  /** Header name for locale */
  headerName?: string;
  /** Enable locale detection from Accept-Language header */
  detectFromHeader?: boolean;
}

export interface DateFormatOptions {
  /** Date style */
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  /** Time style */
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  /** Timezone */
  timeZone?: string;
}

export interface NumberFormatOptions {
  /** Number style */
  style?: 'decimal' | 'currency' | 'percent' | 'unit';
  /** Currency code */
  currency?: string;
  /** Minimum fraction digits */
  minimumFractionDigits?: number;
  /** Maximum fraction digits */
  maximumFractionDigits?: number;
}

export interface LocaleDetectionResult {
  /** Detected locale */
  locale: Locale;
  /** Detection source */
  source: 'query' | 'cookie' | 'header' | 'default';
  /** Confidence score (0-1) */
  confidence: number;
}
