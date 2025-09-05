import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { validateSession, getUserAccessibleClients } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Authenticate user
    const token = req.cookies['auth-token'] || req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const user = await validateSession(token)
    if (!user) {
      return res.status(401).json({ error: 'Invalid session' })
    }

    let whereClause = {}
    
    if (user.userType !== 'admin') {
      // Regular users can only see stats for their accessible clients
      const accessibleClientIds = await getUserAccessibleClients(user.id)
      if (accessibleClientIds.length === 0) {
        return res.json({
          totalClients: 0,
          activeClients: 0,
          totalSelections: 0,
          totalAds: 0,
        })
      }
      whereClause = { id: { in: accessibleClientIds } }
    }

    const [totalClients, activeClients, totalSelections, totalAds] = await Promise.all([
      prisma.client.count({ where: whereClause }),
      prisma.client.count({ where: { ...whereClause, isActive: true } }),
      prisma.selection.count({
        where: user.userType === 'admin' ? {} : {
          client: { id: { in: await getUserAccessibleClients(user.id) } }
        }
      }),
      prisma.adsActiveRaw.count({
        where: {
          effectiveStatus: 'ACTIVE',
          ...(user.userType !== 'admin' ? {
            client: { id: { in: await getUserAccessibleClients(user.id) } }
          } : {})
        }
      }),
    ])

    return res.json({
      totalClients,
      activeClients,
      totalSelections,
      totalAds,
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
