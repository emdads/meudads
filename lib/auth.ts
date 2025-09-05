import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export interface User {
  id: string
  email: string
  name: string
  userType: string
  isActive: boolean
}

export interface AuthenticatedRequest extends NextRequest {
  user?: User
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development'
const SESSION_COOKIE_NAME = 'auth-token'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '60d' })
  const tokenHash = await bcrypt.hash(token, 10)
  
  await prisma.userSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      userAgent,
      ipAddress,
    },
  })

  return token
}

export async function validateSession(token: string): Promise<User | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.userId,
        isActive: true,
        userSessions: {
          some: {
            expiresAt: { gt: new Date() },
          },
        },
      },
    })

    if (!user) return null

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      userType: user.userType,
      isActive: user.isActive,
    }
  } catch {
    return null
  }
}

export async function revokeSession(token: string): Promise<void> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    
    // Find and delete the session
    const sessions = await prisma.userSession.findMany({
      where: { userId: decoded.userId },
    })

    for (const session of sessions) {
      const isMatch = await bcrypt.compare(token, session.tokenHash)
      if (isMatch) {
        await prisma.userSession.delete({ where: { id: session.id } })
        break
      }
    }
  } catch {
    // Token invalid, ignore
  }
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  })

  const permissions = new Set<string>()
  
  for (const userRole of userRoles) {
    for (const rolePermission of userRole.role.rolePermissions) {
      permissions.add(rolePermission.permission.name)
    }
  }

  return Array.from(permissions)
}

export async function userHasPermission(userId: string, permission: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId)
  return permissions.includes(permission)
}

export async function getUserAccessibleClients(userId: string): Promise<string[]> {
  const userClientAccess = await prisma.userClientAccess.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      clientId: true,
    },
  })

  return userClientAccess.map(access => access.clientId)
}

export async function userHasClientAccess(userId: string, clientId: string): Promise<boolean> {
  const access = await prisma.userClientAccess.findFirst({
    where: {
      userId,
      clientId,
      isActive: true,
    },
  })

  return !!access
}
