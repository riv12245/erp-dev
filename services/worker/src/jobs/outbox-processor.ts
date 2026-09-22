import { OutboxProcessor } from '../outbox/outbox-processor.js';
import { DomainEvent } from '../shared/types.js';

export class OutboxProcessorJob {
  private readonly outboxProcessor: OutboxProcessor;

  constructor() {
    this.outboxProcessor = OutboxProcessor.getInstance();
  }

  async execute(): Promise<void> {
    await this.outboxProcessor.processOutbox();
  }

  async handle(_event: DomainEvent): Promise<void> {
    await this.outboxProcessor.processOutbox();
  }
}