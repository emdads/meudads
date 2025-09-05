// Vercel API handler
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Import the worker dynamically
    const { default: workerHandler } = await import('../src/worker/index.ts');
    
    // Create a Request object from the Vercel request
    const url = new URL(req.url, `https://${req.headers.host}`);
    const request = new Request(url.toString(), {
      method: req.method,
      headers: new Headers(req.headers),
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
    });

    // Call the worker handler
    const response = await workerHandler.fetch(request, {
      // Mock environment for Vercel
      JWT_SECRET: process.env.JWT_SECRET,
      MOCHA_USERS_SERVICE_API_KEY: process.env.MOCHA_USERS_SERVICE_API_KEY,
      MOCHA_USERS_SERVICE_API_URL: process.env.MOCHA_USERS_SERVICE_API_URL,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      FROM_EMAIL: process.env.FROM_EMAIL,
      GRAPH_API_VER: process.env.GRAPH_API_VER,
      CRYPTO_KEY: process.env.CRYPTO_KEY,
      CRYPTO_IV: process.env.CRYPTO_IV
    });

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
    
    res.send(responseBody);
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
