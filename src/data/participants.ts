export interface Participant {
  id: string;
  playerId: string;
  name: string;
  email: string;
  phone: string;
  gender: "FEMALE" | "MALE";
  institution: string;
  state: string;
  category: string;
  seed: string;
  status: "APPROVED" | "PENDING" | "UNDER REVIEW" | "REJECTED";
  qrCode: string;
  hostelEligible: "SHALMALA" | "VINDHYA";
  allocatedBedId?: string;
}

export const PARTICIPANTS_DATA: Participant[] = [
  { id: "p1", playerId: "SZ-2026-001", name: "Ananya Sharma", email: "ananya.sharma@institution.edu", phone: "+91 98765 43210", gender: "FEMALE", institution: "Karnataka State University", state: "KARNATAKA", category: "WS-U19", seed: "SEED 01", status: "APPROVED", qrCode: "QR-SZ2026-001", hostelEligible: "SHALMALA" },
  { id: "p2", playerId: "SZ-2026-002", name: "Priya Nair", email: "priya.nair@institution.edu", phone: "+91 98765 43211", gender: "FEMALE", institution: "Kerala Sports Academy", state: "KERALA", category: "WS-U19", seed: "SEED 04", status: "APPROVED", qrCode: "QR-SZ2026-002", hostelEligible: "SHALMALA" },
  { id: "p3", playerId: "SZ-2026-003", name: "Kavya Sundaram", email: "kavya.s@institution.edu", phone: "+91 98765 43212", gender: "FEMALE", institution: "Tamil Nadu Badminton Institute", state: "TAMIL NADU", category: "WS-U19", seed: "SEED 02", status: "APPROVED", qrCode: "QR-SZ2026-003", hostelEligible: "SHALMALA" },
  { id: "p4", playerId: "SZ-2026-004", name: "Riya Reddy", email: "riya.reddy@institution.edu", phone: "+91 98765 43213", gender: "FEMALE", institution: "Telangana Sports College", state: "TELANGANA", category: "WS-U19", seed: "UNSEEDED", status: "UNDER REVIEW", qrCode: "QR-SZ2026-004", hostelEligible: "SHALMALA" },
  { id: "p5", playerId: "SZ-2026-005", name: "Rajesh Kumar", email: "rajesh.manager@institution.edu", phone: "+91 98765 43214", gender: "MALE", institution: "Karnataka State University", state: "KARNATAKA", category: "TEAM MANAGER", seed: "OFFICIAL", status: "APPROVED", qrCode: "QR-SZ2026-005", hostelEligible: "VINDHYA" },
  { id: "p6", playerId: "SZ-2026-006", name: "Dr. Sunita Rao", email: "sunita.medical@institution.edu", phone: "+91 98765 43215", gender: "FEMALE", institution: "Kerala Sports Academy", state: "KERALA", category: "MEDICAL STAFF", seed: "SUPPORT", status: "APPROVED", qrCode: "QR-SZ2026-006", hostelEligible: "SHALMALA" },
];
