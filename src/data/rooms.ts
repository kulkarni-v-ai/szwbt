import { BedItem } from "./beds";

export interface RoomItem {
  id: string;
  roomNumber: string;
  hostelId: "SHALMALA" | "VINDHYA";
  floor: "GROUND FLOOR" | "FLOOR 01" | "FLOOR 02";
  capacity: 4; // ALWAYS 4 BEDS
  beds: BedItem[];
}
