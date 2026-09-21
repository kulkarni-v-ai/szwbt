export interface TeamMemberInvitation {
  id: string;
  email: string;
  name: string;
  role: "CAPTAIN" | "MEMBER" | "RESERVE";
  status: "INVITED" | "EMAIL_UNVERIFIED" | "EMAIL_VERIFIED" | "ACCEPTED" | "DECLINED" | "REMOVED";
  invitedAt: string;
}

export interface TeamItem {
  id: string;
  name: string;
  institution: string;
  state: string;
  managerName: string;
  managerEmail: string;
  managerPhone: string;
  captainName: string;
  captainEmail: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER REVIEW" | "APPROVED" | "REJECTED";
  members: TeamMemberInvitation[];
}

export const TEAMS_DATA: TeamItem[] = [
  {
    id: "t1",
    name: "KARNATAKA TITANS",
    institution: "Karnataka State University",
    state: "KARNATAKA",
    managerName: "Rajesh Kumar",
    managerEmail: "rajesh.manager@institution.edu",
    managerPhone: "+91 98765 43214",
    captainName: "Ananya Sharma",
    captainEmail: "ananya.sharma@institution.edu",
    status: "APPROVED",
    members: [
      { id: "tm-1", email: "ananya.sharma@institution.edu", name: "Ananya Sharma", role: "CAPTAIN", status: "ACCEPTED", invitedAt: "2026-09-20" },
      { id: "tm-2", email: "priya.nair@institution.edu", name: "Priya Nair", role: "MEMBER", status: "ACCEPTED", invitedAt: "2026-09-20" },
      { id: "tm-3", email: "divya.k@institution.edu", name: "Divya K", role: "MEMBER", status: "INVITED", invitedAt: "2026-09-21" },
    ],
  },
  {
    id: "t2",
    name: "KERALA STRIKERS",
    institution: "Kerala Sports Academy",
    state: "KERALA",
    managerName: "Suresh Menon",
    managerEmail: "suresh.m@institution.edu",
    managerPhone: "+91 98765 00011",
    captainName: "Kavya Sundaram",
    captainEmail: "kavya.s@institution.edu",
    status: "UNDER REVIEW",
    members: [
      { id: "tm-4", email: "kavya.s@institution.edu", name: "Kavya Sundaram", role: "CAPTAIN", status: "ACCEPTED", invitedAt: "2026-09-21" },
    ],
  },
];
