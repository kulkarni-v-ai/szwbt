import { prisma } from "../src/lib/prisma";
import { ROLES } from "../src/lib/rbac/roles";

export async function seedTeamManagerData() {
  console.log("=== SEEDING AUTHORITATIVE TEAM MANAGER TOURNAMENT DATA ===");

  // 1. Upsert Team Bangalore University Warriors
  const teamId = "team-blr-warriors";
  const team = await prisma.team.upsert({
    where: { id: teamId },
    update: {
      teamCode: "TM-SZ-001",
      name: "Bangalore University Warriors",
      institution: "Bangalore University",
      state: "Karnataka",
      managerName: "Rajesh Kumar",
      managerPhone: "+91 98450 11223",
      captainName: "Deepa Roy",
      captainPhone: "+91 98450 44556",
      status: "COMPLETED",
      teamQrToken: "sz26_qr_tm_blr_warriors",
    },
    create: {
      id: teamId,
      teamCode: "TM-SZ-001",
      name: "Bangalore University Warriors",
      institution: "Bangalore University",
      state: "Karnataka",
      managerName: "Rajesh Kumar",
      managerPhone: "+91 98450 11223",
      captainName: "Deepa Roy",
      captainPhone: "+91 98450 44556",
      status: "COMPLETED",
      teamQrToken: "sz26_qr_tm_blr_warriors",
    },
  });

  // 2. Ensure Team Manager Users exist and are linked
  const tmUsers = [
    {
      email: "team@szwbt2026.edu",
      name: "Rajesh Kumar (BLR Manager)",
      badge: "UNIVERSITY DESK",
    },
    {
      email: "manager.blr@szwbt2026.edu",
      name: "Rajesh Kumar (BLR Manager)",
      badge: "UNIVERSITY DESK",
    },
  ];

  const tmRole = await prisma.role.findUnique({ where: { name: ROLES.TEAM_MANAGER } });

  for (const u of tmUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        badge: u.badge,
        targetUrl: "/team",
        teamId: team.id,
        isActive: true,
      },
      create: {
        email: u.email,
        name: u.name,
        passwordHash: "szwbt2026pass",
        badge: u.badge,
        targetUrl: "/team",
        teamId: team.id,
        isActive: true,
      },
    });

    if (tmRole) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: tmRole.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: tmRole.id,
        },
      });
    }
  }

  // 3. Upsert Participants for the Team
  const participants = [
    {
      id: "p-blr-01-deepa-roy",
      playerId: "SZ-2026-BLR-01",
      name: "Deepa Roy",
      email: "deepa.roy@bangaloreuniv.edu",
      phone: "+91 98450 44556",
      institution: "Bangalore University",
      state: "Karnataka",
      category: "Women's Doubles",
      gender: "FEMALE",
      status: "APPROVED",
      role: "CAPTAIN",
      roomNumber: "S-101",
      hostelId: "SHALMALA",
      bedNumber: "BED 01",
    },
    {
      id: "p-blr-02-sneha-das",
      playerId: "SZ-2026-BLR-02",
      name: "Sneha Das",
      email: "sneha.das@bangaloreuniv.edu",
      phone: "+91 98450 77889",
      institution: "Bangalore University",
      state: "Karnataka",
      category: "Women's Doubles",
      gender: "FEMALE",
      status: "APPROVED",
      role: "PLAYER",
      roomNumber: "S-101",
      hostelId: "SHALMALA",
      bedNumber: "BED 02",
    },
    {
      id: "p-blr-03-kavita-krishnan",
      playerId: "SZ-2026-BLR-03",
      name: "Kavita Krishnan",
      email: "kavita.k@bangaloreuniv.edu",
      phone: "+91 98450 33221",
      institution: "Bangalore University",
      state: "Karnataka",
      category: "Women's Singles",
      gender: "FEMALE",
      status: "APPROVED",
      role: "PLAYER",
      roomNumber: "S-101",
      hostelId: "SHALMALA",
      bedNumber: "BED 03",
    },
    {
      id: "p-blr-00-rajesh-kumar",
      playerId: "SZ-2026-BLR-MGR",
      name: "Rajesh Kumar",
      email: "team@szwbt2026.edu",
      phone: "+91 98450 11223",
      institution: "Bangalore University",
      state: "Karnataka",
      category: "Institution Teams",
      gender: "MALE",
      status: "APPROVED",
      role: "MANAGER",
      roomNumber: "V-101",
      hostelId: "VINDHYA",
      bedNumber: "BED 01",
    },
  ];

  for (const p of participants) {
    const participant = await prisma.participant.upsert({
      where: { id: p.id },
      update: {
        playerId: p.playerId,
        name: p.name,
        email: p.email,
        phone: p.phone,
        institution: p.institution,
        state: p.state,
        category: p.category,
        gender: p.gender,
        status: p.status,
        hostel: p.hostelId === "SHALMALA" ? "Shalmala Hostel" : "Vindhya Boys Hostel",
        room: p.roomNumber,
        qrCode: `SZ26_PASS_${p.playerId}`,
      },
      create: {
        id: p.id,
        playerId: p.playerId,
        name: p.name,
        email: p.email,
        phone: p.phone,
        institution: p.institution,
        state: p.state,
        category: p.category,
        gender: p.gender,
        status: p.status,
        hostel: p.hostelId === "SHALMALA" ? "Shalmala Hostel" : "Vindhya Boys Hostel",
        room: p.roomNumber,
        qrCode: `SZ26_PASS_${p.playerId}`,
      },
    });

    // Link TeamMember
    await prisma.teamMember.upsert({
      where: {
        teamId_participantId: {
          teamId: team.id,
          participantId: participant.id,
        },
      },
      update: {
        role: p.role,
      },
      create: {
        teamId: team.id,
        participantId: participant.id,
        role: p.role,
      },
    });

    // Upsert participant documents
    const docTypes = [
      { type: "UNIVERSITY_ID", fileName: `${p.playerId.toLowerCase()}_university_id.pdf` },
      { type: "SSLC", fileName: `${p.playerId.toLowerCase()}_dob_certificate.pdf` },
      { type: "OTHER", fileName: `${p.playerId.toLowerCase()}_medical_fitness.pdf` },
    ];

    for (const d of docTypes) {
      const docId = `doc-${p.id}-${d.type.toLowerCase()}`;
      await prisma.document.upsert({
        where: { id: docId },
        update: {
          participantId: participant.id,
          type: d.type,
          fileName: d.fileName,
          filePath: `/secure_vault/documents/${docId}.pdf`,
          mimeType: "application/pdf",
          status: "VERIFIED",
          capturedBy: "registration@szwbt2026.edu",
        },
        create: {
          id: docId,
          participantId: participant.id,
          type: d.type,
          fileName: d.fileName,
          filePath: `/secure_vault/documents/${docId}.pdf`,
          mimeType: "application/pdf",
          status: "VERIFIED",
          capturedBy: "registration@szwbt2026.edu",
        },
      });
    }

    // Accommodation Allocation
    const room = await prisma.room.findFirst({
      where: { hostelId: p.hostelId, roomNumber: p.roomNumber },
      include: { beds: true },
    });

    if (room) {
      const bed = room.beds.find((b) => b.bedNumber === p.bedNumber) || room.beds[0];
      if (bed) {
        await prisma.bed.update({
          where: { id: bed.id },
          data: { status: "OCCUPIED" },
        });

        // Allocation
        const allocId = `alloc-${team.id}-${participant.id}`;
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
    }
  }

  // 4. Upsert Transport Bookings for the Team
  const trip2 = await prisma.transportTrip.findFirst({
    where: { tripCode: "TRIP-SZ-002" },
  });

  if (trip2) {
    for (const p of participants) {
      await prisma.transportPassenger.upsert({
        where: {
          tripId_participantId: {
            tripId: trip2.id,
            participantId: p.id,
          },
        },
        update: {
          teamId: team.id,
          pickupPoint: "Hubballi Junction Concourse",
          dropPoint: p.hostelId === "SHALMALA" ? "Shalmala Hostel Gate" : "Vindhya Boys Hostel Gate",
          boardingStatus: "BOARDED",
          boardedAt: new Date("2026-10-18T08:25:00Z"),
          boardedBy: "transport@szwbt2026.edu",
        },
        create: {
          tripId: trip2.id,
          participantId: p.id,
          teamId: team.id,
          pickupPoint: "Hubballi Junction Concourse",
          dropPoint: p.hostelId === "SHALMALA" ? "Shalmala Hostel Gate" : "Vindhya Boys Hostel Gate",
          boardingStatus: "BOARDED",
          boardedAt: new Date("2026-10-18T08:25:00Z"),
          boardedBy: "transport@szwbt2026.edu",
        },
      });
    }
  }

  // 5. Upsert Fee Ledgers & Payment Transactions
  // Fee Ledger: Registration
  await prisma.feeLedger.upsert({
    where: {
      category_teamId: {
        category: "REGISTRATION",
        teamId: team.id,
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
      entityType: "TEAM",
      teamId: team.id,
      amountDue: 2500,
      amountPaid: 2500,
      balance: 0,
      status: "PAID",
    },
  });

  // Fee Ledger: Accommodation
  await prisma.feeLedger.upsert({
    where: {
      category_teamId: {
        category: "ACCOMMODATION",
        teamId: team.id,
      },
    },
    update: {
      amountDue: 5000,
      amountPaid: 5000,
      balance: 0,
      status: "PAID",
    },
    create: {
      category: "ACCOMMODATION",
      entityType: "TEAM",
      teamId: team.id,
      amountDue: 5000,
      amountPaid: 5000,
      balance: 0,
      status: "PAID",
    },
  });

  // Fee Ledger: Match
  await prisma.feeLedger.upsert({
    where: {
      category_teamId: {
        category: "MATCH",
        teamId: team.id,
      },
    },
    update: {
      amountDue: 1000,
      amountPaid: 1000,
      balance: 0,
      status: "PAID",
    },
    create: {
      category: "MATCH",
      entityType: "TEAM",
      teamId: team.id,
      amountDue: 1000,
      amountPaid: 1000,
      balance: 0,
      status: "PAID",
    },
  });

  // Payment Transactions
  const pTxns = [
    {
      id: `ptxn-reg-${team.id}`,
      category: "REGISTRATION",
      entityType: "TEAM",
      entityId: team.id,
      amount: 2500,
      method: "UPI",
      utr: "UPI948123456789",
      operatorEmail: "finance@szwbt2026.edu",
      receiptNumber: "REC-REG-BLR-001",
      status: "SUCCESS",
      notes: "Official University Registration Fee - Full settlement received via UPI",
    },
    {
      id: `ptxn-acc-${team.id}`,
      category: "ACCOMMODATION",
      entityType: "TEAM",
      entityId: team.id,
      amount: 5000,
      method: "CASH",
      utr: null,
      operatorEmail: "finance@szwbt2026.edu",
      receiptNumber: "REC-ACC-BLR-001",
      status: "SUCCESS",
      notes: "Hostel Lodging deposit (4 contingents) - Cash received at Treasury Counter",
    },
    {
      id: `ptxn-mtc-${team.id}`,
      category: "MATCH",
      entityType: "TEAM",
      entityId: team.id,
      amount: 1000,
      method: "UPI",
      utr: "UPI948123456790",
      operatorEmail: "finance@szwbt2026.edu",
      receiptNumber: "REC-MTC-BLR-001",
      status: "SUCCESS",
      notes: "Official shuttlecock and equipment tournament fee",
    },
  ];

  for (const tx of pTxns) {
    await prisma.paymentTransaction.upsert({
      where: { id: tx.id },
      update: tx,
      create: tx,
    });
  }

  // 6. Upsert Matches for Bangalore University
  const oct18Day = await prisma.tournamentDay.findUnique({ where: { id: "OCT18" } });
  if (oct18Day) {
    // Live Singles Match
    await prisma.match.upsert({
      where: { id: "match-blr-live-01" },
      update: {
        dayId: "OCT18",
        time: "11:00 IST",
        category: "Women's Singles",
        court: "Court 03",
        matchNumber: "R1 - Match 5",
        playerA: "Kavita Krishnan",
        institutionA: "Bangalore University",
        playerB: "Riya Patel",
        institutionB: "Andhra University",
        scoreA: "21, 16, 11",
        scoreB: "19, 21, 9",
        status: "LIVE",
        isPublished: true,
        actualStartTime: new Date("2026-10-18T11:05:00Z"),
      },
      create: {
        id: "match-blr-live-01",
        dayId: "OCT18",
        time: "11:00 IST",
        category: "Women's Singles",
        court: "Court 03",
        matchNumber: "R1 - Match 5",
        playerA: "Kavita Krishnan",
        institutionA: "Bangalore University",
        playerB: "Riya Patel",
        institutionB: "Andhra University",
        scoreA: "21, 16, 11",
        scoreB: "19, 21, 9",
        status: "LIVE",
        isPublished: true,
        actualStartTime: new Date("2026-10-18T11:05:00Z"),
      },
    });

    // Completed Match Result
    await prisma.match.upsert({
      where: { id: "match-blr-res-01" },
      update: {
        dayId: "OCT18",
        time: "09:30 IST",
        category: "Women's Doubles",
        court: "Court 02",
        matchNumber: "R1 - Match 2B",
        playerA: "D. Roy / S. Das",
        institutionA: "Bangalore University",
        playerB: "K. Reddy / M. Shah",
        institutionB: "Osmania University",
        scoreA: "21, 21",
        scoreB: "15, 18",
        status: "COMPLETED",
        winner: "PLAYER_A",
        isPublished: true,
        actualStartTime: new Date("2026-10-18T09:30:00Z"),
        actualEndTime: new Date("2026-10-18T10:15:00Z"),
      },
      create: {
        id: "match-blr-res-01",
        dayId: "OCT18",
        time: "09:30 IST",
        category: "Women's Doubles",
        court: "Court 02",
        matchNumber: "R1 - Match 2B",
        playerA: "D. Roy / S. Das",
        institutionA: "Bangalore University",
        playerB: "K. Reddy / M. Shah",
        institutionB: "Osmania University",
        scoreA: "21, 21",
        scoreB: "15, 18",
        status: "COMPLETED",
        winner: "PLAYER_A",
        isPublished: true,
        actualStartTime: new Date("2026-10-18T09:30:00Z"),
        actualEndTime: new Date("2026-10-18T10:15:00Z"),
      },
    });
  }

  // 7. Upsert Official Announcements
  const announcements = [
    {
      id: "ann-01-briefing",
      title: "Team Managers Technical Meeting & Fixture Draw",
      content: "All accredited Team Managers must assemble at the Main Arena Conference Hall on Oct 17 at 18:00 IST for official tie verification, line-up submissions, and technical rules briefing.",
      targetAudience: "TEAMS",
      isPublished: true,
      authorEmail: "secretariat@szwbt2026.edu",
    },
    {
      id: "ann-02-shuttle",
      title: "Free Airport & Station Shuttle Buses Operating on Schedule",
      content: "Official university transport shuttles are operating across Route 01 (Airport) and Route 02 (Hubballi Junction Railway Station). Present your digital Team Pass upon boarding.",
      targetAudience: "ALL",
      isPublished: true,
      authorEmail: "transport@szwbt2026.edu",
    },
    {
      id: "ann-03-catering",
      title: "Hostel Dining Hall & Meal Timings",
      content: "Breakfast: 06:30 - 08:30 IST | Lunch: 12:30 - 14:30 IST | Dinner: 19:30 - 21:30 IST. Special sports nutrition meals available at Shalmala and Vindhya hostel dining blocks.",
      targetAudience: "TEAMS",
      isPublished: true,
      authorEmail: "hostel@szwbt2026.edu",
    },
    {
      id: "ann-04-passes",
      title: "Digital Accreditation QR Passes Active for All Team Members",
      content: "Your official Team Pass and individual player passes are now live. Security scanners at Arena Gate A and Dining Hall will resolve your authorized tokens.",
      targetAudience: "TEAMS",
      isPublished: true,
      authorEmail: "organizer@szwbt2026.edu",
    },
  ];

  for (const ann of announcements) {
    await prisma.announcement.upsert({
      where: { id: ann.id },
      update: ann,
      create: ann,
    });
  }

  console.log("=== TEAM MANAGER SEED COMPLETE ===");
}

if (require.main === module) {
  seedTeamManagerData()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
