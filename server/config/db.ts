import mongoose from 'mongoose';

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/solaris_dheera';
let pendingConnection: Promise<typeof mongoose> | undefined;

export async function connectDB(uri?: string): Promise<typeof mongoose> {
  if (isDbConnected()) return mongoose;

  const connectionUri = uri || process.env.MONGODB_URI ||
    (process.env.NODE_ENV === 'production' ? undefined : DEFAULT_URI);
  if (!connectionUri) throw new Error('Database configuration is missing.');

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
