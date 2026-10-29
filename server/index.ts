import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { seedDatabase } from './seed/seedData';
import { assessmentRouter } from './routes/assessmentRoutes';
import { communityRouter } from './routes/communityRoutes';
import { optimiserRouter } from './routes/optimiserRoutes';
import { auditRouter } from './routes/auditRoutes';
import { aiRouter } from './routes/aiRoutes';
import { supportRouter } from './routes/supportRoutes';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// CORS & Security headers for API
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health & System probe
app.get('/api/health', (_req: Request, res: Response) => {
  const dbStates: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  const dbState = dbStates[mongoose.connection.readyState] || 'unknown';

  return res.json({
    status: 'ok',
    service: 'Solaris Backend Service (Dheera Green Infra)',
    version: '1.0.0-prototype',
    environment: process.env.NODE_ENV || 'development',
    systemTime: new Date().toISOString(),
    database: {
      status: dbState,
      name: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port
    },
    isSyntheticDataEnforced: true,
    jurisdiction: 'Delhi (DERC Jurisdiction)',
    attribution: 'Solaris foundational engine created by Aryan Das, Ayush Bhatt, Priyal Choudhary. Adapted by Kartik for Dheera Green Infra.'
  });
});

// API Routes
app.use('/api/assessments', assessmentRouter);
app.use('/api/community', communityRouter);
app.use('/api/optimiser', optimiserRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/ai', aiRouter);
app.use('/api/support', supportRouter);

// 404 Route handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `API endpoint '${_req.method} ${_req.path}' not found.`
  });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ServerError]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

/**
 * Start standalone HTTP server
 */
export async function startServer(port: number | string = PORT) {
  let dbConnected = false;
  try {
    await connectDB();
    const seedResult = await seedDatabase();
    console.log(`[Seed] Database ready. Project seeded: ${seedResult.projectSeeded}, Members: ${seedResult.membersSeeded}`);
    dbConnected = true;
  } catch (error: any) {
    console.warn(`[MongoDB Notice] Initial database connection was not established: ${error.message}`);
    console.warn(`[MongoDB Notice] Backend server will run with database in disconnected state.`);
    console.warn(`[MongoDB Notice] Start MongoDB at '${process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/solaris_dheera'}' to enable database persistence.`);
  }

  try {
    const server = app.listen(port, () => {
      console.log(`====================================================`);
      console.log(`  Solaris Backend Server running on http://localhost:${port}`);
      console.log(`  API Health: http://localhost:${port}/api/health`);
      console.log(`  MongoDB: ${dbConnected ? 'Connected & Seeded' : 'Disconnected (Operating in offline mode)'}`);
      console.log(`====================================================`);
    });

    return server;
  } catch (error: any) {
    console.error('[Fatal] Failed to start backend server:', error.message);
    process.exit(1);
  }
}

// Self-executing when run directly via tsx server/index.ts
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].includes('server')) {
  startServer();
}
