/**
 * Domain event types for the ERP platform.
 */

/** Base interface for all domain events */
export interface DomainEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly tenantId: string | null;
  readonly occurredAt: string;
  readonly recordedAt: string;
  readonly metadata: Record<string, unknown>;
}

/** Authentication events */
export interface UserRegisteredEvent extends DomainEvent {
  readonly eventType: "user.registered";
  readonly userId: string;
  readonly email: string;
}

export interface UserLoggedInEvent extends DomainEvent {
  readonly eventType: "user.logged_in";
  readonly userId: string;
  readonly sessionId: string;
  readonly ipAddress: string;
}

export interface UserLoggedOutEvent extends DomainEvent {
  readonly eventType: "user.logged_out";
  readonly userId: string;
  readonly sessionId: string;
}

export interface PasswordChangedEvent extends DomainEvent {
  readonly eventType: "password.changed";
  readonly userId: string;
}

/** Tenant events */
export interface TenantCreatedEvent extends DomainEvent {
  readonly eventType: "tenant.created";
  readonly tenantId: string;
  readonly name: string;
}

export interface TenantActivatedEvent extends DomainEvent {
  readonly eventType: "tenant.activated";
  readonly tenantId: string;
}

/** Sales events */
export interface LeadCreatedEvent extends DomainEvent {
  readonly eventType: "lead.created";
  readonly leadId: string;
  readonly email: string;
  readonly source: string;
}

export interface OpportunityCreatedEvent extends DomainEvent {
  readonly eventType: "opportunity.created";
  readonly opportunityId: string;
  readonly leadId: string | null;
  readonly value: number;
}

export interface OrderCreatedEvent extends DomainEvent {
  readonly eventType: "order.created";
  readonly orderId: string;
  readonly customerId: string;
  readonly total: number;
}

export interface OrderShippedEvent extends DomainEvent {
  readonly eventType: "order.shipped";
  readonly orderId: string;
  readonly trackingNumber: string;
}

/** Inventory events */
export interface ProductCreatedEvent extends DomainEvent {
  readonly eventType: "product.created";
  readonly productId: string;
  readonly sku: string;
}

export interface StockAdjustedEvent extends DomainEvent {
  readonly eventType: "stock.adjusted";
  readonly skuId: string;
  readonly warehouseId: string;
  readonly quantity: number;
  readonly reason: string;
}

export interface LowStockAlertEvent extends DomainEvent {
  readonly eventType: "low_stock_alert";
  readonly skuId: string;
  readonly warehouseId: string;
  readonly currentQuantity: number;
  readonly reorderLevel: number;
}

/** Finance events */
export interface JournalEntryPostedEvent extends DomainEvent {
  readonly eventType: "journal_entry.posted";
  readonly entryId: string;
  readonly reference: string;
  readonly totalDebit: number;
  readonly totalCredit: number;
}

export interface PaymentProcessedEvent extends DomainEvent {
  readonly eventType: "payment.processed";
  readonly transactionId: string;
  readonly amount: number;
  readonly currency: string;
}

/** Union type of all domain events */
export type DomainEventUnion =
  | UserRegisteredEvent
  | UserLoggedInEvent
  | UserLoggedOutEvent
  | PasswordChangedEvent
  | TenantCreatedEvent
  | TenantActivatedEvent
  | LeadCreatedEvent
  | OpportunityCreatedEvent
  | OrderCreatedEvent
  | OrderShippedEvent
  | ProductCreatedEvent
  | StockAdjustedEvent
  | LowStockAlertEvent
  | JournalEntryPostedEvent
  | PaymentProcessedEvent;
