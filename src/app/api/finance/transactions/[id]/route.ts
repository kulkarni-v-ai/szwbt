import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

const VALID_FINANCE_CATEGORIES = ["REGISTRATION", "ACCOMMODATION", "MATCH"];

/**
 * GET /api/finance/transactions/[id]
 * Transaction detail with full entity dossier, fee ledger balance, and audit logs.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      const tx = await prisma.paymentTransaction.findUnique({
        where: { id },
      });

      if (!tx || !VALID_FINANCE_CATEGORIES.includes(tx.category)) {
        return NextResponse.json(
          { success: false, error: "Transaction not found." },
          { status: 404 }
        );
      }

      // Resolve Entity Info
      let entityData = null;
      let feeLedger = null;

      if (tx.entityType === "PARTICIPANT" && tx.entityId) {
        const participant = await prisma.participant.findUnique({
          where: { id: tx.entityId },
          include: {
            teamMemberships: { include: { team: true } },
          },
        });
        if (participant) {
          entityData = {
            id: participant.id,
            type: "PARTICIPANT",
            name: participant.name,
            code: participant.playerId,
            institution: participant.institution,
            email: participant.email,
            phone: participant.phone,
            team: participant.teamMemberships[0]?.team?.name || "Independent",
          };
        }

        feeLedger = await prisma.feeLedger.findFirst({
          where: {
            category: tx.category,
            participantId: tx.entityId,
          },
        });
      } else if (tx.entityType === "TEAM" && tx.entityId) {
        const team = await prisma.team.findUnique({
          where: { id: tx.entityId },
          include: { members: true },
        });
        if (team) {
          entityData = {
            id: team.id,
            type: "TEAM",
            name: team.name,
            code: team.teamCode,
            institution: team.institution,
            managerName: team.managerName,
            managerPhone: team.managerPhone,
            memberCount: team.members.length,
          };
        }

        feeLedger = await prisma.feeLedger.findFirst({
          where: {
            category: tx.category,
            teamId: tx.entityId,
          },
        });
      }

      // Fetch related audit logs for this transaction
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          resourceType: "payment",
          resourceId: tx.id,
        },
        orderBy: { timestamp: "desc" },
        take: 10,
      });

      // Log transaction view audit
      await logAuditEvent({
        actorEmail: context.user.email,
        actorUserId: context.user.id,
        action: "TRANSACTION_VIEWED",
        resourceType: "payment",
        resourceId: tx.id,
        metadata: { internalTxnId: tx.internalTxnId, amount: tx.amount },
      });

      return NextResponse.json({
        success: true,
        transaction: {
          id: tx.id,
          internalTxnId: tx.internalTxnId,
          receiptNumber: tx.receiptNumber,
          category: tx.category,
          amount: tx.amount,
          method: tx.method,
          utr: tx.utr || "—",
          status: tx.status,
          operatorEmail: tx.operatorEmail,
          notes: tx.notes || null,
          createdAt: tx.createdAt.toISOString(),
          entity: entityData,
          ledger: feeLedger
            ? {
                amountDue: feeLedger.amountDue,
                amountPaid: feeLedger.amountPaid,
                balance: feeLedger.balance,
                status: feeLedger.status,
              }
            : null,
          auditHistory: auditLogs.map((log) => ({
            action: log.action,
            actor: log.actorEmail,
            timestamp: log.timestamp.toISOString(),
          })),
        },
      });
    } catch (error: any) {
      console.error("Error in GET /api/finance/transactions/[id]:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch transaction details." },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.FINANCE_READ],
  }
);
