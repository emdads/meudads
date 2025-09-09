// Mock authentication utilities for Vercel environment
import bcrypt from 'bcryptjs';

// Generate a proper hash for admin123 password
export async function generateMockPasswordHash(): Promise<string> {
  try {
    return await bcrypt.hash('admin123', 10);
  } catch (error) {
    // Fallback if bcrypt fails
    return '$2b$10$nOLLGgEABGfYLW0NxfgR4OJ4CxGhzAF8PHbSxGXvJ4VaWY0Rf7XYe';
  }
}

// Verify password against hash
export async function verifyMockPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    // Fallback comparison
    return password === 'admin123' && hash.includes('$2b$');
  }
}

// Mock user data with proper password hash
export const getMockUsers = async () => {
  const passwordHash = await generateMockPasswordHash();
  
  return [
    {
      id: 'mock-admin-1',
      email: 'admin@meudads.com.br',
      name: 'Super Admin',
      password_hash: passwordHash,
      user_type: 'admin',
      is_active: 1,
      password_reset_required: 0,
      last_login_at: null,
      created_at: '2025-01-01 00:00:00',
      updated_at: '2025-01-01 00:00:00'
    },
    {
      id: 'mock-user-1',
      email: 'user@demo.com',
      name: 'Demo User',
      password_hash: passwordHash,
      user_type: 'user',
      is_active: 1,
      password_reset_required: 0,
      last_login_at: null,
      created_at: '2025-01-01 00:00:00',
      updated_at: '2025-01-01 00:00:00'
    }
  ];
};
