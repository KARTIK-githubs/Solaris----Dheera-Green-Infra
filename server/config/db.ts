import mongoose from 'mongoose';

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/solaris_dheera';

/**
 * Connect to MongoDB database
 * @param uri Optional custom connection URI (e.g. for isolated test database)
 */
export async function connectDB(uri?: string): Promise<typeof mongoose> {
  const connectionUri = uri || process.env.MONGODB_URI || DEFAULT_URI;
  try {
    const conn = await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[MongoDB] Connected to database: ${conn.connection.name} at ${conn.connection.host}:${conn.connection.port}`);
    return conn;
  } catch (error: any) {
    console.error(`[MongoDB] Connection error to ${connectionUri}:`, error.message);
    throw error;
  }
}

/**
 * Check if MongoDB connection is active
 */
export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Attempt to reconnect if disconnected
 */
export async function ensureDbConnected(): Promise<boolean> {
  if (isDbConnected()) return true;
  if ((mongoose.connection.readyState as number) === 2) return false;
  try {
    await connectDB();
    return isDbConnected();
  } catch {
    return false;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected from database.');
  } catch (error: any) {
    console.error('[MongoDB] Disconnection error:', error.message);
  }
}
