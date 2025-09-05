// JavaScript compiled version for Vercel - ES Modules
import { Hono } from "hono";

// Simple re-export of the TypeScript worker
// This ensures Vercel can import the worker even if TypeScript compilation fails

const createSimpleHandler = () => {
  const app = new Hono();
  
  app.get("/api/test", async (c) => {
    return c.json({ 
      ok: true, 
      message: "Worker JavaScript fallback active", 
      timestamp: new Date().toISOString(),
      platform: "vercel-js-fallback"
    });
  });

  app.all("*", async (c) => {
    return c.json({ 
      error: "TypeScript worker not available, using JavaScript fallback",
      status: "degraded",
      timestamp: new Date().toISOString()
    }, 503);
  });

  return app;
};

const app = createSimpleHandler();

export default app;
export const fetch = app.fetch.bind(app);
