// Vercel-specific adaptations for the worker
import type { Env } from './env';
import { Pool } from '@neondatabase/serverless';
import { NeonDatabaseAdapter, createDatabaseAdapter } from '../shared/database';

// Create real environment for Vercel with Neon database
export function createVercelEnv(processEnv: NodeJS.ProcessEnv): Env {
  // Create Neon database connection
  const databaseUrl = processEnv.DATABASE_URL || processEnv.POSTGRES_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL ou POSTGRES_URL deve estar configurada para o ambiente Vercel');
  }

  // Create Neon pool
  const pool = new Pool({ connectionString: databaseUrl });
  const databaseAdapter = new NeonDatabaseAdapter(pool);

  return {
    DB: databaseAdapter as any, // Cast to maintain compatibility with D1 interface
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
    // Test connection with existing database
    await adapter.query('SELECT 1 FROM users LIMIT 1');
    console.log('[VERCEL] Conexão com banco Neon estabelecida com sucesso');
  } catch (error) {
    console.error('[VERCEL-ERROR] Erro ao conectar com banco:', error);
    throw new Error('Falha ao conectar com banco de dados Neon');
  }
}
