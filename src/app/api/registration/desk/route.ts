import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/rbac/audit";

/**
 * GET /api/registration/desk
 * Returns all registered teams from the database with their members, documents, and payment transactions.
 */
export async function GET(req: NextRequest) {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            participant: {
              include: {
                documents: true,
                qrPasses: { where: { status: "ACTIVE" } },
              },
            },
          },
        },
        qrPasses: { where: { status: "ACTIVE" } },
        paymentLedgers: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const teamIds = teams.map((t) => t.id);
    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        category: "REGISTRATION",
        OR: [
          { entityType: "TEAM", entityId: { in: teamIds } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const txnMap: Record<string, typeof transactions> = {};
    transactions.forEach((tx) => {
      if (tx.entityId) {
        if (!txnMap[tx.entityId]) txnMap[tx.entityId] = [];
        txnMap[tx.entityId].push(tx);
      }
    });

    return NextResponse.json({
      success: true,
      teams: teams.map((t) => ({
        id: t.id,
        teamCode: t.teamCode,
        teamName: t.name,
        state: t.state,
        institution: t.institution,
        managerName: t.managerName,
        managerPhone: t.managerPhone,
        captainName: t.captainName,
        status: t.status,
        teamQrToken: t.teamQrToken,
        createdAt: t.createdAt,
        members: t.members.map((m) => ({
          id: m.participant.id,
          playerId: m.participant.playerId,
          name: m.participant.name,
          email: m.participant.email,
          phone: m.participant.phone,
          role: m.role,
          status: m.participant.status,
          qrCode: m.participant.qrCode,
          documents: m.participant.documents,
        })),
        transactions: txnMap[t.id] || [],
      })),
    });
  } catch (error: any) {
    console.error("[DESK_GET_TEAMS_ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/registration/desk
 * Records a complete university team registration with its payment transaction in PostgreSQL.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      teamName,
      state,
      institution,
      manager1,
      manager2,
      official,
      players,
      payments,
      operator = "Registration Officer (DESK 01)",
      operatorEmail = "desk01@szwbt2026.edu",
    } = body;

    if (!teamName || !state || !institution) {
      return NextResponse.json(
        { success: false, error: "Team Name, State, and Institution are required." },
        { status: 400 }
      );
    }

    const cleanTeamName = teamName.trim();
    const cleanState = state.trim();
    const cleanInst = institution.trim();

    // Execute Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate canonical Team Code
      const teamCount = await tx.team.count();
      const teamCode = `TM-SZ-${String(teamCount + 101).padStart(3, "0")}`;

      // 2. Create Team
      const team = await tx.team.create({
        data: {
          teamCode,
          name: cleanTeamName,
          institution: cleanInst,
          state: cleanState,
          managerName: manager1?.name || manager2?.name || null,
          managerPhone: manager1?.phone || manager2?.phone || null,
          captainName: players?.find((p: any) => p.role === "CAPTAIN")?.name || players?.[0]?.name || null,
          captainPhone: players?.find((p: any) => p.role === "CAPTAIN")?.phone || players?.[0]?.phone || null,
          status: "PENDING_VERIFICATION",
        },
      });

      // 3. Create Participants & Team Members
      const createdParticipants = [];
      if (Array.isArray(players) && players.length > 0) {
        for (let i = 0; i < players.length; i++) {
          const p = players[i];
          if (!p.name || !p.name.trim()) continue;

          const pCount = await tx.participant.count();
          const playerId = `SZ-2026-${String(pCount + 101).padStart(3, "0")}`;

          const participant = await tx.participant.create({
            data: {
              playerId,
              name: p.name.trim(),
              email: p.email?.trim() || null,
              phone: p.phone?.trim() || null,
              institution: cleanInst,
              state: cleanState,
              category: "Institution Teams",
              gender: "FEMALE",
              status: "PENDING",
            },
          });

          await tx.teamMember.create({
            data: {
              teamId: team.id,
              participantId: participant.id,
              role: p.role || (i === 0 ? "CAPTAIN" : "PLAYER"),
            },
          });

          createdParticipants.push(participant);
        }
      }

      // 4. Record Payment Transactions
      const createdTxns = [];
      const paymentList = Array.isArray(payments) && payments.length > 0
        ? payments
        : [{ amount: 2500, method: "CASH", utr: "CASH-DESK01" }];

      let totalPaidAmount = 0;
      for (const pay of paymentList) {
        const amt = parseFloat(pay.amount) || 2500;
        totalPaidAmount += amt;
        const internalTxnId = `TXN-REG-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        const receiptNumber = `RCP-REG-${Date.now().toString().slice(-6)}`;

        const txn = await tx.paymentTransaction.create({
          data: {
            category: "REGISTRATION",
            entityType: "TEAM",
            entityId: team.id,
            amount: amt,
            method: pay.method || "CASH",
            utr: pay.method === "UPI" ? (pay.utr || "").trim() : (pay.utr || "CASH-DESK01"),
            internalTxnId,
            operatorEmail,
            receiptNumber,
            status: "SUCCESS",
            notes: `Team registration fee for ${cleanTeamName} (${team.teamCode})`,
          },
        });
        createdTxns.push(txn);
      }

      // 5. Create Fee Ledger for Team
      const ledger = await tx.feeLedger.create({
        data: {
          category: "REGISTRATION",
          entityType: "TEAM",
          teamId: team.id,
          amountDue: 2500,
          amountPaid: totalPaidAmount,
          balance: 0,
          status: "PAID",
        },
      });

      return { team, participants: createdParticipants, transactions: createdTxns, ledger };
    });

    // 6. Audit Log
    await logAuditEvent({
      actorEmail: operatorEmail,
      action: "REGISTRATION_DESK_TEAM_CREATED",
      resourceType: "team",
      resourceId: result.team.id,
      metadata: {
        teamCode: result.team.teamCode,
        teamName: cleanTeamName,
        institution: cleanInst,
        memberCount: result.participants.length,
        transactionsCount: result.transactions.length,
        operator,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Team registration and payment transaction recorded in DB.",
      team: {
        id: result.team.id,
        teamCode: result.team.teamCode,
        teamName: result.team.name,
        institution: result.team.institution,
        state: result.team.state,
        status: result.team.status,
      },
      transactions: result.transactions.map((t) => ({
        id: t.id,
        internalTxnId: t.internalTxnId,
        receiptNumber: t.receiptNumber,
        amount: t.amount,
        method: t.method,
        utr: t.utr,
        createdAt: t.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("[DESK_POST_TEAM_ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/registration/desk
 * Approves a team in the verification queue, generating official QR tokens in the DB.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { teamId, action = "APPROVE" } = body;

    if (!teamId) {
      return NextResponse.json({ success: false, error: "Team ID is required." }, { status: 400 });
    }

    if (action === "APPROVE") {
      const qrBase = `SZ26-TEAM-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const updated = await prisma.$transaction(async (tx) => {
        const team = await tx.team.update({
          where: { id: teamId },
          data: {
            status: "COMPLETED",
            teamQrToken: qrBase,
          },
          include: {
            members: {
              include: { participant: true },
            },
          },
        });

        for (const m of team.members) {
          const p = m.participant;
          const playerQr = `SZ26-${p.playerId || "PASS"}-${Math.floor(100 + Math.random() * 900)}`;
          await tx.participant.update({
            where: { id: p.id },
            data: {
              status: "APPROVED",
              qrCode: playerQr,
            },
          });
        }

        return team;
      });

      return NextResponse.json({
        success: true,
        message: "Team approved and official QR passes generated.",
        team: updated,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("[DESK_PUT_TEAM_ERROR]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
