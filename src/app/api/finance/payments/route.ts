import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";
import { logAuditEvent } from "@/lib/rbac/audit";

// Legitimate tournament payment categories (ZERO TRANSPORT)
const VALID_FINANCE_CATEGORIES = ["REGISTRATION", "ACCOMMODATION", "MATCH"];

// Standard tournament fee configurations (Source of Truth)
const STANDARD_CONFIGURED_FEES: Record<string, number> = {
  REGISTRATION: 2500, // ₹ 2,500 per athlete / entry
  ACCOMMODATION: 3000, // ₹ 3,000 per person
  MATCH: 1500, // ₹ 1,500 per match / appeal
};

/**
 * GET /api/finance/payments
 * Returns payment records for authorized roles.
 * Strictly excludes transport.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const categoryParam = searchParams.get("category")?.toUpperCase();

      const isFinanceOrSuper =
        context.roles.includes("SUPER_ADMIN") || context.roles.includes("FINANCE_STAFF");
      const hasFinanceClearance =
        isFinanceOrSuper ||
        context.permissions.includes(PERMISSIONS.FINANCE_READ) ||
        context.permissions.includes(PERMISSIONS.FINANCE_REPORT);

      if (!hasFinanceClearance) {
        return NextResponse.json(
          { success: false, error: "403 Forbidden: Insufficient clearance to view payment transactions." },
          { status: 403 }
        );
      }

      if (categoryParam && !VALID_FINANCE_CATEGORIES.includes(categoryParam)) {
        return NextResponse.json(
          {
            success: false,
            error: `400 Bad Request: Ineligible payment category ${categoryParam}.`,
          },
          { status: 400 }
        );
      }

      const whereClause: any = {
        category: categoryParam || { in: VALID_FINANCE_CATEGORIES },
      };

      const transactions = await prisma.paymentTransaction.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        success: true,
        categories: VALID_FINANCE_CATEGORIES,
        transactions,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  },
  {
    permissions: [PERMISSIONS.FINANCE_READ, PERMISSIONS.PAYMENT_READ],
    permissionsMode: "ANY",
  }
);

/**
 * POST /api/finance/payments
 * Record a financial payment transaction (Cash or UPI).
 * Enforces mandatory UTR for UPI, duplicate UTR check, ledger recalculation, and audit log.
 * Strictly rejects transport payments.
 */
export const POST = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const body = await req.json();
      const {
        category: rawCategory,
        entityType: rawEntityType,
        entityId,
        amount: rawAmount,
        method: rawMethod,
        utr: rawUtr,
        notes,
      } = body;

      const category = rawCategory?.toUpperCase();
      const method = rawMethod?.toUpperCase();
      const entityType = rawEntityType?.toUpperCase() || "PARTICIPANT";

      // 1. Category Validation (Zero Transport)
      if (!category || !VALID_FINANCE_CATEGORIES.includes(category)) {
        return NextResponse.json(
          {
            success: false,
            error: `INVALID_CATEGORY: Category must be one of [${VALID_FINANCE_CATEGORIES.join(", ")}]. Transport is university-provided and has zero payment.`,
          },
          { status: 400 }
        );
      }

      // 2. Amount Validation
      const amount = parseFloat(rawAmount);
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { success: false, error: "INVALID_AMOUNT: Payment amount must be a positive number." },
          { status: 400 }
        );
      }

      // 3. Method & UTR Validation
      if (!method || !["CASH", "UPI"].includes(method)) {
        return NextResponse.json(
          { success: false, error: "INVALID_METHOD: Payment method must be CASH or UPI." },
          { status: 400 }
        );
      }

      const trimmedUtr = rawUtr ? String(rawUtr).trim() : "";

      if (method === "UPI") {
        if (!trimmedUtr) {
          return NextResponse.json(
            { success: false, error: "UTR_REQUIRED: Transaction reference / UTR is mandatory for UPI payments." },
            { status: 400 }
          );
        }

        // Duplicate UTR check across all transactions
        const existingTxnWithUtr = await prisma.paymentTransaction.findFirst({
          where: { utr: trimmedUtr },
        });

        if (existingTxnWithUtr) {
          return NextResponse.json(
            {
              success: false,
              code: "DUPLICATE_UTR",
              error: `TRANSACTION REFERENCE ALREADY EXISTS: UTR [${trimmedUtr}] has already been recorded for ${existingTxnWithUtr.category} payment (${existingTxnWithUtr.internalTxnId}).`,
            },
            { status: 409 }
          );
        }
      }

      // 4. Entity Validation
      if (!entityId) {
        return NextResponse.json(
          { success: false, error: "Participant ID or Team ID is required." },
          { status: 400 }
        );
      }

      let participant = null;
      let team = null;

      if (entityType === "PARTICIPANT") {
        participant = await prisma.participant.findUnique({
          where: { id: entityId },
          include: { teamMemberships: { include: { team: true } } },
        });
        if (!participant) {
          return NextResponse.json(
            { success: false, error: "Participant not found." },
            { status: 404 }
          );
        }
      } else if (entityType === "TEAM") {
        team = await prisma.team.findUnique({
          where: { id: entityId },
          include: { members: true },
        });
        if (!team) {
          return NextResponse.json(
            { success: false, error: "Team not found." },
            { status: 404 }
          );
        }
      }

      // 5. Generate Internal Transaction ID & Receipt Number
      const randSuffix = Math.floor(1000 + Math.random() * 9000);
      const categoryCode = category.slice(0, 3);
      const internalTxnId = `TXN-${categoryCode}-${Date.now().toString(36).toUpperCase()}-${randSuffix}`;
      const receiptNumber = `RCP-${categoryCode}-${Math.floor(100000 + Math.random() * 900000)}`;

      // 6. Execute Transaction and Update Fee Ledger in DB Transaction
      const result = await prisma.$transaction(async (tx) => {
        // Record payment transaction
        const newTxn = await tx.paymentTransaction.create({
          data: {
            category,
            entityType,
            entityId,
            amount,
            method,
            utr: method === "UPI" ? trimmedUtr : null,
            internalTxnId,
            operatorEmail: context.user.email,
            receiptNumber,
            status: "SUCCESS",
            notes: notes || `Direct finance intake by ${context.user.email}`,
          },
        });

        // Determine configured fee amount due
        let configuredFeeDue = STANDARD_CONFIGURED_FEES[category] || amount;
        if (entityType === "TEAM" && team) {
          const count = team.members.length || 1;
          if (category === "ACCOMMODATION") configuredFeeDue = count * (STANDARD_CONFIGURED_FEES.ACCOMMODATION || 3000);
          else if (category === "REGISTRATION") configuredFeeDue = STANDARD_CONFIGURED_FEES.REGISTRATION || 2500;
        }

        // Fetch or create Fee Ledger
        const ledgerWhere: any = { category };
        if (entityType === "PARTICIPANT") ledgerWhere.participantId = entityId;
        else ledgerWhere.teamId = entityId;

        const existingLedger = await tx.feeLedger.findFirst({
          where: ledgerWhere,
        });

        let updatedLedger;
        if (existingLedger) {
          const newAmountPaid = existingLedger.amountPaid + amount;
          const currentDue = existingLedger.amountDue > 0 ? existingLedger.amountDue : configuredFeeDue;
          const newBalance = Math.max(0, currentDue - newAmountPaid);
          const newStatus =
            newBalance === 0 ? "PAID" : newAmountPaid > 0 ? "PARTIALLY_PAID" : "UNPAID";

          updatedLedger = await tx.feeLedger.update({
            where: { id: existingLedger.id },
            data: {
              amountDue: currentDue,
              amountPaid: newAmountPaid,
              balance: newBalance,
              status: newStatus,
            },
          });
        } else {
          const initialDue = configuredFeeDue;
          const newBalance = Math.max(0, initialDue - amount);
          const newStatus = newBalance === 0 ? "PAID" : amount > 0 ? "PARTIALLY_PAID" : "UNPAID";

          updatedLedger = await tx.feeLedger.create({
            data: {
              category,
              entityType,
              participantId: entityType === "PARTICIPANT" ? entityId : null,
              teamId: entityType === "TEAM" ? entityId : null,
              amountDue: initialDue,
              amountPaid: amount,
              balance: newBalance,
              status: newStatus,
            },
          });
        }

        return { txn: newTxn, ledger: updatedLedger };
      });

      // 7. Audit Log
      await logAuditEvent({
        actorEmail: context.user.email,
        actorUserId: context.user.id,
        action: "PAYMENT_CREATED",
        resourceType: "payment",
        resourceId: result.txn.id,
        metadata: {
          category,
          amount,
          method,
          utr: method === "UPI" ? trimmedUtr : null,
          receiptNumber,
          internalTxnId,
          entityName: participant?.name || team?.name || entityId,
          newBalance: result.ledger.balance,
          ledgerStatus: result.ledger.status,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Payment successfully recorded.",
          data: {
            transaction: result.txn,
            ledger: result.ledger,
          },
          transaction: result.txn,
          ledger: result.ledger,
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error("Error in POST /api/finance/payments:", error);
      return NextResponse.json(
        { success: false, error: "Failed to record payment: " + error.message },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.PAYMENT_CREATE, PERMISSIONS.FINANCE_CREATE_PAYMENT],
    permissionsMode: "ANY",
  }
);
