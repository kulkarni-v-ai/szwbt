import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

const VALID_FINANCE_CATEGORIES = ["REGISTRATION", "ACCOMMODATION", "MATCH"];

/**
 * GET /api/finance/search
 * Global operational search for finance staff across transactions, participants, and teams.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const query = searchParams.get("q")?.trim() || "";

      const isFinanceOrSuper =
        context.roles.includes("SUPER_ADMIN") || context.roles.includes("FINANCE_STAFF");
      const hasPermission =
        context.permissions.includes(PERMISSIONS.FINANCE_REPORT) ||
        context.permissions.includes(PERMISSIONS.FINANCE_READ);

      if (!isFinanceOrSuper && !hasPermission) {
        return NextResponse.json(
          { success: false, error: "403 Forbidden: Insufficient clearance for finance search." },
          { status: 403 }
        );
      }

      if (!query || query.length < 2) {
        return NextResponse.json({
          success: true,
          data: {
            transactions: [],
            participants: [],
            teams: [],
          },
        });
      }

      // 1. Search Transactions (UTR, InternalTxnId, ReceiptNumber, Notes)
      const transactions = await prisma.paymentTransaction.findMany({
        where: {
          category: { in: VALID_FINANCE_CATEGORIES },
          OR: [
            { internalTxnId: { contains: query, mode: "insensitive" } },
            { utr: { contains: query, mode: "insensitive" } },
            { receiptNumber: { contains: query, mode: "insensitive" } },
            { notes: { contains: query, mode: "insensitive" } },
            { operatorEmail: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      });

      // 2. Search Participants
      const participants = await prisma.participant.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { playerId: { contains: query, mode: "insensitive" } },
            { institution: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          playerId: true,
          institution: true,
          category: true,
          teamMemberships: {
            include: { team: { select: { id: true, name: true, teamCode: true } } },
          },
          paymentLedgers: {
            where: { category: { in: VALID_FINANCE_CATEGORIES } },
          },
        },
        take: 10,
      });

      // 3. Search Teams
      const teams = await prisma.team.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { teamCode: { contains: query, mode: "insensitive" } },
            { institution: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          teamCode: true,
          institution: true,
          state: true,
          paymentLedgers: {
            where: { category: { in: VALID_FINANCE_CATEGORIES } },
          },
        },
        take: 10,
      });

      return NextResponse.json({
        success: true,
        data: {
          query,
          transactions,
          participants,
          teams,
        },
      });
    } catch (error: any) {
      console.error("[GET /api/finance/search] Error:", error);
      return NextResponse.json(
        { success: false, error: "Internal Server Error", details: error.message },
        { status: 500 }
      );
    }
  }
);
