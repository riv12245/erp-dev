import { Worker } from './worker.js';
import { MongoConnection } from './connection.js';

async function main(): Promise<void> {
  try {
    const worker = Worker.getInstance();
    const db = MongoConnection.getInstance();
    await db.connect();
    await worker.start();
  } catch {
    await MongoConnection.getInstance().disconnect().catch(() => console.error('Worker connection cleanup failed'));
    console.error('Failed to start worker');
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
