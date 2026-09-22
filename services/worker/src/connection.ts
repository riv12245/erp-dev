import { Connection, createConnection, Model } from 'mongoose';
import { ConfigService } from './config.js';

export class MongoConnection {
  private static instance: MongoConnection;
  private conn: Connection | null = null;
  private readonly configService: ConfigService;

  private constructor() {
    this.configService = ConfigService.getInstance();
  }

  static getInstance(): MongoConnection {
    if (!MongoConnection.instance) {
      MongoConnection.instance = new MongoConnection();
    }
    return MongoConnection.instance;
  }

  async connect(): Promise<Connection> {
    if (this.conn && this.conn.readyState === 1) {
      return this.conn;
    }

    const mongoUri = this.configService.get('mongoUri');

    try {
      const conn = await createConnection(mongoUri, {
        dbName: this.configService.get('mongoDbName'),
        maxPoolSize: Number(process.env.MONGO_POOL_SIZE ?? 50),
        minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE ?? 5),
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        authSource: 'admin',
        retryWrites: true,
        w: 'majority',
      }).asPromise();

      this.conn = conn;
      conn.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      conn.on('disconnected', () => {
        console.warn('MongoDB connection disconnected');
      });

      console.info('MongoDB connected successfully');
      return conn;
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  getConnection(): Connection | null {
    return this.conn;
  }

  async disconnect(): Promise<void> {
    if (this.conn && this.conn.readyState !== 0) {
      await this.conn.close();
      this.conn = null;
      console.info('MongoDB disconnected');
    }
  }

  getModel<T>(name: string): Model<T> {
    if (!this.conn || this.conn.readyState !== 1) {
      throw new Error('Database not connected');
    }
    return this.conn.models[name] as Model<T>;
  }
}
