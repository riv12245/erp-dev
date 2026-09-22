import { Worker } from './worker.js';
import { MongoConnection } from './connection.js';

async function main(): Promise<void> {
  const worker = Worker.getInstance();
  const db = MongoConnection.getInstance();

  try {
    await db.connect();
    await worker.start();
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
}

main();

process.on('SIGTERM', async () => {
  const worker = Worker.getInstance();
  await worker.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  const worker = Worker.getInstance();
  await worker.stop();
  process.exit(0);
});