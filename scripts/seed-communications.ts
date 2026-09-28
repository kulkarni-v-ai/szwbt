import { prisma } from "../src/lib/prisma";
import { ROLES } from "../src/lib/rbac/roles";
import { PERMISSIONS } from "../src/lib/rbac/permissions";

async function main() {
  console.log("Seeding Communications & Announcements Center Data...");

  // 1. Ensure COMMUNICATIONS_STAFF role exists
  const commRole = await prisma.role.upsert({
    where: { name: ROLES.COMMUNICATIONS_STAFF },
    update: {},
    create: {
      name: ROLES.COMMUNICATIONS_STAFF,
      displayName: "Communications Staff",
      description: "Tournament public announcements, broadcast alerts, and media press notices.",
      isSystem: true,
    },
  });

  // Assign permissions to COMMUNICATIONS_STAFF
  const commPermissions = [
    PERMISSIONS.ANNOUNCEMENT_READ,
    PERMISSIONS.ANNOUNCEMENT_CREATE,
    PERMISSIONS.ANNOUNCEMENT_UPDATE,
    PERMISSIONS.ANNOUNCEMENT_PUBLISH,
    PERMISSIONS.REPORTS_READ,
  ];

  for (const permCode of commPermissions) {
    const perm = await prisma.permission.upsert({
      where: { code: permCode },
      update: {},
      create: {
        code: permCode,
        resource: "announcement",
        action: permCode.split(":")[1] || "read",
        description: `Permission ${permCode}`,
      },
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: commRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: commRole.id,
        permissionId: perm.id,
      },
    });
  }

  // 2. Upsert Communications Staff User
  const commUser = await prisma.user.upsert({
    where: { email: "comm@szwbt2026.edu" },
    update: {
      name: "KLE Tech Arena Communications Controller",
      badge: "BROADCAST HUD",
      targetUrl: "/admin/communications",
      isActive: true,
    },
    create: {
      email: "comm@szwbt2026.edu",
      name: "KLE Tech Arena Communications Controller",
      passwordHash: "szwbt2026pass",
      badge: "BROADCAST HUD",
      targetUrl: "/admin/communications",
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: commUser.id,
        roleId: commRole.id,
      },
    },
    update: {},
    create: {
      userId: commUser.id,
      roleId: commRole.id,
    },
  });

  // 3. Seed Communication Templates
  const templates = [
    {
      name: "Match Schedule Update",
      code: "MATCH_UPDATE",
      category: "MATCH",
      priority: "HIGH",
      audience: "ALL",
      channels: "IN_APP,EMAIL",
      subject: "Schedule Adjustment: {{MATCH_CODE}} on {{COURT}}",
      bodyTemplate: "Notice to all participating teams: Match {{MATCH_CODE}} ({{ROUND}}) between {{TEAM_A}} and {{TEAM_B}} on {{COURT}} has been rescheduled to {{NEW_TIME}}. Please report to the warm-up arena 20 minutes prior.",
      description: "Standard announcement for court reallocation or match timing shift.",
    },
    {
      name: "Venue Area Advisory",
      code: "VENUE_CHANGE",
      category: "VENUE",
      priority: "NORMAL",
      audience: "ALL",
      channels: "IN_APP",
      subject: "Venue Notice: {{AREA_NAME}} Protocol Update",
      bodyTemplate: "All participants and spectators please note: {{AREA_NAME}} access has been re-routed via {{ENTRY_GATE}}. Please display your digital QR accreditation at the check-in checkpoint.",
      description: "Used when access points, warmup courts, or spectator wings change.",
    },
    {
      name: "University Shuttle Fleet Update",
      code: "TRANSPORT_ALERT",
      category: "TRANSPORT",
      priority: "NORMAL",
      audience: "TEAMS",
      channels: "IN_APP,SMS",
      subject: "Complimentary Shuttle Update: {{ROUTE_NAME}}",
      bodyTemplate: "Complimentary University Shuttle on {{ROUTE_NAME}} will depart from {{PICKUP_LOCATION}} at {{DEPARTURE_TIME}}. Shuttles are complimentary for all accredited players and officials. Boarding requires your QR Pass.",
      description: "Advisory for university-provided transit schedules (zero-payment operational transit).",
    },
    {
      name: "Hostel & Accommodation Notice",
      code: "ACCOMMODATION_NOTICE",
      category: "ACCOMMODATION",
      priority: "NORMAL",
      audience: "PARTICIPANTS",
      channels: "IN_APP,EMAIL",
      subject: "Hostel Information: {{HOSTEL_NAME}} Logistics",
      bodyTemplate: "Attention residents of {{HOSTEL_NAME}}: Quiet hours begin at 22:00 IST. Dining hall breakfast service opens at 06:30 IST. For bed allocation queries, visit the Ground Floor Warden Desk.",
      description: "Hostel rules, meal timings, and front desk assistance.",
    },
    {
      name: "Registration Desk Notice",
      code: "REGISTRATION_NOTICE",
      category: "REGISTRATION",
      priority: "HIGH",
      audience: "TEAMS",
      channels: "IN_APP,EMAIL",
      subject: "Credentials Desk: Final Verification Window",
      bodyTemplate: "Team Managers: Original eligibility certificates and university identity cards must be verified at Registration Counter 02 by {{DEADLINE_TIME}}. Unverified players cannot be rostered.",
      description: "Document submission and physical accreditation deadlines.",
    },
    {
      name: "Volunteer Dispatch Briefing",
      code: "VOLUNTEER_NOTICE",
      category: "VOLUNTEER",
      priority: "NORMAL",
      audience: "VOLUNTEERS",
      channels: "IN_APP",
      subject: "Shift Briefing: Shift {{SHIFT_NUMBER}} - Station {{ZONE}}",
      bodyTemplate: "All on-duty volunteers for Shift {{SHIFT_NUMBER}}: Report to Control Room B at {{REPORTING_TIME}} for radio handover and water station replenishment briefing.",
      description: "Station assignments and shift transition briefings for field volunteers.",
    },
    {
      name: "Urgent Weather / Safety Alert",
      code: "EMERGENCY_NOTICE",
      category: "EMERGENCY",
      priority: "EMERGENCY",
      audience: "ALL",
      channels: "IN_APP,EMAIL,SMS",
      subject: "URGENT SAFETY ALERT: {{ALERT_TITLE}}",
      bodyTemplate: "EMERGENCY NOTIFICATION: {{EMERGENCY_MESSAGE}}. All personnel and spectators follow venue safety marshals immediately to {{SAFE_ASSEMBLY_POINT}}. Tournament operations are temporarily suspended until all-clear.",
      description: "High-priority emergency broadcast requiring mandatory dual confirmation.",
    },
  ];

  for (const tpl of templates) {
    await prisma.communicationTemplate.upsert({
      where: { code: tpl.code },
      update: tpl,
      create: tpl,
    });
  }

  // 4. Seed Announcements
  const announcements = [
    {
      title: "CHAMPIONSHIP INAUGURATION & TECHNICAL BRIEFING",
      content: "The official South Zone Women's Badminton Championship 2026 opening ceremony commences at 08:30 IST in the KLE Tech Main Arena. Chief Technical Officials and University Delegates will inaugurate the 8-court setup. Team managers must ensure athletes wear official university livery.",
      category: "TOURNAMENT",
      priority: "HIGH",
      targetAudience: "ALL",
      channels: "IN_APP,EMAIL",
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(Date.now() - 1000 * 60 * 180), // 3 hours ago
      authorEmail: "comm@szwbt2026.edu",
      authorName: "Communications Controller",
      deliveryStatus: "DELIVERED",
      recipientCount: 384,
    },
    {
      title: "COMPLIMENTARY SHUTTLE BUS FREQUENCY: SHALMALA & VINDHYA",
      content: "University shuttle transit frequency between Shalmala Hostel, Vindhya Boys Hostel, and the Sports Complex has been increased to 12-minute intervals between 07:00 IST and 21:00 IST. Transport is complimentary for all accredited participants and officials. Present your digital QR pass when boarding.",
      category: "TRANSPORT",
      priority: "NORMAL",
      targetAudience: "ALL",
      channels: "IN_APP",
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(Date.now() - 1000 * 60 * 90), // 90 mins ago
      authorEmail: "comm@szwbt2026.edu",
      authorName: "Communications Controller",
      deliveryStatus: "DELIVERED",
      recipientCount: 312,
    },
    {
      title: "COURT 03 MAT RE-ALIGNMENT & LIGHTING CALIBRATION",
      content: "Court 03 mat calibration and lux lighting inspection will take place between 12:45 IST and 13:15 IST. Matches scheduled on Court 03 will experience a brief 15-minute offset. Players affected have been notified via SMS.",
      category: "MATCH",
      priority: "HIGH",
      targetAudience: "OFFICIALS",
      channels: "IN_APP,EMAIL",
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
      authorEmail: "comm@szwbt2026.edu",
      authorName: "Operations Liaison",
      relatedResource: "court:Court 03",
      deliveryStatus: "SENT",
      recipientCount: 24,
    },
    {
      title: "KNOCKOUT ROUND-OF-16 DRAW BROADCAST",
      content: "The official bracket publication for the Round-of-16 Singles and Doubles Knockout phase will be released following the conclusion of Group Pool Stage fixtures. Live bracket verification will be accessible on the Tournament Hub.",
      category: "TOURNAMENT",
      priority: "NORMAL",
      targetAudience: "ALL",
      channels: "IN_APP,EMAIL",
      status: "SCHEDULED",
      isPublished: false,
      scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 4), // 4 hours from now
      authorEmail: "comm@szwbt2026.edu",
      authorName: "Communications Controller",
      deliveryStatus: "PENDING",
      recipientCount: 0,
    },
    {
      title: "DRAFT: VIP GALA & CITATION CEREMONY SEATING",
      content: "Seating designations for university dignitaries, team managers, and state badminton association representatives for the championship gala dinner at the Senate Hall.",
      category: "GENERAL",
      priority: "LOW",
      targetAudience: "TEAMS",
      channels: "IN_APP",
      status: "DRAFT",
      isPublished: false,
      authorEmail: "comm@szwbt2026.edu",
      authorName: "Communications Controller",
      deliveryStatus: "PENDING",
      recipientCount: 0,
    },
    {
      title: "WEATHER ADVISORY: ARENA HVAC MOISTURE AUDIT",
      content: "Facility engineering has confirmed relative humidity inside the arena is within BWF standard specifications (45-55%). Court surface friction tests are 100% compliant. Play proceeds without interruption.",
      category: "SAFETY",
      priority: "URGENT",
      targetAudience: "ALL",
      channels: "IN_APP,EMAIL",
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
      authorEmail: "comm@szwbt2026.edu",
      authorName: "Safety Director",
      deliveryStatus: "DELIVERED",
      recipientCount: 420,
    },
  ];

  for (const ann of announcements) {
    const existing = await prisma.announcement.findFirst({
      where: { title: ann.title },
    });

    let createdAnn;
    if (existing) {
      createdAnn = await prisma.announcement.update({
        where: { id: existing.id },
        data: ann,
      });
    } else {
      createdAnn = await prisma.announcement.create({
        data: ann,
      });
    }

    // Seed delivery records for published announcements
    if (createdAnn.isPublished) {
      await prisma.notificationDelivery.createMany({
        data: [
          {
            announcementId: createdAnn.id,
            channel: "IN_APP",
            recipient: createdAnn.targetAudience,
            status: "DELIVERED",
            attemptCount: 1,
            sentAt: new Date(),
            deliveredAt: new Date(),
          },
          {
            announcementId: createdAnn.id,
            channel: "EMAIL",
            recipient: "broadcast-list@szwbt2026.edu",
            status: createdAnn.deliveryStatus === "DELIVERED" ? "DELIVERED" : "SENT",
            attemptCount: 1,
            sentAt: new Date(),
            deliveredAt: createdAnn.deliveryStatus === "DELIVERED" ? new Date() : null,
          },
        ],
        skipDuplicates: true,
      });
    }
  }

  // 5. Seed one failed delivery sample to test failure monitoring & retry workflow
  const latestAnn = await prisma.announcement.findFirst({
    where: { status: "PUBLISHED" },
  });

  if (latestAnn) {
    await prisma.notificationDelivery.create({
      data: {
        announcementId: latestAnn.id,
        channel: "SMS",
        recipient: "+91 94812 00000",
        status: "FAILED",
        errorMessage: "Carrier Gateway Timeout (HTTP 504) - Gateway buffer congested",
        attemptCount: 1,
      },
    });
  }

  console.log("✓ Communications & Announcements Center Seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding communications:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
