
import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import { app } from '../server/index';
import { connectDB } from '../server/config/db';

let dbConnection: Promise<unknown> | undefined;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    if (mongoose.connection.readyState !== 1) {
      if (!dbConnection) {
        dbConnection = connectDB().catch((error) => {
          dbConnection = undefined;
          throw error;
        });
      }

      await dbConnection;
    }

    return app(req, res);
  } catch (error) {
    console.error('[Solaris API]', error);

    return res.status(503).json({
      success: false,
      error: 'Backend or database unavailable'
    });
  }
}
