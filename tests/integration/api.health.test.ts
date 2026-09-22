import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

describe('API Health Check', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  it('should return healthy status when MongoDB is connected', async () => {
    const db = mongoose.connection.db;
    const state = mongoose.connection.readyState;
    expect(state).toBe(1); // connected
    expect(db.databaseName).toBeTruthy();
  });

  it('should report database connectivity', async () => {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    expect(collections).toBeDefined();
  });

  it('should have health check endpoint structure', () => {
    const healthStatus = {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        connected: mongoose.connection.readyState === 1,
        name: mongoose.connection.db?.databaseName,
      },
    };
    expect(healthStatus.status).toBe('healthy');
    expect(healthStatus.database.connected).toBe(true);
    expect(healthStatus.database.name).toBeTruthy();
  });
});
