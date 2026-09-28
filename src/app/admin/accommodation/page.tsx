"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { useAuth } from "@/lib/rbac/useAuth";
import { HostelSelector } from "@/components/accommodation/HostelSelector";
import { RoomCard, RoomData } from "@/components/accommodation/RoomCard";
import { BedData } from "@/components/accommodation/BedCard";
import { AllocationDrawer } from "@/components/accommodation/AllocationDrawer";
import { PersonSearchItem } from "@/components/accommodation/PersonSearch";
import { FoodPackageSection } from "@/components/accommodation/FoodPackageSection";
import {
  Home, Key, QrCode, Search, Users, UserCheck, AlertTriangle,
  CreditCard, History, RefreshCw, X, CheckCircle2, MoveRight,
  UserMinus, Camera, Upload, ShieldAlert, ArrowRight, ShieldCheck,
  Building2, Layers, DollarSign, Filter, Sparkles, Loader2, Utensils
} from "lucide-react";

interface TeamResolvedData {
  id: string;
  teamName: string;
  teamCode: string;
  institution: string;
  state: string;
  managerName?: string;
  managerPhone?: string;
  captainName?: string;
  totalMembers: number;
  allocatedMembers: number;
  status: "NOT_STARTED" | "PARTIALLY_ALLOCATED" | "FULLY_ALLOCATED";
  members: {
    id: string;
    name: string;
    playerId?: string;
    gender: string;
    role: string;
    hostelEligible: "SHALMALA" | "VINDHYA";
    isAllocated: boolean;
    allocation?: {
      hostelName: string;
      roomNumber: string;
      bedNumber: string;
    } | null;
  }[];
}

interface PaymentRecord {
  id: string;
  date: string;
  category: string;
  method: "CASH" | "UPI";
  amount: number;
  utr?: string;
  operator: string;
  status: string;
  participantName?: string;
  teamName?: string;
}

interface HistoryRecord {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  resourceId: string;
  details: {
    personName?: string;
    teamName?: string;
    hostelName?: string;
    roomNumber?: string;
    bedNumber?: string;
    oldBedNumber?: string;
    method?: string;
    amount?: number;
    utr?: string;
  };
}

function AccommodationAdminContent() {
  const currentRole = ROLE_MATRIX.find((r) => r.roleId === "accommodation_admin")!;
  const { user, hasPermission } = useAuth();
  const searchParams = useSearchParams();

  // ─────────────────────────────────────────────────────────────
  // 1. DYNAMIC KPIS & OVERVIEW STATE (ZERO FAKE DATA)
  // ─────────────────────────────────────────────────────────────
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [kpis, setKpis] = useState<{
    totalPeople: number | null;
    allocatedCount: number | null;
    unallocatedCount: number | null;
    totalBeds: number | null;
    availableBeds: number | null;
    occupiedBeds: number | null;
    shalmalaOccupancy: number | null;
    vindhyaOccupancy: number | null;
    shalmalaStats: { total: number; occupied: number; available: number };
    vindhyaStats: { total: number; occupied: number; available: number };
  }>({
    totalPeople: null,
    allocatedCount: null,
    unallocatedCount: null,
    totalBeds: null,
    availableBeds: null,
    occupiedBeds: null,
    shalmalaOccupancy: null,
    vindhyaOccupancy: null,
    shalmalaStats: { total: 0, occupied: 0, available: 0 },
    vindhyaStats: { total: 0, occupied: 0, available: 0 },
  });

  // ─────────────────────────────────────────────────────────────
  // 2. ROOM GRID & HOSTEL FILTER STATE
  // ─────────────────────────────────────────────────────────────
  const [dynamicHostels, setDynamicHostels] = useState<any[]>([]);
  const [selectedHostelId, setSelectedHostelId] = useState<string>("SHALMALA");
  const [selectedFloor, setSelectedFloor] = useState<string>("ALL");
  const [roomFilterStatus, setRoomFilterStatus] = useState<"ALL" | "AVAILABLE" | "FULL">("ALL");
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [availableFloors, setAvailableFloors] = useState<string[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  // ─────────────────────────────────────────────────────────────
  // 3. TOAST & NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "conflict" | "info" } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "conflict" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // ─────────────────────────────────────────────────────────────
  // 4. ACTION MODALS & DRAWERS
  // ─────────────────────────────────────────────────────────────
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isFindPersonOpen, setIsFindPersonOpen] = useState(false);
  const [isFindTeamOpen, setIsFindTeamOpen] = useState(false);
  const [isUnallocatedOpen, setIsUnallocatedOpen] = useState(false);
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Active allocation drawer
  const [allocatingBedState, setAllocatingBedState] = useState<{
    bed: BedData;
    room: RoomData;
    preSelectedPerson?: PersonSearchItem | null;
  } | null>(null);
  const [isAllocatingSubmitting, setIsAllocatingSubmitting] = useState(false);

  // Move person modal
  const [moveState, setMoveState] = useState<{
    bed: BedData;
    room: RoomData;
  } | null>(null);
  const [moveTargetRoomId, setMoveTargetRoomId] = useState<string>("");
  const [moveTargetBedId, setMoveTargetBedId] = useState<string>("");
  const [isMoveSubmitting, setIsMoveSubmitting] = useState(false);

  // Vacate bed confirmation modal
  const [vacateState, setVacateState] = useState<{
    bed: BedData;
    room: RoomData;
  } | null>(null);
  const [isVacateSubmitting, setIsVacateSubmitting] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // 5. QR CODE SCANNER & TEAM DOSSIER STATE
  // ─────────────────────────────────────────────────────────────
  const [qrTokenInput, setQrTokenInput] = useState<string>("");
  const [isResolvingQr, setIsResolvingQr] = useState(false);
  const [resolvedTeam, setResolvedTeam] = useState<TeamResolvedData | null>(null);
  const [activeFoodParticipant, setActiveFoodParticipant] = useState<{
    id: string;
    name: string;
    institution?: string;
    roomInfo?: string;
  } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // ─────────────────────────────────────────────────────────────
  // 6. SEARCH & UNALLOCATED DRAWER DATA
  // ─────────────────────────────────────────────────────────────
  const [personQuery, setPersonQuery] = useState("");
  const [personResults, setPersonResults] = useState<PersonSearchItem[]>([]);
  const [loadingPersonSearch, setLoadingPersonSearch] = useState(false);

  const [teamQuery, setTeamQuery] = useState("");
  const [teamResults, setTeamResults] = useState<any[]>([]);
  const [loadingTeamSearch, setLoadingTeamSearch] = useState(false);

  const [unallocatedPeople, setUnallocatedPeople] = useState<PersonSearchItem[]>([]);
  const [loadingUnallocated, setLoadingUnallocated] = useState(false);
  const [unallocatedFilter, setUnallocatedFilter] = useState<"ALL" | "SHALMALA" | "VINDHYA">("ALL");

  // ─────────────────────────────────────────────────────────────
  // 7. SEPARATE ACCOMMODATION PAYMENTS LEDGER
  // ─────────────────────────────────────────────────────────────
  const accommodationFee = 3000; // ₹3,000 per person
  const [paymentEntityType, setPaymentEntityType] = useState<"TEAM" | "PARTICIPANT">("TEAM");
  const [paymentEntityId, setPaymentEntityId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<number>(3000);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI">("CASH");
  const [paymentUtr, setPaymentUtr] = useState<string>("");
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // 8. ALLOCATION & AUDIT HISTORY
  // ─────────────────────────────────────────────────────────────
  const [auditHistory, setAuditHistory] = useState<HistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilterAction, setHistoryFilterAction] = useState<string>("ALL");

  // ─────────────────────────────────────────────────────────────
  // FETCH KPIS & OVERVIEW
  // ─────────────────────────────────────────────────────────────
  const fetchOverviewKpis = async () => {
    setLoadingKpis(true);
    try {
      const res = await fetch("/api/accommodation/overview");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.kpis) {
          setKpis({
            totalPeople: data.kpis.totalPeople,
            allocatedCount: data.kpis.allocatedCount,
            unallocatedCount: data.kpis.unallocatedCount,
            totalBeds: data.kpis.totalBeds,
            availableBeds: data.kpis.availableBeds,
            occupiedBeds: data.kpis.occupiedBeds,
            shalmalaOccupancy: data.kpis.shalmalaOccupancy,
            vindhyaOccupancy: data.kpis.vindhyaOccupancy,
            shalmalaStats: data.kpis.shalmalaStats || { total: 0, occupied: 0, available: 0 },
            vindhyaStats: data.kpis.vindhyaStats || { total: 0, occupied: 0, available: 0 },
          });

          if (Array.isArray(data.hostels) && data.hostels.length > 0) {
            setDynamicHostels(data.hostels);
            // Default to first active hostel if selectedHostelId not yet set or not in list
            if (!data.hostels.some((h: any) => h.id === selectedHostelId || h.code === selectedHostelId)) {
              setSelectedHostelId(data.hostels[0].id);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to load accommodation overview:", err);
    } finally {
      setLoadingKpis(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // FETCH ROOMS (EXACTLY 5 BEDS PER ROOM)
  // ─────────────────────────────────────────────────────────────
  const fetchRooms = async (hostelId = selectedHostelId, floor = selectedFloor) => {
    setLoadingRooms(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set("hostelId", hostelId);
      if (floor !== "ALL") {
        queryParams.set("floor", floor);
      }
      const res = await fetch(`/api/accommodation/rooms?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.rooms)) {
          setRooms(data.rooms);

          // Extract distinct floors
          const distinctFloors = Array.from(
            new Set(data.rooms.map((r: RoomData) => r.floorNumber))
          ) as string[];
          if (floor === "ALL") {
            setAvailableFloors(distinctFloors);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load rooms:", err);
    } finally {
      setLoadingRooms(false);
    }
  };

  // Initial Data Load
  useEffect(() => {
    fetchOverviewKpis();
    fetchRooms("SHALMALA", "ALL");
  }, []);

  // Check URL query param for teamQr passed from /register desk
  useEffect(() => {
    const qrFromUrl = searchParams?.get("teamQr");
    if (qrFromUrl) {
      setQrTokenInput(qrFromUrl);
      resolveTeamQr(qrFromUrl);
    }
  }, [searchParams]);

  // When hostel or floor changes, refetch rooms
  useEffect(() => {
    fetchRooms(selectedHostelId, selectedFloor);
  }, [selectedHostelId, selectedFloor]);

  // ─────────────────────────────────────────────────────────────
  // QR RESOLVE WORKFLOW (SECURE OPAQUE TOKEN)
  // ─────────────────────────────────────────────────────────────
  const resolveTeamQr = async (token: string) => {
    if (!token.trim()) {
      showToast("Please enter or scan a valid Team QR token", "error");
      return;
    }

    setIsResolvingQr(true);
    try {
      const res = await fetch("/api/accommodation/qr/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrToken: token.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success && (data.team || data.participant)) {
        if (data.participant) {
          showToast(`PARTICIPANT IDENTIFIED: ${data.participant.name}`, "success");
          if (data.participant.isAllocated) {
            setActiveFoodParticipant({
              id: data.participant.participantId,
              name: data.participant.name,
              institution: data.participant.institution,
              roomInfo: `Hostel ${data.participant.eligibleHostelName || ""} • Room ${data.participant.allocation?.roomNumber} • Bed ${data.participant.allocation?.bedNumber}`,
            });
          }
        } else {
          showToast(`TEAM IDENTIFIED: ${data.team.teamName}`, "success");
        }
        setResolvedTeam(data.team);
        setIsQrScannerOpen(false);
        stopCamera();
      } else {
        showToast(data.error || "Invalid or unresolvable QR token", "error");
      }
    } catch (err: any) {
      showToast("Network error while resolving Team QR", "error");
    } finally {
      setIsResolvingQr(false);
    }
  };

  // Camera handling for QR Scanner
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access failed:", err);
      showToast("Camera access unavailable. Use manual token entry or file upload.", "info");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (isQrScannerOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isQrScannerOpen]);

  // File Upload fallback for QR image
  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate scanning from image name / token
    const tokenFromName = file.name.replace(/\.[^/.]+$/, "").toUpperCase();
    setQrTokenInput(tokenFromName);
    resolveTeamQr(tokenFromName);
  };

  // ─────────────────────────────────────────────────────────────
  // ALLOCATION CONFIRMATION WITH CONCURRENCY 409 PROTECTION
  // ─────────────────────────────────────────────────────────────
  const handleConfirmAllocation = async (
    person: PersonSearchItem,
    bed: BedData,
    room: RoomData
  ) => {
    setIsAllocatingSubmitting(true);
    try {
      const res = await fetch("/api/accommodation/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedId: bed.id,
          participantId: person.id,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // Concurrency conflict handled explicitly!
        showToast(
          "BED NO LONGER AVAILABLE. Another accommodation operator has allocated this bed. Please select another bed.",
          "conflict"
        );
        fetchRooms();
        fetchOverviewKpis();
        setAllocatingBedState(null);
        return;
      }

      if (res.ok && data.success) {
        showToast(`ALLOCATION CONFIRMED: Room ${room.roomNumber} • ${bed.bedNumber}`, "success");
        setAllocatingBedState(null);
        fetchRooms();
        fetchOverviewKpis();

        // Immediately display the Food Package Section for this participant
        setActiveFoodParticipant({
          id: person.id,
          name: person.name,
          institution: person.teamName || person.institution,
          roomInfo: `Room ${room.roomNumber} / ${bed.bedNumber}`,
        });

        // If a team is loaded, update its members state
        if (resolvedTeam) {
          resolveTeamQr(resolvedTeam.teamCode || qrTokenInput);
        }
      } else {
        showToast(data.error || "Failed to allocate bed", "error");
      }
    } catch (err: any) {
      showToast("Network error during bed allocation", "error");
    } finally {
      setIsAllocatingSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // MOVE PERSON BETWEEN ROOMS/BEDS
  // ─────────────────────────────────────────────────────────────
  const handleConfirmMove = async () => {
    if (!moveState || !moveTargetBedId) {
      showToast("Please select a target available bed", "error");
      return;
    }

    setIsMoveSubmitting(true);
    try {
      const res = await fetch("/api/accommodation/allocations/move", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentBedId: moveState.bed.id,
          newBedId: moveTargetBedId,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        showToast(
          "DESTINATION BED OCCUPIED. Another operator allocated that bed. Please select another.",
          "conflict"
        );
        fetchRooms();
        return;
      }

      if (res.ok && data.success) {
        showToast("PERSON MOVED SUCCESSFULLY TO NEW BED", "success");
        setMoveState(null);
        setMoveTargetBedId("");
        setMoveTargetRoomId("");
        fetchRooms();
        fetchOverviewKpis();
      } else {
        showToast(data.error || "Move failed", "error");
      }
    } catch (err) {
      showToast("Network error during bed transfer", "error");
    } finally {
      setIsMoveSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // VACATE BED
  // ─────────────────────────────────────────────────────────────
  const handleConfirmVacate = async () => {
    if (!vacateState) return;

    setIsVacateSubmitting(true);
    try {
      const res = await fetch("/api/accommodation/allocations/vacate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedId: vacateState.bed.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`BED ${vacateState.bed.bedNumber} VACATED AND RELEASED`, "success");
        setVacateState(null);
        fetchRooms();
        fetchOverviewKpis();

        if (resolvedTeam) {
          resolveTeamQr(resolvedTeam.teamCode || qrTokenInput);
        }
      } else {
        showToast(data.error || "Failed to vacate bed", "error");
      }
    } catch (err) {
      showToast("Network error during bed release", "error");
    } finally {
      setIsVacateSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SEARCH PERSON DRAWER
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isFindPersonOpen) return;
    const timer = setTimeout(async () => {
      setLoadingPersonSearch(true);
      try {
        const res = await fetch(`/api/accommodation/people/search?q=${encodeURIComponent(personQuery)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.people)) {
            setPersonResults(data.people);
          }
        }
      } catch (err) {
        console.error("Person search error:", err);
      } finally {
        setLoadingPersonSearch(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [personQuery, isFindPersonOpen]);

  // ─────────────────────────────────────────────────────────────
  // SEARCH TEAM DRAWER
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isFindTeamOpen) return;
    const timer = setTimeout(async () => {
      setLoadingTeamSearch(true);
      try {
        const res = await fetch(`/api/accommodation/teams/search?q=${encodeURIComponent(teamQuery)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.teams)) {
            setTeamResults(data.teams);
          }
        }
      } catch (err) {
        console.error("Team search error:", err);
      } finally {
        setLoadingTeamSearch(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [teamQuery, isFindTeamOpen]);

  // ─────────────────────────────────────────────────────────────
  // UNALLOCATED PEOPLE DRAWER
  // ─────────────────────────────────────────────────────────────
  const fetchUnallocatedPeople = async () => {
    setLoadingUnallocated(true);
    try {
      const res = await fetch("/api/accommodation/unallocated");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.unallocated)) {
          setUnallocatedPeople(data.unallocated);
        }
      }
    } catch (err) {
      console.error("Failed to load unallocated:", err);
    } finally {
      setLoadingUnallocated(false);
    }
  };

  useEffect(() => {
    if (isUnallocatedOpen) {
      fetchUnallocatedPeople();
    }
  }, [isUnallocatedOpen]);

  // ─────────────────────────────────────────────────────────────
  // ACCOMMODATION PAYMENTS LEDGER
  // ─────────────────────────────────────────────────────────────
  const fetchPayments = async () => {
    setLoadingPayments(true);
    try {
      const res = await fetch("/api/accommodation/payments");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.payments)) {
          setPaymentHistory(data.payments);
        }
      }
    } catch (err) {
      console.error("Failed to load accommodation payments:", err);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    if (isPaymentsOpen) {
      fetchPayments();
    }
  }, [isPaymentsOpen]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod === "UPI" && !paymentUtr.trim()) {
      showToast("UPI Transaction Reference (UTR) is strictly required", "error");
      return;
    }

    setIsRecordingPayment(true);
    try {
      const payload: any = {
        amount: paymentAmount,
        method: paymentMethod,
        entityType: paymentEntityType,
        entityId: paymentEntityId.trim() || (resolvedTeam ? resolvedTeam.id : undefined),
      };
      if (paymentMethod === "UPI") {
        payload.utr = paymentUtr.trim();
      }

      const res = await fetch("/api/accommodation/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("ACCOMMODATION PAYMENT RECORDED SUCCESSFULLY", "success");
        setPaymentUtr("");
        fetchPayments();
      } else {
        showToast(data.error || "Failed to record payment", "error");
      }
    } catch (err) {
      showToast("Network error recording payment", "error");
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // AUDIT & ALLOCATION HISTORY
  // ─────────────────────────────────────────────────────────────
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/accommodation/history");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.history)) {
          setAuditHistory(data.history);
        }
      }
    } catch (err) {
      console.error("Failed to load accommodation history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isHistoryOpen) {
      fetchHistory();
    }
  }, [isHistoryOpen]);

  // Filtered rooms based on status
  const displayedRooms = rooms.filter((r) => {
    if (roomFilterStatus === "AVAILABLE") return r.availableCount > 0;
    if (roomFilterStatus === "FULL") return r.isFull;
    return true;
  });

  const currentHostel = dynamicHostels.find((h) => h.id === selectedHostelId || h.code === selectedHostelId);
  const hostelName = currentHostel?.name || (selectedHostelId === "SHALMALA" ? "Shalmala Hostel" : "Vindhya Boys Hostel");

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="space-y-6 pb-24 md:pb-12 text-slate-900">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TOAST NOTIFICATION BANNER */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 p-4 border rounded-xl shadow-lg max-w-md animate-in slide-in-from-top duration-200 flex items-start gap-3 select-none ${
              toast.type === "success"
                ? "bg-white border-emerald-300 text-emerald-800"
                : toast.type === "conflict"
                ? "bg-white border-amber-300 text-amber-800"
                : toast.type === "error"
                ? "bg-white border-rose-300 text-rose-800"
                : "bg-white border-orange-300 text-orange-800"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />}
            {toast.type === "conflict" && <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />}
            {toast.type === "error" && <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />}
            {toast.type === "info" && <Sparkles className="w-5 h-5 shrink-0 text-orange-600 mt-0.5" />}
            <div className="flex-1 font-pixel text-xs leading-relaxed">
              <span className="font-bold uppercase tracking-wider block mb-1">
                {toast.type === "conflict" ? "CONCURRENCY DEFENSE" : toast.type.toUpperCase()}
              </span>
              <p className="font-sans text-xs">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 1. GLOBAL HEADER & STAFF DOSSIER */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="font-pixel text-[9px] text-[#FF5A16] tracking-widest uppercase mb-1 font-bold">
              SOUTH ZONE WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026
            </div>
            <h1 className="font-pixel text-xl sm:text-2xl text-slate-900 font-bold tracking-tight">
              ACCOMMODATION <span className="text-[#FF5A16]">OPERATIONS</span>
            </h1>
            <p className="font-sans text-xs text-slate-500 mt-0.5">
              HOSTEL RESIDENTIAL &amp; BED ALLOCATION CONTROL DESK
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            {/* Authenticated Staff Dossier Badge */}
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-600 flex items-center gap-3 shadow-2xs">
              <div>
                <span className="text-[#FF5A16] font-pixel text-[9px] font-bold">STAFF:</span>{" "}
                <span className="text-slate-900 font-semibold">
                  {user?.name || "Hostel Logistics Officer"}
                </span>
              </div>
              <span className="text-slate-300">|</span>
              <div>
                <span className="text-slate-500 font-pixel text-[9px]">ROLE:</span>{" "}
                <span className="text-slate-800 font-medium">ACCOMMODATION STAFF</span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5 text-emerald-600 font-pixel text-[9px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>ONLINE</span>
              </div>
            </div>

            {/* Quick Refresh Button */}
            <button
              onClick={() => {
                fetchOverviewKpis();
                fetchRooms();
                showToast("Refreshed hostel and room state", "info");
              }}
              className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg font-pixel text-xs cursor-pointer shadow-xs transition-colors"
              title="Refresh Room Occupancy"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* PRIMARY ACTION: [ SCAN QR ] */}
            <button
              id="btn-scan-qr"
              onClick={() => setIsQrScannerOpen(true)}
              className="px-5 py-2.5 bg-[#FF5A16] hover:bg-[#d94e16] text-white font-pixel text-xs sm:text-sm font-bold tracking-wider flex items-center gap-2 transition-all shadow-xs rounded-lg cursor-pointer border border-orange-600"
            >
              <QrCode className="w-4 h-4" />
              <span>SCAN QR</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 2. SECONDARY OPERATIONS ACTION BAR */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl shadow-xs font-pixel text-[10px]">
          <button
            id="btn-find-participant"
            onClick={() => setIsFindPersonOpen(true)}
            className="px-3 py-1.5 bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-orange-600 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span>FIND PARTICIPANT</span>
          </button>

          <button
            onClick={() => setIsFindTeamOpen(true)}
            className="px-3 py-1.5 bg-slate-50 hover:bg-orange-50 text-slate-700 hover:text-orange-600 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>FIND TEAM</span>
          </button>

          <button
            onClick={() => setIsUnallocatedOpen(true)}
            className="px-3 py-1.5 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-700 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
          >
            <UserMinus className="w-3.5 h-3.5 text-amber-500" />
            <span>VIEW UNALLOCATED</span>
          </button>

          <button
            onClick={() => setIsPaymentsOpen(true)}
            className="px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
            <span>PAYMENTS LEDGER</span>
          </button>

          <button
            onClick={() => setIsHistoryOpen(true)}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs ml-auto transition-colors"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>AUDIT HISTORY</span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 3. DYNAMIC KPI STRIP (ZERO FAKE DATA • '—' IF UNAVAILABLE) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "TOTAL PEOPLE", value: kpis.totalPeople, color: "text-slate-900" },
            { label: "ALLOCATED", value: kpis.allocatedCount, color: "text-emerald-600" },
            { label: "UNALLOCATED", value: kpis.unallocatedCount, color: "text-[#FF5A16]" },
            { label: "AVAILABLE BEDS", value: kpis.availableBeds, color: "text-blue-600" },
            { label: "OCCUPIED BEDS", value: kpis.occupiedBeds, color: "text-amber-600" },
            {
              label: "SHALMALA OCCUPANCY",
              value: kpis.shalmalaOccupancy !== null ? `${kpis.shalmalaOccupancy}%` : null,
              color: "text-purple-600",
            },
            {
              label: "VINDHYA OCCUPANCY",
              value: kpis.vindhyaOccupancy !== null ? `${kpis.vindhyaOccupancy}%` : null,
              color: "text-teal-600",
            },
          ].map((kpi, idx) => (
            <div
              key={idx}
              className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <span className="font-pixel text-[9px] text-slate-500 tracking-wider leading-tight uppercase font-medium">
                {kpi.label}
              </span>
              <span className={`font-pixel text-xl sm:text-2xl font-bold mt-2 ${kpi.color}`}>
                {loadingKpis ? "..." : kpi.value !== null && kpi.value !== undefined ? kpi.value : "—"}
              </span>
            </div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 4. ACTIVE TEAM CONTEXT DOSSIER (IF SCANNED/RESOLVED) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {resolvedTeam && (
          <div className="bg-white border-2 border-orange-500 rounded-2xl p-4 sm:p-5 shadow-xs animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-orange-200 pb-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[9px] bg-[#FF5A16] text-white px-2 py-0.5 font-bold uppercase rounded">
                    ACTIVE SCANNED TEAM
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    {resolvedTeam.teamCode}
                  </span>
                </div>
                <h2 className="font-pixel text-lg sm:text-xl text-slate-900 font-bold mt-1">
                  {resolvedTeam.teamName}
                </h2>
                <p className="font-sans text-xs text-slate-500">
                  {resolvedTeam.institution} • {resolvedTeam.state}
                  {resolvedTeam.managerName && ` • Manager: ${resolvedTeam.managerName}`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="font-pixel text-[9px] text-slate-500 block uppercase">
                    ACCOMMODATION PROGRESS
                  </span>
                  <span className="font-pixel text-sm sm:text-base text-emerald-600 font-bold">
                    {resolvedTeam.allocatedMembers} / {resolvedTeam.totalMembers} ALLOCATED
                  </span>
                </div>

                <button
                  onClick={() => setResolvedTeam(null)}
                  className="p-1.5 bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer transition-colors"
                  title="Clear active team"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Team Members Allocation Grid */}
            <div className="space-y-2">
              <span className="font-pixel text-[10px] text-[#FF5A16] uppercase tracking-wider block font-bold">
                TEAM CONTINGENT MEMBERS ({resolvedTeam.members.length})
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {resolvedTeam.members.map((member) => (
                  <div
                    key={member.id}
                    className={`p-3 border rounded-xl flex flex-col justify-between gap-2 shadow-2xs transition-all ${
                      member.isAllocated
                        ? "bg-emerald-50/20 border-emerald-300"
                        : "bg-slate-50 border-slate-200 hover:border-orange-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-pixel text-xs text-slate-900 font-bold">
                          {member.name}
                        </span>
                        <span
                          className={`font-pixel text-[8px] px-2 py-0.5 rounded border ${
                            member.isAllocated
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-amber-100 text-amber-800 border-amber-300"
                          }`}
                        >
                          {member.isAllocated ? "● ALLOCATED" : "○ UNALLOCATED"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mt-1">
                        <span className="text-[#FF5A16] font-semibold">{member.role}</span>
                        <span>•</span>
                        <span>{member.gender}</span>
                        <span>•</span>
                        <span className="text-slate-600">{member.hostelEligible}</span>
                      </div>
                      {member.allocation && (
                        <div className="font-pixel text-[9px] text-emerald-600 mt-1 font-semibold">
                          {member.allocation.hostelName} • ROOM {member.allocation.roomNumber} • BED {member.allocation.bedNumber}
                        </div>
                      )}
                    </div>

                    {member.isAllocated && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFoodParticipant({
                            id: member.id,
                            name: member.name,
                            institution: resolvedTeam.institution,
                            roomInfo: member.allocation ? `${member.allocation.hostelName} • Room ${member.allocation.roomNumber} • Bed ${member.allocation.bedNumber}` : undefined,
                          });
                        }}
                        className="w-full py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-pixel text-[9px] font-bold tracking-wider cursor-pointer shadow-2xs flex items-center justify-center gap-1.5 mt-1 transition-colors"
                      >
                        <Utensils className="w-3 h-3 text-amber-600" />
                        <span>[ MANAGE FOOD PACKAGES ]</span>
                      </button>
                    )}

                    {!member.isAllocated && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHostelId(member.hostelEligible);
                          showToast(
                            `Selected ${member.name} (${member.role}). Please select an available bed in ${member.hostelEligible} Hostel.`,
                            "info"
                          );
                        }}
                        className="w-full py-1.5 px-2 bg-[#FF5A16] hover:bg-[#d94e16] text-white rounded-lg font-pixel text-[9px] font-bold tracking-wider cursor-pointer shadow-xs flex items-center justify-center gap-1 mt-1 transition-colors"
                      >
                        <ArrowRight className="w-3 h-3" />
                        <span>SELECT BED IN {member.hostelEligible}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 4B. ACTIVE FOOD PACKAGE SYSTEM (AFTER ALLOCATION / SELECTION) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeFoodParticipant && (
          <div className="relative animate-in fade-in duration-200">
            <div className="flex justify-end mb-1">
              <button
                type="button"
                onClick={() => setActiveFoodParticipant(null)}
                className="text-xs text-slate-500 hover:text-[#FF5A16] font-pixel flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>CLOSE FOOD PACKAGE VIEW</span>
              </button>
            </div>
            <FoodPackageSection
              participantId={activeFoodParticipant.id}
              participantName={activeFoodParticipant.name}
              institution={activeFoodParticipant.institution}
              roomInfo={activeFoodParticipant.roomInfo}
              onPackageAssigned={() => {
                fetchOverviewKpis();
              }}
            />
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 5. DYNAMIC HOSTEL SELECTOR */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <HostelSelector
          selectedHostelId={selectedHostelId}
          onSelectHostel={(id) => {
            setSelectedHostelId(id);
            setSelectedFloor("ALL");
          }}
          hostels={dynamicHostels}
          shalmalaStats={kpis.shalmalaStats}
          vindhyaStats={kpis.vindhyaStats}
        />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 6. ROOM FILTER & FLOOR SELECTOR CONTROLS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          {/* Floor selector pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-pixel text-[10px] text-slate-500 mr-2 uppercase font-medium">
              SELECT FLOOR:
            </span>
            <button
              onClick={() => setSelectedFloor("ALL")}
              className={`px-3 py-1 font-pixel text-[9px] rounded-lg cursor-pointer transition-colors ${
                selectedFloor === "ALL"
                  ? "bg-[#FF5A16] text-white font-bold shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
              }`}
            >
              ALL FLOORS
            </button>
            {availableFloors.map((floor) => (
              <button
                key={floor}
                onClick={() => setSelectedFloor(floor)}
                className={`px-3 py-1 font-pixel text-[9px] rounded-lg cursor-pointer transition-colors ${
                  selectedFloor === floor
                    ? "bg-[#FF5A16] text-white font-bold shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
                }`}
              >
                {floor.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Occupancy status filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-pixel text-[10px] text-slate-500 mr-1 uppercase font-medium">
              ROOM STATUS:
            </span>
            {(["ALL", "AVAILABLE", "FULL"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setRoomFilterStatus(status)}
                className={`px-2.5 py-1 font-pixel text-[9px] rounded-lg cursor-pointer transition-colors ${
                  roomFilterStatus === status
                    ? "bg-orange-50 text-[#FF5A16] border border-orange-300 font-bold"
                    : "bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* 7. ROOMS GRID (EVERY ROOM HAS EXACTLY 5 BEDS: BED 01 TO BED 05) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#FF5A16]" />
              <h2 className="font-pixel text-base sm:text-lg text-slate-900 font-bold tracking-wider">
                {hostelName.toUpperCase()} — ROOM DIRECTORY ({displayedRooms.length} ROOMS)
              </h2>
            </div>
            <span className="font-pixel text-[10px] text-orange-700 bg-orange-50 border border-orange-200 rounded-md px-2 py-0.5 font-medium">
              REGULATION 5-BED LAYOUT
            </span>
          </div>

          {loadingRooms ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-xs">
              <Loader2 className="w-6 h-6 animate-spin text-[#FF5A16]" />
              <span className="font-pixel text-xs text-slate-500">
                LOADING ROOM CONFIGURATIONS FROM POSTGRESQL...
              </span>
            </div>
          ) : displayedRooms.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl font-pixel text-xs text-slate-500 shadow-xs">
              NO ROOMS FOUND MATCHING FILTER CRITERIA
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {displayedRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  hostelName={hostelName}
                  onAllocateBed={(bed, r) => {
                    setAllocatingBedState({ bed, room: r });
                  }}
                  onMoveBed={(bed, r) => {
                    setMoveState({ bed, room: r });
                  }}
                  onVacateBed={(bed, r) => {
                    setVacateState({ bed, room: r });
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 1: QR SCANNER & TOKEN RESOLUTION */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isQrScannerOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
            <div className="max-w-md w-full bg-white border-2 border-orange-500 rounded-2xl p-5 sm:p-6 shadow-2xl relative text-slate-900">
              <button
                onClick={() => {
                  setIsQrScannerOpen(false);
                  stopCamera();
                }}
                className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 border-b border-orange-200 pb-3 mb-4">
                <QrCode className="w-5 h-5 text-[#FF5A16]" />
                <h3 className="font-pixel text-sm text-slate-900 font-bold">
                  SCAN TEAM REGISTRATION QR
                </h3>
              </div>

              {/* Viewfinder frame */}
              <div className="relative aspect-square w-full bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center mb-4 border border-slate-200">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                />

                {!cameraActive && (
                  <div className="text-center p-4">
                    <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                    <span className="font-pixel text-[10px] text-slate-300 block">
                      CAMERA FEED INACTIVE
                    </span>
                    <span className="font-sans text-[10px] text-slate-400">
                      Scan via live camera or upload a QR image below
                    </span>
                  </div>
                )}

                {/* Arcade crosshair overlay */}
                <div className="absolute inset-4 pointer-events-none border border-orange-400/30 flex flex-col justify-between p-2">
                  <div className="flex justify-between">
                    <div className="w-3 h-3 border-t-2 border-l-2 border-[#FF5A16]" />
                    <div className="w-3 h-3 border-t-2 border-r-2 border-[#FF5A16]" />
                  </div>
                  <div className="w-full h-0.5 bg-[#FF5A16] shadow-[0_0_10px_#FF5A16] animate-pulse" />
                  <div className="flex justify-between">
                    <div className="w-3 h-3 border-b-2 border-l-2 border-[#FF5A16]" />
                    <div className="w-3 h-3 border-b-2 border-r-2 border-[#FF5A16]" />
                  </div>
                </div>
              </div>

              {/* Manual token input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  resolveTeamQr(qrTokenInput);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="font-pixel text-[9px] text-slate-700 uppercase tracking-wider block mb-1 font-bold">
                    ENTER OPAQUE SECURE TOKEN / CODE:
                  </label>
                  <input
                    type="text"
                    value={qrTokenInput}
                    onChange={(e) => setQrTokenInput(e.target.value)}
                    placeholder="e.g. SZBC26-BLR-01 or TEAM-BLR-001"
                    className="w-full bg-slate-50 text-slate-900 border border-slate-300 focus:border-[#FF5A16] px-3 py-2 rounded-lg font-mono text-xs outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isResolvingQr}
                    className="flex-1 py-2.5 bg-[#FF5A16] hover:bg-[#d94e16] text-white font-pixel text-xs font-bold tracking-wider cursor-pointer shadow-xs rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
                  >
                    {isResolvingQr ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>RESOLVING TEAM...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>RESOLVE TEAM</span>
                      </>
                    )}
                  </button>

                  <label className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-pixel text-[10px] cursor-pointer shadow-2xs flex items-center gap-1 transition-colors">
                    <Upload className="w-3 h-3" />
                    <span>UPLOAD</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 2: ALLOCATION DRAWER (WITH REAL DATA & 409 DEFENSE) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {allocatingBedState && (
          <AllocationDrawer
            bed={allocatingBedState.bed}
            room={allocatingBedState.room}
            hostelName={hostelName}
            preSelectedPerson={allocatingBedState.preSelectedPerson}
            onClose={() => setAllocatingBedState(null)}
            onConfirmAllocation={handleConfirmAllocation}
            isSubmitting={isAllocatingSubmitting}
          />
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 3: MOVE PERSON MODAL */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {moveState && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xl relative text-slate-900">
              <button
                onClick={() => setMoveState(null)}
                className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
                <MoveRight className="w-5 h-5 text-[#FF5A16]" />
                <h3 className="font-pixel text-sm text-slate-900 font-bold">
                  TRANSFER PERSON TO NEW BED
                </h3>
              </div>

              {/* Current Occupant Dossier */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 font-sans text-xs space-y-1.5">
                <div className="text-[10px] font-pixel text-slate-500 uppercase font-medium">
                  CURRENT OCCUPANT
                </div>
                <div className="font-pixel text-xs text-slate-900 font-bold">
                  {moveState.bed.occupant?.name}
                </div>
                <div className="text-slate-500 text-[11px]">
                  {moveState.bed.occupant?.role} • {moveState.bed.occupant?.teamName}
                </div>
                <div className="font-pixel text-[10px] text-[#FF5A16] pt-1 font-semibold">
                  CURRENT BED: {hostelName} • ROOM {moveState.room.roomNumber} • {moveState.bed.bedNumber}
                </div>
              </div>

              {/* Target Room / Bed Selector */}
              <div className="space-y-3 font-sans text-xs">
                <div>
                  <label className="font-pixel text-[9px] text-slate-700 uppercase tracking-wider block mb-1 font-bold">
                    SELECT DESTINATION ROOM:
                  </label>
                  <select
                    value={moveTargetRoomId}
                    onChange={(e) => {
                      setMoveTargetRoomId(e.target.value);
                      setMoveTargetBedId("");
                    }}
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg p-2 font-mono text-xs outline-none focus:border-[#FF5A16]"
                  >
                    <option value="">-- Choose Target Room --</option>
                    {rooms
                      .filter((r) => r.availableCount > 0)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          Room {r.roomNumber} ({r.floorNumber}) — {r.availableCount} Available
                        </option>
                      ))}
                  </select>
                </div>

                {moveTargetRoomId && (
                  <div>
                    <label className="font-pixel text-[9px] text-slate-700 uppercase tracking-wider block mb-1 font-bold">
                      SELECT DESTINATION BED:
                    </label>
                    <select
                      value={moveTargetBedId}
                      onChange={(e) => setMoveTargetBedId(e.target.value)}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg p-2 font-mono text-xs outline-none focus:border-[#FF5A16]"
                    >
                      <option value="">-- Choose Available Bed --</option>
                      {rooms
                        .find((r) => r.id === moveTargetRoomId)
                        ?.beds.filter((b) => b.status === "AVAILABLE")
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.bedNumber} (AVAILABLE)
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setMoveState(null)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-pixel text-[10px] transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    disabled={!moveTargetBedId || isMoveSubmitting}
                    onClick={handleConfirmMove}
                    className="px-4 py-2 bg-[#FF5A16] hover:bg-[#d94e16] text-white font-pixel text-xs font-bold tracking-wider cursor-pointer shadow-xs rounded-lg disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                  >
                    {isMoveSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>CONFIRM TRANSFER</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MODAL 4: VACATE BED CONFIRMATION MODAL */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {vacateState && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
            <div className="max-w-md w-full bg-white border-2 border-rose-300 rounded-2xl p-5 sm:p-6 shadow-2xl relative text-slate-900">
              <button
                onClick={() => setVacateState(null)}
                className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 border-b border-rose-200 pb-3 mb-4">
                <UserMinus className="w-5 h-5 text-rose-600" />
                <h3 className="font-pixel text-sm text-slate-900 font-bold">
                  VACATE &amp; RELEASE BED
                </h3>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <p className="text-slate-600">
                  Are you sure you want to vacate this bed? The participant will be unlinked and the bed will immediately return to AVAILABLE state.
                </p>

                <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">OCCUPANT:</span>
                    <span className="font-pixel text-slate-900 font-bold">
                      {vacateState.bed.occupant?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ROOM / BED:</span>
                    <span className="font-mono text-rose-600 font-semibold">
                      ROOM {vacateState.room.roomNumber} • {vacateState.bed.bedNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">HOSTEL:</span>
                    <span className="text-slate-800 font-medium">{hostelName}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setVacateState(null)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-pixel text-[10px] transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    disabled={isVacateSubmitting}
                    onClick={handleConfirmVacate}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-pixel text-xs font-bold tracking-wider cursor-pointer shadow-xs rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                  >
                    {isVacateSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UserMinus className="w-3.5 h-3.5" />
                    )}
                    <span>CONFIRM VACATE</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* DRAWER 1: FIND PERSON */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isFindPersonOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
            <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xl relative max-h-[85vh] flex flex-col text-slate-900">
              <button
                onClick={() => setIsFindPersonOpen(false)}
                className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
                <Search className="w-5 h-5 text-[#FF5A16]" />
                <h3 className="font-pixel text-sm text-slate-900 font-bold">
                  FIND PARTICIPANT / OFFICIAL
                </h3>
              </div>

              <div className="mb-3">
                <input
                  type="text"
                  value={personQuery}
                  onChange={(e) => setPersonQuery(e.target.value)}
                  placeholder="Search by participant name, player ID, team, institution..."
                  className="w-full bg-slate-50 text-slate-900 border border-slate-300 focus:border-[#FF5A16] px-3 py-2 rounded-lg font-sans text-xs outline-none transition-colors"
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
                {loadingPersonSearch ? (
                  <div className="p-8 text-center text-slate-400 font-pixel text-[10px]">
                    SEARCHING POSTGRESQL PARTICIPANTS...
                  </div>
                ) : personResults.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-pixel text-[10px]">
                    NO PARTICIPANTS FOUND MATCHING QUERY
                  </div>
                ) : (
                  personResults.map((person) => (
                    <div
                      key={person.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg hover:border-orange-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-pixel text-xs text-slate-900 font-bold">
                            {person.name}
                          </span>
                          <span className="font-pixel text-[8px] px-2 py-0.5 rounded border bg-orange-50 text-orange-700 border-orange-200 font-medium">
                            {person.role}
                          </span>
                          <span className="font-mono text-[9px] text-slate-500">
                            ({person.gender})
                          </span>
                        </div>
                        <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                          {person.playerId || "REG-ID"} • {person.teamName || person.institution}
                        </p>
                        {person.isAllocated && person.allocation && (
                          <p className="font-pixel text-[9px] text-emerald-600 mt-0.5 font-semibold">
                            {person.allocation.hostelName} • ROOM {person.allocation.roomNumber} • BED {person.allocation.bedNumber}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0">
                        {person.isAllocated ? (
                          <span className="font-pixel text-[9px] text-emerald-700 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded">
                            ALLOCATED
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsFindPersonOpen(false);
                              setSelectedHostelId(person.hostelEligible as any);
                              showToast(`Selected ${person.name}. Please select an available bed.`, "info");
                            }}
                            className="px-3 py-1.5 bg-[#FF5A16] hover:bg-[#d94e16] text-white rounded-lg font-pixel text-[9px] font-bold cursor-pointer shadow-xs transition-colors"
                          >
                            ALLOCATE BED
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* DRAWER 2: FIND TEAM */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isFindTeamOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
            <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xl relative max-h-[85vh] flex flex-col text-slate-900">
              <button
                onClick={() => setIsFindTeamOpen(false)}
                className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
                <Users className="w-5 h-5 text-[#FF5A16]" />
                <h3 className="font-pixel text-sm text-slate-900 font-bold">
                  FIND CONTINGENT TEAM
                </h3>
              </div>

              <div className="mb-3">
                <input
                  type="text"
                  value={teamQuery}
                  onChange={(e) => setTeamQuery(e.target.value)}
                  placeholder="Search by team name, code, institution, state..."
                  className="w-full bg-slate-50 text-slate-900 border border-slate-300 focus:border-[#FF5A16] px-3 py-2 rounded-lg font-sans text-xs outline-none transition-colors"
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
                {loadingTeamSearch ? (
                  <div className="p-8 text-center text-slate-400 font-pixel text-[10px]">
                    SEARCHING REGISTERED TEAMS...
                  </div>
                ) : teamResults.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-pixel text-[10px]">
                    NO TEAMS FOUND MATCHING QUERY
                  </div>
                ) : (
                  teamResults.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg hover:border-orange-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-pixel text-xs text-slate-900 font-bold">
                            {t.name}
                          </span>
                          <span className="font-mono text-[9px] text-slate-500 font-semibold">
                            {t.code}
                          </span>
                        </div>
                        <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                          {t.institution} • {t.state}
                        </p>
                        <p className="font-pixel text-[9px] text-amber-700 mt-1 font-semibold">
                          ALLOCATION: {t.allocatedCount} / {t.totalMembers} ALLOCATED
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsFindTeamOpen(false);
                          resolveTeamQr(t.teamQrToken || t.code);
                        }}
                        className="px-3 py-1.5 bg-[#FF5A16] hover:bg-[#d94e16] text-white rounded-lg font-pixel text-[9px] font-bold cursor-pointer flex items-center gap-1 shadow-xs transition-colors"
                      >
                        <ArrowRight className="w-3 h-3" />
                        <span>OPEN TEAM</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* DRAWER 3: UNALLOCATED PEOPLE */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isUnallocatedOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
            <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xl relative max-h-[85vh] flex flex-col text-slate-900">
              <button
                onClick={() => setIsUnallocatedOpen(false)}
                className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 border-b border-amber-200 pb-3 mb-4">
                <UserMinus className="w-5 h-5 text-amber-600" />
                <h3 className="font-pixel text-sm text-slate-900 font-bold">
                  UNALLOCATED PARTICIPANTS &amp; OFFICIALS ({unallocatedPeople.length})
                </h3>
              </div>

              {/* Filter by gender eligibility */}
              <div className="flex items-center gap-2 mb-3 font-pixel text-[9px]">
                <span className="text-slate-500 font-medium">HOSTEL FILTER:</span>
                {(["ALL", "SHALMALA", "VINDHYA"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setUnallocatedFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                      unallocatedFilter === filter
                        ? "bg-amber-500 text-white border-amber-600 font-bold shadow-xs"
                        : "bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
                {loadingUnallocated ? (
                  <div className="p-8 text-center text-slate-400 font-pixel text-[10px]">
                    LOADING UNALLOCATED ATHLETES...
                  </div>
                ) : unallocatedPeople.length === 0 ? (
                  <div className="p-8 text-center text-emerald-700 font-pixel text-[10px] font-semibold">
                    ★ ALL PARTICIPANTS ARE CURRENTLY ALLOCATED TO BEDS!
                  </div>
                ) : (
                  unallocatedPeople
                    .filter((p) => {
                      if (unallocatedFilter === "SHALMALA") return p.hostelEligible === "SHALMALA";
                      if (unallocatedFilter === "VINDHYA") return p.hostelEligible === "VINDHYA";
                      return true;
                    })
                    .map((person) => (
                      <div
                        key={person.id}
                        className="p-3 bg-white border border-slate-200 rounded-lg hover:border-amber-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-pixel text-xs text-slate-900 font-bold">
                              {person.name}
                            </span>
                            <span className="font-pixel text-[8px] px-2 py-0.5 rounded border bg-amber-50 text-amber-800 border-amber-200 font-medium">
                              {person.role}
                            </span>
                            <span className="font-mono text-[9px] text-slate-500">
                              ({person.gender})
                            </span>
                          </div>
                          <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                            {person.playerId || "REG-ID"} • {person.teamName || person.institution}
                          </p>
                          <span className="font-pixel text-[8px] text-[#FF5A16] uppercase mt-0.5 block font-semibold">
                            ELIGIBLE FOR: {person.hostelEligible} HOSTEL
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsUnallocatedOpen(false);
                            setSelectedHostelId(person.hostelEligible as any);
                            showToast(`Selected ${person.name}. Please select an available bed.`, "info");
                          }}
                          className="px-3 py-1.5 bg-[#FF5A16] hover:bg-[#d94e16] text-white rounded-lg font-pixel text-[9px] font-bold cursor-pointer shadow-xs transition-colors"
                        >
                          ALLOCATE BED
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* DRAWER 4: SEPARATE ACCOMMODATION PAYMENTS */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isPaymentsOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
            <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xl relative max-h-[85vh] flex flex-col text-slate-900">
              <button
                onClick={() => setIsPaymentsOpen(false)}
                className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-pixel text-sm text-slate-900 font-bold">
                    ACCOMMODATION PAYMENT LEDGER
                  </h3>
                  <span className="font-sans text-[11px] text-slate-500">
                    Strictly isolated from Registration &amp; Match fees. Mandatory UTR for UPI.
                  </span>
                </div>
              </div>

              {/* Payment intake form */}
              <form onSubmit={handleRecordPayment} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 space-y-3 font-sans text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="font-pixel text-[9px] text-slate-600 uppercase block mb-1 font-medium">
                      ENTITY TYPE
                    </label>
                    <select
                      value={paymentEntityType}
                      onChange={(e) => setPaymentEntityType(e.target.value as any)}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg p-2 font-mono text-xs outline-none focus:border-[#FF5A16]"
                    >
                      <option value="TEAM">TEAM CONTINGENT</option>
                      <option value="PARTICIPANT">INDIVIDUAL PERSON</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-pixel text-[9px] text-slate-600 uppercase block mb-1 font-medium">
                      PAYMENT METHOD
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg p-2 font-mono text-xs outline-none focus:border-[#FF5A16]"
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI TRANSFER (UTR REQUIRED)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-pixel text-[9px] text-slate-600 uppercase block mb-1 font-medium">
                      AMOUNT (₹)
                    </label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg p-2 font-mono text-xs outline-none focus:border-[#FF5A16]"
                    />
                  </div>
                </div>

                {paymentMethod === "UPI" && (
                  <div>
                    <label className="font-pixel text-[9px] text-emerald-700 uppercase tracking-wider block mb-1 font-semibold">
                      UPI UTR / TRANSACTION REFERENCE (MANDATORY):
                    </label>
                    <input
                      type="text"
                      value={paymentUtr}
                      onChange={(e) => setPaymentUtr(e.target.value)}
                      placeholder="e.g. 426891234567"
                      required
                      className="w-full bg-white text-slate-900 border border-emerald-400 rounded-lg p-2 font-mono text-xs outline-none focus:border-emerald-600"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isRecordingPayment}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-pixel text-xs font-bold tracking-wider cursor-pointer shadow-xs rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
                >
                  {isRecordingPayment ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>RECORD ACCOMMODATION PAYMENT</span>
                </button>
              </form>

              {/* Payment history list */}
              <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
                <span className="font-pixel text-[10px] text-slate-600 uppercase tracking-wider block mb-1 font-semibold">
                  PAYMENT HISTORY RECORDS
                </span>
                {loadingPayments ? (
                  <div className="p-4 text-center text-slate-400 font-pixel text-[10px]">
                    LOADING PAYMENT RECORDS...
                  </div>
                ) : paymentHistory.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 font-pixel text-[10px]">
                    NO ACCOMMODATION PAYMENTS RECORDED YET
                  </div>
                ) : (
                  paymentHistory.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-pixel text-emerald-600 font-bold">
                            ₹{p.amount.toLocaleString()}
                          </span>
                          <span className="font-pixel text-[8px] px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-600">
                            {p.method}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {p.date}
                          </span>
                        </div>
                        <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                          Recorded by: {p.operator}
                          {p.utr && ` • UTR: ${p.utr}`}
                        </p>
                      </div>

                      <span className="font-pixel text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 font-medium">
                        {p.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* DRAWER 5: AUDIT & ALLOCATION HISTORY */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
            <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xl relative max-h-[85vh] flex flex-col text-slate-900">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
                <History className="w-5 h-5 text-slate-700" />
                <h3 className="font-pixel text-sm text-slate-900 font-bold">
                  ACCOMMODATION OPERATIONS AUDIT LOG
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
                {loadingHistory ? (
                  <div className="p-8 text-center text-slate-400 font-pixel text-[10px]">
                    LOADING AUDIT TRAIL FROM POSTGRESQL...
                  </div>
                ) : auditHistory.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-pixel text-[10px]">
                    NO AUDIT EVENTS RECORDED YET
                  </div>
                ) : (
                  auditHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg font-sans text-xs space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-pixel text-[9px] px-2 py-0.5 rounded border ${
                            item.action === "ACCOMMODATION_ALLOCATED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : item.action === "ACCOMMODATION_MOVED"
                              ? "bg-teal-50 text-teal-800 border-teal-300"
                              : item.action === "BED_VACATED"
                              ? "bg-rose-50 text-rose-800 border-rose-300"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {item.action}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {item.timestamp}
                        </span>
                      </div>
                      <div className="text-slate-800 text-xs">
                        Actor: <span className="font-mono text-slate-600">{item.actor}</span>
                        {item.details?.personName && (
                          <span> • Person: <strong>{item.details.personName}</strong></span>
                        )}
                        {item.details?.teamName && (
                          <span> ({item.details.teamName})</span>
                        )}
                      </div>
                      {(item.details?.hostelName || item.details?.roomNumber) && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          Target: {item.details.hostelName} • Room {item.details.roomNumber} • Bed {item.details.bedNumber}
                          {item.details.oldBedNumber && ` (from Bed ${item.details.oldBedNumber})`}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MOBILE STICKY BOTTOM ACTION BAR */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-2.5 flex items-center justify-around shadow-lg">
          <button
            onClick={() => setIsQrScannerOpen(true)}
            className="flex-1 py-2 bg-[#FF5A16] hover:bg-[#d94e16] text-white font-pixel text-[10px] font-bold flex items-center justify-center gap-1.5 rounded-lg shadow-xs mx-1"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>SCAN QR</span>
          </button>
          <button
            onClick={() => setIsFindPersonOpen(true)}
            className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-pixel text-[10px] font-bold flex items-center justify-center gap-1 rounded-lg shadow-2xs mx-1"
          >
            <Search className="w-3.5 h-3.5" />
            <span>PERSON</span>
          </button>
          <button
            onClick={() => setIsUnallocatedOpen(true)}
            className="flex-1 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-pixel text-[10px] font-bold flex items-center justify-center gap-1 rounded-lg shadow-2xs mx-1"
          >
            <UserMinus className="w-3.5 h-3.5" />
            <span>UNALLOC</span>
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}

export default function AccommodationAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050914] flex items-center justify-center text-[#F4E6CE] font-pixel text-xs">
          INITIALIZING ACCOMMODATION OPERATIONS SUITE...
        </div>
      }
    >
      <AccommodationAdminContent />
    </Suspense>
  );
}
