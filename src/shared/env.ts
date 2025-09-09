// Environment configuration for multi-platform compatibility

export interface AppEnvironment {
  // Database
  database: {
    platform: 'cloudflare-d1' | 'vercel-neon' | 'local-sqlite';
    connectionString?: string;
    d1Instance?: any;
  };
  
  // Deployment
  deployment: {
    platform: 'cloudflare' | 'vercel' | 'local';
    baseUrl: string;
    environment: 'development' | 'preview' | 'production';
  };
  
  // Authentication & Security
  auth: {
    jwtSecret: string;
    cryptoKey: string;
    cryptoIV: string;
  };
  
  // External Services
  services: {
    email: {
      provider: 'resend' | 'sendgrid' | 'none';
      apiKey?: string;
      fromEmail?: string;
    };
    meta: {
      graphApiVersion: string;
    };
    mocha: {
      usersServiceApiKey?: string;
      usersServiceApiUrl?: string;
    };
  };
}

// Environment detection and configuration
export function detectEnvironment(): AppEnvironment {
  const env = typeof process !== 'undefined' ? process.env : (globalThis as any).env || {};
  
  // Detect database platform
  let databasePlatform: AppEnvironment['database']['platform'] = 'local-sqlite';
  let databaseConfig: AppEnvironment['database'] = { platform: databasePlatform };
  
  if (env.DB && typeof env.DB === 'object') {
    // Cloudflare D1
    databasePlatform = 'cloudflare-d1';
    databaseConfig = {
      platform: databasePlatform,
      d1Instance: env.DB as any
    };
  } else if (env.DATABASE_URL || env.POSTGRES_URL) {
    // Neon/Vercel PostgreSQL
    databasePlatform = 'vercel-neon';
    databaseConfig = {
      platform: databasePlatform,
      connectionString: env.DATABASE_URL || env.POSTGRES_URL
    };
  }
  
  // Detect deployment platform
  let deploymentPlatform: AppEnvironment['deployment']['platform'] = 'local';
  let baseUrl = 'http://localhost:3000';
  let environment: AppEnvironment['deployment']['environment'] = 'development';
  
  if (env.CF_PAGES || env.CLOUDFLARE_ENV) {
    deploymentPlatform = 'cloudflare';
    baseUrl = env.CF_PAGES_URL || 'https://your-app.pages.dev';
    environment = env.CF_PAGES_BRANCH === 'main' ? 'production' : 'preview';
  } else if (env.VERCEL || env.VERCEL_URL) {
    deploymentPlatform = 'vercel';
    baseUrl = env.VERCEL_URL ? `https://${env.VERCEL_URL}` : 'https://your-app.vercel.app';
    environment = env.VERCEL_ENV as AppEnvironment['deployment']['environment'] || 'development';
  }
  
  return {
    database: databaseConfig,
    deployment: {
      platform: deploymentPlatform,
      baseUrl,
      environment
    },
    auth: {
      jwtSecret: env.JWT_SECRET || 'default-jwt-secret-for-development',
      cryptoKey: env.CRYPTO_KEY || 'c8e2b9f7a1d4e6f8c9e2b7f4a1d6e8f9c2e5b8f1a4d7e9f2c5e8b1f4a7d9e2f5c8',
      cryptoIV: env.CRYPTO_IV || 'a1b2c3d4e5f6a7b8c9d0e1f2'
    },
    services: {
      email: {
        provider: env.RESEND_API_KEY ? 'resend' : 'none',
        apiKey: env.RESEND_API_KEY,
        fromEmail: env.FROM_EMAIL
      },
      meta: {
        graphApiVersion: env.GRAPH_API_VER || 'v21.0'
      },
      mocha: {
        usersServiceApiKey: env.MOCHA_USERS_SERVICE_API_KEY,
        usersServiceApiUrl: env.MOCHA_USERS_SERVICE_API_URL
      }
    }
  };
}

// Environment-specific configurations
export const CONFIG = {
  // Database connection timeouts
  database: {
    queryTimeout: 30000, // 30 seconds
    connectionTimeout: 10000, // 10 seconds
    maxRetries: 3
  },
  
  // API rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // requests per windowMs
    skip: (req: any) => {
      // Skip rate limiting for internal requests
      return req.headers['x-internal-request'] === 'true';
    }
  },
  
  // File upload limits
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxFiles: 5
  },
  
  // Cache configuration
  cache: {
    defaultTTL: 5 * 60, // 5 minutes
    longTTL: 24 * 60 * 60, // 24 hours
    metrics: {
      ttl: 15 * 60 // 15 minutes for metrics cache
    }
  },
  
  // Platform-specific features
  features: {
    cloudflare: {
      durableObjects: false, // Enable when needed
      vectorize: false,     // Enable for AI features
      r2Storage: false      // Enable for file storage
    },
    vercel: {
      edgeFunctions: true,  // Use edge functions when possible
      kvStore: false,       // Enable when KV is needed
      blobStorage: false    // Enable for file storage
    }
  }
};

// Utility functions for environment-specific logic
export class EnvironmentUtils {
  private static env: AppEnvironment;
  
  static getEnvironment(): AppEnvironment {
    if (!this.env) {
      this.env = detectEnvironment();
    }
    return this.env;
  }
  
  static isDevelopment(): boolean {
    return this.getEnvironment().deployment.environment === 'development';
  }
  
  static isProduction(): boolean {
    return this.getEnvironment().deployment.environment === 'production';
  }
  
  static isCloudflare(): boolean {
    return this.getEnvironment().deployment.platform === 'cloudflare';
  }
  
  static isVercel(): boolean {
    return this.getEnvironment().deployment.platform === 'vercel';
  }
  
  static getDatabasePlatform(): string {
    return this.getEnvironment().database.platform;
  }
  
  static getBaseUrl(): string {
    return this.getEnvironment().deployment.baseUrl;
  }
  
  static hasEmailService(): boolean {
    return this.getEnvironment().services.email.provider !== 'none';
  }
  
  static getEmailConfig() {
    return this.getEnvironment().services.email;
  }
  
  static getAuthConfig() {
    return this.getEnvironment().auth;
  }
  
  static getMetaConfig() {
    return this.getEnvironment().services.meta;
  }
  
  // Platform-specific optimizations
  static shouldUseEdgeRuntime(): boolean {
    return this.isVercel() && CONFIG.features.vercel.edgeFunctions;
  }
  
  static shouldUseDurableObjects(): boolean {
    return this.isCloudflare() && CONFIG.features.cloudflare.durableObjects;
  }
  
  static getOptimalCacheStrategy(): 'memory' | 'kv' | 'database' {
    if (this.isCloudflare()) {
      return 'kv'; // Use Cloudflare KV for caching
    } else if (this.isVercel()) {
      return CONFIG.features.vercel.kvStore ? 'kv' : 'memory';
    } else {
      return 'memory';
    }
  }
  
  static getStorageStrategy(): 'r2' | 'blob' | 'filesystem' | 'none' {
    if (this.isCloudflare() && CONFIG.features.cloudflare.r2Storage) {
      return 'r2';
    } else if (this.isVercel() && CONFIG.features.vercel.blobStorage) {
      return 'blob';
    } else if (!this.isProduction()) {
      return 'filesystem';
    } else {
      return 'none';
    }
  }
}

// Export environment instance for global access
export const env = EnvironmentUtils.getEnvironment();
