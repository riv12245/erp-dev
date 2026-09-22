#!/usr/bin/env node
import { startServer } from './server.js';

async function main(): Promise<void> {
  try {
    const handle = await startServer();

    process.on('SIGINT', async () => {
      console.info('[bootstrap] SIGINT received, shutting down');
      await handle.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.info('[bootstrap] SIGTERM received, shutting down');
      await handle.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('[bootstrap] failed to start', error);
    process.exit(1);
  }
}

void main();