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

  const server = context.express.listen(config.port, config.host, () => {
    console.info(`[bootstrap] erp-api listening on ${config.host}:${config.port} (${config.nodeEnv})`);
  });

  const stop = async (): Promise<void> => {
    server.close();
    await disconnectDatabase();
  };

  return { server, context, stop };
}