import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

// Legitimate tournament payment categories (ZERO TRANSPORT)
const VALID_FINANCE_CATEGORIES = ["REGISTRATION", "ACCOMMODATION", "MATCH"];

/**
 * GET /api/finance/overview
 * Centralized real-time financial telemetry for authorized finance staff.
 * 100% database-derived. Zero fake statistics.
 * ZERO TRANSPORT PAYMENT DATA.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      // 1. Fetch transactions for legitimate categories
      const transactions = await prisma.paymentTransaction.findMany({
        where: {
          category: { in: VALID_FINANCE_CATEGORIES },
        },
        orderBy: { createdAt: "desc" },
      });

      // 2. Fetch fee ledgers
      const feeLedgers = await prisma.feeLedger.findMany({
        where: {
          category: { in: VALID_FINANCE_CATEGORIES },
        },
        include: {
          participant: { select: { id: true, name: true, playerId: true, institution: true } },
          team: { select: { id: true, name: true, teamCode: true, institution: true } },
        },
      });

      // 3. Compute Aggregated KPIs
      let totalCollected = 0;
      let totalRefunded = 0;
      let completedPayments = 0;
      let failedPayments = 0;

      let cashTotal = 0;
      let cashCount = 0;
      let upiTotal = 0;
      let upiCount = 0;

      // Category collections
      const categoryCollections: Record<string, { collected: number; count: number }> = {
        REGISTRATION: { collected: 0, count: 0 },
        ACCOMMODATION: { collected: 0, count: 0 },
        MATCH: { collected: 0, count: 0 },
      };

      for (const tx of transactions) {
        if (tx.status === "SUCCESS") {
          totalCollected += tx.amount;
          completedPayments++;

          if (categoryCollections[tx.category]) {
            categoryCollections[tx.category].collected += tx.amount;
            categoryCollections[tx.category].count++;
          }

          if (tx.method === "CASH") {
            cashTotal += tx.amount;
            cashCount++;
          } else if (tx.method === "UPI") {
            upiTotal += tx.amount;
            upiCount++;
          }
        } else if (tx.status === "REFUNDED") {
          totalRefunded += tx.amount;
        } else if (tx.status === "FAILED") {
          failedPayments++;
        }
      }

      // Compute Pending from FeeLedgers
      let totalPending = 0;
      let partialPaymentsCount = 0;
      let unpaidCount = 0;

      const categoryPending: Record<string, number> = {
        REGISTRATION: 0,
        ACCOMMODATION: 0,
        MATCH: 0,
      };
      const categoryDue: Record<string, number> = {
        REGISTRATION: 0,
        ACCOMMODATION: 0,
        MATCH: 0,
      };
      const categoryPaid: Record<string, number> = {
        REGISTRATION: 0,
        ACCOMMODATION: 0,
        MATCH: 0,
      };

      for (const ledger of feeLedgers) {
        if (ledger.balance > 0) {
          totalPending += ledger.balance;
          if (categoryPending[ledger.category] !== undefined) {
            categoryPending[ledger.category] += ledger.balance;
          }
        }
        if (categoryDue[ledger.category] !== undefined) {
          categoryDue[ledger.category] += ledger.amountDue;
        }
        if (categoryPaid[ledger.category] !== undefined) {
          categoryPaid[ledger.category] += ledger.amountPaid;
        }

        if (ledger.status === "PARTIALLY_PAID") {
          partialPaymentsCount++;
        } else if (ledger.status === "UNPAID") {
          unpaidCount++;
        }
      }

      // 4. Resolve recent transaction entities
      const recentTransactions = await Promise.all(
        transactions.slice(0, 10).map(async (tx) => {
          let entityName = "—";
          let institution = "—";

          if (tx.entityType === "PARTICIPANT" && tx.entityId) {
            const p = await prisma.participant.findUnique({
              where: { id: tx.entityId },
              select: { name: true, playerId: true, institution: true },
            });
            if (p) {
              entityName = `${p.name} (${p.playerId})`;
              institution = p.institution;
            }
          } else if (tx.entityType === "TEAM" && tx.entityId) {
            const t = await prisma.team.findUnique({
              where: { id: tx.entityId },
              select: { name: true, teamCode: true, institution: true },
            });
            if (t) {
              entityName = `${t.name} (${t.teamCode})`;
              institution = t.institution;
            }
          }

          return {
            id: tx.id,
            internalTxnId: tx.internalTxnId,
            receiptNumber: tx.receiptNumber,
            date: tx.createdAt.toISOString().slice(0, 16).replace("T", " "),
            category: tx.category,
            entityType: tx.entityType,
            entityName,
            institution,
            amount: tx.amount,
            method: tx.method,
            utr: tx.utr || "—",
            operator: tx.operatorEmail,
            operatorEmail: tx.operatorEmail,
            status: tx.status,
            notes: tx.notes || null,
            createdAt: tx.createdAt.toISOString(),
          };
        })
      );

      const summary = {
        totalCollected,
        totalPending,
        totalRefunded,
        netRevenue: totalCollected - totalRefunded,
        totalTransactions: transactions.length,
        completedPayments,
        partialPayments: partialPaymentsCount,
        pendingPayments: unpaidCount + partialPaymentsCount,
        failedPayments,
      };

      const byCategory = {
        REGISTRATION: {
          collected: categoryCollections.REGISTRATION.collected,
          count: categoryCollections.REGISTRATION.count,
          totalDue: categoryDue.REGISTRATION,
          totalPaid: categoryPaid.REGISTRATION,
          balance: categoryPending.REGISTRATION,
        },
        ACCOMMODATION: {
          collected: categoryCollections.ACCOMMODATION.collected,
          count: categoryCollections.ACCOMMODATION.count,
          totalDue: categoryDue.ACCOMMODATION,
          totalPaid: categoryPaid.ACCOMMODATION,
          balance: categoryPending.ACCOMMODATION,
        },
        MATCH: {
          collected: categoryCollections.MATCH.collected,
          count: categoryCollections.MATCH.count,
          totalDue: categoryDue.MATCH,
          totalPaid: categoryPaid.MATCH,
          balance: categoryPending.MATCH,
        },
      };

      const byMethod = {
        CASH: { total: cashTotal, count: cashCount },
        UPI: { total: upiTotal, count: upiCount },
      };

      return NextResponse.json({
        success: true,
        data: {
          summary,
          byCategory,
          byMethod,
          recentTransactions,
        },
        kpis: summary,
        categoryBreakdown: byCategory,
        methodBreakdown: byMethod,
        recentTransactions,
      });
    } catch (error: any) {
      console.error("Error in GET /api/finance/overview:", error);
      return NextResponse.json(
        { success: false, error: "Failed to load financial overview data." },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.FINANCE_READ],
  }
);
