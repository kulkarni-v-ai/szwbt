export interface BedItem {
  id: string;
  bedNumber: "BED 01" | "BED 02" | "BED 03" | "BED 04" | "BED 05";
  roomId: string;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
  occupant?: {
    id: string;
    name: string;
    role: string;
    team: string;
    institution: string;
    gender: "FEMALE" | "MALE";
  };
}
