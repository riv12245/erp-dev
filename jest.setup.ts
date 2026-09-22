import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;

async function setup() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}

async function teardown() {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}

process.on('beforeExit', async () => {
  await teardown();
});

export { setup, teardown };
