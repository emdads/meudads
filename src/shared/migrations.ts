// Database migrations compatible with both D1 (SQLite) and Neon (PostgreSQL)

import { DatabaseAdapter } from './database';

export interface Migration {
  id: string;
  name: string;
  up: (adapter: DatabaseAdapter) => Promise<void>;
  down: (adapter: DatabaseAdapter) => Promise<void>;
}

// Helper function to create platform-compatible SQL
function createPlatformSQL(adapter: DatabaseAdapter) {
  const isPostgres = adapter.platform === 'vercel-neon';
  
  return {
    // Primary key types
    primaryKey: isPostgres ? 'UUID PRIMARY KEY DEFAULT gen_random_uuid()' : 'TEXT PRIMARY KEY',
    
    // Auto increment
    autoIncrement: isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT',
    
    // Boolean type with default
    booleanTrue: isPostgres ? 'BOOLEAN DEFAULT true' : 'BOOLEAN DEFAULT TRUE',
    booleanFalse: isPostgres ? 'BOOLEAN DEFAULT false' : 'BOOLEAN DEFAULT FALSE',
    
    // Timestamp with default
    timestamp: isPostgres ? 'TIMESTAMP DEFAULT NOW()' : 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    
    // Now function
    now: isPostgres ? 'NOW()' : "datetime('now')",
    
    // Text search
    textSearch: (column: string, term: string) => 
      isPostgres ? `${column} ILIKE '%${term}%'` : `${column} LIKE '%${term}%'`,
      
    // JSON operations (if needed)
    jsonExtract: (column: string, path: string) =>
      isPostgres ? `${column}->>'${path}'` : `JSON_EXTRACT(${column}, '$.${path}')`,
  };
}

export const migrations: Migration[] = [
  {
    id: '001',
    name: 'Create initial tables',
    up: async (adapter: DatabaseAdapter) => {
      const sql = createPlatformSQL(adapter);
      
      // Users table
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id ${sql.primaryKey},
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL,
          user_type TEXT NOT NULL DEFAULT 'user',
          is_active ${sql.booleanTrue},
          last_login_at TIMESTAMP,
          password_reset_token TEXT,
          password_reset_expires TIMESTAMP,
          created_at ${sql.timestamp},
          updated_at ${sql.timestamp}
        )
      `);
      
      // Clients table
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS clients (
          id ${sql.primaryKey},
          name TEXT NOT NULL,
          logo_url TEXT,
          ad_account_id TEXT,
          slug TEXT UNIQUE NOT NULL,
          meta_token_enc TEXT,
          is_active ${sql.booleanTrue},
          email TEXT,
          temporary_password TEXT,
          password_reset_required ${sql.booleanFalse},
          created_at ${sql.timestamp},
          updated_at ${sql.timestamp}
        )
      `);
      
      // Roles table
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS roles (
          id ${sql.primaryKey},
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          is_system ${sql.booleanFalse},
          is_active ${sql.booleanTrue},
          created_at ${sql.timestamp},
          updated_at ${sql.timestamp}
        )
      `);
      
      // Permissions table
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS permissions (
          id ${sql.primaryKey},
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          module TEXT NOT NULL,
          action TEXT NOT NULL,
          is_system ${sql.booleanFalse},
          created_at ${sql.timestamp},
          updated_at ${sql.timestamp}
        )
      `);
    },
    down: async (adapter: DatabaseAdapter) => {
      await adapter.execute('DROP TABLE IF EXISTS permissions');
      await adapter.execute('DROP TABLE IF EXISTS roles');
      await adapter.execute('DROP TABLE IF EXISTS clients');
      await adapter.execute('DROP TABLE IF EXISTS users');
    }
  },
  
  {
    id: '002',
    name: 'Create relationship tables',
    up: async (adapter: DatabaseAdapter) => {
      const sql = createPlatformSQL(adapter);
      
      // Role permissions
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS role_permissions (
          id ${sql.primaryKey},
          role_id TEXT NOT NULL,
          permission_id TEXT NOT NULL,
          created_at ${sql.timestamp},
          UNIQUE(role_id, permission_id)
        )
      `);
      
      // User roles
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS user_roles (
          id ${sql.primaryKey},
          user_id TEXT NOT NULL,
          role_id TEXT NOT NULL,
          assigned_by TEXT,
          assigned_at ${sql.timestamp},
          expires_at TIMESTAMP,
          is_active ${sql.booleanTrue},
          UNIQUE(user_id, role_id)
        )
      `);
      
      // User client access
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS user_client_access (
          id ${sql.primaryKey},
          user_id TEXT NOT NULL,
          client_id TEXT NOT NULL,
          assigned_by TEXT,
          access_level TEXT DEFAULT 'read',
          assigned_at ${sql.timestamp},
          expires_at TIMESTAMP,
          is_active ${sql.booleanTrue},
          UNIQUE(user_id, client_id)
        )
      `);
      
      // User sessions
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id ${sql.primaryKey},
          user_id TEXT NOT NULL,
          token_hash TEXT UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          user_agent TEXT,
          ip_address TEXT,
          created_at ${sql.timestamp},
          last_used_at ${sql.timestamp}
        )
      `);
    },
    down: async (adapter: DatabaseAdapter) => {
      await adapter.execute('DROP TABLE IF EXISTS user_sessions');
      await adapter.execute('DROP TABLE IF EXISTS user_client_access');
      await adapter.execute('DROP TABLE IF EXISTS user_roles');
      await adapter.execute('DROP TABLE IF EXISTS role_permissions');
    }
  },
  
  {
    id: '003',
    name: 'Create ad management tables',
    up: async (adapter: DatabaseAdapter) => {
      const sql = createPlatformSQL(adapter);
      
      // Ad accounts
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS ad_accounts (
          id ${sql.primaryKey},
          client_id TEXT NOT NULL,
          platform TEXT NOT NULL,
          account_name TEXT NOT NULL,
          account_id TEXT NOT NULL,
          access_token_enc TEXT,
          refresh_token_enc TEXT,
          token_expires_at TIMESTAMP,
          is_active ${sql.booleanTrue},
          last_sync_at TIMESTAMP,
          sync_status TEXT DEFAULT 'pending',
          sync_error TEXT,
          created_at ${sql.timestamp},
          updated_at ${sql.timestamp},
          UNIQUE(client_id, platform, account_id)
        )
      `);
      
      // Campaigns
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS campaigns (
          campaign_id TEXT PRIMARY KEY,
          name TEXT,
          objective TEXT,
          ad_account_id TEXT,
          ad_account_ref_id TEXT,
          client_id TEXT,
          created_at ${sql.timestamp},
          updated_at ${sql.timestamp}
        )
      `);
      
      // Active ads
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS ads_active_raw (
          ad_id TEXT PRIMARY KEY,
          ad_name TEXT,
          effective_status TEXT,
          creative_id TEXT,
          creative_thumb TEXT,
          object_story_id TEXT,
          campaign_id TEXT,
          adset_id TEXT,
          adset_optimization_goal TEXT,
          objective TEXT,
          ad_account_id TEXT,
          ad_account_ref_id TEXT,
          client_id TEXT,
          created_at ${sql.timestamp},
          updated_at ${sql.timestamp}
        )
      `);
      
      // Selections
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS selections (
          id ${sql.primaryKey},
          client_id TEXT,
          slug TEXT,
          ad_ids TEXT,
          note TEXT,
          user_id TEXT,
          user_email TEXT,
          user_name TEXT,
          selection_type TEXT DEFAULT 'pause',
          description TEXT,
          status TEXT DEFAULT 'pending',
          executed_at TIMESTAMP,
          executed_by_user_id TEXT,
          executed_by_user_name TEXT,
          execution_notes TEXT,
          ads_paused_count INTEGER DEFAULT 0,
          ads_total_count INTEGER DEFAULT 0,
          created_at ${sql.timestamp},
          updated_at ${sql.timestamp}
        )
      `);
    },
    down: async (adapter: DatabaseAdapter) => {
      await adapter.execute('DROP TABLE IF EXISTS selections');
      await adapter.execute('DROP TABLE IF EXISTS ads_active_raw');
      await adapter.execute('DROP TABLE IF EXISTS campaigns');
      await adapter.execute('DROP TABLE IF EXISTS ad_accounts');
    }
  },
  
  {
    id: '004',
    name: 'Create additional tables and indexes',
    up: async (adapter: DatabaseAdapter) => {
      const sql = createPlatformSQL(adapter);
      
      // Selection ad reasons
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS selection_ad_reasons (
          id ${sql.primaryKey},
          selection_id TEXT NOT NULL,
          ad_id TEXT NOT NULL,
          reason TEXT NOT NULL,
          created_at ${sql.timestamp},
          updated_at ${sql.timestamp},
          UNIQUE(selection_id, ad_id)
        )
      `);
      
      // User permission restrictions
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS user_permission_restrictions (
          id ${sql.primaryKey},
          user_id TEXT NOT NULL,
          permission_name TEXT NOT NULL,
          type TEXT NOT NULL,
          name TEXT NOT NULL,
          allowed ${sql.booleanTrue},
          created_at ${sql.timestamp},
          updated_at ${sql.timestamp}
        )
      `);
      
      // Admin notifications
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS admin_notifications (
          id ${sql.primaryKey},
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          event_type TEXT,
          event_data TEXT,
          is_read ${sql.booleanFalse},
          created_at ${sql.timestamp}
        )
      `);
      
      // Sync schedules
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS sync_schedules (
          id ${sql.primaryKey},
          schedule_type TEXT NOT NULL,
          description TEXT,
          cron_expression TEXT,
          status TEXT DEFAULT 'active',
          created_at ${sql.timestamp},
          updated_at ${sql.timestamp}
        )
      `);
      
      // Sync config data
      await adapter.execute(`
        CREATE TABLE IF NOT EXISTS sync_config_data (
          id ${sql.primaryKey},
          config_type TEXT NOT NULL,
          config_data TEXT NOT NULL,
          updated_by TEXT,
          created_at ${sql.timestamp},
          updated_at ${sql.timestamp}
        )
      `);
      
      // Create indexes for better performance
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
        'CREATE INDEX IF NOT EXISTS idx_clients_slug ON clients(slug)',
        'CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_client_access_user_id ON user_client_access(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_ads_client_id ON ads_active_raw(client_id)',
        'CREATE INDEX IF NOT EXISTS idx_ads_account_ref_id ON ads_active_raw(ad_account_ref_id)',
        'CREATE INDEX IF NOT EXISTS idx_selections_client_id ON selections(client_id)',
        'CREATE INDEX IF NOT EXISTS idx_selection_reasons_selection_id ON selection_ad_reasons(selection_id)',
      ];
      
      for (const indexSql of indexes) {
        try {
          await adapter.execute(indexSql);
        } catch (error) {
          console.warn(`Index creation warning: ${error}`);
        }
      }
    },
    down: async (adapter: DatabaseAdapter) => {
      await adapter.execute('DROP TABLE IF EXISTS sync_config_data');
      await adapter.execute('DROP TABLE IF EXISTS sync_schedules');
      await adapter.execute('DROP TABLE IF EXISTS admin_notifications');
      await adapter.execute('DROP TABLE IF EXISTS user_permission_restrictions');
      await adapter.execute('DROP TABLE IF EXISTS selection_ad_reasons');
    }
  }
];

// Migration runner
export class MigrationRunner {
  constructor(private adapter: DatabaseAdapter) {}
  
  async ensureMigrationsTable() {
    const sql = createPlatformSQL(this.adapter);
    await this.adapter.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at ${sql.timestamp}
      )
    `);
  }
  
  async getAppliedMigrations(): Promise<string[]> {
    await this.ensureMigrationsTable();
    const result = await this.adapter.query<{ id: string }>('SELECT id FROM migrations ORDER BY applied_at');
    return result.map(row => row.id);
  }
  
  async applyMigrations(): Promise<void> {
    console.log('[MIGRATIONS] Starting migration process...');
    
    const applied = await this.getAppliedMigrations();
    const pending = migrations.filter(m => !applied.includes(m.id));
    
    if (pending.length === 0) {
      console.log('[MIGRATIONS] No pending migrations');
      return;
    }
    
    console.log(`[MIGRATIONS] Applying ${pending.length} migrations...`);
    
    for (const migration of pending) {
      try {
        console.log(`[MIGRATIONS] Applying: ${migration.name}`);
        await migration.up(this.adapter);
        
        // Record migration
        const sql = createPlatformSQL(this.adapter);
        await this.adapter.execute(
          `INSERT INTO migrations (id, name, applied_at) VALUES (?, ?, ${sql.now})`,
          [migration.id, migration.name]
        );
        
        console.log(`[MIGRATIONS] ✅ Applied: ${migration.name}`);
      } catch (error) {
        console.error(`[MIGRATIONS] ❌ Failed: ${migration.name}:`, error);
        throw error;
      }
    }
    
    console.log('[MIGRATIONS] ✅ All migrations applied successfully');
  }
  
  async rollbackMigration(migrationId: string): Promise<void> {
    const migration = migrations.find(m => m.id === migrationId);
    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`);
    }
    
    console.log(`[MIGRATIONS] Rolling back: ${migration.name}`);
    
    try {
      await migration.down(this.adapter);
      await this.adapter.execute('DELETE FROM migrations WHERE id = ?', [migrationId]);
      console.log(`[MIGRATIONS] ✅ Rolled back: ${migration.name}`);
    } catch (error) {
      console.error(`[MIGRATIONS] ❌ Rollback failed: ${migration.name}:`, error);
      throw error;
    }
  }
}
