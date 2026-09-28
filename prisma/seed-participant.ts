import { prisma } from "../src/lib/prisma";
import { ROLES } from "../src/lib/rbac/roles";

export async function seedParticipantData() {
  console.log("=== SEEDING AUTHORITATIVE PARTICIPANT ATHLETE TOURNAMENT DATA ===");

  // 1. Ensure Team KLE Tech Titans exists
  const teamId = "team-kle-titans";
  const team = await prisma.team.upsert({
    where: { id: teamId },
    update: {
      teamCode: "TM-SZ-KLE-01",
      name: "KLE Tech Titans",
      institution: "KLE Technological University",
      state: "Karnataka",
      managerName: "Dr. Ashok Patil",
      managerPhone: "+91 94812 55667",
      captainName: "Ananya Sharma",
      captainPhone: "+91 98451 22334",
      status: "COMPLETED",
      teamQrToken: "sz26_qr_tm_kle_titans",
    },
    create: {
      id: teamId,
      teamCode: "TM-SZ-KLE-01",
      name: "KLE Tech Titans",
      institution: "KLE Technological University",
      state: "Karnataka",
      managerName: "Dr. Ashok Patil",
      managerPhone: "+91 94812 55667",
      captainName: "Ananya Sharma",
      captainPhone: "+91 98451 22334",
      status: "COMPLETED",
      teamQrToken: "sz26_qr_tm_kle_titans",
    },
  });

  // 2. Upsert Ananya Sharma Participant Record
  const participantId = "p1-ananya-sharma";
  const participant = await prisma.participant.upsert({
    where: { id: participantId },
    update: {
      playerId: "SZ-2026-001",
      name: "Ananya Sharma",
      email: "player@szwbt2026.edu",
      phone: "+91 98451 22334",
      institution: "KLE Technological University",
      state: "Karnataka",
      category: "Women's Singles",
      gender: "FEMALE",
      status: "APPROVED",
      hostel: "Shalmala Hostel",
      room: "S-102",
      qrCode: "sz26_qr_pt_ananya_sharma",
    },
    create: {
      id: participantId,
      playerId: "SZ-2026-001",
      name: "Ananya Sharma",
      email: "player@szwbt2026.edu",
      phone: "+91 98451 22334",
      institution: "KLE Technological University",
      state: "Karnataka",
      category: "Women's Singles",
      gender: "FEMALE",
      status: "APPROVED",
      hostel: "Shalmala Hostel",
      room: "S-102",
      qrCode: "sz26_qr_pt_ananya_sharma",
    },
  });

  // 3. Link Team Member
  await prisma.teamMember.upsert({
    where: {
      teamId_participantId: {
        teamId: team.id,
        participantId: participant.id,
      },
    },
    update: {
      role: "CAPTAIN",
    },
    create: {
      teamId: team.id,
      participantId: participant.id,
      role: "CAPTAIN",
    },
  });

  // 4. Ensure Participant Users exist in User table
  const participantRole = await prisma.role.findUnique({ where: { name: ROLES.PARTICIPANT } });

  const participantUsers = [
    {
      email: "player@szwbt2026.edu",
      name: "Ananya Sharma",
      badge: "PLAYER HUD",
    },
    {
      email: "ananya@szwbt2026.edu",
      name: "Ananya Sharma",
      badge: "PLAYER HUD",
    },
  ];

  for (const u of participantUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        badge: u.badge,
        targetUrl: "/dashboard",
        participantId: participant.id,
        teamId: team.id,
        isActive: true,
      },
      create: {
        email: u.email,
        name: u.name,
        passwordHash: "szwbt2026pass",
        badge: u.badge,
        targetUrl: "/dashboard",
        participantId: participant.id,
        teamId: team.id,
        isActive: true,
      },
    });

    if (participantRole) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: participantRole.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: participantRole.id,
        },
      });
    }
  }

  // 5. Upsert Documents for Ananya Sharma
  const docs = [
    { type: "UNIVERSITY_ID", fileName: "ananya_kle_student_id.pdf", status: "VERIFIED" },
    { type: "SSLC", fileName: "ananya_dob_certificate.pdf", status: "VERIFIED" },
    { type: "PUC", fileName: "ananya_puc_marks_card.pdf", status: "VERIFIED" },
    { type: "OTHER", fileName: "ananya_medical_fitness.pdf", status: "VERIFIED" },
  ];

  for (const d of docs) {
    const docId = `doc-ananya-${d.type.toLowerCase()}`;
    await prisma.document.upsert({
      where: { id: docId },
      update: {
        participantId: participant.id,
        type: d.type,
        fileName: d.fileName,
        filePath: `/secure_vault/documents/${docId}.pdf`,
        mimeType: "application/pdf",
        status: d.status,
        capturedBy: "registration@szwbt2026.edu",
      },
      create: {
        id: docId,
        participantId: participant.id,
        type: d.type,
        fileName: d.fileName,
        filePath: `/secure_vault/documents/${docId}.pdf`,
        mimeType: "application/pdf",
        status: d.status,
        capturedBy: "registration@szwbt2026.edu",
      },
    });
  }

  // 6. Accommodation Allocation: Room S-102 in Shalmala Hostel
  const roomS102 = await prisma.room.findFirst({
    where: { hostelId: "SHALMALA", roomNumber: "S-102" },
    include: { beds: true },
  });

  if (roomS102 && roomS102.beds.length > 0) {
    const bed = roomS102.beds[0]; // Bed 01
    await prisma.bed.update({
      where: { id: bed.id },
      data: { status: "OCCUPIED" },
    });

    const allocId = `alloc-ananya-s102`;
    await prisma.accommodationAllocation.upsert({
      where: { id: allocId },
      update: {
        bedId: bed.id,
        participantId: participant.id,
        teamId: team.id,
        status: "ACTIVE",
        allocatedBy: "hostel@szwbt2026.edu",
      },
      create: {
        id: allocId,
        bedId: bed.id,
        participantId: participant.id,
        teamId: team.id,
        status: "ACTIVE",
        allocatedBy: "hostel@szwbt2026.edu",
      },
    });
  }

  // 7. Transport Booking: Trip 2 (Hubballi Junction Shuttle)
  const trip2 = await prisma.transportTrip.findFirst({
    where: { tripCode: "TRIP-SZ-002" },
  });

  if (trip2) {
    await prisma.transportPassenger.upsert({
      where: {
        tripId_participantId: {
          tripId: trip2.id,
          participantId: participant.id,
        },
      },
      update: {
        teamId: team.id,
        pickupPoint: "Hubballi Junction Concourse",
        dropPoint: "Shalmala Hostel Gate",
        boardingStatus: "BOARDED",
        boardedAt: new Date("2026-10-18T08:15:00Z"),
        boardedBy: "transport@szwbt2026.edu",
      },
      create: {
        tripId: trip2.id,
        participantId: participant.id,
        teamId: team.id,
        pickupPoint: "Hubballi Junction Concourse",
        dropPoint: "Shalmala Hostel Gate",
        boardingStatus: "BOARDED",
        boardedAt: new Date("2026-10-18T08:15:00Z"),
        boardedBy: "transport@szwbt2026.edu",
      },
    });
  }

  // 8. Individual Participant Fee Ledgers & Payments
  // Registration Fee Ledger
  await prisma.feeLedger.upsert({
    where: {
      category_participantId: {
        category: "REGISTRATION",
        participantId: participant.id,
      },
    },
    update: {
      amountDue: 2500,
      amountPaid: 2500,
      balance: 0,
      status: "PAID",
    },
    create: {
      category: "REGISTRATION",
      entityType: "PARTICIPANT",
      participantId: participant.id,
      amountDue: 2500,
      amountPaid: 2500,
      balance: 0,
      status: "PAID",
    },
  });

  // Accommodation Fee Ledger
  await prisma.feeLedger.upsert({
    where: {
      category_participantId: {
        category: "ACCOMMODATION",
        participantId: participant.id,
      },
    },
    update: {
      amountDue: 1500,
      amountPaid: 1500,
      balance: 0,
      status: "PAID",
    },
    create: {
      category: "ACCOMMODATION",
      entityType: "PARTICIPANT",
      participantId: participant.id,
      amountDue: 1500,
      amountPaid: 1500,
      balance: 0,
      status: "PAID",
    },
  });

  // Match Fee Ledger
  await prisma.feeLedger.upsert({
    where: {
      category_participantId: {
        category: "MATCH",
        participantId: participant.id,
      },
    },
    update: {
      amountDue: 500,
      amountPaid: 500,
      balance: 0,
      status: "PAID",
    },
    create: {
      category: "MATCH",
      entityType: "PARTICIPANT",
      participantId: participant.id,
      amountDue: 500,
      amountPaid: 500,
      balance: 0,
      status: "PAID",
    },
  });

  // Payment Transactions for participant
  const ptTxns = [
    {
      id: `ptxn-reg-${participant.id}`,
      category: "REGISTRATION",
      entityType: "PARTICIPANT",
      entityId: participant.id,
      amount: 2500,
      method: "UPI",
      utr: "UPI984512233401",
      operatorEmail: "finance@szwbt2026.edu",
      receiptNumber: "REC-REG-SZ-001",
      status: "SUCCESS",
      notes: "Participant registration fee - Paid via UPI",
    },
    {
      id: `ptxn-acc-${participant.id}`,
      category: "ACCOMMODATION",
      entityType: "PARTICIPANT",
      entityId: participant.id,
      amount: 1500,
      method: "CASH",
      utr: null,
      operatorEmail: "finance@szwbt2026.edu",
      receiptNumber: "REC-ACC-SZ-001",
      status: "SUCCESS",
      notes: "Hostel lodging deposit - Paid at Treasury Desk",
    },
  ];

  for (const tx of ptTxns) {
    await prisma.paymentTransaction.upsert({
      where: { id: tx.id },
      update: tx,
      create: tx,
    });
  }

  // 9. Match 1 (R1 - Match 1): Ananya Sharma vs Priya Nair (LIVE)
  const oct18Day = await prisma.tournamentDay.findUnique({ where: { id: "OCT18" } });
  if (oct18Day) {
    await prisma.match.upsert({
      where: { id: "match-ananya-live-01" },
      update: {
        dayId: "OCT18",
        time: "09:00 IST",
        category: "Women's Singles",
        court: "Court 01",
        matchNumber: "R1 - Match 1",
        playerA: "Ananya Sharma",
        institutionA: "KLE Technological University",
        playerB: "Priya Nair",
        institutionB: "Calicut University",
        scoreA: "21, 18, 14",
        scoreB: "19, 21, 11",
        status: "LIVE",
        isPublished: true,
        actualStartTime: new Date("2026-10-18T09:05:00Z"),
      },
      create: {
        id: "match-ananya-live-01",
        dayId: "OCT18",
        time: "09:00 IST",
        category: "Women's Singles",
        court: "Court 01",
        matchNumber: "R1 - Match 1",
        playerA: "Ananya Sharma",
        institutionA: "KLE Technological University",
        playerB: "Priya Nair",
        institutionB: "Calicut University",
        scoreA: "21, 18, 14",
        scoreB: "19, 21, 11",
        status: "LIVE",
        isPublished: true,
        actualStartTime: new Date("2026-10-18T09:05:00Z"),
      },
    });

    // Upcoming Match: Quarter-Finals on Day 2
    const oct19Day = await prisma.tournamentDay.findUnique({ where: { id: "OCT19" } });
    if (oct19Day) {
      await prisma.match.upsert({
        where: { id: "match-ananya-upc-02" },
        update: {
          dayId: "OCT19",
          time: "11:30 IST",
          category: "Women's Singles",
          court: "Court 01",
          matchNumber: "QF - Match 3",
          playerA: "Ananya Sharma",
          institutionA: "KLE Technological University",
          playerB: "Kavya Sundaram",
          institutionB: "Anna University",
          status: "UPCOMING",
          isPublished: true,
        },
        create: {
          id: "match-ananya-upc-02",
          dayId: "OCT19",
          time: "11:30 IST",
          category: "Women's Singles",
          court: "Court 01",
          matchNumber: "QF - Match 3",
          playerA: "Ananya Sharma",
          institutionA: "KLE Technological University",
          playerB: "Kavya Sundaram",
          institutionB: "Anna University",
          status: "UPCOMING",
          isPublished: true,
        },
      });
    }

    // Completed Match Result from Pre-Tournament Seeding
    await prisma.match.upsert({
      where: { id: "match-ananya-comp-00" },
      update: {
        dayId: "OCT18",
        time: "08:00 IST",
        category: "Women's Singles",
        court: "Court 01",
        matchNumber: "Prelim - Match 1",
        playerA: "Ananya Sharma",
        institutionA: "KLE Technological University",
        playerB: "Meera Nair",
        institutionB: "Kerala Sports Academy",
        scoreA: "21, 21",
        scoreB: "12, 14",
        status: "COMPLETED",
        winner: "PLAYER_A",
        isPublished: true,
        actualStartTime: new Date("2026-10-18T08:00:00Z"),
        actualEndTime: new Date("2026-10-18T08:40:00Z"),
      },
      create: {
        id: "match-ananya-comp-00",
        dayId: "OCT18",
        time: "08:00 IST",
        category: "Women's Singles",
        court: "Court 01",
        matchNumber: "Prelim - Match 1",
        playerA: "Ananya Sharma",
        institutionA: "KLE Technological University",
        playerB: "Meera Nair",
        institutionB: "Kerala Sports Academy",
        scoreA: "21, 21",
        scoreB: "12, 14",
        status: "COMPLETED",
        winner: "PLAYER_A",
        isPublished: true,
        actualStartTime: new Date("2026-10-18T08:00:00Z"),
        actualEndTime: new Date("2026-10-18T08:40:00Z"),
      },
    });
  }

  // 10. Announcements targeted to PARTICIPANTS and ALL
  const pAnnouncements = [
    {
      id: "ann-p01-call",
      title: "Athlete Court Call Protocol: Report 20 Minutes Prior to Fixture",
      content: "All athletes must report to the Warm-Up Area and Line Judges Desk at least 20 minutes prior to scheduled tie time. Ensure BWF-approved attire and accreditation pass.",
      targetAudience: "PARTICIPANTS",
      isPublished: true,
      authorEmail: "secretariat@szwbt2026.edu",
    },
    {
      id: "ann-p02-curfew",
      title: "Hostel Gate Timings & Dining Hall Hours",
      content: "Hostel gates close strictly at 22:00 IST. Dining hall will serve hot sports dinner until 21:30 IST. Hydration stations are open 24/7 on each floor.",
      targetAudience: "PARTICIPANTS",
      isPublished: true,
      authorEmail: "hostel@szwbt2026.edu",
    },
  ];

  for (const ann of pAnnouncements) {
    await prisma.announcement.upsert({
      where: { id: ann.id },
      update: ann,
      create: ann,
    });
  }

  console.log("=== PARTICIPANT ATHLETE DATA SEEDED SUCCESSFULLY ===");
}

if (require.main === module) {
  seedParticipantData()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
