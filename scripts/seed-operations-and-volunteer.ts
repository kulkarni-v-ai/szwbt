import { prisma } from "../src/lib/prisma";
import { ROLES } from "../src/lib/rbac/roles";

async function main() {
  console.log("Seeding On-Ground Operations & Volunteer Portal Data...");

  // 1. Ensure OPERATIONS_STAFF role exists
  const opsRole = await prisma.role.upsert({
    where: { name: ROLES.OPERATIONS_STAFF },
    update: {},
    create: {
      name: ROLES.OPERATIONS_STAFF,
      displayName: "On-Ground Operations",
      description: "Field venue check-ins, rapid issue escalations, and cross-departmental telemetry.",
      isSystem: true,
    },
  });

  // Ensure VOLUNTEER role exists
  const volRole = await prisma.role.upsert({
    where: { name: ROLES.VOLUNTEER },
    update: {},
    create: {
      name: ROLES.VOLUNTEER,
      displayName: "Field Volunteer",
      description: "Assigned on-ground tasks, shuttle passenger assistance, and public announcement access.",
      isSystem: true,
    },
  });

  // 2. Upsert Operations Staff User
  const opsUser = await prisma.user.upsert({
    where: { email: "ops@szwbt2026.edu" },
    update: {
      name: "KLE Tech Arena Operations Controller",
      badge: "FIELD COMMAND",
      targetUrl: "/operations",
      isActive: true,
    },
    create: {
      email: "ops@szwbt2026.edu",
      name: "KLE Tech Arena Operations Controller",
      passwordHash: "szwbt2026pass",
      badge: "FIELD COMMAND",
      targetUrl: "/operations",
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: opsUser.id,
        roleId: opsRole.id,
      },
    },
    update: {},
    create: {
      userId: opsUser.id,
      roleId: opsRole.id,
    },
  });

  // 3. Ensure Volunteer User exists
  const volUser = await prisma.user.upsert({
    where: { email: "volunteer@szwbt2026.edu" },
    update: {
      name: "Arena Field Volunteer",
      badge: "MOBILE FIELD",
      targetUrl: "/volunteer",
      isActive: true,
    },
    create: {
      email: "volunteer@szwbt2026.edu",
      name: "Arena Field Volunteer",
      passwordHash: "szwbt2026pass",
      badge: "MOBILE FIELD",
      targetUrl: "/volunteer",
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: volUser.id,
        roleId: volRole.id,
      },
    },
    update: {},
    create: {
      userId: volUser.id,
      roleId: volRole.id,
    },
  });

  // 4. Seed Venue Areas
  const venueAreas = [
    {
      name: "KLE Tech Main Arena",
      category: "COURT",
      status: "READY",
      location: "Ground Floor Main Hall",
      inCharge: "Dr. Rajesh K (Venue Director)",
      notes: "4 International Standard Wooden Courts with Taraflex mats.",
    },
    {
      name: "Court Block A (Courts 01-02)",
      category: "COURT",
      status: "ACTIVE",
      location: "Main Hall East Wing",
      inCharge: "BWF Technical Team",
      notes: "Equipped with live electronic scoreboards and high-speed hawk-eye cameras.",
    },
    {
      name: "Court Block B (Courts 03-04)",
      category: "COURT",
      status: "READY",
      location: "Main Hall West Wing",
      inCharge: "BWF Technical Team",
      notes: "Ready for afternoon Round 1 matches.",
    },
    {
      name: "Player Warm-up Hall",
      category: "COURT",
      status: "ACTIVE",
      location: "Annex Arena Building 2",
      inCharge: "Fitness Marshal Somnath",
      notes: "Dedicated stretching zones and 2 warm-up practice courts.",
    },
    {
      name: "Accreditation & Registration Desk",
      category: "DESK",
      status: "ACTIVE",
      location: "Concourse Gate 01",
      inCharge: "Priya Rao (Registration Chief)",
      notes: "Biometric and QR document validation active.",
    },
    {
      name: "Main Entrance & Security Gate 01",
      category: "ENTRANCE",
      status: "ACTIVE",
      location: "Main Boulevard Entrance",
      inCharge: "Security Chief Anand",
      notes: "Dual metal detector bag scanners operational.",
    },
    {
      name: "Spectator Gate 02",
      category: "ENTRANCE",
      status: "READY",
      location: "East Plaza Entrance",
      inCharge: "Gate Marshals",
      notes: "Ticketing & crowd flow queues staged.",
    },
    {
      name: "Medical Bay & Emergency Desk",
      category: "MEDICAL",
      status: "READY",
      location: "Adjacent to Court Block A",
      inCharge: "Dr. Meera Patil (Lead Sports Physio)",
      notes: "First responder kit, ice baths, and on-call university ambulance.",
    },
    {
      name: "University Shuttle Transit Hub",
      category: "TRANSPORT",
      status: "ACTIVE",
      location: "Arena South Bay Parking",
      inCharge: "Fleet Officer Somesh",
      notes: "Complimentary shuttles connecting KLE Tech to Shalmala and Vindhya hostels.",
    },
    {
      name: "Shalmala & Vindhya Hostel Desks",
      category: "HOSTEL",
      status: "ACTIVE",
      location: "Hostel Zone Block A & B",
      inCharge: "Hostel Advisor Rekha",
      notes: "Keycard issuance, bed allocations, and dining passes.",
    },
  ];

  for (const va of venueAreas) {
    await prisma.venueArea.upsert({
      where: { name: va.name },
      update: va,
      create: va,
    });
  }

  // 5. Seed Volunteer Shifts
  const existingShift = await prisma.volunteerShift.findFirst({
    where: { userId: volUser.id },
  });
  if (!existingShift) {
    await prisma.volunteerShift.create({
      data: {
        userId: volUser.id,
        status: "ON_SHIFT",
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        notes: "Morning field operations deployment",
      },
    });
  }

  // 6. Seed Volunteer Assignments
  await prisma.volunteerAssignment.deleteMany({
    where: { userId: volUser.id },
  });

  const assignment1 = await prisma.volunteerAssignment.create({
    data: {
      userId: volUser.id,
      title: "Court Operations",
      venue: "KLE Tech Arena",
      area: "Court Block A",
      reportingPoint: "Arena Control Desk Room 102",
      shiftStart: "09:00",
      shiftEnd: "13:00",
      date: "2026-10-18",
      supervisor: "Dr. Rajesh K (Venue Director)",
      supervisorPhone: "+91 94481 00234",
      status: "ACTIVE",
      instructions: "Report to Court Block A controller. Verify player racquets and court shuttlecocks. Maintain court boundary order during live sets.",
    },
  });

  const assignment2 = await prisma.volunteerAssignment.create({
    data: {
      userId: volUser.id,
      title: "Registration Desk Support",
      venue: "KLE Tech Arena",
      area: "Concourse Gate 01",
      reportingPoint: "Desk 02",
      shiftStart: "13:30",
      shiftEnd: "17:30",
      date: "2026-10-18",
      supervisor: "Priya Rao (Registration Chief)",
      supervisorPhone: "+91 98862 33411",
      status: "ASSIGNED",
      instructions: "Assist athletes arriving for afternoon rounds. Provide directional signage to warm-up zones.",
    },
  });

  const assignment3 = await prisma.volunteerAssignment.create({
    data: {
      userId: volUser.id,
      title: "Transport Coordination Support",
      venue: "Arena South Bay",
      area: "Transit Hub",
      reportingPoint: "Gate 04 Bay",
      shiftStart: "17:30",
      shiftEnd: "21:00",
      date: "2026-10-18",
      supervisor: "Fleet Officer Somesh",
      supervisorPhone: "+91 97410 88522",
      status: "ASSIGNED",
      instructions: "Direct team managers and athletes to designated complimentary shuttles to Shalmala and Vindhya hostels.",
    },
  });

  // 7. Seed Tasks
  await prisma.volunteerTask.deleteMany({
    where: { userId: volUser.id },
  });

  await prisma.volunteerTask.createMany({
    data: [
      {
        userId: volUser.id,
        assignmentId: assignment1.id,
        title: "Verify Court 01 Net Height & Tension",
        description: "Official BWF calibration check on Court 01 main match court.",
        location: "Court Block A",
        priority: "URGENT",
        dueTime: "08:45 IST",
        scheduledTime: "08:30 IST",
        status: "COMPLETED",
        category: "COURT",
        instructions: "Measure net center height exactly at 1.524m (5 ft) and posts at 1.55m per BWF guidelines.",
        startedAt: new Date(Date.now() - 90 * 60 * 1000),
        completedAt: new Date(Date.now() - 60 * 60 * 1000),
        supervisor: "Dr. Rajesh K",
        assignedStaffName: "Arena Field Volunteer",
      },
      {
        userId: volUser.id,
        assignmentId: assignment1.id,
        title: "Restock BWF Tournament Grade Shuttles",
        description: "Replenish Yonex AS-50 speed-tested tubes at official scoring tables.",
        location: "Court Block A & B Desks",
        priority: "HIGH",
        dueTime: "09:30 IST",
        scheduledTime: "09:00 IST",
        status: "IN_PROGRESS",
        category: "EQUIPMENT",
        instructions: "Distribute 8 tubes of Yonex AS-50 shuttles to match umpire desks.",
        startedAt: new Date(Date.now() - 30 * 60 * 1000),
        supervisor: "Dr. Rajesh K",
        assignedStaffName: "Arena Field Volunteer",
      },
      {
        userId: volUser.id,
        assignmentId: assignment1.id,
        title: "Escort Bangalore University WS-01 Athletes",
        description: "Player call escort from warm-up hall to Court 01 entrance tunnel.",
        location: "Warm-up Hall to Court 01",
        priority: "HIGH",
        dueTime: "10:15 IST",
        scheduledTime: "10:00 IST",
        status: "ASSIGNED",
        category: "PARTICIPANT",
        instructions: "Ensure athletes and coaches reach Court 01 call area 15 minutes before scheduled match start.",
        supervisor: "Dr. Rajesh K",
        assignedStaffName: "Arena Field Volunteer",
      },
      {
        userId: volUser.id,
        assignmentId: assignment2.id,
        title: "Inspect Gate 01 Barcode Scanners",
        description: "Test optical scanners and wireless sync with accreditation server.",
        location: "Concourse Gate 01",
        priority: "NORMAL",
        dueTime: "11:00 IST",
        scheduledTime: "10:30 IST",
        status: "ASSIGNED",
        category: "VENUE",
        instructions: "Verify wireless connectivity and battery level of all handheld entry scanners.",
        supervisor: "Priya Rao",
        assignedStaffName: "Arena Field Volunteer",
      },
      {
        userId: volUser.id,
        assignmentId: assignment3.id,
        title: "Direct Osmania Team to Hostel Shuttle",
        description: "Meet arriving evening contingent and guide to Bay 02 shuttle.",
        location: "Arena South Bay",
        priority: "NORMAL",
        dueTime: "12:30 IST",
        scheduledTime: "12:00 IST",
        status: "ASSIGNED",
        category: "TRANSPORT",
        instructions: "Meet Osmania University contingent at Gate 03 exit and escort to Shuttle Bus S-02.",
        supervisor: "Fleet Officer Somesh",
        assignedStaffName: "Arena Field Volunteer",
      },
    ],
  });

  // 8. Seed Incidents / Issues
  await prisma.volunteerIssue.deleteMany({});

  await prisma.volunteerIssue.createMany({
    data: [
      {
        userId: volUser.id,
        title: "Court 02 Floor Tape Delamination",
        category: "VENUE",
        severity: "HIGH",
        priority: "HIGH",
        location: "Court 02 Baseline",
        description: "Service line vinyl tape lifting near baseline right corner. Needs immediate re-adhesion before R1-Match 2.",
        status: "IN_PROGRESS",
        reporterEmail: "volunteer@szwbt2026.edu",
        assignedResponder: "Operations Staff",
        latestUpdate: "Maintenance crew dispatched with heat sealer",
        escalatedTo: "Venue Director",
      },
      {
        userId: volUser.id,
        title: "Spectator Crowd Congestion Gate 01",
        category: "VENUE",
        severity: "MEDIUM",
        priority: "NORMAL",
        location: "Main Concourse Entrance",
        description: "Large queue buildup outside spectator turnstiles. Requesting 2 additional volunteer ushers.",
        status: "OPEN",
        reporterEmail: "volunteer@szwbt2026.edu",
        assignedResponder: null,
        latestUpdate: "Reported by volunteer at Gate 01",
        escalatedTo: "Operations",
      },
      {
        userId: opsUser.id,
        title: "Shuttle Bus S-01 AC Blower Malfunction",
        category: "TRANSPORT",
        severity: "LOW",
        priority: "LOW",
        location: "Campus Loop Route",
        description: "Driver reports cabin AC blower non-operational on Route 1. Vehicle operational but maintenance requested.",
        status: "ACKNOWLEDGED",
        reporterEmail: "ops@szwbt2026.edu",
        assignedResponder: "Fleet Maintenance",
        latestUpdate: "Inspection scheduled during 14:00 lull",
        escalatedTo: "Transport Admin",
      },
    ],
  });

  // 9. Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorUserId: volUser.id,
        actorEmail: volUser.email,
        action: "SHIFT_STARTED",
        resourceType: "volunteer_shift",
        resourceId: volUser.id,
        metadata: JSON.stringify({ shift: "Morning Arena Desk", location: "KLE Tech Arena" }),
      },
      {
        actorUserId: volUser.id,
        actorEmail: volUser.email,
        action: "TASK_COMPLETED",
        resourceType: "volunteer_task",
        metadata: JSON.stringify({ title: "Verify Court 01 Net Height & Tension", status: "COMPLETED" }),
      },
      {
        actorUserId: volUser.id,
        actorEmail: volUser.email,
        action: "INCIDENT_REPORTED",
        resourceType: "volunteer_issue",
        metadata: JSON.stringify({ title: "Court 02 Floor Tape Delamination", severity: "HIGH" }),
      },
      {
        actorUserId: opsUser.id,
        actorEmail: opsUser.email,
        action: "INCIDENT_ACKNOWLEDGED",
        resourceType: "volunteer_issue",
        metadata: JSON.stringify({ assignedTo: "Operations Staff", status: "IN_PROGRESS" }),
      },
    ],
  });

  console.log("Successfully seeded On-Ground Operations and Volunteer Portal data!");
}

main()
  .catch((e) => {
    console.error("Error seeding operations data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
