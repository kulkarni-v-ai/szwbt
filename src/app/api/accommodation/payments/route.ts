import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

// Official Accommodation Fee per person (₹ 3,000)
const ACCOMMODATION_FEE_PER_PERSON = 3000;

/**
 * GET & POST /api/accommodation/payments
 * Strictly isolated financial management for accommodation fees.
 * Completely separate from registration, transport, or match fees.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const teamId = searchParams.get("teamId");
      const participantId = searchParams.get("participantId");

      const whereClause: any = {
        category: "ACCOMMODATION",
      };

      if (teamId) {
        whereClause.entityId = teamId;
      } else if (participantId) {
        whereClause.entityId = participantId;
      }

      // Fetch payment transactions
      const transactions = await prisma.paymentTransaction.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      // Calculate total received
      const totalReceived = transactions.reduce((sum, tx) => sum + tx.amount, 0);

      // Fetch or calculate fee ledger
      let amountDue = 0;
      let balance = 0;

      if (teamId) {
        const team = await prisma.team.findUnique({
          where: { id: teamId },
          include: { members: true },
        });
        const membersCount = team?.members.length || 1;
        amountDue = membersCount * ACCOMMODATION_FEE_PER_PERSON;
        balance = Math.max(0, amountDue - totalReceived);
      } else if (participantId) {
        amountDue = ACCOMMODATION_FEE_PER_PERSON;
        balance = Math.max(0, amountDue - totalReceived);
      } else {
        // Global accommodation fee summary
        const allocatedCount = await prisma.accommodationAllocation.count({
          where: { status: "ACTIVE" },
        });
        amountDue = allocatedCount * ACCOMMODATION_FEE_PER_PERSON;
        balance = Math.max(0, amountDue - totalReceived);
      }

      const formatted = transactions.map((tx) => ({
        id: tx.id,
        internalTxnId: tx.internalTxnId,
        date: tx.createdAt.toISOString().replace("T", " ").slice(0, 16),
        category: tx.category,
        entityType: tx.entityType,
        entityId: tx.entityId,
        amount: tx.amount,
        method: tx.method,
        utr: tx.utr || "—",
        operator: tx.operatorEmail,
        status: tx.status,
        receiptNumber: tx.receiptNumber || `ACC-REC-${tx.id.slice(-6).toUpperCase()}`,
        notes: tx.notes,
      }));

      return NextResponse.json({
        success: true,
        summary: {
          feePerPerson: ACCOMMODATION_FEE_PER_PERSON,
          amountDue,
          amountReceived: totalReceived,
          balance,
          status: balance === 0 ? "PAID" : totalReceived > 0 ? "PARTIALLY_PAID" : "UNPAID",
        },
        transactions: formatted,
      });
    } catch (err: any) {
      console.error("[ACCOMMODATION_PAYMENTS_GET_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.PAYMENT_READ],
  }
);

export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const { entityType, entityId, amount, method, utr, notes } = body;

      if (!entityType || !amount || !method) {
        return NextResponse.json(
          { success: false, error: "entityType, amount, and method (CASH or UPI) are required." },
          { status: 400 }
        );
      }

      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return NextResponse.json(
          { success: false, error: "Amount must be a positive number." },
          { status: 400 }
        );
      }

      const upperMethod = method.toUpperCase();
      if (!["CASH", "UPI"].includes(upperMethod)) {
        return NextResponse.json(
          { success: false, error: "Method must be strictly CASH or UPI." },
          { status: 400 }
        );
      }

      // CRITICAL: If UPI, UTR is strictly mandatory
      if (upperMethod === "UPI") {
        if (!utr || typeof utr !== "string" || !utr.trim()) {
          return NextResponse.json(
            { success: false, error: "UTR / Transaction Reference is mandatory for UPI payments." },
            { status: 400 }
          );
        }

        // Check for duplicate UTR
        const existingUtr = await prisma.paymentTransaction.findFirst({
          where: { utr: utr.trim() },
        });

        if (existingUtr) {
          return NextResponse.json(
            { success: false, error: `Duplicate UTR reference: This UTR (${utr.trim()}) has already been recorded.` },
            { status: 400 }
          );
        }
      }

      // Record transaction
      const receiptNumber = `ACC-${Date.now().toString().slice(-6)}`;
      const paymentTx = await prisma.paymentTransaction.create({
        data: {
          category: "ACCOMMODATION",
          entityType: entityType.toUpperCase(),
          entityId: entityId || null,
          amount: numAmount,
          method: upperMethod,
          utr: upperMethod === "UPI" ? utr.trim() : null,
          operatorEmail: context.user.email,
          receiptNumber,
          notes: notes || "Accommodation desk fee intake",
          status: "SUCCESS",
        },
      });

      // Update or create FeeLedger
      if (entityType === "TEAM" && entityId) {
        await prisma.feeLedger.upsert({
          where: {
            category_teamId: {
              category: "ACCOMMODATION",
              teamId: entityId,
            },
          },
          update: {
            amountPaid: { increment: numAmount },
            balance: { decrement: numAmount },
          },
          create: {
            category: "ACCOMMODATION",
            entityType: "TEAM",
            teamId: entityId,
            amountDue: ACCOMMODATION_FEE_PER_PERSON * 6,
            amountPaid: numAmount,
            balance: ACCOMMODATION_FEE_PER_PERSON * 6 - numAmount,
            status: numAmount >= ACCOMMODATION_FEE_PER_PERSON * 6 ? "PAID" : "PARTIALLY_PAID",
          },
        });
      }

      // Audit Log
      await logAuditEvent({
        actorUserId: context.user.id,
        actorEmail: context.user.email,
        action: "PAYMENT_RECORDED",
        resourceType: "payment",
        resourceId: paymentTx.id,
        metadata: {
          category: "ACCOMMODATION",
          amount: numAmount,
          method: upperMethod,
          utr: upperMethod === "UPI" ? utr.trim() : null,
          receiptNumber,
          operator: context.user.email,
        },
      });

      return NextResponse.json({
        success: true,
        message: `ACCOMMODATION PAYMENT RECORDED: ₹ ${numAmount} via ${upperMethod} (${receiptNumber}).`,
        payment: {
          id: paymentTx.id,
          receiptNumber,
          amount: numAmount,
          method: upperMethod,
          utr: paymentTx.utr || "—",
          date: paymentTx.createdAt.toISOString().replace("T", " ").slice(0, 16),
          operator: context.user.email,
        },
      });
    } catch (err: any) {
      console.error("[ACCOMMODATION_PAYMENT_POST_ERROR]", err);
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.PAYMENT_CREATE],
    auditAction: "PAYMENT_RECORDED",
    auditResource: "payment",
  }
);
