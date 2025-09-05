// Vercel API handler with real database integration
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Platform', 'vercel');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('[VERCEL-API] Processing request:', req.method, req.url);
    
    // Import the Vercel adapter
    const { createVercelEnv, handleVercelError, validateDatabaseConnection } = await import('../src/worker/vercel-adapter.js');
    
    // Import the worker
    const workerModule = await import('../src/worker/index.js');
    const workerHandler = workerModule.default;
    
    // Parse request body for non-GET requests
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
    
    // Create a Request object from the Vercel request
    const url = new URL(req.url, `https://${req.headers.host}`);
    const request = new Request(url.toString(), {
      method: req.method,
      headers: new Headers(req.headers),
      body: body
    });

    console.log('[VERCEL-API] Created request:', request.method, request.url);

    // Create real environment using the adapter (now async)
    const env = await createVercelEnv(process.env);
    
    console.log('[VERCEL-API] Environment configured:', {
      hasDB: !!env.DB,
      hasJWT: !!env.JWT_SECRET,
      platform: 'vercel',
      databaseType: env.DB?.platform || 'unknown'
    });

    // Database já existe no Neon, não precisa validar

    const response = await workerHandler.fetch(request, env);

    console.log('[VERCEL-API] Worker response:', response.status, response.statusText);

    // Convert Response to Vercel response
    const responseBody = await response.text();
    const responseHeaders = {};
    
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    res.status(response.status);
    Object.entries(responseHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    console.log('[VERCEL-API] Sending response:', response.status, responseBody?.length || 0);
    res.send(responseBody);
    
  } catch (error) {
    console.error('[VERCEL-API] Critical error:', error);
    console.error('[VERCEL-API] Error stack:', error.stack);
    
    // Use enhanced error handling
    try {
      const { handleVercelError } = await import('../src/worker/vercel-adapter.js');
      const errorResponse = handleVercelError(error);
      const errorBody = await errorResponse.text();
      
      res.status(errorResponse.status);
      errorResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      res.send(errorBody);
    } catch (fallbackError) {
      // Final fallback
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message || 'Erro desconhecido',
        platform: 'vercel',
        timestamp: new Date().toISOString()
      });
    }
  }
}
