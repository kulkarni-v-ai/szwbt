import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

const VALID_FINANCE_CATEGORIES = ["REGISTRATION", "ACCOMMODATION", "MATCH"];

/**
 * Helper to escape CSV fields safely according to RFC 4180
 */
function escapeCsv(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * GET /api/finance/reports
 * Provides financial telemetry reports and optional CSV export (?format=csv).
 * Zero transport fees.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const format = searchParams.get("format")?.toLowerCase();
      const categoryParam = searchParams.get("category")?.toUpperCase();
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");

      const isFinanceOrSuper =
        context.roles.includes("SUPER_ADMIN") || context.roles.includes("FINANCE_STAFF");
      const hasPermission =
        context.permissions.includes(PERMISSIONS.FINANCE_REPORT) ||
        context.permissions.includes(PERMISSIONS.FINANCE_READ);
      const hasExportPerm = context.permissions.includes(PERMISSIONS.FINANCE_EXPORT);

      if (!isFinanceOrSuper && !hasPermission) {
        return NextResponse.json(
          { success: false, error: "403 Forbidden: Insufficient clearance to view financial reports." },
          { status: 403 }
        );
      }

      if (format === "csv" && !isFinanceOrSuper && !hasExportPerm) {
        return NextResponse.json(
          { success: false, error: "403 Forbidden: Insufficient clearance to export financial CSV." },
          { status: 403 }
        );
      }

      // Filter conditions
      const where: any = {
        category: categoryParam && VALID_FINANCE_CATEGORIES.includes(categoryParam)
          ? categoryParam
          : { in: VALID_FINANCE_CATEGORIES },
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      // Fetch all transactions matching filter
      const transactions = await prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      // If format === 'csv', return CSV stream
      if (format === "csv") {
        const headers = [
          "Transaction ID",
          "Date & Time (UTC)",
          "Category",
          "Entity Type",
          "Entity ID",
          "Amount (INR)",
          "Payment Method",
          "UTR / Reference",
          "Status",
          "Operator",
          "Receipt Number",
          "Notes",
        ];

        const rows = transactions.map((t) => [
          escapeCsv(t.internalTxnId),
          escapeCsv(t.createdAt.toISOString()),
          escapeCsv(t.category),
          escapeCsv(t.entityType),
          escapeCsv(t.entityId || "N/A"),
          escapeCsv(t.amount.toFixed(2)),
          escapeCsv(t.method),
          escapeCsv(t.utr || "—"),
          escapeCsv(t.status),
          escapeCsv(t.operatorEmail),
          escapeCsv(t.receiptNumber || "—"),
          escapeCsv(t.notes || ""),
        ]);

        const csvContent = [headers.map(escapeCsv).join(","), ...rows.map((r) => r.join(","))].join("\r\n");

        return new NextResponse(csvContent, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="SZWBT2026_Finance_Export_${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      // ── Aggregate Data for JSON Report ─────────────────────────────
      // Fetch fee ledgers
      const feeLedgers = await prisma.feeLedger.findMany({
        where: {
          category: categoryParam && VALID_FINANCE_CATEGORIES.includes(categoryParam)
            ? categoryParam
            : { in: VALID_FINANCE_CATEGORIES },
        },
        include: {
          participant: { select: { institution: true } },
          team: { select: { institution: true } },
        },
      });

      // Category breakdown
      const categoryReport: Record<string, { collected: number; count: number; due: number; balance: number; refunded: number }> = {
        REGISTRATION: { collected: 0, count: 0, due: 0, balance: 0, refunded: 0 },
        ACCOMMODATION: { collected: 0, count: 0, due: 0, balance: 0, refunded: 0 },
        MATCH: { collected: 0, count: 0, due: 0, balance: 0, refunded: 0 },
      };

      let grandCollected = 0;
      let grandRefunded = 0;
      let cashTotal = 0;
      let cashCount = 0;
      let upiTotal = 0;
      let upiCount = 0;

      // Group collections by date (YYYY-MM-DD)
      const dailyMap: Record<string, { date: string; registration: number; accommodation: number; match: number; total: number }> = {};

      for (const t of transactions) {
        const dateKey = t.createdAt.toISOString().slice(0, 10);
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { date: dateKey, registration: 0, accommodation: 0, match: 0, total: 0 };
        }

        if (t.status === "SUCCESS") {
          grandCollected += t.amount;
          if (categoryReport[t.category]) {
            categoryReport[t.category].collected += t.amount;
            categoryReport[t.category].count += 1;
          }

          if (t.method === "CASH") {
            cashTotal += t.amount;
            cashCount += 1;
          } else if (t.method === "UPI") {
            upiTotal += t.amount;
            upiCount += 1;
          }

          dailyMap[dateKey].total += t.amount;
          if (t.category === "REGISTRATION") dailyMap[dateKey].registration += t.amount;
          if (t.category === "ACCOMMODATION") dailyMap[dateKey].accommodation += t.amount;
          if (t.category === "MATCH") dailyMap[dateKey].match += t.amount;
        } else if (t.status === "REFUNDED") {
          grandRefunded += t.amount;
          if (categoryReport[t.category]) {
            categoryReport[t.category].refunded += t.amount;
          }
        }
      }

      // Aggregate ledgers
      let grandDue = 0;
      let grandBalance = 0;
      const institutionMap: Record<string, { institution: string; totalDue: number; totalPaid: number; balance: number; entries: number }> = {};

      for (const l of feeLedgers) {
        if (categoryReport[l.category]) {
          categoryReport[l.category].due += l.amountDue;
          categoryReport[l.category].balance += l.balance;
        }
        grandDue += l.amountDue;
        grandBalance += l.balance;

        const instName = l.participant?.institution || l.team?.institution || "Independent / Unassigned";
        if (!institutionMap[instName]) {
          institutionMap[instName] = { institution: instName, totalDue: 0, totalPaid: 0, balance: 0, entries: 0 };
        }
        institutionMap[instName].totalDue += l.amountDue;
        institutionMap[instName].totalPaid += l.amountPaid;
        institutionMap[instName].balance += l.balance;
        institutionMap[instName].entries += 1;
      }

      const dailyTimeline = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
      const institutions = Object.values(institutionMap).sort((a, b) => b.balance - a.balance);

      return NextResponse.json({
        success: true,
        data: {
          summary: {
            totalCollected: grandCollected,
            totalRefunded: grandRefunded,
            netRevenue: grandCollected - grandRefunded,
            totalDue: grandDue,
            totalOutstandingBalance: grandBalance,
            collectionRatePercent: grandDue > 0 ? ((grandCollected / grandDue) * 100).toFixed(1) : "100.0",
          },
          methodBreakdown: {
            cash: { total: cashTotal, count: cashCount },
            upi: { total: upiTotal, count: upiCount },
          },
          categoryBreakdown: categoryReport,
          dailyTimeline,
          institutionBreakdown: institutions,
        },
      });
    } catch (error: any) {
      console.error("[GET /api/finance/reports] Error:", error);
      return NextResponse.json(
        { success: false, error: "Internal Server Error", details: error.message },
        { status: 500 }
      );
    }
  }
);
