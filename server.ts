import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const startServer = async () => {
  const express = (await import('express')).default;
  const cors = (await import('cors')).default;
  const { default: loginHandler } = await import('./backend/src/api/auth/login');
  const { default: registerHandler } = await import('./backend/src/api/auth/register');
 
  /* bulk-create is missing */

  const app = express();
  const PORT = process.env.PORT || 3001;

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Request logging middleware (after body parsing)
  app.use((req: any, res: any, next: any) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';

    // Log request start
    console.log(`\n[${timestamp}] ${method} ${url} - IP: ${ip}`);

    // Log response status when response finishes
    const originalSend = res.send;
    res.send = function (data: any) {
      const statusEmoji = res.statusCode >= 200 && res.statusCode < 300 ? '✅' : '❌';
      console.log(`  ${statusEmoji} Response: ${res.statusCode} ${req.method} ${url}`);
      return originalSend.call(this, data);
    };

    next();
  });

  // Helper to convert Express req/res to Vercel format
  // VercelResponse is compatible with Express Response at runtime
  const vercelAdapter = (handler: (req: any, res: any) => Promise<any>) => {
    return async (req: any, res: any) => {
      const vercelReq = req;

      // VercelResponse methods are compatible with Express Response
      // The utils expect Express Response, so we pass res directly
      const vercelRes = res;

      try {
        await handler(vercelReq, vercelRes);
      } catch (error: any) {
        console.error('Handler error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
          });
        }
      }
    };
  };

  // Auth Routes
  app.post('/api/auth/login', vercelAdapter(loginHandler));
  app.post('/api/auth/register', vercelAdapter(registerHandler));

  // Health check
  app.get('/health', (req: any, res: any) => {
    res.json({ status: 'ok', message: 'Local dev server running' });
  });

  app.listen(PORT, () => {
    console.log(`🚀 Local API server running on http://localhost:${PORT}`);
    console.log(`📝 Available endpoints:`);
    console.log(`   GET  http://localhost:${PORT}/health`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});


