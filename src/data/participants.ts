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
  allocatedRoomNumber?: string;
  documentsStatus?: "3/3 VERIFIED" | "2/3 VERIFIED" | "PENDING" | "REJECTED";
  feeStatus?: "PAID" | "PENDING" | "EXEMPT";
  feeAmount?: number;
  paymentMethod?: "CASH" | "UPI";
  paymentUtr?: string;
  registeredAt?: string;
  deskOperator?: string;
}

export const PARTICIPANTS_DATA: Participant[] = [];
