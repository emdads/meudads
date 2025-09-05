// Vercel-specific adaptations for the worker
import type { Env } from './env';

// Mock D1 database for Vercel environment
class MockD1Database {
  async query(sql: string, params?: any[]): Promise<any> {
    // For now, return empty results to avoid errors
    // In a real implementation, this would connect to a PostgreSQL database
    console.log('[VERCEL-MOCK] SQL Query:', sql, params);
    return {
      results: [],
      meta: {
        duration: 0,
        rows_read: 0,
        rows_written: 0
      }
    };
  }

  async prepare(sql: string) {
    return {
      bind: (...params: any[]) => this,
      first: async () => null,
      all: async () => ({ results: [] }),
      run: async () => ({ success: true, meta: { duration: 0 } })
    };
  }
}

// Create environment for Vercel
export async function createVercelEnv(processEnv: NodeJS.ProcessEnv): Promise<Env> {
  // Use mock database for now
  const mockDB = new MockD1Database();

  return {
    DB: mockDB as any, // Cast to maintain compatibility with D1 interface
    JWT_SECRET: processEnv.JWT_SECRET || (() => {
      throw new Error('JWT_SECRET é obrigatório');
    })(),
    MOCHA_USERS_SERVICE_API_KEY: processEnv.MOCHA_USERS_SERVICE_API_KEY,
    MOCHA_USERS_SERVICE_API_URL: processEnv.MOCHA_USERS_SERVICE_API_URL,
    RESEND_API_KEY: processEnv.RESEND_API_KEY,
    FROM_EMAIL: processEnv.FROM_EMAIL || (() => {
      throw new Error('FROM_EMAIL é obrigatório');
    })(),
    GRAPH_API_VER: processEnv.GRAPH_API_VER || 'v21.0',
    CRYPTO_KEY: processEnv.CRYPTO_KEY || (() => {
      throw new Error('CRYPTO_KEY é obrigatório');
    })(),
    CRYPTO_IV: processEnv.CRYPTO_IV || (() => {
      throw new Error('CRYPTO_IV é obrigatório');
    })()
  };
}

// Platform detection
export function isVercelEnvironment(): boolean {
  return process.env.VERCEL === '1' || process.env.DEPLOYMENT_PLATFORM === 'vercel';
}

// Enhanced error handling for Vercel
export function handleVercelError(error: any): Response {
  console.error('[VERCEL-ERROR]', error);
  
  const errorResponse = {
    error: 'Erro no servidor',
    message: error.message || 'Erro interno do servidor',
    platform: 'vercel',
    timestamp: new Date().toISOString()
  };
  
  return new Response(JSON.stringify(errorResponse), {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'X-Platform': 'vercel'
    }
  });
}

// Database connection validation for Vercel
export async function validateDatabaseConnection(env: Env): Promise<void> {
  const adapter = env.DB as any;
  
  if (!adapter || typeof adapter.query !== 'function') {
    throw new Error('Database adapter não configurado corretamente');
  }

  try {
  // Test connection with mock database
    await adapter.query('SELECT 1');
    console.log('[VERCEL] Conexão com banco mock estabelecida com sucesso');
  } catch (error) {
    console.error('[VERCEL-ERROR] Erro ao conectar com banco:', error);
      throw new Error('Falha ao conectar com banco de dados');
  }
}
