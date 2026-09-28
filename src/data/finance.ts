export interface FinanceTransaction {
  id: string;
  txRef: string;
  institution: string;
  category: string;
  amount: string;
  type: "REGISTRATION FEE" | "ACCOMMODATION" | "TRANSPORT" | "REFUND";
  status: "SUCCESSFUL" | "PENDING" | "FAILED";
  date: string;
}

export const FINANCE_TRANSACTIONS_DATA: FinanceTransaction[] = [];

export const FINANCE_SUMMARY_DATA = {
  totalRevenue: "₹ 0.00",
  successfulCount: "0 TRANSACTIONS",
  pendingCount: "0 PENDING",
  failedCount: "0 FAILED",
  refundsCount: "0 REFUNDS",
  disclaimer: "PAYMENTS ARE REAL-TIME AND SYNCHRONIZED DIRECTLY WITH POSTGRESQL TREASURY RECORDS."
};
