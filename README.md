# 🏸 SZWBT 2026: South Zone Inter-University Women's Badminton Championship

<div align="center">

![SZWBT 2026 Banner](public/logo.png)

### **16-Bit Retro Arcade & Anime Sports Tournament Platform**
*Official Digital Command & Telemetry Engine for the South Zone Inter-University Women's Badminton Championship 2026 at KLE Technological University, Hubballi.*

[![Next.js](https://img.shields.io/badge/Next.js-15.2.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![BWF Compliant](https://img.shields.io/badge/BWF-Standard_Rules-red?style=for-the-badge)](https://corporate.bwfbadminton.com/)
[![Tests](https://img.shields.io/badge/Tests-100%25_Passing-brightgreen?style=for-the-badge&logo=node.js)](https://nodejs.org/)

</div>

---

## 🌟 Overview & Core Philosophy

**SZWBT 2026** is a comprehensive, production-grade tournament management ecosystem built with a distinctive **16-bit retro arcade / anime sports aesthetics** paired with modern web engineering. Designed to run the South Zone Inter-University Women's Badminton Championship, the platform manages the entire lifecycle of high-stakes university badminton tournaments:

- **18 Specialized Command Portals & Dashboards**: Dedicated operational environments tailored for every stakeholder from Chief Umpires to Team Managers, Bus Drivers, and Super Admins.
- **BWF Official Match Scoring Engine**: 21-point rally scoring with sudden-death ceiling at 30, service judge fault tracking, yellow/red/black cards, medical timeouts, and cryptographically verifiable digital scoresheets.
- **4-Bed Contingent Hostel Allocation**: Precision room and bed management across *Shalmala Block* and *Vindhya Block*, keeping 5-member contingents together while monitoring room capacities.
- **Zero Transport Payment Policy**: Real-time university shuttle fleet tracking between Hubballi Junction / Hubballi Airport and the campus with strict zero-cost enforcement.
- **Real SMTP & Dynamic OTP Verification**: Live email-based one-time password security for contingent registration, pass validation, and account protection.
- **Tamper-Evident Audit Logging**: Every administrative action, score override, financial receipt, and credential reset is logged immutably.

---

## 🕹️ Aesthetic Design System: 16-Bit Retro Arcade

The interface merges the nostalgic energy of classic 90s Japanese arcade games (*Street Fighter II, Capcom Sports Club, Neo Geo*) with smooth modern web motion:
- **CRT Scanline Filter**: Optional toggleable CRT scanlines, flicker, and barrel distortion shaders.
- **Pixel HUD & Borders**: Custom 8-bit and 16-bit bevel borders, arcade status bars, pulsing health/readiness gauges, and gold coin point counters.
- **Interactive Three.js Intro**: Dynamic 3D shuttlecock physics canvas welcoming visitors at the tournament gates.
- **Sound & Motion**: GSAP and Framer Motion spring transitions with 8-bit victory confetti cannons.

---

## 🗺️ Portal Directory (18 Dashboards & Hubs)

| Portal / Module | Route | Access Level | Description |
| :--- | :--- | :--- | :--- |
| **Public Tournament Hub** | [`/`](file:///e:/SZWBT/src/app/page.tsx) | Public | Tournament hero, live ticker, quick links, event schedule, and university standings. |
| **Live Match Scoreboard** | [`/matches`](file:///e:/SZWBT/src/app/matches/page.tsx) | Public | Live court telecast, active tie scores, game sets, and upcoming matchups. |
| **Tournament Schedule** | [`/schedule`](file:///e:/SZWBT/src/app/schedule/page.tsx) | Public | Day-by-day court fixtures, stage progression (R1, R2, QF, SF, Finals). |
| **Official Tournament Results** | [`/results`](file:///e:/SZWBT/src/app/results/page.tsx) | Public | Completed matches, verified scoresheets, institutional medal tallies. |
| **Announcements Hub** | [`/announcements`](file:///e:/SZWBT/src/app/announcements/page.tsx) | Public | Official championship bulletins, schedule adjustments, and weather/logistics alerts. |
| **Central Auth Gateway** | [`/login`](file:///e:/SZWBT/src/app/login/page.tsx) | Public | Unified login terminal with automatic role-based dispatching to user's assigned portal. |
| **Super Admin Command** | [`/admin`](file:///e:/SZWBT/src/app/admin/page.tsx) | `SUPER_ADMIN` | Executive tournament control, system health, credential reset, and audit trail. |
| **User & Access Management** | [`/admin/system/users`](file:///e:/SZWBT/src/app/admin/system/page.tsx) | `SUPER_ADMIN` | 5-step user provisioning wizard, role assignment, account locking, and session invalidation. |
| **Tournament Admin Center** | [`/admin/tournament`](file:///e:/SZWBT/src/app/admin/tournament/page.tsx) | `TOURNAMENT_ADMIN` | Fixture scheduling, court availability, category setup, and conflict resolution. |
| **Technical Match Ops (TechOps)** | [`/operations`](file:///e:/SZWBT/src/app/operations/page.tsx) | `TECHOPS` / `OPERATIONS` | Arena court manager, match queue dispatch, emergency interventions, walkovers. |
| **Official Umpire Scoreboard** | [`/official`](file:///e:/SZWBT/src/app/official/page.tsx) | `OFFICIAL` | Live BWF digital scoring HUD, service fault counter, card tracking, signed match exports. |
| **Live Court Telemetry HUD** | [`/admin/live`](file:///e:/SZWBT/src/app/admin/live/page.tsx) | `ADMIN` / `TECHOPS` | Real-time 4-court camera telemetry, umpire status, and shuttlecock consumption. |
| **Registration Desk** | [`/register`](file:///e:/SZWBT/src/app/register/page.tsx) | `REGISTRATION_STAFF` | 5-member team contingent intake, digital photo capture, badge generation, fee receipts. |
| **Document Scanner & OCR Desk** | [`/scanner`](file:///e:/SZWBT/src/app/scanner/page.tsx) | `DOCUMENT_VERIFIER` | Mobile-first QR badge scanner, student ID verification, SSLC & PUC marks card audit. |
| **Accommodation & Hostels** | [`/admin/accommodation`](file:///e:/SZWBT/src/app/admin/accommodation/page.tsx) | `ACCOMMODATION_STAFF` | 4-bed room allocation (Shalmala & Vindhya blocks), bed occupancy, check-in/out timestamps. |
| **Transport & Shuttle Fleet** | [`/admin/transport`](file:///e:/SZWBT/src/app/admin/transport/page.tsx) | `TRANSPORT_STAFF` | Airport/railway pickup runs, driver dispatch, bus boarding passes (*Strict Zero Payment*). |
| **Treasury & Finance** | [`/admin/finance`](file:///e:/SZWBT/src/app/admin/finance/page.tsx) | `FINANCE_STAFF` | Institutional affiliation fees, security deposits, refund approvals, UTR reconciliation. |
| **Communications Center** | [`/admin/communications`](file:///e:/SZWBT/src/app/admin/communications/page.tsx) | `COMMUNICATIONS_STAFF` | Mass SMS, broadcast emails, emergency bulletins, template management. |
| **Help Desk & Support** | [`/support`](file:///e:/SZWBT/src/app/support/page.tsx) | `SUPPORT_STAFF` / All | Ticket intake, department escalation, private staff internal notes, public responses. |
| **Reports & Analytics** | [`/admin/reports`](file:///e:/SZWBT/src/app/admin/reports/page.tsx) | `REPORTS_STAFF` | Participation statistics, CSV data export, court utilization metrics, financial reports. |
| **University Team Manager** | [`/team`](file:///e:/SZWBT/src/app/team/page.tsx) | `TEAM_MANAGER` | Contingent roster inspection, tie player nominations, contingent pass downloads. |
| **Athlete Personal HUD** | [`/dashboard`](file:///e:/SZWBT/src/app/dashboard/page.tsx) | `PARTICIPANT` | Digital QR accreditation badge, next match countdown, hostel/bus pass, food tokens. |
| **Volunteer Mobile Hub** | [`/volunteer`](file:///e:/SZWBT/src/app/volunteer/page.tsx) | `VOLUNTEER` | Shift duties, court runner tasks, spectator guidance, SOS emergency beacon. |
| **Self-Service Profile** | [`/profile`](file:///e:/SZWBT/src/app/profile/page.tsx) | Authenticated | Contact update, emergency numbers, active device revocation, password change. |

---

## 🔐 Pre-Seeded Accounts & Credentials Directory

> **Universal Development Password**: `szwbt2026pass`
> Central Login Terminal: `http://localhost:3000/login`

| Role | Email / Login ID | Clearance Level | Primary Route |
| :--- | :--- | :--- | :--- |
| **Super Admin / Root** | `admin@szwbt2026.edu` | Level 04 Root | `/admin` |
| **Technical Operations Lead (TechOps)** | `techops@szwbt2026.edu` | TechOps Command | `/operations` |
| **Tournament Administrator** | `tournament@szwbt2026.edu` | Tournament Admin | `/admin/tournament` |
| **Chief Umpire** | `umpire@szwbt2026.edu` | BWF Technical | `/official` |
| **Registration Desk Chief** | `registration@szwbt2026.edu` | Desk 02 Chief | `/register` |
| **Document Scanner Officer** | `scanner@szwbt2026.edu` | Doc Scanner 01 | `/scanner` |
| **Hostel Logistics Officer** | `hostel@szwbt2026.edu` | Residence Advisor | `/admin/accommodation` |
| **Fleet Transport Manager** | `transport@szwbt2026.edu` | Fleet Control | `/admin/transport` |
| **Treasury Auditor** | `finance@szwbt2026.edu` | Treasury Clearance | `/admin/finance` |
| **Communications Controller** | `comm@szwbt2026.edu` | Broadcast HUD | `/admin/communications` |
| **Help Desk Lead** | `support@szwbt2026.edu` | Support Command | `/support` |
| **Reports & Analytics Lead** | `reports@szwbt2026.edu` | Analytics Command | `/admin/reports` |
| **University Team Manager** | `team@szwbt2026.edu` | University Desk | `/team` |
| **Accredited Athlete / Player** | `player@szwbt2026.edu` | Player HUD | `/dashboard` |
| **Field Volunteer** | `volunteer@szwbt2026.edu` | Mobile Field | `/volunteer` |

*(Detailed credentials and multi-role accounts are documented in [`credentials.md`](credentials.md))*

---

## ⚙️ Technical Architecture & Key Modules

```
SZWBT/
├── docs/                        # Tournament CSV templates & guidelines
├── prisma/
│   ├── schema.prisma            # 40+ relational models (Matches, Teams, Accommodation, Transport...)
│   └── seed.ts                  # Comprehensive seed database
├── public/                      # Static assets, sound effects, retro sprites
├── src/
│   ├── app/                     # Next.js 15 App Router (18 portal routes & API endpoints)
│   │   ├── admin/               # Administrative Command Hubs
│   │   ├── api/                 # Secure REST API endpoints (RBAC protected)
│   │   ├── dashboard/           # Athlete HUD
│   │   ├── official/            # BWF Umpire Digital Scoresheet
│   │   ├── operations/          # TechOps Court Command
│   │   ├── register/            # Contingent Intake Wizard
│   │   ├── scanner/             # QR & Document Scanner
│   │   ├── team/                # University Team Manager Portal
│   │   ├── volunteer/           # Field Volunteer Terminal
│   │   └── ...                  # Public and auxiliary routes
│   ├── components/              # Modular UI Component Library
│   │   ├── accommodation/       # 4-Bed Room Cards, Allocation Drawer
│   │   ├── court/               # Pixel Badminton Court & Visualizers
│   │   ├── navigation/          # ArcadeNav & MobileArcadeMenu
│   │   ├── pixel/               # CRTEffect, PixelCard, PixelHUD, PixelTable, QRPass
│   │   └── ...
│   ├── lib/                     # Core Business Logic & Engines
│   │   ├── rbac/                # RBAC Engine, Permission Matrix & Session Tokenizer
│   │   ├── scoring/             # Official BWF 21-Point Badminton Scoring State Machine
│   │   ├── food/                # Dining & Meal Token Management
│   │   ├── qr/                  # Cryptographic QR Generator & Verifier
│   │   └── prisma.ts            # Prisma Client Singleton
│   └── styles/
│       └── globals.css          # 16-bit design system, arcade fonts, custom scrollbars
└── tests/                       # 12 Automated Integration & Security Test Suites
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.18+ or v20+
- **pnpm** (preferred) or **npm**
- **Git**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kulkarni-v-ai/szwbt.git
   cd szwbt
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   # Database (PostgreSQL or local SQLite for testing)
   DATABASE_URL="postgresql://user:password@localhost:5432/szwbt?schema=public"

   # Authentication & JWT
   JWT_SECRET="szwbt-arcade-secret-key-2026-super-secure"

   # SMTP Configuration (for real Email OTP)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-app-password"
   SMTP_FROM="SZWBT 2026 <no-reply@szwbt2026.edu>"

   # App Base URL
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Initialize Database & Seed Data:**
   ```bash
   npx prisma generate
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

5. **Start Development Server:**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

The platform includes 12 automated test suites covering role-based access control, match scoring rules, security guarantees, and portal APIs:

```bash
# Run all test suites
npm test

# Run individual test suites
npm run test:rbac            # Role-Based Access Control matrix
npm run test:tournament      # Fixtures, court conflicts, readiness
npm run test:team            # Team manager contingent workflows
npm run test:participant     # Athlete HUD, QR verification
npm run test:organizer       # Secretariat & executive controls
npm run test:operations      # TechOps, queue flow, walkovers
npm run test:volunteer       # Field volunteer tasks & SOS
npm run test:communications  # Announcements & delivery logs
npm run test:support         # Support desk tickets & notes
npm run test:reports         # Analytics & CSV export security
npm run test:system          # Health telemetry & audit logs
npm run test:profile         # Self-service profile & device revocation
```

---

## 📤 Commands to Push to GitHub via Command Prompt (CMD)

If you are pushing to GitHub from your Windows Command Prompt (`cmd.exe`), follow these exact steps:

### Option 1: Commit Everything and Push (Recommended)

```cmd
:: 1. Navigate to the project root
cd /d e:\SZWBT

:: 2. Stage all modifications, new portals, tests, docs, and assets
git add .

:: 3. Commit the complete tournament platform
git commit -m "feat: complete 16-bit retro arcade tournament platform with 18 dashboards, BWF scoring, and full test suites"

:: 4. Set the main branch name
git branch -M main

:: 5. Push to GitHub (sets upstream origin)
git push -u origin main
```

### Option 2: Push Only the Existing Commit (`d93be6d`)

```cmd
cd /d e:\SZWBT
git push -u origin main
```

> **Note on Authentication in CMD**:
> When running `git push`, Git will open a browser window or prompt for your GitHub credentials:
> - **Username**: `kulkarni-v-ai` (or your GitHub username)
> - **Password**: Use a **GitHub Personal Access Token (Classic or Fine-Grained)** with `repo` permissions, or log in via the Git Credential Manager browser popup.
> - To generate a token: GitHub → **Settings** → **Developer Settings** → **Personal Access Tokens** → **Generate new token (classic)** → Check `repo`.

---

## 🛡️ Security & Zero-Payment Policy Highlights

1. **Complimentary Campus Shuttle**: All transport between Hubballi Junction, Hubballi Airport, and the KLE Tech campus is **100% free**. No payment options or fees exist anywhere in the transport or support modules.
2. **Credential Sanitization**: Passwords, hashes, and session identifiers are strictly filtered and never returned over public or administrative API responses.
3. **Audit Trail**: Every critical action creates an immutable log containing actor ID, IP address, timestamp, action category, and state diffs.

---

## 🏆 Credits & Acknowledgments

- **Host Institution**: KLE Technological University, Hubballi, Karnataka, India
- **Governing Body**: Association of Indian Universities (AIU)
- **Rules Standard**: Badminton World Federation (BWF) General Competition Regulations
- **Championship**: South Zone Inter-University Badminton (Women) Tournament 2026

---

<div align="center">
<sub>Built with 🏸 passion & 16-bit retro spirit for SZWBT 2026.</sub>
</div>
