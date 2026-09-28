import { BedItem } from "./beds";

export interface RoomItem {
  id: string;
  roomNumber: string;
  hostelId: "SHALMALA" | "VINDHYA";
  floor: "GROUND FLOOR" | "FLOOR 01" | "FLOOR 02";
  capacity: 5; // EXACTLY 5 BEDS PER ROOM
  beds: BedItem[];
}
