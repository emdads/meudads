// Database abstraction layer for compatibility between D1 (SQLite) and Neon (PostgreSQL)

export interface DatabaseAdapter {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  querySingle<T>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertId?: string | number }>;
  transaction<T>(callback: (tx: DatabaseAdapter) => Promise<T>): Promise<T>;
  platform: 'cloudflare-d1' | 'vercel-neon';
}

// Cloudflare D1 Adapter
export class D1DatabaseAdapter implements DatabaseAdapter {
  public platform: 'cloudflare-d1' = 'cloudflare-d1';
  
  constructor(private db: any) {}

  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const result = await this.db.prepare(sql).bind(...params).all();
      return result.results as T[];
    } catch (error) {
      console.error("D1 Database query error:", error);
      throw error;
    }
  }

  async querySingle<T>(sql: string, params: any[] = []): Promise<T | null> {
    try {
      const result = await this.db.prepare(sql).bind(...params).first();
      return result as T | null;
    } catch (error) {
      console.error("D1 Database query error:", error);
      throw error;
    }
  }

  async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertId?: string | number }> {
    try {
      const result = await this.db.prepare(sql).bind(...params).run();
      return {
        changes: result.changes || 0,
        lastInsertId: result.meta?.last_row_id
      };
    } catch (error) {
      console.error("D1 Database execute error:", error);
      throw error;
    }
  }

  async transaction<T>(callback: (tx: DatabaseAdapter) => Promise<T>): Promise<T> {
    // D1 doesn't support transactions natively, so we just execute sequentially
    // In a real implementation, you might want to implement rollback logic
    return await callback(this);
  }
}

// Neon PostgreSQL Adapter (for Vercel) - banco já existe, apenas conecta
export class NeonDatabaseAdapter implements DatabaseAdapter {
  public platform: 'vercel-neon' = 'vercel-neon';
  
  constructor(private pool: any) {}

  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      // Convert SQLite placeholders (?) to PostgreSQL ($1, $2, etc.)
      const pgSql = this.convertPlaceholders(sql);
      
      const result = await this.pool.query(pgSql, params);
      return result.rows as T[];
    } catch (error) {
      console.error("Neon Database query error:", error);
      throw error;
    }
  }

  async querySingle<T>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  async execute(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertId?: string | number }> {
    try {
      const pgSql = this.convertPlaceholders(sql);
      
      const result = await this.pool.query(pgSql, params);
      return {
        changes: result.rowCount || 0,
        lastInsertId: result.insertId
      };
    } catch (error) {
      console.error("Neon Database execute error:", error);
      throw error;
    }
  }

  async transaction<T>(callback: (tx: DatabaseAdapter) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const txAdapter = new NeonDatabaseAdapter(client);
      const result = await callback(txAdapter);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private convertPlaceholders(sql: string): string {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  }

  // Method to implement D1-like interface
  prepare(sql: string) {
    return {
      bind: (...params: any[]) => ({
        all: async () => {
          const results = await this.query(sql, params);
          return { results };
        },
        first: async () => {
          return await this.querySingle(sql, params);
        },
        run: async () => {
          const result = await this.execute(sql, params);
          return {
            success: true,
            meta: { 
              changes: result.changes, 
              last_row_id: result.lastInsertId 
            }
          };
        }
      })
    };
  }
}

// SQL Query Builder with cross-platform compatibility
export class QueryBuilder {
  constructor(private adapter: DatabaseAdapter) {}

  // Convert SQLite-specific functions to PostgreSQL equivalents
  adaptSql(sql: string): string {
    if (this.adapter.platform === 'vercel-neon') {
      return sql
        // Convert datetime functions
        .replace(/datetime\('now'\)/g, "NOW()")
        .replace(/datetime\('now', '([^']+)'\)/g, "NOW() + INTERVAL '$1'")
        
        // Convert AUTOINCREMENT to SERIAL
        .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, "SERIAL PRIMARY KEY")
        
        // Convert TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/g, "TIMESTAMP DEFAULT NOW()")
        
        // Convert BOOLEAN type
        .replace(/BOOLEAN DEFAULT TRUE/g, "BOOLEAN DEFAULT true")
        .replace(/BOOLEAN DEFAULT FALSE/g, "BOOLEAN DEFAULT false")
        
        // Convert INSERT OR REPLACE to ON CONFLICT
        .replace(/INSERT OR REPLACE INTO/g, "INSERT INTO")
        
        // Convert LIMIT in subqueries
        .replace(/GROUP_CONCAT\(([^)]+)\)/g, "STRING_AGG($1, ',')")
        
        // Convert CASE for boolean comparisons
        .replace(/= 1\b/g, "= true")
        .replace(/= 0\b/g, "= false")
        .replace(/!= 1\b/g, "!= true")
        .replace(/!= 0\b/g, "!= false");
    }
    
    return sql;
  }

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    const adaptedSql = this.adaptSql(sql);
    return this.adapter.query<T>(adaptedSql, params);
  }

  async querySingle<T>(sql: string, params?: any[]): Promise<T | null> {
    const adaptedSql = this.adaptSql(sql);
    return this.adapter.querySingle<T>(adaptedSql, params);
  }

  async execute(sql: string, params?: any[]): Promise<{ changes: number; lastInsertId?: string | number }> {
    const adaptedSql = this.adaptSql(sql);
    return this.adapter.execute(adaptedSql, params);
  }
}

// Database factory
export function createDatabaseAdapter(env: any): DatabaseAdapter {
  // Detect environment
  if (env.DB && typeof env.DB.prepare === 'function') {
    // Cloudflare D1
    return new D1DatabaseAdapter(env.DB);
  } else if (env.DB && env.DB.platform === 'vercel-neon') {
    // Already a Neon adapter
    return env.DB;
  } else if (env.DATABASE_URL || env.POSTGRES_URL) {
    // Create Neon adapter
    const { Pool } = require('@neondatabase/serverless');
    const pool = new Pool({ connectionString: env.DATABASE_URL || env.POSTGRES_URL });
    return new NeonDatabaseAdapter(pool);
  } else {
    throw new Error('No supported database found in environment');
  }
}

// Common database operations with cross-platform support
export class DatabaseService {
  private queryBuilder: QueryBuilder;
  
  constructor(adapter: DatabaseAdapter) {
    this.queryBuilder = new QueryBuilder(adapter);
  }

  // User management
  async findUserByEmail(email: string) {
    return this.queryBuilder.querySingle<any>(
      "SELECT * FROM users WHERE email = ? AND is_active = ?",
      [email.toLowerCase(), true]
    );
  }

  async createUser(userData: {
    id: string;
    email: string;
    name: string;
    password_hash: string;
    user_type: string;
    is_active: boolean;
    password_reset_required: boolean;
  }) {
    return this.queryBuilder.execute(`
      INSERT INTO users (id, email, name, password_hash, user_type, is_active, password_reset_required, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      userData.id,
      userData.email,
      userData.name,
      userData.password_hash,
      userData.user_type,
      userData.is_active,
      userData.password_reset_required
    ]);
  }

  // Client management
  async findClientBySlug(slug: string) {
    return this.queryBuilder.querySingle<any>(
      "SELECT * FROM clients WHERE slug = ? AND is_active = ?",
      [slug, true]
    );
  }

  async createClient(clientData: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    email: string;
    temporary_password: string;
    is_active: boolean;
  }) {
    return this.queryBuilder.execute(`
      INSERT INTO clients (id, name, slug, logo_url, email, temporary_password, password_reset_required, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      clientData.id,
      clientData.name,
      clientData.slug,
      clientData.logo_url || null,
      clientData.email,
      clientData.temporary_password,
      true,
      clientData.is_active
    ]);
  }

  // Selection management
  async findSelectionsByClientId(clientId: string, status?: string) {
    let sql = "SELECT * FROM selections WHERE client_id = ?";
    const params = [clientId];
    
    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }
    
    sql += " ORDER BY created_at DESC";
    
    return this.queryBuilder.query<any>(sql, params);
  }

  // Ad management
  async findActiveAdsByAccountId(accountId: string) {
    return this.queryBuilder.query<any>(`
      SELECT a.*, c.name as campaign_name 
      FROM ads_active_raw a 
      LEFT JOIN campaigns c ON a.campaign_id = c.campaign_id
      WHERE a.ad_account_ref_id = ? AND a.effective_status = 'ACTIVE'
      ORDER BY a.updated_at DESC
    `, [accountId]);
  }

  // Platform-aware ID generation
  generateId(): string {
    return crypto.randomUUID();
  }
}
