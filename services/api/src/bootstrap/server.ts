import http from 'node:http';
import { createApp, AppContext } from '../app.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';

export interface ServerHandle {
  readonly server: http.Server;
  readonly context: AppContext;
  readonly stop: () => Promise<void>;
}

/** Boots the API: connect Mongo, create express app, start listening. */
export async function startServer(): Promise<ServerHandle> {
  const context = createApp();
  const { config } = context;

  await connectDatabase(config.mongoUri, config.mongoDbName);

  const server = http.createServer(context.express);
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(config.port, config.host, () => { server.removeListener('error', reject); resolve(); });
    });
  } catch (error) {
    await disconnectDatabase();
    throw error;
  }
  console.info(`[bootstrap] erp-api listening (${config.nodeEnv})`);

  let stopping: Promise<void> | undefined;
  const stop = (): Promise<void> => stopping ??= (async () => {
    // Drain HTTP before closing Mongo. Force hung connections closed after a bounded grace period.
    await new Promise<void>((resolve, reject) => {
      const deadline = setTimeout(() => server.closeAllConnections(), 10_000);
      deadline.unref();
      server.close(error => { clearTimeout(deadline); error ? reject(error) : resolve(); });
      server.closeIdleConnections();
    });
    await disconnectDatabase();
  })();

  return { server, context, stop };
}
