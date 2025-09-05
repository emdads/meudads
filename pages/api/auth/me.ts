import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { verify } from 'jsonwebtoken'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get session token from cookies
    const token = req.cookies.session_token

    if (!token) {
      return res.status(401).json({ error: 'No session token' })
    }

    // Verify JWT token
    const JWT_SECRET = process.env.JWT_SECRET
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET not configured')
    }

    const decoded = verify(token, JWT_SECRET) as { userId: string }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        userType: true,
        isActive: true
      }
    })

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' })
    }

    return res.status(200).json({ 
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.userType
      }
    })

  } catch (error) {
    console.error('Auth me error:', error)
    return res.status(401).json({ error: 'Invalid session' })
  }
}
