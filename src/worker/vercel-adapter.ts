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

// Database migration adapter for Vercel
export async function runMigrations(env: Env): Promise<void> {
  const adapter = env.DB as any;
  
  if (!adapter || typeof adapter.query !== 'function') {
    throw new Error('Database adapter não configurado corretamente');
  }

  // Check if tables exist and create basic structure if needed
  try {
    // Try to query users table to see if it exists
    await adapter.query('SELECT 1 FROM users LIMIT 1');
    console.log('[VERCEL-MIGRATION] Database schema já existe');
  } catch (error) {
    console.log('[VERCEL-MIGRATION] Criando schema básico...');
    
    // Create basic tables for initial functionality
    const createTables = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        user_type TEXT NOT NULL DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        password_reset_required BOOLEAN DEFAULT false,
        last_login_at TIMESTAMP,
        password_reset_token TEXT,
        password_reset_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        logo_url TEXT,
        ad_account_id TEXT,
        slug TEXT UNIQUE NOT NULL,
        meta_token_enc TEXT,
        email TEXT,
        temporary_password TEXT,
        password_reset_required BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        user_agent TEXT,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        last_used_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        module TEXT NOT NULL,
        action TEXT NOT NULL,
        is_system BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        is_system BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        id TEXT PRIMARY KEY,
        role_id TEXT NOT NULL,
        permission_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(role_id, permission_id)
      );

      CREATE TABLE IF NOT EXISTS user_roles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role_id TEXT NOT NULL,
        assigned_by TEXT,
        assigned_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        UNIQUE(user_id, role_id)
      );
    `;

    await adapter.execute(createTables);
    console.log('[VERCEL-MIGRATION] Schema básico criado com sucesso');
  }
}
