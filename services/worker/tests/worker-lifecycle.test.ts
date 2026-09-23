import { afterEach, describe, expect, it, vi } from 'vitest';
import { Worker } from '../src/worker.js';
import { OutboxProcessor } from '../src/outbox/outbox-processor.js';
import { InboxProcessor } from '../src/outbox/inbox-processor.js';
import { MongoConnection } from '../src/connection.js';
import { Scheduler } from '../src/scheduled/scheduler.js';
import { JobQueue } from '../src/shared/job-queue.js';

describe('worker startup cleanup', () => {
  afterEach(async () => {
    await Worker.getInstance().stop().catch(() => undefined);
    vi.restoreAllMocks();
  });
  it('cleans all started resources after partial startup even if one stop rejects', async () => {
    const resources = new Set<string>();
    const outbox = OutboxProcessor.getInstance();
    const inbox = InboxProcessor.getInstance();
    vi.spyOn(outbox, 'start').mockImplementation(async () => { resources.add('outbox'); });
    vi.spyOn(outbox, 'stop').mockImplementation(async () => { resources.delete('outbox'); throw new Error('stop failed'); });
    vi.spyOn(inbox, 'start').mockImplementation(async () => { resources.add('inbox'); throw new Error('startup failed'); });
    vi.spyOn(inbox, 'stop').mockImplementation(async () => { resources.delete('inbox'); });
    vi.spyOn(Scheduler.getInstance(), 'stop').mockResolvedValue();
    vi.spyOn(JobQueue.getInstance(), 'stop').mockResolvedValue();
    let disconnected = false;
    vi.spyOn(MongoConnection.getInstance(), 'disconnect').mockImplementation(async () => { disconnected = true; });
    const worker = Worker.getInstance();
    await expect(worker.start()).rejects.toThrow('startup failed');
    expect(worker.getIsRunning()).toBe(false);
    expect(resources.size).toBe(0);
    expect(disconnected).toBe(true);
  });
});
