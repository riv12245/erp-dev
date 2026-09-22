import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

async function globalSetup() {
  console.log('E2E Test Setup: Starting MongoDB memory server...');
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log('E2E Test Setup: MongoDB connected at', uri);
}

async function globalTeardown() {
  console.log('E2E Test Teardown: Disconnecting from MongoDB...');
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
    console.log('E2E Test Teardown: MongoDB stopped');
  }
}

export async function setup() {
  await globalSetup();
}

export async function teardown() {
  await globalTeardown();
}

export { globalSetup, globalTeardown };

if (typeof require !== 'undefined' && require.main === module) {
  globalSetup().then(() => globalTeardown()).catch(console.error);
}

// Export for use in other test files
export function getMongoUri(): string {
  return mongoServer?.getUri() ?? '';
}

export function getConnection(): typeof mongoose {
  return mongoose;
}
