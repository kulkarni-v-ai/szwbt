import { prisma } from "../src/lib/prisma";

async function main() {
  const partUsers = await prisma.user.findMany({
    where: { userRoles: { some: { role: { name: "PARTICIPANT" } } } },
    include: { userRoles: { include: { role: true } } },
  });
  console.log("PARTICIPANT USERS IN DB:", partUsers.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    participantId: u.participantId,
    roles: u.userRoles.map(ur => ur.role.name)
  })));

  const participants = await prisma.participant.findMany({
    include: {
      teamMemberships: { include: { team: true } },
      bedAllocations: { include: { bed: { include: { room: { include: { hostel: true, floor: true } } } } } },
      transportBookings: { include: { trip: { include: { route: true, vehicle: true } } } },
      documents: true,
      paymentLedgers: true,
    },
  });
  console.log("PARTICIPANTS COUNT:", participants.length);
  for (const p of participants) {
    console.log("  Participant:", p.id, p.playerId, p.name, p.institution);
    console.log("    Teams:", p.teamMemberships.map(tm => `${tm.team.name} (${tm.role})`));
    console.log("    Beds:", p.bedAllocations.map(ba => `${ba.bed.room.hostel.name} Rm ${ba.bed.room.roomNumber} Bed ${ba.bed.bedNumber}`));
    console.log("    Transports:", p.transportBookings.map(tb => `${tb.trip.tripCode} - ${tb.boardingStatus}`));
    console.log("    Docs:", p.documents.map(d => `${d.type}: ${d.status}`));
    console.log("    Ledgers:", p.paymentLedgers.map(l => `${l.category}: Due=${l.amountDue}, Paid=${l.amountPaid}, Bal=${l.balance}, Stat=${l.status}`));
  }
}

main().finally(() => prisma.$disconnect());
