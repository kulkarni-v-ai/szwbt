import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

const VALID_FINANCE_CATEGORIES = ["REGISTRATION", "ACCOMMODATION", "MATCH"];

/**
 * GET /api/finance/payments/[id]
 * Fetch single payment transaction with fee ledger and entity details.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      const isFinanceOrSuper =
        context.roles.includes("SUPER_ADMIN") || context.roles.includes("FINANCE_STAFF");
      const hasPermission = context.permissions.includes(PERMISSIONS.FINANCE_REPORT) || context.permissions.includes(PERMISSIONS.FINANCE_READ);

      if (!isFinanceOrSuper && !hasPermission) {
        return NextResponse.json(
          { success: false, error: "403 Forbidden: Insufficient clearance to view payment record." },
          { status: 403 }
        );
      }

      const tx = await prisma.paymentTransaction.findUnique({
        where: { id },
      });

      if (!tx) {
        return NextResponse.json(
          { success: false, error: "404 Not Found: Transaction not found." },
          { status: 404 }
        );
      }

      // Prohibit access to transport if any exists in db
      if (!VALID_FINANCE_CATEGORIES.includes(tx.category)) {
        return NextResponse.json(
          { success: false, error: "400 Bad Request: Ineligible transaction category." },
          { status: 400 }
        );
      }

      // Resolve Entity Details
      let entity: any = null;
      let feeLedger: any = null;

      if (tx.entityType === "PARTICIPANT" && tx.entityId) {
        entity = await prisma.participant.findUnique({
          where: { id: tx.entityId },
          select: {
            id: true,
            name: true,
            playerId: true,
            institution: true,
            category: true,
            teamMemberships: {
              include: { team: { select: { id: true, name: true, teamCode: true } } },
            },
          },
        });
        feeLedger = await prisma.feeLedger.findFirst({
          where: { participantId: tx.entityId, category: tx.category },
        });
      } else if (tx.entityType === "TEAM" && tx.entityId) {
        entity = await prisma.team.findUnique({
          where: { id: tx.entityId },
          select: {
            id: true,
            name: true,
            teamCode: true,
            institution: true,
            state: true,
          },
        });
        feeLedger = await prisma.feeLedger.findFirst({
          where: { teamId: tx.entityId, category: tx.category },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          transaction: tx,
          entity,
          feeLedger,
        },
      });
    } catch (error: any) {
      console.error("[GET /api/finance/payments/[id]] Error:", error);
      return NextResponse.json(
        { success: false, error: "Internal Server Error", details: error.message },
        { status: 500 }
      );
    }
  }
);

/**
 * PATCH /api/finance/payments/[id]
 * Process refunds or update transaction notes/metadata.
 * Strictly verifies clearance (FINANCE_REFUND or FINANCE_UPDATE_PAYMENT).
 */
export const PATCH = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const { action, reason, notes } = body;

      const isSuper = context.roles.includes("SUPER_ADMIN");
      const isFinance = context.roles.includes("FINANCE_STAFF");
      const hasRefundPerm = context.permissions.includes(PERMISSIONS.FINANCE_REFUND);
      const hasUpdatePerm = context.permissions.includes(PERMISSIONS.FINANCE_UPDATE_PAYMENT);

      const existingTx = await prisma.paymentTransaction.findUnique({
        where: { id },
      });

      if (!existingTx) {
        return NextResponse.json(
          { success: false, error: "404 Not Found: Transaction not found." },
          { status: 404 }
        );
      }

      if (!VALID_FINANCE_CATEGORIES.includes(existingTx.category)) {
        return NextResponse.json(
          { success: false, error: "400 Bad Request: Ineligible transaction category." },
          { status: 400 }
        );
      }

      // Handle REFUND action
      if (action === "REFUND") {
        if (!isSuper && !isFinance && !hasRefundPerm) {
          return NextResponse.json(
            { success: false, error: "403 Forbidden: Clearance FINANCE_REFUND required." },
            { status: 403 }
          );
        }

        if (existingTx.status === "REFUNDED") {
          return NextResponse.json(
            { success: false, error: "Transaction is already refunded." },
            { status: 400 }
          );
        }

        if (!reason || reason.trim().length < 5) {
          return NextResponse.json(
            { success: false, error: "A valid audit reason of at least 5 characters is required for refund." },
            { status: 400 }
          );
        }

        // Execute refund within atomic transaction to update transaction & adjust fee ledger
        const updatedTx = await prisma.$transaction(async (txPrisma) => {
          // 1. Mark transaction as REFUNDED
          const updated = await txPrisma.paymentTransaction.update({
            where: { id },
            data: {
              status: "REFUNDED",
              notes: existingTx.notes
                ? `${existingTx.notes} | Refund Reason: ${reason.trim()} (Processed by ${context.user.email})`
                : `Refund Reason: ${reason.trim()} (Processed by ${context.user.email})`,
            },
          });

          // 2. Adjust FeeLedger if exists
          let ledger = null;
          if (existingTx.entityType === "PARTICIPANT" && existingTx.entityId) {
            ledger = await txPrisma.feeLedger.findFirst({
              where: { participantId: existingTx.entityId, category: existingTx.category },
            });
          } else if (existingTx.entityType === "TEAM" && existingTx.entityId) {
            ledger = await txPrisma.feeLedger.findFirst({
              where: { teamId: existingTx.entityId, category: existingTx.category },
            });
          }

          if (ledger) {
            const newAmountPaid = Math.max(0, ledger.amountPaid - existingTx.amount);
            const newBalance = Math.max(0, ledger.amountDue - newAmountPaid);
            const newStatus =
              newBalance <= 0
                ? "PAID"
                : newAmountPaid > 0
                ? "PARTIALLY_PAID"
                : "UNPAID";

            await txPrisma.feeLedger.update({
              where: { id: ledger.id },
              data: {
                amountPaid: newAmountPaid,
                balance: newBalance,
                status: newStatus,
              },
            });
          }

          return updated;
        });

        // Audit logging
        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "PAYMENT_REFUNDED",
          resourceType: "PAYMENT_TRANSACTION",
          resourceId: id,
          metadata: {
            amount: existingTx.amount,
            category: existingTx.category,
            method: existingTx.method,
            utr: existingTx.utr,
            reason: reason.trim(),
            roles: context.roles,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Transaction marked as REFUNDED. Fee ledger balances recalculated.",
          data: updatedTx,
        });
      }

      // Handle NOTE / METADATA update
      if (action === "UPDATE_NOTES") {
        if (!isSuper && !isFinance && !hasUpdatePerm) {
          return NextResponse.json(
            { success: false, error: "403 Forbidden: Clearance FINANCE_UPDATE_PAYMENT required." },
            { status: 403 }
          );
        }

        const updated = await prisma.paymentTransaction.update({
          where: { id },
          data: {
            notes: notes !== undefined ? notes : existingTx.notes,
          },
        });

        await logAuditEvent({
          actorUserId: context.user.id,
          actorEmail: context.user.email,
          action: "PAYMENT_NOTES_UPDATED",
          resourceType: "PAYMENT_TRANSACTION",
          resourceId: id,
          metadata: {
            previousNotes: existingTx.notes,
            newNotes: notes,
            roles: context.roles,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Transaction notes updated.",
          data: updated,
        });
      }

      return NextResponse.json(
        { success: false, error: "Invalid action. Supported actions: REFUND, UPDATE_NOTES" },
        { status: 400 }
      );
    } catch (error: any) {
      console.error("[PATCH /api/finance/payments/[id]] Error:", error);
      return NextResponse.json(
        { success: false, error: "Internal Server Error", details: error.message },
        { status: 500 }
      );
    }
  }
);
