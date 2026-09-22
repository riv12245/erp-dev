import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { DatabaseService } from '../../services/api/src/config/database.js';

describe('MongoDB Connection', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterEach(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  });

  it('should connect to MongoDB memory server', async () => {
    const uri = mongoServer.getUri();
    expect(uri).toContain('mongodb://');
    expect(uri).toContain('localhost');
  });

  it('should have a database name', () => {
    const uri = mongoServer.getUri();
    const dbName = uri.split('/').pop();
    expect(dbName).toBeTruthy();
    expect(dbName.length).toBeGreaterThan(0);
  });

  it('should support creating and listing collections', async () => {
    const db = mongoose.connection.db;
    await db.createCollection('test_collection');
    const collections = await db.listCollections().toArray();
    const names = collections.map((c) => c.name);
    expect(names).toContain('test_collection');
  });

  it('should support insert and find operations', async () => {
    const db = mongoose.connection.db;
    const col = db.collection('test_users');
    await col.insertOne({ name: 'test', tenantId: 'tenant-a' });
    const result = await col.findOne({ name: 'test' });
    expect(result).toBeTruthy();
    expect(result?.tenantId).toBe('tenant-a');
  });

  it('should support index creation', async () => {
    const db = mongoose.connection.db;
    await db.createCollection('users');
    const col = db.collection('users');
    await col.createIndex({ tenantId: 1, status: 1 });
    const indexes = await col.indexes();
    expect(indexes.some((idx) => idx.key?.tenantId === 1)).toBe(true);
  });
});
