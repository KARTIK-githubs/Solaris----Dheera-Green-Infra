import mongoose from 'mongoose';
import type { Response } from 'express';

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/solaris_dheera';
let pendingConnection: Promise<typeof mongoose> | undefined;

export function databaseUnavailable(res: Response) {
  return res.status(503).json({ success: false, error: 'Database is temporarily unavailable.' });
}

export function isDatabaseUnavailable(error: unknown): boolean {
  const driver = mongoose.mongo;
  return error instanceof mongoose.Error.MongooseServerSelectionError
    || error instanceof driver.MongoServerSelectionError
    || error instanceof driver.MongoNetworkError
    || error instanceof driver.MongoNotConnectedError
    || error instanceof driver.MongoTopologyClosedError
    || error instanceof driver.MongoClientClosedError
    || (error instanceof mongoose.Error && /buffering timed out/.test(error.message));
}

export async function connectDB(uri?: string): Promise<typeof mongoose> {
  if (isDbConnected()) return mongoose;

  const connectionUri = uri || process.env.MONGODB_URI ||
    (process.env.NODE_ENV === 'production' || process.env.VERCEL ? undefined : DEFAULT_URI);
  if (!connectionUri) throw new Error('Database configuration is missing.');
  if (process.env.VERCEL_ENV === 'preview' || (process.env.VERCEL && process.env.VERCEL_ENV !== 'production')) {
    // The driver parses the URI without making a connection.
    const database = new mongoose.mongo.MongoClient(connectionUri).options.dbName;
    if (!database?.endsWith('_preview')) throw new Error('A dedicated preview database is required.');
  }

  pendingConnection ??= mongoose.connect(connectionUri, {
    serverSelectionTimeoutMS: 2500
  }).finally(() => {
    pendingConnection = undefined;
  });

  return await pendingConnection;
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function ensureDbConnected(): Promise<boolean> {
  if (isDbConnected()) return true;
  try {
    await connectDB();
    return true;
  } catch {
    return false;
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
