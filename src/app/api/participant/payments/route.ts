import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac/guard";
import { resolveAuthenticatedParticipant } from "@/lib/participant/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.authenticated) {
      return authResult.response;
    }

    const { context } = authResult;
    const partAuth = await resolveAuthenticatedParticipant(req, context);
    if (partAuth.errorResponse) {
      return partAuth.errorResponse;
    }

    const { participant } = partAuth;
    if (!participant) {
      return NextResponse.json({
        success: true,
        ledgers: [],
        transactions: [],
        message: "No athlete record linked.",
      });
    }

    // STRICT DOMAIN RULE: Only REGISTRATION, ACCOMMODATION, MATCH.
    // Absolutely NO TRANSPORT payment category!
    const ledgers = await prisma.feeLedger.findMany({
      where: {
        participantId: participant.id,
        category: { in: ["REGISTRATION", "ACCOMMODATION", "MATCH"] },
      },
    });

    // Fetch official payment transactions for this participant (Read-only history)
    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        entityId: participant.id,
        category: { in: ["REGISTRATION", "ACCOMMODATION", "MATCH"] },
      },
      orderBy: { createdAt: "desc" },
    });

    const categories = ["REGISTRATION", "ACCOMMODATION", "MATCH"];
    const formattedLedgers = categories.map((cat) => {
      const match = ledgers.find((l) => l.category === cat);
      if (match) {
        return {
          id: match.id,
          category: match.category,
          amountDue: match.amountDue,
          amountPaid: match.amountPaid,
          balance: match.balance,
          status: match.status,
          hasRecord: true,
        };
      }
      return {
        id: null,
        category: cat,
        amountDue: 0,
        amountPaid: 0,
        balance: 0,
        status: "NO PAYMENT RECORD",
        hasRecord: false,
      };
    });

    const totalDue = ledgers.reduce((sum, l) => sum + l.amountDue, 0);
    const totalPaid = ledgers.reduce((sum, l) => sum + l.amountPaid, 0);
    const totalBalance = ledgers.reduce((sum, l) => sum + l.balance, 0);

    return NextResponse.json({
      success: true,
      summary: {
        totalDue,
        totalPaid,
        totalBalance,
        isSettled: totalBalance <= 0 && ledgers.length > 0,
        deskNotice:
          "Official payment collection is conducted at the Finance Desk. Participant online mutations are disabled for audit security.",
      },
      ledgers: formattedLedgers,
      transactions: transactions.map((t) => ({
        id: t.id,
        category: t.category,
        amount: t.amount,
        method: t.method,
        utr: t.utr ? `••••${t.utr.slice(-4)}` : null, // Mask UTR for privacy
        receiptNumber: t.receiptNumber,
        status: t.status,
        date: t.createdAt,
      })),
    });
  } catch (err: any) {
    console.error("Error in GET /api/participant/payments:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
