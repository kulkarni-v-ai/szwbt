# SOUTH ZONE WOMEN'S BADMINTON CHAMPIONSHIP 2026
## COMPLETE CSV REPOSITORY AUDIT & CENTRALIZED SYNTHETIC EXAMPLES DIRECTORY

This directory (`docs/csv-examples/`) serves as the authoritative repository library for all CSV import and export workflows in the SZWBT 2026 tournament management system.

---

### SUMMARY MATRIX OF ALL CSV WORKFLOWS

| CSV Workflow | Purpose | Direction | Module | Frontend Route | Backend Route / API | Required Columns | Example File Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **University & Institution Master** | Super Admin master list of universities & states | `IMPORT` | Institutions | `/admin/system/institutions` | `POST /api/admin/institutions/upload`<br>`POST /api/admin/institutions/import` | `institution_code, university_name, state, city, district, status` | [university_master_template.csv](./institutions/university_master_template.csv) |
| **Tournament Schedule** | Upload fixtures & scheduled matches per day | `IMPORT` | Tournament | `/admin/tournament` | `POST /api/schedule/upload-csv` | `Time, Category, Court, MatchNumber, PlayerA, InstitutionA, PlayerB, InstitutionB, Status` | [tournament_schedule_template.csv](./tournament/tournament_schedule_template.csv) |
| **Match Results & Scores** | Official match results & set scores | `EXPORT` | Tournament / Operations | `/admin/reports` | `POST /api/reports/export` (`reportType: MATCHES`) | `Match_Number, Tournament_Day, Scheduled_Time, Court, Category, Player_A, Institution_A, Player_B, Institution_B, Score, Winner, Status, Published` | [match_results_export_example.csv](./tournament/match_results_export_example.csv) |
| **University Contingents** | Registered university teams & member counts | `EXPORT` | Registration | `/admin/registrations`, `/admin/reports` | `POST /api/reports/export` (`reportType: REGISTRATION` / `TEAMS`) | `Team_Code, Team_Name, Institution, State, Manager_Name, Captain_Name, Member_Count, Beds_Allocated, Transport_Assigned, Status, Registration_Date` | [team_contingents_export_example.csv](./registration/team_contingents_export_example.csv) |
| **Participants Roster** | Accredited athlete registry with ID & category | `EXPORT` | Registration | `/admin/reports`, `/register` | `POST /api/reports/export` (`reportType: PARTICIPANTS`) | `Player_ID, Full_Name, Institution, State, Category, Gender, Status, Team_Code, Team_Name, Registered_At` | [participants_roster_export_example.csv](./registration/participants_roster_export_example.csv) |
| **Hostel Bed Inventory** | Bed allocation & occupancy for Shalmala/Vindhya | `EXPORT` | Accommodation | `/admin/accommodation`, `/admin/reports` | `POST /api/reports/export` (`reportType: ACCOMMODATION`) | `Hostel, Floor, Room_Number, Bed_Number, Capacity, Bed_Status, Occupant_Name, Occupant_ID` | [hostel_bed_inventory_export_example.csv](./accommodation/hostel_bed_inventory_export_example.csv) |
| **Transport Shuttle Manifest** | Complimentary fleet trips & passenger manifests | `EXPORT` | Transport | `/admin/transport`, `/admin/reports` | `POST /api/reports/export` (`reportType: TRANSPORT`) | `Trip_Code, Route, Scheduled_Date, Scheduled_Time, Vehicle_Reg, Driver_Name, Assigned_Passengers, Boarded_Count, No_Show_Count, Status, Fare_Type` | [transport_manifest_export_example.csv](./transport/transport_manifest_export_example.csv) |
| **Treasury & Fee Ledger** | Registration & accommodation fee reconciliation | `EXPORT` | Finance | `/admin/finance`, `/admin/reports` | `GET /api/finance/reports?format=csv`<br>`POST /api/reports/export` (`reportType: FINANCE`) | `Transaction_ID, Date, Category, Entity_Type, Entity_ID, Amount_INR, Payment_Method, UTR_Reference, Status, Operator_Email, Receipt_Number, Notes` | [finance_ledger_export_example.csv](./finance/finance_ledger_export_example.csv) |
| **Support Help Desk** | Escalated issues & resolution history | `EXPORT` | Support | `/admin/reports` | `POST /api/reports/export` (`reportType: SUPPORT`) | `Ticket_Number, Subject, Requester, Requester_Type, Category, Priority, Status, Assigned_Agent, Created_At, Resolved_At` | [support_tickets_export_example.csv](./reports/support_tickets_export_example.csv) |
| **Tamper-Evident Audit** | System-wide operational activity & access logs | `EXPORT` | Audit & Security | `/admin/reports` | `POST /api/reports/export` (`reportType: AUDIT`) | `Timestamp, Actor, Action, Resource_Type, Resource_ID, Request_ID` | [audit_logs_export_example.csv](./reports/audit_logs_export_example.csv) |

---

## DETAILED SPECIFICATION FOR EACH CSV WORKFLOW

### 1. University & Institution Master (`IMPORT`)
- **Purpose**: Defines authoritative university entities organized by state. Used in Registration desk dropdowns.
- **Used By**: `SUPER_ADMIN`
- **Import Endpoint**: `POST /api/admin/institutions/upload` (Stage 1: parse & preview) -> `POST /api/admin/institutions/import` (Stage 2: atomic upsert transaction).
- **Frontend Route**: `/admin/system/institutions`
- **Required Columns**:
  - `institution_code` (e.g. `KAR001`, `TAM001`, `KER001`) — Unique alphanumeric code.
  - `university_name` (e.g. `KLE Technological University`) — Full official name.
  - `state` (e.g. `Karnataka`, `Tamil Nadu`, `Kerala`, `Andhra Pradesh`, `Telangana`, `Puducherry`).
- **Optional Columns**:
  - `city` (e.g. `Hubballi`)
  - `district` (e.g. `Dharwad`)
  - `status` (`ACTIVE` or `INACTIVE`, default `ACTIVE`)
- **Validation Rules**:
  - `institution_code` and `university_name` cannot be empty.
  - `state` must be a valid recognized South Zone state/UT.
  - Case-insensitive deduplication on `institution_code` and composite `(university_name, state)`.
- **Database Upsert**: Updates existing records or inserts new. Soft-deactivates missing entries if replace mode is selected.
- **Example File**: `docs/csv-examples/institutions/university_master_template.csv`

---

### 2. Tournament Schedule (`IMPORT`)
- **Purpose**: Populates tournament day fixtures, court assignments, and scheduled matches in PostgreSQL.
- **Used By**: `TOURNAMENT_ADMIN`, `SUPER_ADMIN`
- **Import Endpoint**: `POST /api/schedule/upload-csv`
- **Frontend Route**: `/admin/tournament` (Schedule Manager)
- **Required Columns**:
  - `Time` (e.g. `09:00 IST`)
  - `Category` (e.g. `Women's Singles`, `Women's Doubles`, `Institution Teams`)
  - `Court` (e.g. `Court 01`, `Court 02`, `TBD`)
  - `MatchNumber` (e.g. `R1-M01`, `QF-M01`, `SF-M01`, `FINAL-01`)
  - `PlayerA` / `InstitutionA` (or Knockout Placeholder: `WINNER OF R1-M01`)
  - `PlayerB` / `InstitutionB`
- **Optional Columns**:
  - `Status` (`UPCOMING`, `READY`, `SCHEDULED`, `LIVE`, `COMPLETED`)
- **Validation Rules**:
  - Day ID (e.g. `OCT18`, `OCT19`, `OCT20`, `OCT21`) must exist in PostgreSQL.
  - Atomic transaction: replaces day fixtures and marks `isPublished = true`.
- **Example File**: `docs/csv-examples/tournament/tournament_schedule_template.csv`

---

### 3. Match Results & Live Scoring (`EXPORT`)
- **Purpose**: Generates public and operational match result records with set scores and winner confirmation.
- **Used By**: `OPERATIONS_STAFF`, `TOURNAMENT_ADMIN`, `REPORTS_STAFF`
- **Export Endpoint**: `POST /api/reports/export` (`reportType: "MATCHES"`)
- **Columns**: `Match_Number, Tournament_Day, Scheduled_Time, Court, Category, Player_A, Institution_A, Player_B, Institution_B, Score, Winner, Status, Published`
- **Example File**: `docs/csv-examples/tournament/match_results_export_example.csv`

---

### 4. Registered University Contingents (`EXPORT`)
- **Purpose**: Complete export of registered university contingents (5 athletes per team squad).
- **Used By**: `REGISTRATION_STAFF`, `SUPER_ADMIN`, `REPORTS_STAFF`
- **Export Endpoint**: `POST /api/reports/export` (`reportType: "REGISTRATION"`)
- **Columns**: `Team_Code, Team_Name, Institution, State, Manager_Name, Captain_Name, Member_Count, Beds_Allocated, Transport_Assigned, Status, Registration_Date`
- **Example File**: `docs/csv-examples/registration/team_contingents_export_example.csv`

---

### 5. Participant Accreditation Roster (`EXPORT`)
- **Purpose**: Individual participant records with permanent tournament IDs (`SZWBT26-P-XXXXXX`), category, and document verification status.
- **Used By**: `REGISTRATION_STAFF`, `REPORTS_STAFF`
- **Export Endpoint**: `POST /api/reports/export` (`reportType: "PARTICIPANTS"`)
- **Columns**: `Player_ID, Full_Name, Institution, State, Category, Gender, Status, Team_Code, Team_Name, Registered_At`
- **Example File**: `docs/csv-examples/registration/participants_roster_export_example.csv`

---

### 6. Accommodation Bed Inventory & Allocations (`EXPORT`)
- **Purpose**: Live occupancy and availability matrix across Shalmala Hostel & Vindhya Boys Hostel.
- **Used By**: `ACCOMMODATION_STAFF`, `REPORTS_STAFF`
- **Export Endpoint**: `POST /api/reports/export` (`reportType: "ACCOMMODATION"`)
- **Columns**: `Hostel, Floor, Room_Number, Bed_Number, Capacity, Bed_Status, Occupant_Name, Occupant_ID`
- **Example File**: `docs/csv-examples/accommodation/hostel_bed_inventory_export_example.csv`

---

### 7. Transportation Shuttle Fleet Manifest (`EXPORT`)
- **Purpose**: Complimentary (zero payment) university fleet operations, driver shifts, vehicle occupancy, and passenger boarding logs.
- **Used By**: `TRANSPORT_STAFF`, `OPERATIONS_STAFF`
- **Export Endpoint**: `POST /api/reports/export` (`reportType: "TRANSPORT"`)
- **Columns**: `Trip_Code, Route, Scheduled_Date, Scheduled_Time, Vehicle_Reg, Driver_Name, Assigned_Passengers, Boarded_Count, No_Show_Count, Status, Fare_Type`
- **Note**: Strict Zero-Payment enforcement (`Fare_Type: COMPLIMENTARY_UNIVERSITY_SERVICE`).
- **Example File**: `docs/csv-examples/transport/transport_manifest_export_example.csv`

---

### 8. Financial Treasury & Fee Ledger (`EXPORT`)
- **Purpose**: Bank-level reconciliation of physical cash collections and UPI UTR references for registration and accommodation deposits.
- **Used By**: `FINANCE_STAFF`, `SUPER_ADMIN`
- **Export Endpoint**: `GET /api/finance/reports?format=csv` and `POST /api/reports/export` (`reportType: "FINANCE"`)
- **Columns**: `Transaction_ID, Date, Category, Entity_Type, Entity_ID, Amount_INR, Payment_Method, UTR_Reference, Status, Operator_Email, Receipt_Number, Notes`
- **Example File**: `docs/csv-examples/finance/finance_ledger_export_example.csv`

---

### 9. Support Help Desk & Issue Escalations (`EXPORT`)
- **Purpose**: Help desk inquiries, category breakdown, response times, and resolutions.
- **Used By**: `SUPPORT_STAFF`, `OPERATIONS_STAFF`
- **Export Endpoint**: `POST /api/reports/export` (`reportType: "SUPPORT"`)
- **Columns**: `Ticket_Number, Subject, Requester, Requester_Type, Category, Priority, Status, Assigned_Agent, Created_At, Resolved_At`
- **Example File**: `docs/csv-examples/reports/support_tickets_export_example.csv`

---

### 10. Tamper-Evident System Audit Trail (`EXPORT`)
- **Purpose**: Immutable cryptographic security logs for administrative actions, RBAC changes, match interventions, and financial audits.
- **Used By**: `SUPER_ADMIN`
- **Export Endpoint**: `POST /api/reports/export` (`reportType: "AUDIT"`)
- **Columns**: `Timestamp, Actor, Action, Resource_Type, Resource_ID, Request_ID`
- **Example File**: `docs/csv-examples/reports/audit_logs_export_example.csv`
