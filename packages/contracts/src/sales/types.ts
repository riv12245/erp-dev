/**
 * Sales contract types.
 */

/** A sales lead */
export interface Lead {
  readonly id: string;
  readonly source: LeadSource;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone: string | null;
  readonly company: string | null;
  readonly status: LeadStatus;
  readonly estimatedValue: number;
  readonly notes: string;
  readonly assignedTo: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type LeadSource = "web" | "referral" | "cold_call" | "social_media" | "partner" | "other";
export type LeadStatus = "new" | "contacted" | "qualified" | "negotiating" | "lost" | "converted";

/** A sales opportunity */
export interface Opportunity {
  readonly id: string;
  readonly leadId: string | null;
  readonly name: string;
  readonly stage: OpportunityStage;
  readonly expectedCloseDate: string | null;
  readonly value: number;
  readonly probability: number;
  readonly assignedTo: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type OpportunityStage = "prospecting" | "qualification" | "proposal" | "negotiation" | "closed_won" | "closed_lost";

/** A quote sent to a customer */
export interface Quote {
  readonly id: string;
  readonly opportunityId: string | null;
  readonly customerId: string;
  readonly items: QuoteItem[];
  readonly subtotal: number;
  readonly taxAmount: number;
  readonly total: number;
  readonly currency: string;
  readonly status: QuoteStatus;
  readonly validUntil: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface QuoteItem {
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly total: number;
}

export type QuoteStatus = "draft" | "sent" | "approved" | "rejected" | "expired";

/** Legacy roadmap projection, not the persisted draft order API. Use DraftSalesOrderDTO for implemented orders. */
export interface Order {
  readonly id: string;
  readonly quoteId: string | null;
  readonly customerId: string;
  readonly items: OrderItem[];
  readonly subtotal: number;
  readonly taxAmount: number;
  readonly discountAmount: number;
  readonly total: number;
  readonly currency: string;
  readonly status: OrderStatus;
  readonly paymentMethod: string;
  readonly shippingAddress: string;
  readonly billingAddress: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OrderItem {
  readonly productId: string;
  readonly productName: string;
  readonly sku: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly total: number;
}

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "returned";
