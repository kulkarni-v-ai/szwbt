# South Zone Women's Badminton Championship 2026 (SZWBT)
## Official System Credentials & Authentication Directory

> **CONFIDENTIAL**: For authorized championship personnel and administration only. All access is protected by Role-Based Access Control (RBAC) and monitored via tamper-evident audit logging.

---

### Universal Default Password
The default security passcode for all pre-seeded official accounts is:
```text
szwbt2026pass
```

---

### Central Authentication Endpoint
- **Unified Login Terminal**: [`http://localhost:3000/login`](http://localhost:3000/login)
- **Automatic Smart Routing**: The login gateway automatically authenticates the credential, checks assigned RBAC roles, resolves the primary destination, and securely dispatches the user to their designated operational portal.

---

### Comprehensive Account Directory

#### 1. Executive & Root Operations
| Role | Email / Login ID | Password | Clearance Level | Primary Portal Route | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Super Admin / Root** | `admin@szwbt2026.edu` | `szwbt2026pass` | Level 04 Root | [`/admin`](http://localhost:3000/admin)<br>[`/admin/system/users`](http://localhost:3000/admin/system/users) | Complete administrative authority over system health, users, credentials, roles, audit trails, and platform settings. |

#### 2. Technical Operations (TechOps) & Match Command
| Role | Email / Login ID | Password | Clearance Level | Primary Portal Route | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Technical Operations Lead (TechOps)** | `techops@szwbt2026.edu` | `szwbt2026pass` | TechOps Command | [`/operations`](http://localhost:3000/operations)<br>[`/operations/matches`](http://localhost:3000/operations/matches) | Technical match command, court assignation, umpire conflict management, live interventions (court release, delay, walkovers), and queue flow. |
| **Arena Operations Controller** | `ops@szwbt2026.edu` | `szwbt2026pass` | Field Command | [`/operations`](http://localhost:3000/operations) | Court equipment readiness, venue physical telemetry, shuttlecock supply, arena coordination, and incident dispatch. |
| **Lead Controller (Multi-Role)** | `lead.multirole@szwbt2026.edu` | `szwbt2026pass` | Controller / Dual | [`/admin`](http://localhost:3000/admin)<br>[`/admin/live`](http://localhost:3000/admin/live) | Tournament Admin & Finance Staff dual-clearance for court schedules, live telemetry, and prize allocations. |
| **Tournament Secretariat** | `organizer@szwbt2026.edu` | `szwbt2026pass` | SZWBT Secretariat | [`/organizer`](http://localhost:3000/organizer) | Executive notices, university official delegations, credential issuance, and ceremony schedules. |
| **Reports & Analytics Lead** | `reports@szwbt2026.edu` | `szwbt2026pass` | Analytics Command | [`/admin/reports`](http://localhost:3000/admin/reports) | Real-time tournament KPIs, participation reports, CSV data exports, and audit reports. |
| **Communications Controller** | `comm@szwbt2026.edu` | `szwbt2026pass` | Broadcast HUD | [`/admin/communications`](http://localhost:3000/admin/communications) | Broadcast announcements, SMS/email dispatches, emergency alerts, and press bulletins. |

#### 3. Document Scanning & Verification Desk
| Role | Email / Login ID | Password | Clearance Level | Primary Portal Route | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Document Scanner Officer** | `scanner@szwbt2026.edu` | `szwbt2026pass` | Doc Scanner 01 | [`/scanner`](http://localhost:3000/scanner) | Mobile-first document scanner: QR scan of participant badges, phone camera capture of University ID, SSLC (10th) & PUC (12th) marks cards. |
| **Document Verification Lead** | `documents@szwbt2026.edu` | `szwbt2026pass` | Doc Verification | [`/scanner`](http://localhost:3000/scanner)<br>[`/admin/registrations`](http://localhost:3000/admin/registrations) | Verification queue inspection, athlete age/enrollment eligibility validation, OCR verification, and compliance approval. |

#### 4. Registration Desk & Finance Operations
| Role | Email / Login ID | Password | Clearance Level | Primary Portal Route | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Registration Desk Chief** | `registration@szwbt2026.edu` | `szwbt2026pass` | Desk 02 Chief | [`/register`](http://localhost:3000/register) | Full 5-member team contingent intake, athlete photo capture, contingent bed allocation, fee receipting, and 5-pass generation. |
| **Dual Desk Staff (Multi-Role)** | `priya.multirole@szwbt2026.edu` | `szwbt2026pass` | Dual Desk Ops | [`/register`](http://localhost:3000/register)<br>[`/admin/accommodation`](http://localhost:3000/admin/accommodation) | Registration & Accommodation dual-clearance for seamless check-in and hostel assignment. |
| **Treasury Auditor** | `finance@szwbt2026.edu` | `szwbt2026pass` | Treasury Clearance | [`/admin/finance`](http://localhost:3000/admin/finance) | Institutional affiliation fees, security deposits, refund processing, UTR reconciliation, and financial audit reports. |

#### 5. Ground Logistics & Fleet
| Role | Email / Login ID | Password | Clearance Level | Primary Portal Route | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Fleet Transport Manager** | `transport@szwbt2026.edu` | `szwbt2026pass` | Fleet Control | [`/admin/transport`](http://localhost:3000/admin/transport) | Shuttle fleet, driver assignments, Hubballi Junction/Airport pickups. *(Strict Zero Payment Policy enforced)* |
| **Hostel Logistics Officer** | `hostel@szwbt2026.edu` | `szwbt2026pass` | Residence Advisor | [`/admin/accommodation`](http://localhost:3000/admin/accommodation) | Shalmala & Vindhya Hostel block allocation, room and bed assignments, check-in/out timestamps. |
| **Arena Field Volunteer** | `volunteer@szwbt2026.edu` | `szwbt2026pass` | Mobile Field | [`/volunteer`](http://localhost:3000/volunteer) | Shift tasks, live court assistance, spectator management, water/shuttle replenishment, and field SOS distress calls. |

#### 6. Court Technical & Match Officiating
| Role | Email / Login ID | Password | Clearance Level | Primary Portal Route | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Chief Umpire** | `umpire@szwbt2026.edu` | `szwbt2026pass` | BWF Technical | [`/official`](http://localhost:3000/official) | Court 1-4 digital scoreboard controller, point scoring, line calls, service faults, cards, and signed scoresheets. |

#### 7. Contingents, Team Management & Athletes
| Role | Email / Login ID | Password | Clearance Level | Primary Portal Route | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **University Team Manager** | `team@szwbt2026.edu`<br>`manager.blr@szwbt2026.edu` | `szwbt2026pass` | University Desk | [`/team`](http://localhost:3000/team) | Contingent roster validation, player nomination for ties, hostel & shuttle inspection, university pass downloads. |
| **Accredited Athlete / Player** | `player@szwbt2026.edu`<br>`ananya@szwbt2026.edu` | `szwbt2026pass` | Player HUD | [`/dashboard`](http://localhost:3000/dashboard) | Digital accreditation badge, next match countdown, court call notifications, room & bus pass, self-service profile. |

#### 8. Help Desk & Support
| Role | Email / Login ID | Password | Clearance Level | Primary Portal Route | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Support Desk Lead** | `support@szwbt2026.edu` | `szwbt2026pass` | Support Command | [`/support`](http://localhost:3000/support) | Ticket intake, resolution assignments, department escalations, public responses, and confidential internal notes. |
| **Help Desk Specialist** | `agent.kavya@szwbt2026.edu` | `szwbt2026pass` | Support Desk | [`/support`](http://localhost:3000/support) | Rapid athlete inquiries, dietary requests, lost & found, accommodation queries. |

---

### Self-Service Account Management
- **Universal Profile Route**: [`http://localhost:3000/profile`](http://localhost:3000/profile)
  - Accessible to all authenticated accounts.
  - Allows editing personal phone, state, and emergency contact details.
  - Session management (active devices inspection, remote session revocation).
  - Password updating (verifies current password, enforces minimum length).
  - Notification preference controls (system-critical notifications cannot be disabled).

---

### Super Admin User & Credential Management
- **Control Interface**: [`http://localhost:3000/admin/system/users`](http://localhost:3000/admin/system/users)
  - Accessible exclusively to `SUPER_ADMIN`.
  - Account provisioning (5-step wizard with automatic credential assignment).
  - Immediate account lock / deactivation and account reactivation.
  - Role assignment & revocation (with protective safety guard preventing de-admining the sole Super Admin).
  - Administrative credential reset (generates temporary passcodes).
  - Force logout across all devices (`sessionVersion` invalidation).
  - Detailed security inspection: computed access matrix, safe session telemetry, and immutable audit logs.

---

### Security & Privacy Policies
1. **Zero Transport Payment Policy**:
   - University shuttle transit between Hubballi Junction / Airport and KLE Tech campus is **100% complimentary**.
   - No payment triggers, fees, or gateway links exist anywhere in the transport or support subsystems.
2. **Credential Privacy**:
   - Plaintext passwords and cryptographic hashes are **strictly prohibited** from ever being returned in public or administrative API payloads.
3. **Session Token Isolation**:
   - Session identifiers are never exposed over administrative API responses; only safe metadata (device type, browser, IP prefix, active timestamp) is presented.
