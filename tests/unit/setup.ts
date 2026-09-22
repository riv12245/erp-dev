import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { connectMongo, disconnectMongo } from './helpers.js';

describe('Unit Test Setup', () => {
  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await disconnectMongo();
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  it('should have a connected MongoDB in-memory server', async () => {
    const db = mongoose.connection.db;
    expect(db).toBeTruthy();
    expect(db.databaseName).toBeTruthy();
  });

  it('should have a clean database before each test', async () => {
    const collections = await mongoose.connection.db.listCollections().toArray();
    expect(collections.length).toBe(0);
  });
});
