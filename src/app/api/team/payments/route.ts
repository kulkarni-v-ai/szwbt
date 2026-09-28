import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { resolveAuthorizedTeam } from "@/lib/team/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const teamAuth = await resolveAuthorizedTeam(req, context);
    if (teamAuth.errorResponse) {
      return teamAuth.errorResponse;
    }

    const { selectedTeamId } = teamAuth;
    if (!selectedTeamId) {
      return NextResponse.json({
        success: true,
        ledgers: [],
        transactions: [],
        message: "No team assigned.",
      });
    }

    // 1. Fetch authorized team fee ledgers
    // Strictly filter out any inadvertent TRANSPORT records
    const feeLedgers = await prisma.feeLedger.findMany({
      where: {
        teamId: selectedTeamId,
        category: { in: ["REGISTRATION", "ACCOMMODATION", "MATCH"] },
      },
      orderBy: { category: "asc" },
    });

    // Structure categorized summary
    const categories = ["REGISTRATION", "ACCOMMODATION", "MATCH"] as const;
    const categoryLabels: Record<string, string> = {
      REGISTRATION: "Tournament Registration Fee",
      ACCOMMODATION: "Hostel Lodging & Meals Deposit",
      MATCH: "Official Match & Equipment Fees",
    };

    const ledgers = categories.map((cat) => {
      const found = feeLedgers.find((l) => l.category === cat);
      return {
        category: cat,
        displayName: categoryLabels[cat],
        amountDue: found?.amountDue ?? 0,
        amountReceived: found?.amountPaid ?? 0,
        balance: found?.balance ?? 0,
        status: found?.status ?? "UNPAID",
        updatedAt: found?.updatedAt ?? null,
      };
    });

    // Total aggregate (Excluding transport completely)
    const totals = ledgers.reduce(
      (acc, l) => ({
        totalDue: acc.totalDue + l.amountDue,
        totalPaid: acc.totalPaid + l.amountReceived,
        totalBalance: acc.totalBalance + l.balance,
      }),
      { totalDue: 0, totalPaid: 0, totalBalance: 0 }
    );

    // 2. Fetch authorized payment transaction receipts
    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        entityId: selectedTeamId,
        category: { in: ["REGISTRATION", "ACCOMMODATION", "MATCH"] },
      },
      select: {
        id: true,
        category: true,
        amount: true,
        method: true,
        utr: true,
        receiptNumber: true,
        status: true,
        notes: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      teamId: selectedTeamId,
      totals,
      ledgers,
      transactions,
      isReadOnly: true, // Team Manager is strictly viewer, Finance Staff controls creation/refund
      transportNotice: "Transportation is a complimentary service provided by the university. No transit fees apply.",
    });
  } catch (err: any) {
    console.error("Error in GET /api/team/payments:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
