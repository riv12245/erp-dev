export interface ValidatableEvent {
  readonly eventType: string;
  readonly data: Record<string, unknown>;
}

export class EventSchemaValidator {
  private static instance: EventSchemaValidator;
  private schemas: Map<string, { requiredFields: string[]; validate: (data: Record<string, unknown>) => boolean }> = new Map();

  private constructor() {
    this.registerSchemas();
  }

  static getInstance(): EventSchemaValidator {
    if (!EventSchemaValidator.instance) {
      EventSchemaValidator.instance = new EventSchemaValidator();
    }
    return EventSchemaValidator.instance;
  }

  async validate(event: ValidatableEvent): Promise<boolean> {
    const schema = this.schemas.get(event.eventType);
    if (!schema) return true;
    return schema.validate(event.data);
  }

  async validateIntegration(event: ValidatableEvent): Promise<boolean> {
    const schema = this.schemas.get(event.eventType);
    if (!schema) return true;
    return schema.validate(event.data);
  }

  private registerSchemas(): void {
    this.schemas.set('order.created', {
      requiredFields: ['orderId', 'customerId', 'total'],
      validate: (data) => !!data.orderId && !!data.customerId && typeof data.total === 'number',
    });
    this.schemas.set('payment.processed', {
      requiredFields: ['paymentId', 'orderId', 'amount'],
      validate: (data) => !!data.paymentId && !!data.orderId && typeof data.amount === 'number',
    });
    this.schemas.set('user.registered', {
      requiredFields: ['userId', 'email'],
      validate: (data) => !!data.userId && !!data.email,
    });
  }
}