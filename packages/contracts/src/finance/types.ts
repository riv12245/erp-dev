/**
 * Finance contract types.
 */

/** A journal entry in the accounting system */
export interface JournalEntry {
  readonly id: string;
  readonly reference: string;
  readonly entryDate: string;
  readonly fiscalPeriodId: string;
  readonly description: string;
  readonly lines: JournalEntryLine[];
  readonly totalDebit: number;
  readonly totalCredit: number;
  readonly isBalanced: boolean;
  readonly status: EntryStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface JournalEntryLine {
  readonly id: string;
  readonly accountId: string;
  readonly debit: number;
  readonly credit: number;
  readonly description: string;
  readonly taxAmount: number;
}

export type EntryStatus = "draft" | "posted" | "approved" | "reversed" | "voided";

/** A ledger account */
export interface LedgerAccount {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly type: AccountType;
  readonly parentAccountId: string | null;
  readonly tenantId: string;
  readonly balance: number;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

/** A fiscal period */
export interface FiscalPeriod {
  readonly id: string;
  readonly name: string;
  readonly fiscalYear: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: FiscalPeriodStatus;
  readonly tenantId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type FiscalPeriodStatus = "open" | "closed" | "locked" | "archived";

/** Financial transaction */
export interface Transaction {
  readonly id: string;
  readonly journalEntryId: string;
  readonly amount: number;
  readonly currency: string;
  readonly type: TransactionType;
  readonly description: string;
  readonly isReconciled: boolean;
  readonly createdAt: string;
}

export type TransactionType = "payment" | "receipt" | "transfer" | "adjustment";

/** Balance sheet summary */
export interface BalanceSheet {
  readonly id: string;
  readonly fiscalPeriodId: string;
  readonly totalAssets: number;
  readonly totalLiabilities: number;
  readonly totalEquity: number;
  readonly isBalanced: boolean;
  readonly createdAt: string;
}
