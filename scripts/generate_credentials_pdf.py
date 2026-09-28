import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        # Top banner line
        self.setStrokeColor(colors.HexColor("#FF5500"))
        self.setLineWidth(2.5)
        self.line(36, letter[1] - 28, letter[0] - 36, letter[1] - 28)
        
        # Bottom footer line
        self.setStrokeColor(colors.HexColor("#18D8D0"))
        self.setLineWidth(1)
        self.line(36, 36, letter[0] - 36, 36)
        
        # Footer text
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#475569"))
        self.drawString(36, 24, "SOUTH ZONE WOMEN'S BADMINTON CHAMPIONSHIP 2026 (SZWBT) • OFFICIAL SYSTEM CREDENTIALS")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 36, 24, page_str)
        self.restoreState()

def build_pdf(filename="credentials.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=38,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=2
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#FF5500"),
        spaceAfter=4
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=7,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor("#334155")
    )

    callout_title = ParagraphStyle(
        'CalloutTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12.5,
        textColor=colors.HexColor("#0F172A")
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#1E293B")
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0F172A")
    )

    table_cell_code = ParagraphStyle(
        'TableCellCode',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#C2410C")
    )

    table_cell_pass = ParagraphStyle(
        'TableCellPass',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0F766E")
    )

    table_cell_route = ParagraphStyle(
        'TableCellRoute',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0369A1")
    )

    story = []

    # Title & Subtitle
    story.append(Paragraph("SOUTH ZONE WOMEN'S BADMINTON CHAMPIONSHIP 2026", title_style))
    story.append(Paragraph("OFFICIAL SYSTEM CREDENTIALS & ACCESS CONTROL DIRECTORY", subtitle_style))
    story.append(Paragraph("KLE Technological University, Hubballi • Dr. Prabhakar Kore Sports Arena • 4 BWF Standard Synthetic Courts", body_style))
    story.append(Spacer(1, 6))

    # Master Password Callout Box
    callout_data = [
        [
            Paragraph("<b>CENTRAL LOGIN TERMINAL</b><br/><font color='#0369A1'><b>http://localhost:3000/login</b></font><br/><font color='#64748B' size='7'>Smart-routing gateway: authenticates credentials and dispatches each role to their designated dashboard.</font>", callout_title),
            Paragraph("<b>UNIVERSAL SECURITY PASSCODE</b><br/><font size='12' color='#FF5500'><b>szwbt2026pass</b></font><br/><font color='#64748B' size='7'>Pre-seeded master passcode for all authorized tournament personnel accounts.</font>", callout_title)
        ]
    ]
    callout_table = Table(callout_data, colWidths=[270, 270])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('LINEBEFORE', (1, 0), (1, 0), 1, colors.HexColor("#E2E8F0")),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(callout_table)
    story.append(Spacer(1, 4))

    # Table generator helper (Total width = 540)
    def create_section_table(rows):
        formatted_rows = [
            [
                Paragraph("ROLE / DESIGNATION", table_header),
                Paragraph("OFFICIAL EMAIL (LOGIN ID)", table_header),
                Paragraph("PASSCODE", table_header),
                Paragraph("CLEARANCE", table_header),
                Paragraph("DESTINATION", table_header),
                Paragraph("CORE RESPONSIBILITY", table_header)
            ]
        ]
        for role, email, pwd, clearance, dest, desc in rows:
            formatted_rows.append([
                Paragraph(role, table_cell_bold),
                Paragraph(email, table_cell_code),
                Paragraph(pwd, table_cell_pass),
                Paragraph(clearance, table_cell),
                Paragraph(dest, table_cell_route),
                Paragraph(desc, table_cell)
            ])
        t = Table(formatted_rows, colWidths=[95, 125, 78, 70, 74, 98])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        return t

    # SECTION 1: Executive & Command
    story.append(Paragraph("1. Executive Command & Tournament Operations", h2_style))
    exec_rows = [
        ("Super Admin / Root", "admin@szwbt2026.edu", "szwbt2026pass", "Level 04 Root", "/admin<br/>/admin/system/users", "Full master authority: users, credentials, roles, database, system health, and audit trails."),
        ("Lead Controller (Multi-Role)", "lead.multirole@szwbt2026.edu", "szwbt2026pass", "Operations Lead", "/admin<br/>/admin/live", "Tournament Admin & Finance dual-clearance: court schedules, live telemetry, and prize awards."),
        ("Secretariat", "organizer@szwbt2026.edu", "szwbt2026pass", "Secretariat", "/organizer", "Executive communications, university delegations, passes, official bulletins, and notices."),
        ("Operations Controller", "ops@szwbt2026.edu", "szwbt2026pass", "Field Command", "/operations", "KLE Tech Arena court equipment, venue telemetry, shuttlecock stock, and court flow."),
    ]
    story.append(create_section_table(exec_rows))
    story.append(Spacer(1, 6))

    # SECTION 2: Analytics & Communications
    story.append(Paragraph("2. Analytics, Broadcast & Help Desk Support", h2_style))
    comm_rows = [
        ("Reports & Analytics Lead", "reports@szwbt2026.edu", "szwbt2026pass", "Analytics Lead", "/admin/reports", "Championship telemetry, KPI reporting, participation metrics, and CSV exports."),
        ("Communications Controller", "comm@szwbt2026.edu", "szwbt2026pass", "Broadcast HUD", "/admin/communications", "Tournament-wide broadcasts, emergency alerts, SMS/Email dispatches, and bulletins."),
        ("Support Desk Lead", "support@szwbt2026.edu", "szwbt2026pass", "Support Command", "/support", "Inquiry intake, ticket resolution, department escalations, and resolution audit notes."),
        ("Help Desk Specialist", "agent.kavya@szwbt2026.edu", "szwbt2026pass", "Support Desk", "/support", "Rapid response for athlete dietary, transport, lost & found, and general support tickets."),
    ]
    story.append(create_section_table(comm_rows))
    
    # Clean page break before Section 3 to prevent split table headers
    story.append(PageBreak())

    # SECTION 3: Desk, Finance & Ground Logistics
    story.append(Paragraph("3. Desk Operations, Finance & Ground Logistics", h2_style))
    desk_rows = [
        ("Registration Desk Chief", "registration@szwbt2026.edu", "szwbt2026pass", "Desk 02 Chief", "/register", "Physical ID verification, athlete check-in, contingent badge generation, and QR issuance."),
        ("Dual Desk Staff (Multi-Role)", "priya.multirole@szwbt2026.edu", "szwbt2026pass", "Dual Desk Ops", "/register<br/>/admin/accommodation", "Registration + Accommodation dual-clearance for simultaneous check-in and hostel assignment."),
        ("Treasury Auditor", "finance@szwbt2026.edu", "szwbt2026pass", "Treasury", "/admin/finance", "Affiliation fee audit, caution deposit records, payment verification, and reconciliation."),
        ("Fleet Transport Manager", "transport@szwbt2026.edu", "szwbt2026pass", "Fleet Control", "/admin/transport", "Campus shuttle fleet, driver schedules, airport/station pickups (Zero Fee Policy)."),
        ("Hostel Logistics Officer", "hostel@szwbt2026.edu", "szwbt2026pass", "Hostel Logistics", "/admin/accommodation", "Shalmala Hostel block allocation, room and bed assignments, check-in/out timestamps."),
        ("Arena Field Volunteer", "volunteer@szwbt2026.edu", "szwbt2026pass", "Mobile Field", "/volunteer", "Shift checklists, water/shuttle distribution, court support, and emergency SOS alerts."),
    ]
    story.append(create_section_table(desk_rows))
    story.append(Spacer(1, 6))

    # SECTION 4: Court Technical & Teams
    story.append(Paragraph("4. Match Officiating, Contingents & Athletes", h2_style))
    court_rows = [
        ("Chief Umpire", "umpire@szwbt2026.edu", "szwbt2026pass", "BWF Technical", "/official", "Court 1-4 digital scoreboard controller, point scoring, line calls, faults, and scoresheets."),
        ("Team Manager", "team@szwbt2026.edu", "szwbt2026pass", "University Desk", "/team", "Contingent roster validation, tie nominations, hostel inspection, and accreditation passes."),
        ("Accredited Athlete / Player", "player@szwbt2026.edu", "szwbt2026pass", "Player HUD", "/dashboard", "Digital accreditation badge, match countdown, court call alerts, transport & room pass."),
    ]
    story.append(create_section_table(court_rows))
    story.append(Spacer(1, 10))

    # Key Policies Box
    policy_data = [
        [
            Paragraph("<b>CRITICAL OPERATIONAL POLICIES & SECURITY DIRECTIVES</b><br/>"
                      "• <b>Strict Zero Transport Payment Policy:</b> All Hubballi Junction/Airport shuttle services are 100% complimentary for registered contingents. No payment fields or gateway charges exist anywhere in the platform.<br/>"
                      "• <b>Super Admin User Management (/admin/system/users):</b> Dedicated administrative module for account provisioning, credential resets, role assignments, active sessions audit, and force-logout execution.<br/>"
                      "• <b>Self-Service Profile Security (/profile):</b> All accounts can inspect active devices, revoke individual sessions, and update personal security credentials.<br/>"
                      "• <b>Data Privacy Standard:</b> Passwords and hashes are strictly excluded from API outputs. Session tokens are never exposed in administrative queries.", body_style)
        ]
    ]
    policy_table = Table(policy_data, colWidths=[540])
    policy_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#EFF6FF")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#93C5FD")),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(policy_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {filename}")

if __name__ == "__main__":
    build_pdf("credentials.pdf")
