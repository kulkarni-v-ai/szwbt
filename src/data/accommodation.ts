import { RoomItem } from "./rooms";

export interface HostelDetails {
  id: "SHALMALA" | "VINDHYA";
  name: string;
  code: string;
  targetAudience: string;
  description: string;
  floors: string[];
}

export const HOSTELS_DATA: HostelDetails[] = [
  {
    id: "SHALMALA",
    name: "SHALMALA HOSTEL",
    code: "SHALMALA",
    targetAudience: "All Female & Male Participants, Female Team Managers, Female Medical/Support Staff",
    description: "Main Athlete Hostel Complex. Configured with 5-bed room layout.",
    floors: ["GROUND FLOOR", "FLOOR 01", "FLOOR 02"],
  },
  {
    id: "VINDHYA",
    name: "VINDHYA BOYS HOSTEL",
    code: "VINDHYA",
    targetAudience: "Male Team Managers, Male Medical & Support Staff",
    description: "Officials & Managers Hostel Block. Configured with 5-bed room layout.",
    floors: ["GROUND FLOOR", "FLOOR 01"],
  },
];

export const INITIAL_ROOMS_DATA: RoomItem[] = [
  // SHALMALA HOSTEL ROOMS
  {
    id: "room-s101",
    roomNumber: "S-101",
    hostelId: "SHALMALA",
    floor: "GROUND FLOOR",
    capacity: 5,
    beds: [
      { id: "b-s101-1", bedNumber: "BED 01", roomId: "room-s101", status: "AVAILABLE" },
      { id: "b-s101-2", bedNumber: "BED 02", roomId: "room-s101", status: "AVAILABLE" },
      { id: "b-s101-3", bedNumber: "BED 03", roomId: "room-s101", status: "AVAILABLE" },
      { id: "b-s101-4", bedNumber: "BED 04", roomId: "room-s101", status: "AVAILABLE" },
      { id: "b-s101-5", bedNumber: "BED 05", roomId: "room-s101", status: "AVAILABLE" },
    ],
  },
  {
    id: "room-s102",
    roomNumber: "S-102",
    hostelId: "SHALMALA",
    floor: "GROUND FLOOR",
    capacity: 5,
    beds: [
      { id: "b-s102-1", bedNumber: "BED 01", roomId: "room-s102", status: "AVAILABLE" },
      { id: "b-s102-2", bedNumber: "BED 02", roomId: "room-s102", status: "AVAILABLE" },
      { id: "b-s102-3", bedNumber: "BED 03", roomId: "room-s102", status: "AVAILABLE" },
      { id: "b-s102-4", bedNumber: "BED 04", roomId: "room-s102", status: "AVAILABLE" },
      { id: "b-s102-5", bedNumber: "BED 05", roomId: "room-s102", status: "AVAILABLE" },
    ],
  },
  {
    id: "room-s201",
    roomNumber: "S-201",
    hostelId: "SHALMALA",
    floor: "FLOOR 01",
    capacity: 5,
    beds: [
      { id: "b-s201-1", bedNumber: "BED 01", roomId: "room-s201", status: "AVAILABLE" },
      { id: "b-s201-2", bedNumber: "BED 02", roomId: "room-s201", status: "AVAILABLE" },
      { id: "b-s201-3", bedNumber: "BED 03", roomId: "room-s201", status: "AVAILABLE" },
      { id: "b-s201-4", bedNumber: "BED 04", roomId: "room-s201", status: "AVAILABLE" },
      { id: "b-s201-5", bedNumber: "BED 05", roomId: "room-s201", status: "AVAILABLE" },
    ],
  },

  // VINDHYA BOYS HOSTEL ROOMS
  {
    id: "room-v101",
    roomNumber: "V-101",
    hostelId: "VINDHYA",
    floor: "GROUND FLOOR",
    capacity: 5,
    beds: [
      { id: "b-v101-1", bedNumber: "BED 01", roomId: "room-v101", status: "AVAILABLE" },
      { id: "b-v101-2", bedNumber: "BED 02", roomId: "room-v101", status: "AVAILABLE" },
      { id: "b-v101-3", bedNumber: "BED 03", roomId: "room-v101", status: "AVAILABLE" },
      { id: "b-v101-4", bedNumber: "BED 04", roomId: "room-v101", status: "AVAILABLE" },
      { id: "b-v101-5", bedNumber: "BED 05", roomId: "room-v101", status: "AVAILABLE" },
    ],
  },
  {
    id: "room-v102",
    roomNumber: "V-102",
    hostelId: "VINDHYA",
    floor: "GROUND FLOOR",
    capacity: 5,
    beds: [
      { id: "b-v102-1", bedNumber: "BED 01", roomId: "room-v102", status: "AVAILABLE" },
      { id: "b-v102-2", bedNumber: "BED 02", roomId: "room-v102", status: "AVAILABLE" },
      { id: "b-v102-3", bedNumber: "BED 03", roomId: "room-v102", status: "AVAILABLE" },
      { id: "b-v102-4", bedNumber: "BED 04", roomId: "room-v102", status: "AVAILABLE" },
      { id: "b-v102-5", bedNumber: "BED 05", roomId: "room-v102", status: "AVAILABLE" },
    ],
  },
];

export interface AllocationHistoryItem {
  id: string;
  personName: string;
  hostelName: string;
  roomNumber: string;
  bedNumber: string;
  action: "ALLOCATED" | "MOVED" | "VACATED";
  timestamp: string;
  operator: string;
}

export const INITIAL_ALLOCATION_HISTORY: AllocationHistoryItem[] = [];
