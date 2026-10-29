import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import { app } from '../server/index';
import { connectDB } from '../server/config/db';

let dbInitPromise: Promise<void> | null = null;
let lastFailureTime = 0;
const RETRY_COOLDOWN_MS = 10000;

async function ensureDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  const now = Date.now();
  if (now - lastFailureTime < RETRY_COOLDOWN_MS) return;

  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        await connectDB();
        try {
          const { seedDatabase } = await import('../server/seed/seedData');
          await seedDatabase();
        } catch (seedErr: any) {
          console.warn('[Solaris API] Database seeding notice:', seedErr.message);
        }
      } catch (err: any) {
        lastFailureTime = Date.now();
        console.warn('[Solaris API] MongoDB connection could not be established:', err.message);
      } finally {
        dbInitPromise = null;
      }
    })();
  }

  await dbInitPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Establish database connection if configured
    await ensureDatabase();

    // 2. Ensure /api prefix is present if an upstream proxy ever stripped it
    if (req.url && !req.url.startsWith('/api')) {
      req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
    }

    // 3. Delegate directly to Express
    return app(req, res);
  } catch (error: any) {
    console.error('[Solaris API Fatal]', error?.message || error);
    return res.status(500).json({ success: false, error: 'Internal API handler error' });
  }
}
