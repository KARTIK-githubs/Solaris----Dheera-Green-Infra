import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db';
import { seedDatabase } from './seedData';

if (!process.env.MONGODB_URI || process.env.NODE_ENV === 'production') {
  throw new Error('Set MONGODB_URI to a dedicated demo database and use a development environment.');
}

try {
  const connection = await connectDB();
  if (!/_demo$/.test(connection.connection.name ?? '')) {
    throw new Error('Use an isolated MongoDB database with a name ending in _demo.');
  }
  const { projectSeeded, membersSeeded } = await seedDatabase();
  console.log(`Demo project inserted: ${projectSeeded}. Demo members inserted: ${membersSeeded}.`);
} finally {
  await disconnectDB();
}
