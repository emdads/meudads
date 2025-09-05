import { NextApiRequest, NextApiResponse } from 'next'
import { revokeSession } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    const sessionToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies['auth-token']

    if (sessionToken) {
      await revokeSession(sessionToken)
    }

    // Clear session cookie
    res.setHeader('Set-Cookie', 'auth-token=; HttpOnly; Path=/; SameSite=Lax; Secure; Max-Age=0')

    return res.json({ ok: true })
  } catch (error) {
    console.error('Logout error:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
}
