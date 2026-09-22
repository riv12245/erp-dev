import mongoose from 'mongoose';

let cached: mongoose.Connection | null = null;

/** Establishes (or reuses) the MongoDB connection. */
export async function connectDatabase(
  uri: string,
  dbName: string,
): Promise<mongoose.Connection> {
  if (cached && cached.readyState === 1) {
    return cached;
  }

  if (!uri) {
    throw new Error(
      'MONGODB_URI is not configured. Set MONGODB_URI in your environment before starting the API.',
    );
  }

  const connection = mongoose.createConnection(uri, {
    dbName,
    maxPoolSize: Number(process.env.MONGO_POOL_SIZE ?? 20),
    minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE ?? 1),
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45_000,
    retryWrites: true,
  });

  connection.on('error', (error) => {
    console.error('[database] connection error', error.name);
  });

  connection.on('connected', () => {
    console.info('[database] connected');
  });

  connection.on('disconnected', () => {
    console.warn('[database] disconnected');
  });

  try {
    await connection.asPromise();

    cached = connection;

    return connection;
  } catch {
    await connection.close().catch(() => undefined);
    throw new Error('Database connection failed; check configuration and connectivity');
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (cached) {
    await cached.close();
    cached = null;
  }
}

export function getConnection(): mongoose.Connection | null {
  return cached;
}