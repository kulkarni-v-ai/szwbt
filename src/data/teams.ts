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

export const TEAMS_DATA: TeamItem[] = [];
