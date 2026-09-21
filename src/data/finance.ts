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

export const FINANCE_TRANSACTIONS_DATA: FinanceTransaction[] = [
  { id: "tx-1", txRef: "TXN-SZ2026-001", institution: "Karnataka State University", category: "REGISTRATION FEE", amount: "₹ —— CONFIGURABLE", type: "REGISTRATION FEE", status: "SUCCESSFUL", date: "COMING SOON" },
  { id: "tx-2", txRef: "TXN-SZ2026-002", institution: "Kerala Sports Academy", category: "ACCOMMODATION", amount: "₹ —— CONFIGURABLE", type: "ACCOMMODATION", status: "SUCCESSFUL", date: "COMING SOON" },
  { id: "tx-3", txRef: "TXN-SZ2026-003", institution: "Tamil Nadu Badminton Institute", category: "REGISTRATION FEE", amount: "₹ —— CONFIGURABLE", type: "REGISTRATION FEE", status: "PENDING", date: "COMING SOON" },
  { id: "tx-4", txRef: "TXN-SZ2026-004", institution: "Telangana Sports College", category: "TRANSPORT", amount: "₹ —— CONFIGURABLE", type: "TRANSPORT", status: "FAILED", date: "COMING SOON" },
];

export const FINANCE_SUMMARY_DATA = {
  totalRevenue: "₹ —— CONFIGURABLE",
  successfulCount: "128 TRANSACTIONS",
  pendingCount: "14 PENDING",
  failedCount: "3 FAILED",
  refundsCount: "1 REFUND",
  disclaimer: "PAYMENTS ARE CONFIGURABLE. ALL FINANCIAL RECORDS ARE VISUAL UI STRUCTURES."
};
