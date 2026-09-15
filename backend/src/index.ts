/**
 * @fileoverview Main server entry point for Workforce Management System API
 * @description Express server setup with all routes
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import handlers
import loginHandler from './api/auth/login';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: any, res: any, next: any) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';

  console.log(`\n[${timestamp}] ${method} ${url} - IP: ${ip}`);

  const originalSend = res.send;
  res.send = function (data: any) {
    const statusEmoji = res.statusCode >= 200 && res.statusCode < 300 ? '✅' : '❌';
    console.log(`  ${statusEmoji} Response: ${res.statusCode} ${req.method} ${url}`);
    return originalSend.call(this, data);
  };

  next();
});

// Helper to adapt handlers (VercelRequest/Response are compatible with Express Request/Response)
const adaptHandler = (handler: (req: any, res: any) => Promise<any>) => {
  return async (req: any, res: any) => {
    try {
      await handler(req, res);
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

// Health check
app.get('/health', (req: any, res: any) => {
  res.json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req: any, res: any) => {
  res.json({
    status: 'ok',
    message: 'API is healthy',
    timestamp: new Date().toISOString()
  });
});

// Auth Routes
app.post('/api/auth/login', adaptHandler(loginHandler));
app.post('/api/auth/register', adaptHandler(registerHandler));


// 404 handler
app.use((req: any, res: any) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
  });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message,
  });
});

// Start server (only in non-Vercel environments)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 server running on http://localhost:${PORT}`);
    console.log(`📝 Health check: http://localhost:${PORT}/health`);
  });
}

export default app;

