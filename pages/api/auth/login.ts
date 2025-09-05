import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { verifyPassword, createSession, getUserPermissions } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' })
    }

    // Find user by email
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
    })

    if (!user) {
      return res.status(401).json({ error: 'Email ou senha incorretos' })
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.passwordHash)
    if (!passwordValid) {
      return res.status(401).json({ error: 'Email ou senha incorretos' })
    }

    // Check if password reset is required
    const requiresPasswordReset = user.passwordResetRequired

    // Create session
    const userAgent = req.headers['user-agent']
    const ipAddress = req.headers['x-forwarded-for'] as string || req.headers['x-real-ip'] as string || req.socket.remoteAddress
    const sessionToken = await createSession(user.id, userAgent, ipAddress)

    // Get user permissions
    const permissions = await getUserPermissions(user.id)

    // Set session cookie
    res.setHeader('Set-Cookie', `auth-token=${sessionToken}; HttpOnly; Path=/; SameSite=Lax; Secure; Max-Age=${60 * 24 * 60 * 60}`)

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    return res.json({
      ok: true,
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.userType,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        passwordResetRequired: requiresPasswordReset,
      },
      permissions,
      requires_password_reset: requiresPasswordReset
    })

  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
}
