import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/rbac/guard";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { UserContext } from "@/lib/rbac/service";

const VALID_FINANCE_CATEGORIES = ["REGISTRATION", "ACCOMMODATION", "MATCH"];

/**
 * GET /api/finance/transactions
 * Server-side paginated, debounced, and filtered transaction search.
 * ZERO TRANSPORT PAYMENT DATA.
 */
export const GET = withAuth(
  async (req: NextRequest, context: UserContext) => {
    try {
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
      const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "15")));
      const category = searchParams.get("category");
      const method = searchParams.get("method");
      const status = searchParams.get("status");
      const search = searchParams.get("search");
      const minAmount = searchParams.get("minAmount");
      const maxAmount = searchParams.get("maxAmount");
      const skip = (page - 1) * limit;

      const whereClause: any = {};

      // Category filter (Strictly legitimate categories, no transport)
      if (category && category !== "ALL") {
        if (!VALID_FINANCE_CATEGORIES.includes(category.toUpperCase())) {
          return NextResponse.json(
            { success: false, error: `Invalid category ${category}. Transport is not a financial category.` },
            { status: 400 }
          );
        }
        whereClause.category = category.toUpperCase();
      } else {
        whereClause.category = { in: VALID_FINANCE_CATEGORIES };
      }

      // Method filter
      if (method && method !== "ALL") {
        whereClause.method = method.toUpperCase();
      }

      // Status filter
      if (status && status !== "ALL") {
        whereClause.status = status.toUpperCase();
      }

      // Amount filter
      if (minAmount || maxAmount) {
        whereClause.amount = {};
        if (minAmount) whereClause.amount.gte = parseFloat(minAmount);
        if (maxAmount) whereClause.amount.lte = parseFloat(maxAmount);
      }

      // Search query filter
      if (search && search.trim()) {
        const q = search.trim();
        // Find matching participant IDs
        const matchedParticipants = await prisma.participant.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { playerId: { contains: q, mode: "insensitive" } },
              { institution: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          },
          select: { id: true },
          take: 50,
        });
        const matchedPartIds = matchedParticipants.map((p) => p.id);

        // Find matching team IDs
        const matchedTeams = await prisma.team.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { teamCode: { contains: q, mode: "insensitive" } },
              { institution: { contains: q, mode: "insensitive" } },
            ],
          },
          select: { id: true },
          take: 50,
        });
        const matchedTeamIds = matchedTeams.map((t) => t.id);

        whereClause.OR = [
          { internalTxnId: { contains: q, mode: "insensitive" } },
          { utr: { contains: q, mode: "insensitive" } },
          { receiptNumber: { contains: q, mode: "insensitive" } },
          { operatorEmail: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
          ...(matchedPartIds.length > 0 ? [{ entityId: { in: matchedPartIds } }] : []),
          ...(matchedTeamIds.length > 0 ? [{ entityId: { in: matchedTeamIds } }] : []),
        ];
      }

      // Execute queries
      const [totalCount, transactions] = await Promise.all([
        prisma.paymentTransaction.count({ where: whereClause }),
        prisma.paymentTransaction.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
      ]);

      // Enrich with entity names
      const enriched = await Promise.all(
        transactions.map(async (tx) => {
          let entityName = "—";
          let entityCode = "—";
          let institution = "—";

          if (tx.entityType === "PARTICIPANT" && tx.entityId) {
            const p = await prisma.participant.findUnique({
              where: { id: tx.entityId },
              select: { name: true, playerId: true, institution: true },
            });
            if (p) {
              entityName = p.name;
              entityCode = p.playerId;
              institution = p.institution;
            }
          } else if (tx.entityType === "TEAM" && tx.entityId) {
            const t = await prisma.team.findUnique({
              where: { id: tx.entityId },
              select: { name: true, teamCode: true, institution: true },
            });
            if (t) {
              entityName = t.name;
              entityCode = t.teamCode;
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
            entityId: tx.entityId,
            entityName,
            entityCode,
            institution,
            amount: tx.amount,
            method: tx.method,
            utr: tx.utr || "—",
            operatorEmail: tx.operatorEmail,
            status: tx.status,
            notes: tx.notes || null,
          };
        })
      );

      return NextResponse.json({
        success: true,
        transactions: enriched,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error: any) {
      console.error("Error in GET /api/finance/transactions:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch transactions." },
        { status: 500 }
      );
    }
  },
  {
    permissions: [PERMISSIONS.FINANCE_READ],
  }
);
