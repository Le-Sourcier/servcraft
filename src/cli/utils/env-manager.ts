import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

export interface EnvVariable {
  key: string;
  value?: string;
  comment?: string;
  required?: boolean;
}

export interface EnvSection {
  title: string;
  variables: EnvVariable[];
}

/**
 * Environment Manager
 * Manages .env file updates when adding modules
 */
export class EnvManager {
  private envPath: string;
  private envExamplePath: string;

  constructor(projectRoot: string) {
    this.envPath = path.join(projectRoot, '.env');
    this.envExamplePath = path.join(projectRoot, '.env.example');
  }

  /**
   * Add environment variables to .env file
   */
  async addVariables(sections: EnvSection[]): Promise<{
    added: string[];
    skipped: string[];
    created: boolean;
  }> {
    const added: string[] = [];
    const skipped: string[] = [];
    let created = false;

    // Read existing .env or create new one
    let envContent = '';
    if (existsSync(this.envPath)) {
      envContent = await fs.readFile(this.envPath, 'utf-8');
    } else {
      created = true;
    }

    // Parse existing variables
    const existingKeys = this.parseExistingKeys(envContent);

    // Build new content
    let newContent = envContent;
    if (newContent && !newContent.endsWith('\n\n')) {
      newContent += '\n\n';
    }

    for (const section of sections) {
      // Add section comment
      newContent += `# ${section.title}\n`;

      for (const variable of section.variables) {
        // Skip if already exists
        if (existingKeys.has(variable.key)) {
          skipped.push(variable.key);
          continue;
        }

        // Add variable comment if provided
        if (variable.comment) {
          newContent += `# ${variable.comment}\n`;
        }

        // Add variable
        const value = variable.value || '';
        const prefix = variable.required ? '' : '# ';
        newContent += `${prefix}${variable.key}=${value}\n`;

        added.push(variable.key);
      }

      newContent += '\n';
    }

    // Write to .env
    await fs.writeFile(this.envPath, newContent, 'utf-8');

    // Update .env.example if it exists
    if (existsSync(this.envExamplePath)) {
      await this.updateEnvExample(sections);
    }

    return { added, skipped, created };
  }

  /**
   * Update .env.example file
   */
  private async updateEnvExample(sections: EnvSection[]): Promise<void> {
    let exampleContent = '';
    if (existsSync(this.envExamplePath)) {
      exampleContent = await fs.readFile(this.envExamplePath, 'utf-8');
    }

    const existingKeys = this.parseExistingKeys(exampleContent);

    let newContent = exampleContent;
    if (newContent && !newContent.endsWith('\n\n')) {
      newContent += '\n\n';
    }

    for (const section of sections) {
      newContent += `# ${section.title}\n`;

      for (const variable of section.variables) {
        if (existingKeys.has(variable.key)) {
          continue;
        }

        if (variable.comment) {
          newContent += `# ${variable.comment}\n`;
        }

        // In .env.example, show placeholder values
        const placeholder = this.getPlaceholder(variable.key);
        newContent += `${variable.key}=${placeholder}\n`;
      }

      newContent += '\n';
    }

    await fs.writeFile(this.envExamplePath, newContent, 'utf-8');
  }

  /**
   * Parse existing environment variable keys
   */
  private parseExistingKeys(content: string): Set<string> {
    const keys = new Set<string>();
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Extract key from KEY=value or # KEY=value
      const match = trimmed.match(/^#?\s*([A-Z_][A-Z0-9_]*)\s*=/);
      if (match) {
        keys.add(match[1]);
      }
    }

    return keys;
  }

  /**
   * Get placeholder value for .env.example
   */
  private getPlaceholder(key: string): string {
    // Common patterns
    if (key.includes('SECRET') || key.includes('KEY') || key.includes('PASSWORD')) {
      return 'your-secret-key-here';
    }
    if (key.includes('HOST')) {
      return 'localhost';
    }
    if (key.includes('PORT')) {
      return '3000';
    }
    if (key.includes('URL')) {
      return 'http://localhost:3000';
    }
    if (key.includes('EMAIL')) {
      return 'user@example.com';
    }
    if (key.includes('REDIS')) {
      return 'redis://localhost:6379';
    }
    if (key.includes('DATABASE')) {
      return 'postgresql://user:pass@localhost:5432/db';
    }
    if (key.includes('NODE')) {
      return 'http://localhost:9200';
    }

    return '';
  }

  /**
   * Get environment variables for a specific module
   */
  static getModuleEnvVariables(moduleName: string): EnvSection[] {
    const moduleEnvMap: Record<string, EnvSection[]> = {
      'rate-limit': [
        {
          title: 'Rate Limiting Configuration',
          variables: [
            {
              key: 'RATE_LIMIT_ENABLED',
              value: 'true',
              comment: 'Enable rate limiting',
              required: true,
            },
            {
              key: 'RATE_LIMIT_REDIS_URL',
              value: 'redis://localhost:6379',
              comment:
                'Redis URL for distributed rate limiting (optional, uses in-memory if not set)',
              required: false,
            },
          ],
        },
      ],
      webhook: [
        {
          title: 'Webhook Configuration',
          variables: [
            {
              key: 'WEBHOOK_TIMEOUT',
              value: '10000',
              comment: 'Webhook request timeout in milliseconds',
              required: true,
            },
            {
              key: 'WEBHOOK_MAX_RETRIES',
              value: '5',
              comment: 'Maximum number of retry attempts',
              required: true,
            },
            {
              key: 'WEBHOOK_SIGNATURE_ENABLED',
              value: 'true',
              comment: 'Enable HMAC signature verification',
              required: true,
            },
          ],
        },
      ],
      queue: [
        {
          title: 'Queue/Jobs Configuration',
          variables: [
            {
              key: 'REDIS_HOST',
              value: 'localhost',
              comment: 'Redis host for Bull queue',
              required: true,
            },
            {
              key: 'REDIS_PORT',
              value: '6379',
              comment: 'Redis port',
              required: true,
            },
            {
              key: 'REDIS_PASSWORD',
              value: '',
              comment: 'Redis password (optional)',
              required: false,
            },
            {
              key: 'QUEUE_METRICS_ENABLED',
              value: 'true',
              comment: 'Enable queue metrics collection',
              required: true,
            },
          ],
        },
      ],
      websocket: [
        {
          title: 'WebSocket Configuration',
          variables: [
            {
              key: 'WEBSOCKET_PORT',
              value: '3001',
              comment: 'WebSocket server port',
              required: true,
            },
            {
              key: 'WEBSOCKET_CORS_ORIGIN',
              value: 'http://localhost:3000',
              comment: 'CORS origin for WebSocket',
              required: true,
            },
            {
              key: 'WEBSOCKET_REDIS_URL',
              value: 'redis://localhost:6379',
              comment: 'Redis URL for Socket.io adapter (optional, for multi-instance)',
              required: false,
            },
          ],
        },
      ],
      search: [
        {
          title: 'Search Configuration (Elasticsearch)',
          variables: [
            {
              key: 'SEARCH_ENGINE',
              value: 'memory',
              comment: 'Search engine: elasticsearch, meilisearch, or memory',
              required: true,
            },
            {
              key: 'ELASTICSEARCH_NODE',
              value: 'http://localhost:9200',
              comment: 'Elasticsearch node URL',
              required: false,
            },
            {
              key: 'ELASTICSEARCH_USERNAME',
              value: '',
              comment: 'Elasticsearch username (optional)',
              required: false,
            },
            {
              key: 'ELASTICSEARCH_PASSWORD',
              value: '',
              comment: 'Elasticsearch password (optional)',
              required: false,
            },
          ],
        },
        {
          title: 'Search Configuration (Meilisearch)',
          variables: [
            {
              key: 'MEILISEARCH_HOST',
              value: 'http://localhost:7700',
              comment: 'Meilisearch host URL',
              required: false,
            },
            {
              key: 'MEILISEARCH_API_KEY',
              value: '',
              comment: 'Meilisearch API key (optional)',
              required: false,
            },
          ],
        },
      ],
      i18n: [
        {
          title: 'i18n/Localization Configuration',
          variables: [
            {
              key: 'DEFAULT_LOCALE',
              value: 'en',
              comment: 'Default locale/language',
              required: true,
            },
            {
              key: 'SUPPORTED_LOCALES',
              value: 'en,fr,es,de,ar,zh,ja',
              comment: 'Comma-separated list of supported locales',
              required: true,
            },
            {
              key: 'TRANSLATIONS_DIR',
              value: './locales',
              comment: 'Directory for translation files',
              required: true,
            },
            {
              key: 'I18N_CACHE_ENABLED',
              value: 'true',
              comment: 'Enable translation caching',
              required: true,
            },
          ],
        },
      ],
      cache: [
        {
          title: 'Cache Configuration',
          variables: [
            {
              key: 'CACHE_PROVIDER',
              value: 'redis',
              comment: 'Cache provider: redis or memory',
              required: true,
            },
            {
              key: 'CACHE_REDIS_URL',
              value: 'redis://localhost:6379',
              comment: 'Redis URL for cache',
              required: false,
            },
            {
              key: 'CACHE_TTL',
              value: '3600',
              comment: 'Default cache TTL in seconds',
              required: true,
            },
          ],
        },
      ],
      mfa: [
        {
          title: 'MFA/TOTP Configuration',
          variables: [
            {
              key: 'MFA_ISSUER',
              value: 'MyApp',
              comment: 'MFA issuer name shown in authenticator apps',
              required: true,
            },
            {
              key: 'MFA_ALGORITHM',
              value: 'SHA1',
              comment: 'TOTP algorithm: SHA1, SHA256, or SHA512',
              required: true,
            },
          ],
        },
      ],
      oauth: [
        {
          title: 'OAuth Configuration',
          variables: [
            {
              key: 'OAUTH_GOOGLE_CLIENT_ID',
              value: '',
              comment: 'Google OAuth client ID',
              required: false,
            },
            {
              key: 'OAUTH_GOOGLE_CLIENT_SECRET',
              value: '',
              comment: 'Google OAuth client secret',
              required: false,
            },
            {
              key: 'OAUTH_GITHUB_CLIENT_ID',
              value: '',
              comment: 'GitHub OAuth client ID',
              required: false,
            },
            {
              key: 'OAUTH_GITHUB_CLIENT_SECRET',
              value: '',
              comment: 'GitHub OAuth client secret',
              required: false,
            },
            {
              key: 'OAUTH_REDIRECT_URL',
              value: 'http://localhost:3000/auth/callback',
              comment: 'OAuth callback URL',
              required: true,
            },
          ],
        },
      ],
      payment: [
        {
          title: 'Payment Configuration',
          variables: [
            {
              key: 'STRIPE_SECRET_KEY',
              value: '',
              comment: 'Stripe secret key',
              required: false,
            },
            {
              key: 'STRIPE_PUBLISHABLE_KEY',
              value: '',
              comment: 'Stripe publishable key',
              required: false,
            },
            {
              key: 'PAYPAL_CLIENT_ID',
              value: '',
              comment: 'PayPal client ID',
              required: false,
            },
            {
              key: 'PAYPAL_CLIENT_SECRET',
              value: '',
              comment: 'PayPal client secret',
              required: false,
            },
            {
              key: 'PAYPAL_MODE',
              value: 'sandbox',
              comment: 'PayPal mode: sandbox or live',
              required: false,
            },
          ],
        },
      ],
      upload: [
        {
          title: 'File Upload Configuration',
          variables: [
            {
              key: 'UPLOAD_PROVIDER',
              value: 'local',
              comment: 'Upload provider: local, s3, cloudinary',
              required: true,
            },
            {
              key: 'UPLOAD_MAX_SIZE',
              value: '10485760',
              comment: 'Max upload size in bytes (10MB)',
              required: true,
            },
            {
              key: 'UPLOAD_DIR',
              value: './uploads',
              comment: 'Local upload directory',
              required: true,
            },
            {
              key: 'AWS_ACCESS_KEY_ID',
              value: '',
              comment: 'AWS access key for S3',
              required: false,
            },
            {
              key: 'AWS_SECRET_ACCESS_KEY',
              value: '',
              comment: 'AWS secret key for S3',
              required: false,
            },
            {
              key: 'AWS_S3_BUCKET',
              value: '',
              comment: 'S3 bucket name',
              required: false,
            },
          ],
        },
      ],
      notification: [
        {
          title: 'Notification Configuration',
          variables: [
            {
              key: 'NOTIFICATION_EMAIL_ENABLED',
              value: 'true',
              comment: 'Enable email notifications',
              required: true,
            },
            {
              key: 'NOTIFICATION_SMS_ENABLED',
              value: 'false',
              comment: 'Enable SMS notifications',
              required: false,
            },
            {
              key: 'NOTIFICATION_PUSH_ENABLED',
              value: 'false',
              comment: 'Enable push notifications',
              required: false,
            },
            {
              key: 'TWILIO_ACCOUNT_SID',
              value: '',
              comment: 'Twilio account SID for SMS',
              required: false,
            },
            {
              key: 'TWILIO_AUTH_TOKEN',
              value: '',
              comment: 'Twilio auth token',
              required: false,
            },
          ],
        },
      ],
    };

    return moduleEnvMap[moduleName] || [];
  }
}
