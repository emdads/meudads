// Vercel API Route - Proxy to Worker
import { NextRequest } from 'next/server'

export const config = {
  runtime: 'edge',
}

export default async function handler(req: NextRequest) {
  try {
    // Import the worker app
    const { default: app } = await import('../src/worker/index')
    
    // Create environment bindings (you'll need to configure these in Vercel)
    const env = {
      DB: process.env.DB, // D1 database binding
      CRYPTO_KEY: process.env.CRYPTO_KEY,
      CRYPTO_IV: process.env.CRYPTO_IV,
      FROM_EMAIL: process.env.FROM_EMAIL,
      GRAPH_API_VER: process.env.GRAPH_API_VER,
      JWT_SECRET: process.env.JWT_SECRET,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      MOCHA_USERS_SERVICE_API_KEY: process.env.MOCHA_USERS_SERVICE_API_KEY,
      MOCHA_USERS_SERVICE_API_URL: process.env.MOCHA_USERS_SERVICE_API_URL,
    }
    
    // Create a new Request object with the correct URL
    const url = new URL(req.url)
    url.pathname = url.pathname.replace('/api', '')
    
    const request = new Request(url.toString(), {
      method: req.method,
      headers: req.headers,
      body: req.body,
    })
    
    // Call the Hono app
    const response = await app.fetch(request, env)
    
    return response
  } catch (error) {
    console.error('API Route Error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
