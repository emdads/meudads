// Authentication utilities for MeuDads system

// Funções de hash de senha
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Funções de token de sessão
export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashSessionToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Interface do usuário
export interface User {
  id: string;
  email: string;
  name: string;
  user_type: 'admin' | 'client' | 'user';
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// Interface de permissão
export interface Permission {
  id: string;
  name: string;
  description?: string;
  module: string;
  action: string;
}

// Interface de role
export interface Role {
  id: string;
  name: string;
  description?: string;
  is_system: boolean;
  permissions: Permission[];
}

// Helper para consulta de banco de dados
async function dbQuery<T>(
  db: D1Database,
  query: string,
  params: any[] = []
): Promise<T[]> {
  try {
    const result = await db.prepare(query).bind(...params).all();
    return result.results as T[];
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

async function dbQuerySingle<T>(
  db: D1Database,
  query: string,
  params: any[] = []
): Promise<T | null> {
  try {
    const result = await db.prepare(query).bind(...params).first();
    return result as T | null;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

// Função para verificar sessão
export async function verifySession(db: D1Database, sessionToken: string): Promise<User | null> {
  try {
    const tokenHash = await hashSessionToken(sessionToken);
    
    const session = await dbQuerySingle<any>(
      db,
      `SELECT s.*, u.* FROM user_sessions s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND u.is_active = 1`,
      [tokenHash]
    );

    if (!session) {
      return null;
    }

    // Atualizar last_used_at da sessão
    await db.prepare(
      "UPDATE user_sessions SET last_used_at = datetime('now') WHERE id = ?"
    ).bind(session.id).run();

    return {
      id: session.user_id,
      email: session.email,
      name: session.name,
      user_type: session.user_type,
      is_active: session.is_active,
      last_login_at: session.last_login_at,
      created_at: session.created_at,
      updated_at: session.updated_at
    };
  } catch (error) {
    console.error("Error verifying session:", error);
    return null;
  }
}

// Função para criar sessão
export async function createSession(
  db: D1Database, 
  userId: string, 
  userAgent?: string, 
  ipAddress?: string
): Promise<string> {
  const sessionToken = generateSessionToken();
  const tokenHash = await hashSessionToken(sessionToken);
  const sessionId = crypto.randomUUID();
  
  // Sessão válida por 30 dias
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await db.prepare(`
    INSERT INTO user_sessions (id, user_id, token_hash, expires_at, user_agent, ip_address, created_at, last_used_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(
    sessionId,
    userId,
    tokenHash,
    expiresAt.toISOString(),
    userAgent || null,
    ipAddress || null
  ).run();

  // Atualizar last_login_at do usuário
  await db.prepare(
    "UPDATE users SET last_login_at = datetime('now') WHERE id = ?"
  ).bind(userId).run();

  return sessionToken;
}

// Função para revogar sessão
export async function revokeSession(db: D1Database, sessionToken: string): Promise<void> {
  try {
    const tokenHash = await hashSessionToken(sessionToken);
    await db.prepare("DELETE FROM user_sessions WHERE token_hash = ?").bind(tokenHash).run();
  } catch (error) {
    console.error("Error revoking session:", error);
  }
}

// Função para revogar todas as sessões de um usuário
export async function revokeAllUserSessions(db: D1Database, userId: string): Promise<void> {
  try {
    await db.prepare("DELETE FROM user_sessions WHERE user_id = ?").bind(userId).run();
  } catch (error) {
    console.error("Error revoking all user sessions:", error);
  }
}

// Função para verificar permissões do usuário
export async function getUserPermissions(db: D1Database, userId: string): Promise<Permission[]> {
  try {
    const permissions = await dbQuery<any>(
      db,
      `SELECT DISTINCT p.* FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = ? AND ur.is_active = 1 AND ur.expires_at IS NULL OR ur.expires_at > datetime('now')`,
      [userId]
    );

    return permissions.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      module: p.module,
      action: p.action
    }));
  } catch (error) {
    console.error("Error getting user permissions:", error);
    return [];
  }
}

// Função para verificar se usuário tem permissão específica
export async function userHasPermission(
  db: D1Database, 
  userId: string, 
  permissionName: string
): Promise<boolean> {
  try {
    const result = await dbQuerySingle<any>(
      db,
      `SELECT 1 FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = ? AND p.name = ? AND ur.is_active = 1 
       AND (ur.expires_at IS NULL OR ur.expires_at > datetime('now'))`,
      [userId, permissionName]
    );

    return !!result;
  } catch (error) {
    console.error("Error checking user permission:", error);
    return false;
  }
}

// Função para verificar se usuário tem acesso a cliente específico
export async function userHasClientAccess(
  db: D1Database, 
  userId: string, 
  clientId: string
): Promise<boolean> {
  try {
    console.log(`[CLIENT-ACCESS] Checking access for user ${userId} to client ${clientId}`);
    
    // Verificar se é super admin ou admin
    const adminResult = await dbQuerySingle<any>(
      db,
      `SELECT 1 FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = ? AND r.name IN ('Super Admin', 'Administrador') 
       AND ur.is_active = 1 AND (ur.expires_at IS NULL OR ur.expires_at > datetime('now'))`,
      [userId]
    );

    console.log(`[CLIENT-ACCESS] User ${userId} is admin: ${!!adminResult}`);
    if (adminResult) {
      return true;
    }

    // Verificar acesso específico ao cliente
    const clientAccess = await dbQuerySingle<any>(
      db,
      `SELECT 1 FROM user_client_access 
       WHERE user_id = ? AND client_id = ? AND is_active = 1 
       AND (expires_at IS NULL OR expires_at > datetime('now'))`,
      [userId, clientId]
    );

    console.log(`[CLIENT-ACCESS] User ${userId} has explicit access to client ${clientId}: ${!!clientAccess}`);
    return !!clientAccess;
  } catch (error) {
    console.error("Error checking client access:", error);
    return false;
  }
}

// Função para obter clientes acessíveis pelo usuário
export async function getUserAccessibleClients(db: D1Database, userId: string): Promise<string[]> {
  try {
    // Verificar se é super admin ou admin
    const adminResult = await dbQuerySingle<any>(
      db,
      `SELECT 1 FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = ? AND r.name IN ('Super Admin', 'Administrador') 
       AND ur.is_active = 1 AND (ur.expires_at IS NULL OR ur.expires_at > datetime('now'))`,
      [userId]
    );

    if (adminResult) {
      // Admin pode acessar todos os clientes ativos
      const clients = await dbQuery<any>(db, "SELECT id FROM clients WHERE is_active = 1");
      return clients.map(c => c.id);
    } else {
      // Usuário comum só pode acessar clientes específicos
      const clientAccess = await dbQuery<any>(
        db,
        `SELECT client_id FROM user_client_access 
         WHERE user_id = ? AND is_active = 1 
         AND (expires_at IS NULL OR expires_at > datetime('now'))`,
        [userId]
      );
      return clientAccess.map(ca => ca.client_id);
    }
  } catch (error) {
    console.error("Error getting accessible clients:", error);
    return [];
  }
}

// Função para limpar sessões expiradas
export async function cleanupExpiredSessions(db: D1Database): Promise<void> {
  try {
    await db.prepare("DELETE FROM user_sessions WHERE expires_at <= datetime('now')").run();
  } catch (error) {
    console.error("Error cleaning up expired sessions:", error);
  }
}

// Middleware de autenticação
export async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header('Authorization');
  const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!sessionToken) {
    return c.json({ error: "Token de autenticação não fornecido" }, 401);
  }

  const user = await verifySession(c.env.DB, sessionToken);
  if (!user) {
    return c.json({ error: "Token inválido ou expirado" }, 401);
  }

  // Adicionar usuário e permissões ao contexto
  c.set("user", user);
  c.set("permissions", await getUserPermissions(c.env.DB, user.id));

  await next();
}

// Middleware de permissão
export function requirePermission(permissionName: string) {
  return async (c: any, next: any) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Usuário não autenticado" }, 401);
    }

    const hasPermission = await userHasPermission(c.env.DB, user.id, permissionName);
    if (!hasPermission) {
      return c.json({ error: "Permissão insuficiente" }, 403);
    }

    await next();
  };
}

// Nome do cookie de sessão
export const SESSION_COOKIE_NAME = "meudads_session";
