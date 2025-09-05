import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { validateSession, getUserAccessibleClients } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    if (req.method === 'GET') {
      // Get user's accessible clients
      const accessibleClientIds = await getUserAccessibleClients(user.id)
      
      let clients
      
      if (user.userType === 'admin') {
        // Admin can see all clients
        clients = await prisma.client.findMany({
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            logoUrl: true,
            slug: true,
            email: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      } else {
        // Regular user can only see their accessible clients
        if (accessibleClientIds.length === 0) {
          return res.json({ ok: true, clients: [] })
        }

        clients = await prisma.client.findMany({
          where: {
            id: { in: accessibleClientIds },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            logoUrl: true,
            slug: true,
            email: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      }

      return res.json({ ok: true, clients })
    }

    if (req.method === 'POST') {
      // Only admins can create clients
      if (user.userType !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }

      const { name, slug, logoUrl, email } = req.body

      if (!name?.trim() || !slug?.trim() || !email?.trim()) {
        return res.status(400).json({ error: 'Nome, slug e e-mail são obrigatórios' })
      }

      // Check if slug already exists
      const existingClient = await prisma.client.findUnique({
        where: { slug: slug.trim() },
      })

      if (existingClient) {
        return res.status(400).json({ error: 'slug_exists' })
      }

      // Check if email already exists
      const existingEmail = await prisma.client.findFirst({
        where: { email: email.trim().toLowerCase() },
      })

      if (existingEmail) {
        return res.status(400).json({ error: 'email_exists' })
      }

      // Create client
      const client = await prisma.client.create({
        data: {
          name: name.trim(),
          slug: slug.trim(),
          logoUrl: logoUrl?.trim() || null,
          email: email.trim().toLowerCase(),
          isActive: true,
        },
      })

      return res.json({ 
        ok: true, 
        client_id: client.id,
        message: 'Cliente criado com sucesso' 
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error) {
    console.error('Clients API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
