import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

const VALID_FINANCE_CATEGORIES = ["REGISTRATION", "ACCOMMODATION", "MATCH"];

/**
 * GET /api/finance/pending
 * Retrieve pending fee ledgers (balance > 0) for legitimate categories.
 * Strictly zero transport.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const categoryParam = searchParams.get("category")?.toUpperCase();
      const search = searchParams.get("search")?.trim() || "";
      const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
      const skip = (page - 1) * limit;

      const isFinanceOrSuper =
        context.roles.includes("SUPER_ADMIN") || context.roles.includes("FINANCE_STAFF");
      const hasPermission =
        context.permissions.includes(PERMISSIONS.FINANCE_REPORT) ||
        context.permissions.includes(PERMISSIONS.FINANCE_READ);

      if (!isFinanceOrSuper && !hasPermission) {
        return NextResponse.json(
          { success: false, error: "403 Forbidden: Insufficient clearance to view pending balances." },
          { status: 403 }
        );
      }

      // Base category filter
      let categoriesToFetch = VALID_FINANCE_CATEGORIES;
      if (categoryParam) {
        if (!VALID_FINANCE_CATEGORIES.includes(categoryParam)) {
          return NextResponse.json(
            { success: false, error: "400 Bad Request: Ineligible finance category." },
            { status: 400 }
          );
        }
        categoriesToFetch = [categoryParam];
      }

      // Build WHERE conditions
      const where: any = {
        category: { in: categoriesToFetch },
        balance: { gt: 0 },
      };

      if (search) {
        where.OR = [
          {
            participant: {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { playerId: { contains: search, mode: "insensitive" } },
                { institution: { contains: search, mode: "insensitive" } },
              ],
            },
          },
          {
            team: {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { teamCode: { contains: search, mode: "insensitive" } },
                { institution: { contains: search, mode: "insensitive" } },
              ],
            },
          },
        ];
      }

      const [totalCount, pendingLedgers, categoryAggregations] = await Promise.all([
        prisma.feeLedger.count({ where }),
        prisma.feeLedger.findMany({
          where,
          include: {
            participant: {
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
            },
            team: {
              select: {
                id: true,
                name: true,
                teamCode: true,
                institution: true,
                state: true,
              },
            },
          },
          orderBy: { balance: "desc" },
          skip,
          take: limit,
        }),
        // Group by category to get total pending amounts
        prisma.feeLedger.groupBy({
          by: ["category"],
          where: {
            category: { in: VALID_FINANCE_CATEGORIES },
            balance: { gt: 0 },
          },
          _sum: {
            balance: true,
            amountDue: true,
            amountPaid: true,
          },
          _count: {
            id: true,
          },
        }),
      ]);

      // Category breakdown map
      const pendingByCategory: Record<string, { count: number; totalDue: number; totalPaid: number; totalBalance: number }> = {
        REGISTRATION: { count: 0, totalDue: 0, totalPaid: 0, totalBalance: 0 },
        ACCOMMODATION: { count: 0, totalDue: 0, totalPaid: 0, totalBalance: 0 },
        MATCH: { count: 0, totalDue: 0, totalPaid: 0, totalBalance: 0 },
      };

      let grandTotalPending = 0;
      for (const item of categoryAggregations) {
        if (pendingByCategory[item.category]) {
          const balance = item._sum.balance || 0;
          pendingByCategory[item.category] = {
            count: item._count.id,
            totalDue: item._sum.amountDue || 0,
            totalPaid: item._sum.amountPaid || 0,
            totalBalance: balance,
          };
          grandTotalPending += balance;
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          summary: {
            totalPendingRecords: totalCount,
            grandTotalPending,
            byCategory: pendingByCategory,
          },
          pagination: {
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit) || 1,
            totalCount,
          },
          ledgers: pendingLedgers,
        },
      });
    } catch (error: any) {
      console.error("[GET /api/finance/pending] Error:", error);
      return NextResponse.json(
        { success: false, error: "Internal Server Error", details: error.message },
        { status: 500 }
      );
    }
  }
);
