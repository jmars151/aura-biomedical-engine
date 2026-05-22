import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import url from 'url'

const apiMiddleware = async (req, res, next) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  if (pathname.startsWith('/api/')) {
    const apiName = pathname.slice(5); // e.g. 'align' or 'contact'
    const apiFilePath = path.resolve(process.cwd(), 'api', `${apiName}.js`);
    
    if (fs.existsSync(apiFilePath)) {
      try {
        // Dynamically import the handler with cache-busting timestamp
        const modulePath = url.pathToFileURL(apiFilePath).href;
        const { default: handler } = await import(`${modulePath}?t=${Date.now()}`);
        
        // Attach query parameters
        req.query = parsedUrl.query || {};
        
        // Read and parse POST/PUT JSON body
        let body = {};
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
          const buffers = [];
          for await (const chunk of req) {
            buffers.push(chunk);
          }
          const rawBody = Buffer.concat(buffers).toString();
          if (rawBody) {
            try {
              body = JSON.parse(rawBody);
            } catch {
              body = rawBody; // Fallback to raw text
            }
          }
        }
        req.body = body;
        
        // Mock Vercel response helper methods
        res.status = (statusCode) => {
          res.statusCode = statusCode;
          return res;
        };
        
        res.json = (data) => {
          if (!res.writableEnded) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          }
        };
        
        // Run the serverless handler
        await handler(req, res);
        return; // Prevent falling through to Vite static file serving
      } catch (err) {
        console.error(`Error in local API handler ${apiName}:`, err);
        if (!res.writableEnded) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'error', message: err.message || 'Internal Server Error' }));
        }
        return;
      }
    }
  }
  next();
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-middleware',
      configureServer(server) {
        server.middlewares.use(apiMiddleware);
      },
      configurePreviewServer(server) {
        server.middlewares.use(apiMiddleware);
      }
    }
  ],
})


