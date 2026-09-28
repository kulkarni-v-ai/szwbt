import { prisma } from "../src/lib/prisma";
import { ROLES } from "../src/lib/rbac/roles";
import { PERMISSIONS } from "../src/lib/rbac/permissions";

async function main() {
  console.log("Seeding Support & Help Desk Portal Data...");

  // 1. Ensure SUPPORT_STAFF role exists
  const supportRole = await prisma.role.upsert({
    where: { name: ROLES.SUPPORT_STAFF },
    update: {},
    create: {
      name: ROLES.SUPPORT_STAFF,
      displayName: "Support & Help Desk",
      description: "Participant query resolutions, directions, and general assistance.",
      isSystem: true,
    },
  });

  // Assign permissions to SUPPORT_STAFF
  const supportPermissions = [
    PERMISSIONS.PARTICIPANT_READ,
    PERMISSIONS.TEAM_READ,
    PERMISSIONS.ACCOMMODATION_READ,
    PERMISSIONS.TRANSPORT_READ,
    PERMISSIONS.ANNOUNCEMENT_READ,
    PERMISSIONS.SUPPORT_READ,
    PERMISSIONS.SUPPORT_CREATE,
    PERMISSIONS.SUPPORT_UPDATE,
    PERMISSIONS.SUPPORT_ASSIGN,
    PERMISSIONS.SUPPORT_RESOLVE,
    PERMISSIONS.SUPPORT_CLOSE,
    PERMISSIONS.SUPPORT_ESCALATE,
    PERMISSIONS.SUPPORT_COMMENT,
  ];

  for (const permCode of supportPermissions) {
    const perm = await prisma.permission.upsert({
      where: { code: permCode },
      update: {},
      create: {
        code: permCode,
        resource: "support",
        action: permCode.split(":")[1] || "read",
        description: `Permission ${permCode}`,
      },
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: supportRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: supportRole.id,
        permissionId: perm.id,
      },
    });
  }

  // 2. Upsert Support Staff User
  const supportUser = await prisma.user.upsert({
    where: { email: "support@szwbt2026.edu" },
    update: {
      name: "KLE Tech Arena Support Desk Lead",
      badge: "SUPPORT COMMAND",
      targetUrl: "/support",
      isActive: true,
    },
    create: {
      email: "support@szwbt2026.edu",
      name: "KLE Tech Arena Support Desk Lead",
      passwordHash: "szwbt2026pass",
      badge: "SUPPORT COMMAND",
      targetUrl: "/support",
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: supportUser.id,
        roleId: supportRole.id,
      },
    },
    update: {},
    create: {
      userId: supportUser.id,
      roleId: supportRole.id,
    },
  });

  // Also ensure support agent 2 exists for assignment testing
  const agent2 = await prisma.user.upsert({
    where: { email: "agent.kavya@szwbt2026.edu" },
    update: {
      name: "Kavya Murthy (Help Desk Specialist)",
      badge: "SUPPORT DESK",
      targetUrl: "/support",
      isActive: true,
    },
    create: {
      email: "agent.kavya@szwbt2026.edu",
      name: "Kavya Murthy (Help Desk Specialist)",
      passwordHash: "szwbt2026pass",
      badge: "SUPPORT DESK",
      targetUrl: "/support",
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: agent2.id,
        roleId: supportRole.id,
      },
    },
    update: {},
    create: {
      userId: agent2.id,
      roleId: supportRole.id,
    },
  });

  // 3. Seed Knowledge Base Articles
  const knowledgeArticles = [
    {
      title: "Athlete Accreditation & Name Corrections",
      slug: "athlete-accreditation-corrections",
      category: "REGISTRATION",
      content: "All accreditation badge re-issuances or spelling corrections must be requested at Registration Counter 01. Present original Government photo ID (Aadhaar or Passport) and University Identity Card for immediate badge re-printing.",
    },
    {
      title: "Shalmala & Vindhya Hostel Check-in Instructions",
      slug: "hostel-checkin-instructions",
      category: "ACCOMMODATION",
      content: "Participants checking into Shalmala Hostel (Women's Wing) and managers checking into Vindhya Boys Hostel must present their digital QR pass at the Ground Floor Warden Desk. Linen packets and room keys are issued upon digital scan.",
    },
    {
      title: "Complimentary University Shuttle Timings & Routes",
      slug: "university-shuttle-timings",
      category: "TRANSPORT",
      content: "University shuttle service is complimentary for all accredited players, managers, and officials. Shuttles depart every 15 minutes between Hubballi Airport, Hubballi Railway Station, Shalmala Hostel, and the KLE Tech Main Arena. No payment or ticketing required.",
    },
    {
      title: "Match Schedule Delays & Warmup Court Access",
      slug: "match-schedule-warmup-access",
      category: "MATCHES",
      content: "If a match on an assigned court is paused or delayed, the Chief Umpire Desk updates the live court matrix. Warmup courts W1 and W2 remain accessible 30 minutes prior to scheduled match call.",
    },
    {
      title: "Eligibility Document Submission Guidelines",
      slug: "eligibility-document-guidelines",
      category: "DOCUMENTS",
      content: "Under AIU rules, all collegiate athletes must provide verified 10th (SSLC) mark sheets, 12th (PUC) certificates, and bona fide university enrollment certificates before entering the tournament draw.",
    },
  ];

  for (const art of knowledgeArticles) {
    await prisma.supportKnowledgeArticle.upsert({
      where: { slug: art.slug },
      update: art,
      create: art,
    });
  }

  // 4. Seed Support Tickets
  const initialTickets = [
    {
      ticketNumber: "TKT-2026-001",
      subject: "Aadhaar Name Spelling Discrepancy on Accreditation Card",
      description: "My middle name was misspelled on the printed badge as 'Ananya R. Sharma' instead of 'Ananya Raj Sharma'. Requesting reissue before first round match on Court 01.",
      requesterEmail: "player@szwbt2026.edu",
      requesterName: "Ananya Sharma",
      requesterType: "PARTICIPANT",
      category: "REGISTRATION",
      subcategory: "ACCREDITATION_CORRECTION",
      priority: "NORMAL",
      status: "IN_PROGRESS",
      assignedAgentEmail: "support@szwbt2026.edu",
      assignedAgentName: "Support Desk Lead",
      relatedResourceType: "PARTICIPANT",
      relatedResourceId: "P-SZWBT-001",
      messages: [
        {
          senderEmail: "player@szwbt2026.edu",
          senderName: "Ananya Sharma",
          senderType: "REQUESTER",
          messageType: "PUBLIC",
          content: "Hello Support, please see my uploaded student ID. My official middle name is Raj, please update my badge.",
        },
        {
          senderEmail: "support@szwbt2026.edu",
          senderName: "Support Desk Lead",
          senderType: "SUPPORT_AGENT",
          messageType: "INTERNAL_NOTE",
          content: "Cross-checked with AIU roster sheet. Discrepancy verified. Sending reprint token to Registration Desk Counter 1.",
        },
        {
          senderEmail: "support@szwbt2026.edu",
          senderName: "Support Desk Lead",
          senderType: "SUPPORT_AGENT",
          messageType: "PUBLIC",
          content: "Hello Ananya, we have verified your record. Please visit Registration Counter 01 in the Main Concourse at 14:00 IST to collect your corrected badge.",
        },
      ],
    },
    {
      ticketNumber: "TKT-2026-002",
      subject: "Ground Floor Room Request for Reserve Athlete Recovering from Sprain",
      description: "Bangalore University reserve athlete has a mild ankle strain. Requesting allocation transfer from Floor 3 to Ground Floor Room 102 in Shalmala Hostel for accessibility.",
      requesterEmail: "team@szwbt2026.edu",
      requesterName: "Priya Nair (Team Manager)",
      requesterType: "TEAM_MANAGER",
      category: "ACCOMMODATION",
      subcategory: "ROOM_REALLOCATION",
      priority: "HIGH",
      status: "OPEN",
      assignedAgentEmail: "agent.kavya@szwbt2026.edu",
      assignedAgentName: "Kavya Murthy",
      relatedResourceType: "TEAM",
      relatedResourceId: "TM-SZ-001",
      messages: [
        {
          senderEmail: "team@szwbt2026.edu",
          senderName: "Priya Nair",
          senderType: "REQUESTER",
          messageType: "PUBLIC",
          content: "Requesting ground floor bed in Shalmala Hostel due to player medical necessity. Medical certificate available.",
        },
        {
          senderEmail: "agent.kavya@szwbt2026.edu",
          senderName: "Kavya Murthy",
          senderType: "SUPPORT_AGENT",
          messageType: "INTERNAL_NOTE",
          content: "Checking Shalmala Hostel Room 102 bed availability with hostel admin desk.",
        },
      ],
    },
    {
      ticketNumber: "TKT-2026-003",
      subject: "Inquiry on Early Morning Airport Shuttle Frequency from Hubballi Airport",
      description: "Our contingent arrives on the 06:15 IST flight from Hyderabad. Is the university shuttle waiting at Terminal 1, and what is the departure timing?",
      requesterEmail: "team@szwbt2026.edu",
      requesterName: "Priya Nair",
      requesterType: "TEAM_MANAGER",
      category: "TRANSPORT",
      subcategory: "SHUTTLE_TIMINGS",
      priority: "NORMAL",
      status: "RESOLVED",
      assignedAgentEmail: "support@szwbt2026.edu",
      assignedAgentName: "Support Desk Lead",
      relatedResourceType: "TRANSPORT",
      relatedResourceId: "RT-01",
      resolutionNotes: "Provided university shuttle pickup schedule. Shuttles are complimentary and stand at Airport Terminal 1 Gate 2 every 15 minutes.",
      resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      messages: [
        {
          senderEmail: "team@szwbt2026.edu",
          senderName: "Priya Nair",
          senderType: "REQUESTER",
          messageType: "PUBLIC",
          content: "Please confirm shuttle availability for flight arrival 06:15 IST.",
        },
        {
          senderEmail: "support@szwbt2026.edu",
          senderName: "Support Desk Lead",
          senderType: "SUPPORT_AGENT",
          messageType: "PUBLIC",
          content: "Hello Priya, official university buses KA-25-EA-9021 and KA-25-EA-9022 are stationed at Terminal 1 Gate 2. Service is complimentary and departs directly to Shalmala Hostel.",
        },
      ],
    },
    {
      ticketNumber: "TKT-2026-004",
      subject: "SSLC Mark Sheet Verification Escalation for Reserve Player",
      description: "AIU registration documents for player are flagged pending due to illegible scan of 10th standard mark sheet. Original certificate brought physically to venue.",
      requesterEmail: "player@szwbt2026.edu",
      requesterName: "Ananya Sharma",
      requesterType: "PARTICIPANT",
      category: "DOCUMENTS",
      subcategory: "VERIFICATION_ESCALATION",
      priority: "URGENT",
      status: "ESCALATED",
      assignedAgentEmail: "support@szwbt2026.edu",
      assignedAgentName: "Support Desk Lead",
      relatedResourceType: "PARTICIPANT",
      relatedResourceId: "P-SZWBT-001",
      messages: [
        {
          senderEmail: "player@szwbt2026.edu",
          senderName: "Ananya Sharma",
          senderType: "REQUESTER",
          messageType: "PUBLIC",
          content: "Original SSLC certificate is in my hand at the help desk. Need registration clearance before 11:00 IST technical meeting.",
        },
        {
          senderEmail: "support@szwbt2026.edu",
          senderName: "Support Desk Lead",
          senderType: "SUPPORT_AGENT",
          messageType: "INTERNAL_NOTE",
          content: "Escalating directly to Registration Admin for physical verification override.",
        },
      ],
      escalations: [
        {
          targetDepartment: "REGISTRATION",
          escalationReason: "Original document verified physically at helpdesk; requires Registration Admin clearance in central database.",
          priority: "URGENT",
          escalatedBy: "support@szwbt2026.edu",
          status: "OPEN",
        },
      ],
    },
    {
      ticketNumber: "TKT-2026-005",
      subject: "Coach Device Login Support",
      description: "Resolved: Assisted manager with password reset for match schedule portal.",
      requesterEmail: "manager.blr@szwbt2026.edu",
      requesterName: "BLR University Coach",
      requesterType: "STAFF",
      category: "TECHNICAL",
      priority: "LOW",
      status: "CLOSED",
      assignedAgentEmail: "support@szwbt2026.edu",
      assignedAgentName: "Support Desk Lead",
      resolutionNotes: "Password reset completed and login verified on tablet.",
      resolvedAt: new Date(Date.now() - 1000 * 60 * 120),
      closedAt: new Date(Date.now() - 1000 * 60 * 60),
      messages: [
        {
          senderEmail: "manager.blr@szwbt2026.edu",
          senderName: "BLR Coach",
          senderType: "REQUESTER",
          messageType: "PUBLIC",
          content: "Cannot remember coach portal passcode.",
        },
        {
          senderEmail: "support@szwbt2026.edu",
          senderName: "Support Desk Lead",
          senderType: "SUPPORT_AGENT",
          messageType: "PUBLIC",
          content: "Security passcode reset to default championship passcode szwbt2026pass.",
        },
      ],
    },
  ];

  for (const tktData of initialTickets) {
    const { messages, escalations, ...tktFields } = tktData;

    const existing = await prisma.supportTicket.findUnique({
      where: { ticketNumber: tktFields.ticketNumber },
    });

    let ticket;
    if (existing) {
      ticket = await prisma.supportTicket.update({
        where: { id: existing.id },
        data: tktFields,
      });
    } else {
      ticket = await prisma.supportTicket.create({
        data: tktFields,
      });
    }

    if (messages && messages.length > 0) {
      for (const msg of messages) {
        await prisma.supportMessage.create({
          data: {
            ticketId: ticket.id,
            ...msg,
          },
        });
      }
    }

    if (escalations && escalations.length > 0) {
      for (const esc of escalations) {
        await prisma.supportEscalation.create({
          data: {
            ticketId: ticket.id,
            ...esc,
          },
        });
      }
    }
  }

  console.log("✓ Support & Help Desk Portal Data Seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding support portal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
