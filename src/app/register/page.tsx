"use client";

import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PortalQrCode } from "@/components/qr/PortalQrCode";

import {
  Shield, Camera, Upload, CheckCircle2, Plus, Trash2, RefreshCw,
  Download, X, Check, FileText, Users, Briefcase, Info,
  FileCheck, ChevronDown, ChevronUp, Printer, ClipboardList,
  ClipboardCheck, Flag, AlertTriangle, ThumbsUp, Eye, Search,
  Award, Sparkles, Building2, MapPin, QrCode, ExternalLink,
  Paperclip, CheckCircle, UserCheck, AlertCircle, BadgeCheck,
  Receipt, FolderCheck, ShieldCheck, Layers, Grid, List,
  Calendar, Bed, Home, DollarSign, CreditCard, ArrowRight, User, Clock, Phone, Mail, FileBadge,
  Smartphone
} from "lucide-react";

// South Zone States for geographical filtering
const SOUTH_ZONE_STATES = [
  "Karnataka",
  "Tamil Nadu",
  "Andhra Pradesh",
  "Telangana",
  "Kerala",
  "Puducherry"
];

interface InstitutionOption {
  id: string;
  name: string;
  state: string;
  institutionCode?: string;
  city?: string;
  district?: string;
}

interface ParticipantRecord {
  id: string;
  playerId: string;
  name: string;
  email: string;
  phone: string;
  state: string;
  institution: string;
  institutionId?: string;
  category: string;
  role: string;
  photoUrl?: string;
  qrToken?: string;
  qrCodeSvg?: string;
  documentsStatus: "DOCUMENTS_PENDING" | "READY" | "VERIFIED";
  documents?: {
    id: string;
    type: string;
    fileName: string;
    filePath?: string;
    status: string;
  }[];
  paymentStatus: "PAID" | "PENDING" | "PARTIAL";
  paymentMethod?: "CASH" | "UPI";
  utr?: string;
  amountPaid?: number;
  accommodationStatus: "ALLOCATED" | "NOT_ALLOCATED";
  hostel?: string;
  floor?: string;
  room?: string;
  bed?: string;
  registrationStatus: "COMPLETED" | "IN_PROGRESS" | "APPROVED";
  registeredAt: string;
}

interface HostelRoomOption {
  id: string;
  roomNumber: string;
  floorNumber: string;
  capacity: number;
  hostelId: string;
  hostelName: string;
  beds: {
    id: string;
    bedNumber: string;
    status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
  }[];
}

interface TeamAthleteFormItem {
  name: string;
  email: string;
  mobile: string;
  photoUrl: string | null;
  bedId?: string;
  bedNumber?: string;
  pdfFileName?: string;
  pdfFileSize?: string;
  pdfDataUrl?: string | null;
}

interface CreatedTeamContingent {
  team: {
    id: string;
    teamCode: string;
    name: string;
    institution: string;
    state: string;
    managerName?: string;
    managerPhone?: string;
  };
  manager?: ParticipantRecord | null;
  participants: ParticipantRecord[];
  payment: {
    amount: number;
    method: string;
    utr?: string;
    receiptNumber: string;
  };
}

export default function RegistrationDeskPage() {
  const staffName = "Registration Desk Officer";
  const deskId = "DESK 01";

  // Top-level Navigation: 1. FULL TEAM REGISTRATION | 2. REGISTERED PARTICIPANTS | 3. ONBOARDED TEAMS | 4. DOCUMENT VERIFICATION
  const [activeTab, setActiveTab] = useState<"NEW_REG" | "REGISTERED" | "ONBOARDED" | "DOCUMENTS">("NEW_REG");

  // ─────────────────────────────────────────────────────────────
  // MASTER DATA: State & University Dependent Lists
  // ─────────────────────────────────────────────────────────────
  const [selectedState, setSelectedState] = useState<string>("Karnataka");
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>("");
  const [selectedInstitutionName, setSelectedInstitutionName] = useState<string>("");
  const [institutionSearch, setInstitutionSearch] = useState<string>("");
  const [loadingInstitutions, setLoadingInstitutions] = useState<boolean>(false);

  // ─────────────────────────────────────────────────────────────
  // TEAM MANAGER SEPARATE REGISTRATION & PHOTO & COMBINED PDF
  // ─────────────────────────────────────────────────────────────
  const [managerName, setManagerName] = useState<string>("");
  const [managerPhone, setManagerPhone] = useState<string>("");
  const [managerEmail, setManagerEmail] = useState<string>("");
  const [managerPhotoUrl, setManagerPhotoUrl] = useState<string | null>(null);
  const [managerPdfName, setManagerPdfName] = useState<string>("");
  const [managerPdfSize, setManagerPdfSize] = useState<string>("");
  const [managerPdfDataUrl, setManagerPdfDataUrl] = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────
  // 5-MEMBER FULL SQUAD STATE (1 COMBINED PDF PER ATHLETE)
  // ─────────────────────────────────────────────────────────────
  const [teamAthletes, setTeamAthletes] = useState<TeamAthleteFormItem[]>([
    { name: "", email: "", mobile: "", photoUrl: null, pdfDataUrl: null },
    { name: "", email: "", mobile: "", photoUrl: null, pdfDataUrl: null },
    { name: "", email: "", mobile: "", photoUrl: null, pdfDataUrl: null },
    { name: "", email: "", mobile: "", photoUrl: null, pdfDataUrl: null },
    { name: "", email: "", mobile: "", photoUrl: null, pdfDataUrl: null },
  ]);

  // Active photo target: "MANAGER" | index (0..4)
  const [activePhotoTarget, setActivePhotoTarget] = useState<"MANAGER" | number | null>(null);

  // ─────────────────────────────────────────────────────────────
  // CAMERA CAPTURE WORKFLOW
  // ─────────────────────────────────────────────────────────────
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraPreview, setCameraPreview] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ─────────────────────────────────────────────────────────────
  // ACCOMMODATION ALLOCATION (5 BEDS SQUAD CONTINGENT)
  // ─────────────────────────────────────────────────────────────
  const [wantAccommodation, setWantAccommodation] = useState<boolean>(true);
  const [rooms, setRooms] = useState<HostelRoomOption[]>([]);
  const [selectedHostel, setSelectedHostel] = useState<string>("SHALMALA");
  const [selectedFloor, setSelectedFloor] = useState<string>("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [loadingRooms, setLoadingRooms] = useState<boolean>(false);
  const [isViewAllRoomsOpen, setIsViewAllRoomsOpen] = useState<boolean>(false);

  // ─────────────────────────────────────────────────────────────
  // PAYMENT & VERIFICATION LEDGER (₹2,500 PER TEAM CONTINGENT TOTAL)
  // ─────────────────────────────────────────────────────────────
  const totalTeamFee = 2500; // ₹2,500 per team contingent
  const feePerAthlete = 500; // ₹500 per athlete (5 x 500 = ₹2,500)
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI">("CASH");
  const [upiUtr, setUpiUtr] = useState<string>("");
  const [isPaymentVerified, setIsPaymentVerified] = useState<boolean>(true);

  // ─────────────────────────────────────────────────────────────
  // SAVING & CREATED STATE
  // ─────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [createdTeam, setCreatedTeam] = useState<CreatedTeamContingent | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // ─────────────────────────────────────────────────────────────
  // REGISTERED PARTICIPANTS & ONBOARDED TEAMS
  // ─────────────────────────────────────────────────────────────
  const [participantsList, setParticipantsList] = useState<ParticipantRecord[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [selectedParticipantForPass, setSelectedParticipantForPass] = useState<ParticipantRecord | null>(null);
  const [selectedParticipantForQr, setSelectedParticipantForQr] = useState<ParticipantRecord | null>(null);

  // Selected participant for document upload modal
  const [docUploadParticipant, setDocUploadParticipant] = useState<ParticipantRecord | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>("UNIVERSITY_ID");
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);

  // ─────────────────────────────────────────────────────────────
  // FIND DETAILS MODAL
  // ─────────────────────────────────────────────────────────────
  const [isFindDetailsOpen, setIsFindDetailsOpen] = useState<boolean>(false);
  const [findSearchQuery, setFindSearchQuery] = useState<string>("");

  // Trigger Toast Helper
  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ─────────────────────────────────────────────────────────────
  // FETCH INSTITUTIONS FROM DATABASE (STATE DEPENDENT)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchInstitutions = async () => {
      setLoadingInstitutions(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectedState) queryParams.set("state", selectedState);
        queryParams.set("status", "ACTIVE");
        queryParams.set("limit", "200");

        const res = await fetch(`/api/institutions?${queryParams.toString()}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.institutions)) {
          setInstitutions(data.institutions);
          if (data.institutions.length > 0) {
            setSelectedInstitutionId(data.institutions[0].id);
            setSelectedInstitutionName(data.institutions[0].name);
          } else {
            setSelectedInstitutionId("");
            setSelectedInstitutionName("");
          }
        }
      } catch (err) {
        console.error("Error fetching institutions:", err);
      } finally {
        setLoadingInstitutions(false);
      }
    };
    fetchInstitutions();
  }, [selectedState]);

  // ─────────────────────────────────────────────────────────────
  // FETCH ACCOMMODATION ROOMS & BEDS
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchRooms = async () => {
      setLoadingRooms(true);
      try {
        const res = await fetch("/api/accommodation/rooms");
        const data = await res.json();
        if (data.success && Array.isArray(data.rooms)) {
          setRooms(data.rooms);
          if (data.rooms.length > 0 && !selectedRoomId) {
            setSelectedRoomId(data.rooms[0].id);
          }
        }
      } catch (err) {
        console.error("Error fetching rooms:", err);
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchRooms();
  }, []);

  // Filtered rooms for selected hostel & floor
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchHostel = !selectedHostel || r.hostelId === selectedHostel || r.hostelName?.toUpperCase().includes(selectedHostel);
      const matchFloor = !selectedFloor || r.floorNumber === selectedFloor;
      return matchHostel && matchFloor;
    });
  }, [rooms, selectedHostel, selectedFloor]);

  const selectedRoom = useMemo(() => {
    return rooms.find((r) => r.id === selectedRoomId);
  }, [rooms, selectedRoomId]);

  const availableBedsInRoom = useMemo(() => {
    return selectedRoom?.beds?.filter((b) => b.status === "AVAILABLE") || [];
  }, [selectedRoom]);

  // Automatically assign available beds from selected room to athletes on initial room select
  useEffect(() => {
    if (!wantAccommodation || !selectedRoom) return;
    const avail = selectedRoom.beds.filter((b) => b.status === "AVAILABLE");
    setTeamAthletes((prev) =>
      prev.map((ath, idx) => ({
        ...ath,
        bedId: avail[idx] ? avail[idx].id : undefined,
        bedNumber: avail[idx] ? avail[idx].bedNumber : undefined,
      }))
    );
  }, [selectedRoomId, selectedRoom, wantAccommodation]);

  // Select all 5 available beds in the selected room for the squad
  const handleSelectAllBeds = () => {
    if (!selectedRoom) return;
    const avail = selectedRoom.beds.filter((b) => b.status === "AVAILABLE");
    setTeamAthletes((prev) =>
      prev.map((ath, idx) => ({
        ...ath,
        bedId: avail[idx] ? avail[idx].id : undefined,
        bedNumber: avail[idx] ? avail[idx].bedNumber : undefined,
      }))
    );
    showToast("All available beds assigned to the 5 squad athletes ✓");
  };

  // Clear all bed assignments
  const handleClearAllBeds = () => {
    setTeamAthletes((prev) =>
      prev.map((ath) => ({
        ...ath,
        bedId: undefined,
        bedNumber: undefined,
      }))
    );
    showToast("All bed allocations cleared");
  };

  // Assign specific bed to specific athlete
  const handleAssignBedToAthlete = (athleteIndex: number, bedId: string) => {
    const bedObj = selectedRoom?.beds.find((b) => b.id === bedId);
    setTeamAthletes((prev) => {
      const updated = [...prev];
      // If another athlete had this bed, clear it from them
      updated.forEach((a, i) => {
        if (i !== athleteIndex && a.bedId === bedId) {
          a.bedId = undefined;
          a.bedNumber = undefined;
        }
      });
      updated[athleteIndex] = {
        ...updated[athleteIndex],
        bedId: bedId || undefined,
        bedNumber: bedObj?.bedNumber || undefined,
      };
      return updated;
    });
  };

  // Toggle bed assignment on click
  const handleToggleBedSelection = (bed: { id: string; bedNumber: string; status: string }) => {
    if (bed.status !== "AVAILABLE") return;
    const assignedIndex = teamAthletes.findIndex((a) => a.bedId === bed.id);
    if (assignedIndex !== -1) {
      handleAssignBedToAthlete(assignedIndex, "");
      showToast(`Unassigned ${bed.bedNumber}`);
      return;
    }
    const firstUnassignedIndex = teamAthletes.findIndex((a) => !a.bedId);
    if (firstUnassignedIndex !== -1) {
      handleAssignBedToAthlete(firstUnassignedIndex, bed.id);
      const athName = teamAthletes[firstUnassignedIndex].name || `Athlete 0${firstUnassignedIndex + 1}`;
      showToast(`Assigned ${bed.bedNumber} ➔ ${athName} ✓`);
    } else {
      showToast("All 5 athletes already have beds assigned. To reassign, change an athlete's bed dropdown below.", "info");
    }
  };

  const selectedBedsCount = useMemo(() => {
    return teamAthletes.filter((a) => a.bedId).length;
  }, [teamAthletes]);

  // ─────────────────────────────────────────────────────────────
  // FETCH EXISTING PARTICIPANTS
  // ─────────────────────────────────────────────────────────────
  const fetchParticipants = async () => {
    setLoadingParticipants(true);
    try {
      const res = await fetch("/api/participants");
      const data = await res.json();
      if (data.success && Array.isArray(data.participants)) {
        const mapped: ParticipantRecord[] = data.participants.map((p: any) => ({
          id: p.id,
          playerId: p.playerId,
          name: p.name,
          email: p.email || "—",
          phone: p.phone,
          state: p.state || selectedState,
          institution: p.institution || p.institutionRel?.name || "University",
          institutionId: p.institutionId,
          category: p.category || "Women's Team",
          role: p.teamMemberships?.[0]?.role || p.role || "ATHLETE",
          photoUrl: p.photoUrl,
          qrToken: p.qrPasses?.[0]?.token || `sz26_part_${p.id}`,
          documentsStatus: p.documents?.length > 0 ? "VERIFIED" : "DOCUMENTS_PENDING",
          documents: p.documents || [],
          paymentStatus: "PAID",
          paymentMethod: p.payments?.[0]?.method || "CASH",
          utr: p.payments?.[0]?.utr,
          amountPaid: p.payments?.[0]?.amount || 2500,
          accommodationStatus: p.bedAllocations?.length > 0 ? "ALLOCATED" : "NOT_ALLOCATED",
          hostel: p.bedAllocations?.[0]?.bed?.room?.hostel?.name || "—",
          floor: p.bedAllocations?.[0]?.bed?.room?.floor?.name || "—",
          room: p.bedAllocations?.[0]?.bed?.room?.roomNumber || p.room || "—",
          bed: p.bedAllocations?.[0]?.bed?.bedNumber || "—",
          registrationStatus: p.status === "ACTIVE" || p.status === "APPROVED" ? "COMPLETED" : "IN_PROGRESS",
          registeredAt: p.createdAt ? new Date(p.createdAt).toLocaleString() : new Date().toLocaleString(),
        }));
        setParticipantsList(mapped);
      }
    } catch (err) {
      console.warn("Could not fetch participants:", err);
    } finally {
      setLoadingParticipants(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  // Update specific athlete field
  const handleUpdateAthlete = (index: number, field: keyof TeamAthleteFormItem, value: any) => {
    setTeamAthletes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // ─────────────────────────────────────────────────────────────
  // CAMERA STREAM CONTROLS (SUPPORTS MANAGER & ATHLETES)
  // ─────────────────────────────────────────────────────────────
  const startCamera = (target: "MANAGER" | number) => {
    setActivePhotoTarget(target);
    setIsCameraActive(true);
    setCameraPreview(null);
    setCameraError(null);
    navigator.mediaDevices
      ?.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      .then((stream) => {
        setCameraStream(stream);
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        setCameraError("Camera access denied or webcam not available. Please upload a photo file instead.");
      });
  };

  const stopCamera = useCallback(() => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
    setIsCameraActive(false);
    setCameraPreview(null);
    setCameraError(null);
    setActivePhotoTarget(null);
  }, [cameraStream]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCameraPreview(dataUrl);
    }
  };

  const applyCapturedPhoto = () => {
    if (!cameraPreview) return;
    if (activePhotoTarget === "MANAGER") {
      setManagerPhotoUrl(cameraPreview);
      showToast("Team Manager photo captured successfully ✓");
    } else if (typeof activePhotoTarget === "number") {
      handleUpdateAthlete(activePhotoTarget, "photoUrl", cameraPreview);
      showToast(`Athlete 0${activePhotoTarget + 1} photo captured successfully ✓`);
    }
    stopCamera();
  };

  const handleFileUpload = (target: "MANAGER" | number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (JPEG or PNG).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (target === "MANAGER") {
        setManagerPhotoUrl(dataUrl);
        showToast("Team Manager photo uploaded ✓");
      } else {
        handleUpdateAthlete(target, "photoUrl", dataUrl);
        showToast(`Athlete 0${target + 1} photo uploaded ✓`);
      }
    };
    reader.readAsDataURL(file);
  };

  // ─────────────────────────────────────────────────────────────
  // PER-ATHLETE & MANAGER 1 COMBINED PDF HANDLERS
  // ─────────────────────────────────────────────────────────────
  const handleAthletePdfUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a valid PDF document (.pdf only).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setTeamAthletes((prev) =>
        prev.map((a, i) =>
          i === idx
            ? { ...a, pdfFileName: file.name, pdfFileSize: `${sizeMb} MB`, pdfDataUrl: dataUrl }
            : a
        )
      );
      showToast(`Athlete 0${idx + 1} combined PDF attached ✓`);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAthletePdf = (idx: number) => {
    setTeamAthletes((prev) =>
      prev.map((a, i) =>
        i === idx
          ? { ...a, pdfFileName: undefined, pdfFileSize: undefined, pdfDataUrl: null }
          : a
      )
    );
  };

  const handleManagerPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a valid PDF document (.pdf only).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setManagerPdfName(file.name);
      setManagerPdfSize(`${sizeMb} MB`);
      setManagerPdfDataUrl(dataUrl);
      showToast("Team Manager combined PDF attached ✓");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveManagerPdf = () => {
    setManagerPdfName("");
    setManagerPdfSize("");
    setManagerPdfDataUrl(null);
  };

  // ─────────────────────────────────────────────────────────────
  // DIRECT DOCUMENT UPLOAD & VERIFY HANDLER
  // ─────────────────────────────────────────────────────────────
  const handleUploadDocumentForParticipant = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !docUploadParticipant) return;

    setUploadingDoc(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const res = await fetch("/api/documents/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantId: docUploadParticipant.id,
            type: selectedDocType,
            fileName: file.name,
            dataUrl,
            mimeType: file.type || "image/jpeg",
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast(`✓ Document (${selectedDocType}) uploaded & verified for ${docUploadParticipant.name}`, "success");
          fetchParticipants();
          setDocUploadParticipant(null);
        } else {
          alert(`Document upload error: ${data.error || "Failed to upload"}`);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploadingDoc(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SUBMIT FULL TEAM CONTINGENT (5 ATHLETES + MANAGER AT ONCE)
  // ─────────────────────────────────────────────────────────────
  const handleRegisterFullTeam = async () => {
    if (!selectedState) {
      alert("Please select State / Region.");
      return;
    }
    if (!selectedInstitutionName) {
      alert("Please select University / Institution from master list.");
      return;
    }

    // Validate Manager (if name is entered, ensure mobile & photo are entered)
    if (managerName.trim()) {
      if (!managerPhone.trim()) {
        alert("Please enter Mobile Number for Team Manager.");
        return;
      }
      if (!managerPhotoUrl) {
        alert("Photograph is mandatory for Team Manager. Please capture or upload manager photo.");
        return;
      }
    }

    // Validate all 5 athletes
    for (let i = 0; i < teamAthletes.length; i++) {
      const ath = teamAthletes[i];
      const slotName = i === 0 ? "Athlete 1 (Team Captain)" : `Athlete ${i + 1}`;
      if (!ath.name.trim()) {
        alert(`Please enter Full Name for ${slotName}.`);
        return;
      }
      if (!ath.mobile.trim()) {
        alert(`Please enter Mobile Number for ${slotName}.`);
        return;
      }
      if (!ath.photoUrl) {
        alert(`Photograph is mandatory for ${slotName}. Please take a photo or upload one.`);
        return;
      }
    }

    if (paymentMethod === "UPI" && !upiUtr.trim()) {
      alert("UPI Transaction Reference (UTR) is strictly required for UPI payment.");
      return;
    }

    if (!isPaymentVerified) {
      alert("Please verify and check the 'Payment Verification Confirmed' box before proceeding.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        state: selectedState,
        institution: selectedInstitutionName,
        institutionId: selectedInstitutionId,
        teamName: `${selectedInstitutionName} Women's Badminton Team`,
        managerName: managerName.trim() || undefined,
        managerPhone: managerPhone.trim() || undefined,
        managerEmail: managerEmail.trim() || undefined,
        managerPhotoUrl: managerPhotoUrl || undefined,
        managerPdf: managerPdfDataUrl ? {
          fileName: managerPdfName,
          fileSize: managerPdfSize,
          dataUrl: managerPdfDataUrl,
        } : undefined,
        athletes: teamAthletes.map((ath) => ({
          name: ath.name.trim(),
          email: ath.email.trim() || undefined,
          mobile: ath.mobile.trim(),
          photoUrl: ath.photoUrl,
          bedId: wantAccommodation ? ath.bedId : undefined,
          pdfFileName: ath.pdfFileName,
          pdfFileSize: ath.pdfFileSize,
          pdfDataUrl: ath.pdfDataUrl,
        })),
        paymentMethod,
        utr: paymentMethod === "UPI" ? upiUtr.trim() : undefined,
        feePerAthlete,
      };

      const res = await fetch("/api/registration/team-contingent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to register team contingent.");
      }

      const teamData = data.data;

      // Manager record if created
      let mappedManager: ParticipantRecord | null = null;
      if (teamData.manager) {
        mappedManager = {
          id: teamData.manager.id,
          playerId: teamData.manager.playerId,
          name: teamData.manager.name,
          email: teamData.manager.email || "—",
          phone: teamData.manager.phone,
          state: selectedState,
          institution: selectedInstitutionName,
          institutionId: selectedInstitutionId,
          category: "Contingent Management",
          role: "MANAGER",
          photoUrl: teamData.manager.photoUrl,
          qrToken: teamData.manager.qrToken,
          documentsStatus: "DOCUMENTS_PENDING",
          paymentStatus: "PAID",
          paymentMethod,
          amountPaid: 0,
          accommodationStatus: "NOT_ALLOCATED",
          hostel: "—",
          floor: "—",
          room: "—",
          bed: "—",
          registrationStatus: "COMPLETED",
          registeredAt: new Date().toLocaleString(),
        };
      }

      const mappedParticipants: ParticipantRecord[] = teamData.participants.map((p: any, idx: number) => ({
        id: p.id,
        playerId: p.playerId,
        name: p.name,
        email: p.email || "—",
        phone: p.phone,
        state: selectedState,
        institution: selectedInstitutionName,
        institutionId: selectedInstitutionId,
        category: idx < 2 ? "Women's Singles" : "Women's Doubles",
        role: idx === 0 ? "CAPTAIN" : "ATHLETE",
        photoUrl: p.photoUrl,
        qrToken: p.qrToken,
        documentsStatus: "DOCUMENTS_PENDING",
        paymentStatus: "PAID",
        paymentMethod,
        utr: paymentMethod === "UPI" ? upiUtr.trim() : undefined,
        amountPaid: feePerAthlete,
        accommodationStatus: p.bed ? "ALLOCATED" : "NOT_ALLOCATED",
        hostel: p.bed?.hostel || (selectedHostel === "SHALMALA" ? "Shalmala Hostel" : "Vindhya Boys Hostel"),
        floor: p.bed?.floor || selectedFloor || "Floor 01",
        room: p.bed?.roomNumber || selectedRoom?.roomNumber || "—",
        bed: p.bed?.bedNumber || teamAthletes[idx]?.bedNumber || "—",
        registrationStatus: "COMPLETED",
        registeredAt: new Date().toLocaleString(),
      }));

      const createdObj: CreatedTeamContingent = {
        team: {
          id: teamData.team.id,
          teamCode: teamData.team.teamCode,
          name: teamData.team.name,
          institution: selectedInstitutionName,
          state: selectedState,
          managerName: managerName.trim() || undefined,
          managerPhone: managerPhone.trim() || undefined,
        },
        manager: mappedManager,
        participants: mappedParticipants,
        payment: {
          amount: totalTeamFee,
          method: paymentMethod,
          utr: paymentMethod === "UPI" ? upiUtr.trim() : undefined,
          receiptNumber: teamData.payment?.receiptNumber || `REC-SZ26-${Date.now().toString().slice(-6)}`,
        },
      };

      setCreatedTeam(createdObj);
      const allToAppend = mappedManager ? [mappedManager, ...mappedParticipants] : mappedParticipants;
      setParticipantsList((prev) => [...allToAppend, ...prev]);
      showToast(`FULL TEAM REGISTERED ✓ ${teamData.team.teamCode} (5 ATHLETES + MANAGER)`);
    } catch (err: any) {
      alert(`Error registering team contingent: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset for + REGISTER NEXT TEAM CONTINGENT
  const handleResetForNextTeam = () => {
    setTeamAthletes([
      { name: "", email: "", mobile: "", photoUrl: null },
      { name: "", email: "", mobile: "", photoUrl: null },
      { name: "", email: "", mobile: "", photoUrl: null },
      { name: "", email: "", mobile: "", photoUrl: null },
      { name: "", email: "", mobile: "", photoUrl: null },
    ]);
    setManagerName("");
    setManagerPhone("");
    setManagerEmail("");
    setManagerPhotoUrl(null);
    setUpiUtr("");
    setIsPaymentVerified(true);
    setCreatedTeam(null);
  };

  // Search filter
  const searchResults = useMemo(() => {
    if (!findSearchQuery.trim()) return [];
    const q = findSearchQuery.toLowerCase();
    return participantsList.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.playerId.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.institution.toLowerCase().includes(q)
    );
  }, [participantsList, findSearchQuery]);

  // Grouped by Institution for Tab 3 (ONBOARDED TEAMS & PASSES)
  const groupedByInstitution = useMemo(() => {
    const map: Record<string, { state: string; participants: ParticipantRecord[] }> = {};
    participantsList.forEach((p) => {
      const inst = p.institution || "Other Institution";
      if (!map[inst]) {
        map[inst] = { state: p.state || "Karnataka", participants: [] };
      }
      map[inst].participants.push(p);
    });
    return Object.entries(map).map(([institution, data]) => ({
      institution,
      state: data.state,
      participants: data.participants,
      totalPaid: data.participants.reduce((acc, p) => acc + (p.amountPaid || 2500), 0),
    }));
  }, [participantsList]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col selection:bg-[#FF5A16] selection:text-white">

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TOP REGISTRATION DESK HEADER BAR */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 sticky top-0 z-40 shadow-xs">
        <div className="max-w-[1536px] mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border-2 border-orange-200 flex items-center justify-center text-[#FF5A16] font-black text-sm shadow-xs">
                SZ
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-rajdhani text-lg sm:text-xl text-slate-900 font-black uppercase tracking-wider">
                    SOUTH ZONE WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-[#FF5A16] border border-orange-200 font-rajdhani text-[10px] font-bold uppercase">
                    {deskId}
                  </span>
                </div>
                <p className="font-sans text-xs text-slate-500">
                  Official Team Contingent Registration Desk &bull; Dr. Prabhakar Kore Sports Arena, KLE Tech
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Direct Link to Mobile Document Scanner */}
              <Link
                href="/scanner"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-rajdhani text-xs font-bold uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Smartphone className="w-4 h-4 text-[#FF5A16]" /> DOCUMENT SCANNER (/scanner)
              </Link>

              <button
                onClick={() => setIsFindDetailsOpen(true)}
                type="button"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-rajdhani text-xs font-bold uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-slate-300"
              >
                <Search className="w-4 h-4 text-slate-600" /> FIND DETAILS
              </button>

              <button
                onClick={() => {
                  handleResetForNextTeam();
                  setActiveTab("NEW_REG");
                }}
                type="button"
                className="px-4 py-2 bg-[#FF5A16] hover:bg-[#ea4e0e] text-white font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs font-rajdhani text-xs uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />+ REGISTER FULL TEAM
              </button>
            </div>
          </div>

          {/* TOP-LEVEL 4 TABS: 01. FULL TEAM REGISTRATION | 02. REGISTERED PARTICIPANTS | 03. ONBOARDED TEAMS | 04. DOCUMENT VERIFICATION */}
          <div className="flex border-t border-slate-100 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("NEW_REG")}
              className={`flex items-center gap-2 px-5 py-3 font-rajdhani text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "NEW_REG"
                ? "border-[#FF5A16] text-[#FF5A16] bg-orange-50/60 font-black"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
            >
              <ClipboardList className="w-4 h-4" />
              01. FULL TEAM REGISTRATION (5 ATHLETES + MANAGER)
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("REGISTERED");
                fetchParticipants();
              }}
              className={`flex items-center gap-2 px-5 py-3 font-rajdhani text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "REGISTERED"
                ? "border-[#FF5A16] text-[#FF5A16] bg-orange-50/60 font-black"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
            >
              <Users className="w-4 h-4" />
              02. REGISTERED PARTICIPANTS ({participantsList.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("ONBOARDED");
                fetchParticipants();
              }}
              className={`flex items-center gap-2 px-5 py-3 font-rajdhani text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "ONBOARDED"
                ? "border-[#FF5A16] text-[#FF5A16] bg-orange-50/60 font-black"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
            >
              <BadgeCheck className="w-4 h-4" />
              03. ONBOARDED TEAMS &amp; PASSES ({groupedByInstitution.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("DOCUMENTS");
                fetchParticipants();
              }}
              className={`flex items-center gap-2 px-5 py-3 font-rajdhani text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === "DOCUMENTS"
                ? "border-[#FF5A16] text-[#FF5A16] bg-orange-50/60 font-black"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
            >
              <FileBadge className="w-4 h-4" />
              04. DOCUMENT VERIFICATION &amp; UPLOADS ({participantsList.filter(p => p.documentsStatus === "VERIFIED").length}/{participantsList.length})
            </button>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl font-rajdhani text-xs font-bold uppercase tracking-wider flex items-center gap-2.5 shadow-xl border ${toastMessage.type === "success"
              ? "bg-emerald-900 text-emerald-100 border-emerald-500"
              : "bg-rose-900 text-rose-100 border-rose-500"
              }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN VIEW CONTENT */}
      <main className="max-w-[1536px] mx-auto p-4 sm:p-8 flex-1 w-full space-y-6">

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 01: FULL TEAM CONTINGENT REGISTRATION */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "NEW_REG" && (
          <>
            {createdTeam ? (
              /* TEAM CONTINGENT CREATED STATE */
              <div className="bg-white border-2 border-emerald-300 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-rajdhani text-xs font-bold uppercase tracking-wider">
                          TEAM CONTINGENT REGISTERED ✓
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-[#FF5A16] font-mono text-xs font-bold">
                          {createdTeam.team.teamCode}
                        </span>
                      </div>
                      <h2 className="font-rajdhani text-2xl font-black text-slate-900 uppercase mt-1">
                        {createdTeam.team.institution}
                      </h2>
                      <p className="font-mono text-xs text-slate-600">
                        {createdTeam.team.state} &bull; 5 Athletes + Team Manager Accredited &bull; Receipt: {createdTeam.payment.receiptNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-rajdhani text-xs font-bold uppercase rounded-xl flex items-center gap-1.5 border border-slate-300 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" /> PRINT ALL BADGES &amp; PASSES
                    </button>
                    <button
                      type="button"
                      onClick={handleResetForNextTeam}
                      className="px-5 py-2 bg-[#FF5A16] hover:bg-[#ea4e0e] text-white font-rajdhani text-xs font-black uppercase rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />+ REGISTER ANOTHER UNIVERSITY TEAM
                    </button>
                  </div>
                </div>

                {/* Contingent Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-rajdhani">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">TOTAL CONTINGENT</span>
                    <div className="text-slate-900 font-black text-sm flex items-center gap-1">
                      <Users className="w-4 h-4 text-[#FF5A16]" /> 5 ATHLETES + 1 MANAGER
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">PAYMENT STATUS</span>
                    <div className="text-emerald-700 font-black text-sm flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> ₹{createdTeam.payment.amount.toLocaleString()} ({createdTeam.payment.method}) PAID
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">DOCUMENTS SCANNER</span>
                    <div className="text-amber-700 font-black text-sm flex items-center gap-1">
                      <Smartphone className="w-4 h-4 text-[#FF5A16]" /> SCANNER READY (/scanner)
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">ACCOMMODATION</span>
                    <div className="text-slate-900 font-black text-sm flex items-center gap-1">
                      <Bed className="w-4 h-4 text-[#FF5A16]" /> 5 BEDS ALLOCATED
                    </div>
                  </div>
                </div>

                {/* Manager Pass Card if registered */}
                {createdTeam.manager && (
                  <div className="p-4 bg-orange-50/70 border-2 border-orange-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-[#FF5A16] text-white font-rajdhani text-[10px] font-black rounded-full uppercase">
                          OFFICIAL
                        </span>
                        <span className="font-rajdhani font-black text-sm uppercase text-slate-900">
                          TEAM MANAGER ACCREDITATION PASS
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#FF5A16]">
                        ID: {createdTeam.manager.playerId}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-5">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 border-2 border-slate-300 shrink-0">
                        {createdTeam.manager.photoUrl ? (
                          <img src={createdTeam.manager.photoUrl} alt="Manager" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-slate-400 m-auto mt-5" />
                        )}
                      </div>

                      <div className="flex-1 space-y-1 text-center sm:text-left text-xs">
                        <div className="font-rajdhani font-black text-slate-900 text-base">
                          {createdTeam.manager.name}
                        </div>
                        <div className="text-slate-600 font-mono text-[11px]">
                          Phone: {createdTeam.manager.phone}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          Official Team Manager &bull; {createdTeam.team.institution}
                        </div>
                      </div>

                      <div className="bg-white p-2 rounded-xl border border-slate-300 shadow-2xs">
                        <PortalQrCode
                          value={createdTeam.manager.qrToken || `sz26_m_${createdTeam.manager.playerId}`}
                          size={90}
                          showActions={false}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedParticipantForPass(createdTeam.manager!)}
                        className="px-4 py-2 bg-slate-900 hover:bg-[#FF5A16] text-white font-rajdhani text-xs font-bold uppercase rounded-xl cursor-pointer"
                      >
                        VIEW BADGE
                      </button>
                    </div>
                  </div>
                )}

                {/* 5 Registered Athletes Cards with Photos and QR Tokens */}
                <div className="space-y-3 pt-2">
                  <h3 className="font-rajdhani text-sm font-black text-slate-800 uppercase tracking-wider">
                    ACCREDITED SQUAD ATHLETES (5 PASSES GENERATED)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {createdTeam.participants.map((ath, idx) => (
                      <div
                        key={ath.id}
                        className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl flex flex-col items-center text-center space-y-3 shadow-xs hover:border-[#FF5A16] transition-colors"
                      >
                        <div className="w-full flex items-center justify-between text-[10px] font-mono font-bold">
                          <span className={idx === 0 ? "text-[#FF5A16]" : "text-slate-500"}>
                            {idx === 0 ? "★ CAPTAIN" : `ATHLETE 0${idx + 1}`}
                          </span>
                          <span className="text-emerald-700">✓ SAVED</span>
                        </div>

                        {/* Athlete Photo */}
                        <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-slate-300 bg-slate-200 shadow-xs">
                          {ath.photoUrl ? (
                            <img src={ath.photoUrl} alt={ath.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-10 h-10 text-slate-400 m-auto mt-6" />
                          )}
                        </div>

                        <div className="space-y-0.5 w-full">
                          <div className="font-rajdhani font-black text-slate-900 text-sm truncate" title={ath.name}>
                            {ath.name}
                          </div>
                          <div className="font-mono text-xs text-[#FF5A16] font-bold">
                            {ath.playerId}
                          </div>
                          <div className="text-[10px] font-mono text-slate-600 truncate">
                            {ath.phone}
                          </div>
                        </div>

                        {/* QR Code Pass */}
                        <div className="bg-white p-2 rounded-xl border border-slate-300 shadow-2xs">
                          <PortalQrCode
                            value={ath.qrToken || `sz26_p_${ath.playerId}`}
                            size={100}
                            showActions={false}
                          />
                        </div>

                        <div className="w-full pt-1 border-t border-slate-200 text-[10px] font-mono text-slate-600">
                          Room: <strong className="text-slate-900">{ath.room}</strong> &bull; Bed: <strong className="text-slate-900">{ath.bed}</strong>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedParticipantForPass(ath)}
                          className="w-full py-1.5 bg-slate-900 hover:bg-[#FF5A16] text-white font-rajdhani text-[11px] font-bold uppercase rounded-lg transition-colors cursor-pointer"
                        >
                          VIEW BADGE
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              /* FULL TEAM CONTINGENT INTAKE FORM (5 ATHLETES + MANAGER AT ONCE) */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT COLUMN: 8 COLS (UNIVERSITY, MANAGER, 5 ATHLETES, ACCOMMODATION) */}
                <div className="lg:col-span-8 space-y-6">

                  {/* SECTION 01: STATE & UNIVERSITY SELECTION */}
                  <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                      <span className="w-6 h-6 rounded-lg bg-orange-50 border border-orange-200 text-[#FF5A16] font-rajdhani font-black text-xs flex items-center justify-center">01</span>
                      <h2 className="font-rajdhani text-base sm:text-lg text-slate-900 font-black uppercase tracking-wider">
                        UNIVERSITY &amp; INSTITUTION DETAILS
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* State Dropdown */}
                      <div>
                        <label className="block font-rajdhani text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          STATE / REGION *
                        </label>
                        <select
                          value={selectedState}
                          onChange={(e) => setSelectedState(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#FF5A16] text-slate-900 rounded-xl px-3.5 py-2.5 text-xs transition-colors focus:outline-none"
                        >
                          {SOUTH_ZONE_STATES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* Dependent University Dropdown */}
                      <div>
                        <label className="block font-rajdhani text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          UNIVERSITY / INSTITUTION * {loadingInstitutions && "(Loading...)"}
                        </label>
                        <select
                          value={selectedInstitutionId}
                          onChange={(e) => {
                            setSelectedInstitutionId(e.target.value);
                            const found = institutions.find((i) => i.id === e.target.value);
                            if (found) setSelectedInstitutionName(found.name);
                          }}
                          className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#FF5A16] text-slate-900 rounded-xl px-3.5 py-2.5 text-xs transition-colors focus:outline-none"
                        >
                          {institutions.length === 0 ? (
                            <option value="">No institutions registered in {selectedState}</option>
                          ) : (
                            institutions.map((inst) => (
                              <option key={inst.id} value={inst.id}>
                                {inst.name} {inst.city ? `(${inst.city})` : ""}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 02: TEAM MANAGER SEPARATE REGISTRATION & PHOTO */}
                  <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-orange-50 border border-orange-200 text-[#FF5A16] font-rajdhani font-black text-xs flex items-center justify-center">02</span>
                        <h2 className="font-rajdhani text-base sm:text-lg text-slate-900 font-black uppercase tracking-wider">
                          TEAM MANAGER / COACH REGISTRATION
                        </h2>
                      </div>
                      {managerPhotoUrl && (
                        <span className="text-[11px] font-rajdhani font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> MANAGER PHOTO READY
                        </span>
                      )}
                    </div>

                    <div className="p-4 bg-orange-50/40 border border-orange-200 rounded-2xl space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Manager Photo Capture */}
                        <div className="md:col-span-3 flex items-center gap-2.5">
                          <div className="w-20 h-20 rounded-xl overflow-hidden bg-white border-2 border-slate-300 shrink-0 relative shadow-2xs">
                            {managerPhotoUrl ? (
                              <img src={managerPhotoUrl} alt="Manager" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-10 h-10 text-slate-300 m-auto mt-5" />
                            )}
                          </div>

                          <div className="space-y-1.5 flex-1">
                            <button
                              type="button"
                              onClick={() => startCamera("MANAGER")}
                              className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white font-rajdhani text-[10px] font-black uppercase rounded-lg flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                            >
                              <Camera className="w-3.5 h-3.5 text-[#FF5A16]" /> CAMERA
                            </button>

                            <label className="w-full py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-rajdhani text-[10px] font-bold uppercase rounded-lg flex items-center justify-center gap-1 cursor-pointer shadow-xs">
                              <Upload className="w-3.5 h-3.5 text-slate-500" /> UPLOAD
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload("MANAGER", e)}
                              />
                            </label>
                          </div>
                        </div>

                        {/* Manager Details: Name, Mobile, Email */}
                        <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block font-rajdhani text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                              MANAGER FULL NAME *
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Dr. Ramesh Rao"
                              value={managerName}
                              onChange={(e) => setManagerName(e.target.value)}
                              className="w-full bg-white border border-slate-300 focus:border-[#FF5A16] text-slate-900 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block font-rajdhani text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                              MANAGER CONTACT NUMBER *
                            </label>
                            <input
                              type="tel"
                              placeholder="+91 98450 99887"
                              value={managerPhone}
                              onChange={(e) => setManagerPhone(e.target.value)}
                              className="w-full bg-white border border-slate-300 focus:border-[#FF5A16] text-slate-900 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block font-rajdhani text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                              MANAGER EMAIL ADDRESS
                            </label>
                            <input
                              type="email"
                              placeholder="manager@university.edu"
                              value={managerEmail}
                              onChange={(e) => setManagerEmail(e.target.value)}
                              className="w-full bg-white border border-slate-300 focus:border-[#FF5A16] text-slate-900 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 1 Combined PDF upload for manager */}
                      <div className="pt-3 border-t border-orange-200/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#FF5A16]" />
                          <span className="font-rajdhani text-xs font-bold text-slate-800 uppercase tracking-wider">
                            MANAGER DOCUMENTS (1 COMBINED PDF: ID CARD, APPOINTMENT ORDER)
                          </span>
                        </div>

                        {managerPdfName ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {managerPdfName} ({managerPdfSize})
                            </span>
                            <button
                              type="button"
                              onClick={handleRemoveManagerPdf}
                              className="text-[10px] font-rajdhani font-bold text-red-600 hover:text-red-700 uppercase cursor-pointer"
                            >
                              ✕ Remove
                            </button>
                          </div>
                        ) : (
                          <label className="px-3.5 py-1.5 bg-white hover:bg-orange-50/70 border-2 border-dashed border-orange-300 hover:border-[#FF5A16] text-slate-700 hover:text-[#FF5A16] rounded-xl font-rajdhani text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors">
                            <Upload className="w-3.5 h-3.5 text-[#FF5A16]" />
                            UPLOAD 1 COMBINED PDF (MANAGER)
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              className="hidden"
                              onChange={handleManagerPdfUpload}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 03: 5-MEMBER SQUAD ROSTER INTAKE (FULL TEAM AT ONCE) */}
                  <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-orange-50 border border-orange-200 text-[#FF5A16] font-rajdhani font-black text-xs flex items-center justify-center">03</span>
                        <h2 className="font-rajdhani text-base sm:text-lg text-slate-900 font-black uppercase tracking-wider">
                          TEAM SQUAD ROSTER (ALL 5 ATHLETES AT ONCE)
                        </h2>
                      </div>
                      <span className="text-xs font-mono font-bold text-[#FF5A16] bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                        5 ATHLETES PER SQUAD
                      </span>
                    </div>

                    <div className="space-y-4">
                      {teamAthletes.map((athlete, idx) => {
                        const isCaptain = idx === 0;
                        const label = isCaptain ? "ATHLETE 01 — TEAM CAPTAIN *" : `ATHLETE 0${idx + 1} *`;

                        return (
                          <div
                            key={`athlete-row-${idx}`}
                            className={`p-4 rounded-xl border-2 transition-all ${athlete.name && athlete.mobile && athlete.photoUrl
                              ? "bg-emerald-50/40 border-emerald-300"
                              : "bg-slate-50/70 border-slate-200 hover:border-slate-300"
                              }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full font-rajdhani font-black text-xs flex items-center justify-center ${isCaptain ? "bg-[#FF5A16] text-white" : "bg-slate-200 text-slate-800"
                                  }`}>
                                  {idx + 1}
                                </span>
                                <span className="font-rajdhani font-black text-xs uppercase tracking-wider text-slate-900">
                                  {label}
                                </span>
                              </div>

                              {athlete.photoUrl && (
                                <span className="text-[11px] font-rajdhani font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> PHOTO READY
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                              {/* Photo Avatar / Capture Control */}
                              <div className="md:col-span-3 flex items-center gap-2.5">
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border-2 border-slate-300 shrink-0 relative shadow-2xs">
                                  {athlete.photoUrl ? (
                                    <img src={athlete.photoUrl} alt="Athlete" className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-8 h-8 text-slate-300 m-auto mt-3.5" />
                                  )}
                                </div>

                                <div className="space-y-1.5 flex-1">
                                  <button
                                    type="button"
                                    onClick={() => startCamera(idx)}
                                    className="w-full py-1 px-2 bg-slate-900 hover:bg-slate-800 text-white font-rajdhani text-[10px] font-black uppercase rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Camera className="w-3 h-3 text-[#FF5A16]" /> CAMERA
                                  </button>

                                  <label className="w-full py-1 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-rajdhani text-[10px] font-bold uppercase rounded-lg flex items-center justify-center gap-1 cursor-pointer">
                                    <Upload className="w-3 h-3 text-slate-500" /> UPLOAD
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => handleFileUpload(idx, e)}
                                    />
                                  </label>
                                </div>
                              </div>

                              {/* Athlete Fields: Name, Mobile, Email */}
                              <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Full Name */}
                                <div>
                                  <label className="block font-rajdhani text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    FULL NAME *
                                  </label>
                                  <input
                                    type="text"
                                    placeholder={isCaptain ? "e.g. Ananya Sharma" : `Athlete ${idx + 1} Name`}
                                    value={athlete.name}
                                    onChange={(e) => handleUpdateAthlete(idx, "name", e.target.value)}
                                    className="w-full bg-white border border-slate-300 focus:border-[#FF5A16] text-slate-900 rounded-xl px-3 py-2 text-xs focus:outline-none"
                                  />
                                </div>

                                {/* Mobile Number */}
                                <div>
                                  <label className="block font-rajdhani text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    MOBILE NUMBER *
                                  </label>
                                  <input
                                    type="tel"
                                    placeholder="+91 98450 12345"
                                    value={athlete.mobile}
                                    onChange={(e) => handleUpdateAthlete(idx, "mobile", e.target.value)}
                                    className="w-full bg-white border border-slate-300 focus:border-[#FF5A16] text-slate-900 rounded-xl px-3 py-2 text-xs focus:outline-none"
                                  />
                                </div>

                                {/* Email Address */}
                                <div>
                                  <label className="block font-rajdhani text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    EMAIL ADDRESS
                                  </label>
                                  <input
                                    type="email"
                                    placeholder="athlete@univ.edu"
                                    value={athlete.email}
                                    onChange={(e) => handleUpdateAthlete(idx, "email", e.target.value)}
                                    className="w-full bg-white border border-slate-300 focus:border-[#FF5A16] text-slate-900 rounded-xl px-3 py-2 text-xs focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* 1 Combined PDF upload row for this athlete */}
                            <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-[#FF5A16]" />
                                <span className="font-rajdhani text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                                  DOCUMENTS (1 COMBINED PDF: ID CARD, SSLC, PUC / ELIGIBILITY)
                                </span>
                              </div>

                              {athlete.pdfFileName ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    {athlete.pdfFileName} ({athlete.pdfFileSize})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAthletePdf(idx)}
                                    className="text-[10px] font-rajdhani font-bold text-red-600 hover:text-red-700 uppercase cursor-pointer"
                                  >
                                    ✕ Remove
                                  </button>
                                </div>
                              ) : (
                                <label className="px-3 py-1 bg-white hover:bg-orange-50/70 border-2 border-dashed border-slate-300 hover:border-[#FF5A16] text-slate-700 hover:text-[#FF5A16] rounded-lg font-rajdhani text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors">
                                  <Upload className="w-3 h-3 text-[#FF5A16]" />
                                  UPLOAD 1 COMBINED PDF
                                  <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    className="hidden"
                                    onChange={(e) => handleAthletePdfUpload(idx, e)}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* SECTION 04: CONTINGENT ACCOMMODATION (5-BED SQUAD ALLOCATION) */}
                  <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-orange-50 border border-orange-200 text-[#FF5A16] font-rajdhani font-black text-xs flex items-center justify-center">04</span>
                        <div>
                          <h2 className="font-rajdhani text-base sm:text-lg text-slate-900 font-black uppercase tracking-wider">
                            CONTINGENT ACCOMMODATION (5 BEDS SQUAD ALLOCATION)
                          </h2>
                          <p className="text-[11px] text-slate-500 font-sans">
                            {selectedBedsCount} of 5 Athletes Assigned Beds &bull; {selectedBedsCount === 5 ? "✓ Complete" : "Select beds below"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* SELECT ALL 5 BEDS BUTTON */}
                        <button
                          type="button"
                          onClick={handleSelectAllBeds}
                          className="px-3 py-1.5 bg-[#FF5A16] hover:bg-[#ea4e0e] text-white rounded-xl text-xs font-rajdhani font-black uppercase flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> SELECT ALL 5 BEDS
                        </button>

                        {/* CLEAR ALL BEDS BUTTON */}
                        <button
                          type="button"
                          onClick={handleClearAllBeds}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-rajdhani font-bold uppercase flex items-center gap-1.5 border border-slate-300 cursor-pointer transition-all"
                        >
                          <X className="w-3.5 h-3.5" /> CLEAR ALL
                        </button>

                        {/* VIEW ALL ROOMS MODAL BUTTON */}
                        <button
                          type="button"
                          onClick={() => setIsViewAllRoomsOpen(true)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-rajdhani font-bold flex items-center gap-1 border border-slate-300 cursor-pointer"
                        >
                          <Bed className="w-3.5 h-3.5 text-[#FF5A16]" /> VIEW ALL ROOMS
                        </button>
                      </div>
                    </div>

                    {/* Hostel, Floor & Room Dropdowns */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Hostel */}
                      <div>
                        <label className="block font-rajdhani text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          HOSTEL
                        </label>
                        <select
                          value={selectedHostel}
                          onChange={(e) => {
                            setSelectedHostel(e.target.value);
                            setSelectedRoomId("");
                          }}
                          className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#FF5A16] text-slate-900 rounded-xl px-3.5 py-2.5 text-xs transition-colors focus:outline-none"
                        >
                          <option value="SHALMALA">Shalmala Hostel (Female Athletes)</option>
                          <option value="VINDHYA">Vindhya Boys Hostel (Male Managers)</option>
                        </select>
                      </div>

                      {/* Floor */}
                      <div>
                        <label className="block font-rajdhani text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          FLOOR
                        </label>
                        <select
                          value={selectedFloor}
                          onChange={(e) => {
                            setSelectedFloor(e.target.value);
                            setSelectedRoomId("");
                          }}
                          className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#FF5A16] text-slate-900 rounded-xl px-3.5 py-2.5 text-xs transition-colors focus:outline-none"
                        >
                          <option value="">All Floors</option>
                          <option value="Floor 01">Floor 01</option>
                          <option value="Floor 02">Floor 02</option>
                          <option value="Floor 03">Floor 03</option>
                        </select>
                      </div>

                      {/* Room Selection */}
                      <div>
                        <label className="block font-rajdhani text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          ROOM (5-BED CONTINGENT ROOM)
                        </label>
                        <select
                          value={selectedRoomId}
                          onChange={(e) => setSelectedRoomId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#FF5A16] text-slate-900 rounded-xl px-3.5 py-2.5 text-xs transition-colors focus:outline-none"
                        >
                          <option value="">Select Room</option>
                          {filteredRooms.map((r) => {
                            const availCount = r.beds?.filter((b) => b.status === "AVAILABLE").length || 0;
                            return (
                              <option key={r.id} value={r.id} disabled={availCount === 0}>
                                {r.roomNumber} ({availCount}/{r.capacity || 5} Available Beds)
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    {/* INTERACTIVE BED TOPOLOGY SELECTION GRID */}
                    {selectedRoom && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-rajdhani font-black text-xs uppercase tracking-wider text-slate-900">
                              ROOM {selectedRoom.roomNumber} &bull; INTERACTIVE BED SELECTION (CLICK TO TOGGLE)
                            </span>
                            <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full font-bold">
                              {availableBedsInRoom.length} / {selectedRoom.capacity || 5} Beds Available
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSelectAllBeds}
                              className="text-[11px] font-rajdhani font-bold text-[#FF5A16] hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Select All ({selectedRoom.beds.filter(b => b.status === "AVAILABLE").length} Available)
                            </button>
                          </div>
                        </div>

                        {/* Visual Clickable Bed Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                          {selectedRoom.beds.map((bed) => {
                            const isAvailable = bed.status === "AVAILABLE";
                            const assignedIndex = teamAthletes.findIndex((a) => a.bedId === bed.id);
                            const isAssigned = assignedIndex !== -1;
                            const assignedAthlete = isAssigned ? teamAthletes[assignedIndex] : null;

                            return (
                              <button
                                key={bed.id}
                                type="button"
                                disabled={!isAvailable}
                                onClick={() => handleToggleBedSelection(bed)}
                                className={`p-3 rounded-xl border-2 text-center transition-all cursor-pointer flex flex-col justify-between min-h-[92px] ${isAssigned
                                  ? "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs ring-2 ring-emerald-300/60"
                                  : isAvailable
                                    ? "bg-white border-slate-300 text-slate-800 hover:border-[#FF5A16] hover:bg-orange-50/50"
                                    : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                                  }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-rajdhani font-black text-xs uppercase">{bed.bedNumber}</span>
                                  {isAssigned ? (
                                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">✓</span>
                                  ) : isAvailable ? (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                  ) : (
                                    <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                  )}
                                </div>

                                <div className="py-1">
                                  {isAssigned ? (
                                    <div className="space-y-0.5 text-left">
                                      <div className="text-[10px] font-rajdhani font-black text-emerald-800 truncate">
                                        {assignedIndex === 0 ? "★ Captain" : `Athlete 0${assignedIndex + 1}`}
                                      </div>
                                      <div className="text-[11px] font-bold text-slate-900 truncate" title={assignedAthlete?.name}>
                                        {assignedAthlete?.name || `Slot ${assignedIndex + 1}`}
                                      </div>
                                    </div>
                                  ) : isAvailable ? (
                                    <div className="text-[10px] font-mono text-slate-500">
                                      Available (Click to assign)
                                    </div>
                                  ) : (
                                    <div className="text-[10px] font-mono text-slate-400">
                                      Occupied
                                    </div>
                                  )}
                                </div>

                                <div className="text-[9px] font-mono font-bold text-slate-400 pt-1 border-t border-slate-200/60">
                                  {isAssigned ? "SELECTED" : isAvailable ? "SELECT" : "UNAVAILABLE"}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>

                </div>

                {/* RIGHT COLUMN: 4 COLS (CONTINGENT FEE ₹2,500, PAYMENT METHOD, VERIFICATION & SUBMIT) */}
                <div className="lg:col-span-4 space-y-6">

                  {/* Team Registration Fee Ledger Card */}
                  <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-rajdhani text-base font-black text-slate-900 uppercase tracking-wider">
                          CONTINGENT LEDGER
                        </h3>
                        <p className="text-[11px] text-slate-500">5 Athletes Squad Registration</p>
                      </div>
                      <span className="font-rajdhani text-lg text-[#FF5A16] font-black">
                        ₹{totalTeamFee.toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-4 font-sans text-xs">
                      {/* Breakdown */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 font-mono text-[11px] text-slate-700">
                        <div className="flex justify-between">
                          <span>Team Registration Fee:</span>
                          <span className="font-bold text-slate-900">₹2,500 / Team</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Squad Athletes:</span>
                          <span className="font-bold text-slate-900">5 Players (₹500 / athlete)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Team Manager Registration:</span>
                          <span className="font-bold text-emerald-700">Complimentary Pass</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
                          <span>Total Contingent Amount:</span>
                          <span className="text-[#FF5A16]">₹2,500</span>
                        </div>
                      </div>

                      {/* Payment Method Selector */}
                      <div>
                        <label className="block font-rajdhani text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                          PAYMENT METHOD *
                        </label>
                        <div className="grid grid-cols-2 gap-2 font-rajdhani font-bold text-xs uppercase">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("CASH")}
                            className={`py-2.5 rounded-xl border-2 transition-all cursor-pointer ${paymentMethod === "CASH"
                              ? "bg-[#FF5A16] text-white border-[#FF5A16] shadow-xs font-black"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                          >
                            CASH AT DESK
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod("UPI")}
                            className={`py-2.5 rounded-xl border-2 transition-all cursor-pointer ${paymentMethod === "UPI"
                              ? "bg-[#FF5A16] text-white border-[#FF5A16] shadow-xs font-black"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                              }`}
                          >
                            UPI / SCAN
                          </button>
                        </div>
                      </div>

                      {/* UPI Reference Input */}
                      {paymentMethod === "UPI" && (
                        <div>
                          <label className="block font-rajdhani text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                            UPI TRANSACTION REFERENCE (UTR) *
                          </label>
                          <input
                            type="text"
                            placeholder="Enter 12-digit UTR (e.g. 529182746192)"
                            value={upiUtr}
                            onChange={(e) => setUpiUtr(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#FF5A16] text-slate-900 placeholder:text-slate-400 rounded-xl px-3.5 py-2.5 text-xs transition-colors focus:outline-none font-mono"
                          />
                        </div>
                      )}

                      {/* Payment Verification Checkbox */}
                      <label className="flex items-start gap-3 p-3.5 bg-emerald-50/80 border-2 border-emerald-300/80 rounded-xl cursor-pointer hover:bg-emerald-50 transition-colors shadow-xs">
                        <input
                          type="checkbox"
                          id="checkbox-reg-payment-verified"
                          checked={isPaymentVerified}
                          onChange={(e) => setIsPaymentVerified(e.target.checked)}
                          className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                        />
                        <div>
                          <div className="font-rajdhani font-black text-xs text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            PAYMENT VERIFICATION CONFIRMED *
                          </div>
                          <div className="text-[11px] text-emerald-800 font-sans mt-0.5 leading-snug">
                            ₹2,500 full squad fee verified &amp; received via {paymentMethod === "CASH" ? "CASH AT DESK" : "UPI / SCAN"}
                          </div>
                        </div>
                      </label>

                      {/* Register Full Team Button */}
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={handleRegisterFullTeam}
                        className="w-full py-3.5 bg-[#FF5A16] hover:bg-[#ea4e0e] disabled:opacity-50 text-white font-rajdhani text-sm font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> REGISTERING SQUAD &amp; GENERATING PASSES...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" /> REGISTER FULL TEAM (5 ATHLETES + MANAGER)
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 02: REGISTERED PARTICIPANTS LIST */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "REGISTERED" && (
          <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-rajdhani text-xl font-black text-slate-900 uppercase">
                  REGISTERED PARTICIPANTS REGISTRY ({participantsList.length})
                </h2>
                <p className="text-xs text-slate-500">Official tournament athlete &amp; manager accreditation database</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Name, ID, Mobile, University..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 w-64 focus:outline-none focus:border-[#FF5A16]"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchParticipants}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 cursor-pointer"
                  title="Refresh list"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loadingParticipants ? (
              <div className="p-12 text-center text-slate-400 font-rajdhani text-sm">
                LOADING PARTICIPANTS DATABASE...
              </div>
            ) : participantsList.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-rajdhani text-sm">
                NO PARTICIPANTS RECORDED YET. CLICK &quot;01. FULL TEAM REGISTRATION&quot; TO BEGIN.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-rajdhani font-black uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3">PHOTO</th>
                      <th className="p-3">PARTICIPANT NAME &amp; ID</th>
                      <th className="p-3">UNIVERSITY</th>
                      <th className="p-3">MOBILE</th>
                      <th className="p-3">ROLE</th>
                      <th className="p-3">QR STATUS</th>
                      <th className="p-3">DOCUMENTS</th>
                      <th className="p-3">PAYMENT</th>
                      <th className="p-3">ACCOMMODATION</th>
                      <th className="p-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {participantsList
                      .filter((p) => {
                        if (!searchFilter.trim()) return true;
                        const q = searchFilter.toLowerCase();
                        return (
                          p.name.toLowerCase().includes(q) ||
                          p.playerId.toLowerCase().includes(q) ||
                          p.phone.includes(q) ||
                          p.institution.toLowerCase().includes(q)
                        );
                      })
                      .map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-200 border border-slate-300">
                              {p.photoUrl ? (
                                <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-slate-400 m-auto mt-2" />
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{p.name}</div>
                            <div className="font-mono text-[11px] text-[#FF5A16] font-bold">{p.playerId}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-slate-800">{p.institution}</div>
                            <div className="text-[10px] text-slate-500">{p.state}</div>
                          </td>
                          <td className="p-3 text-slate-600 font-mono text-[11px]">{p.phone}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full font-rajdhani text-[10px] font-bold ${p.role === "MANAGER"
                              ? "bg-purple-100 text-purple-800 border border-purple-200 font-black"
                              : p.role === "CAPTAIN"
                                ? "bg-orange-100 text-[#FF5A16] border border-orange-200 font-black"
                                : "bg-slate-100 text-slate-700"
                              }`}>
                              {p.role || "ATHLETE"}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-rajdhani text-[10px] font-black">
                              QR ACTIVE ✓
                            </span>
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => setDocUploadParticipant(p)}
                              className={`px-2.5 py-0.5 rounded-full font-rajdhani text-[10px] font-bold cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1 ${p.documentsStatus === "VERIFIED"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-300 font-black"
                                : "bg-amber-50 text-amber-800 border border-amber-300"
                                }`}
                            >
                              <FileText className="w-3 h-3" />
                              {p.documentsStatus}
                            </button>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-rajdhani text-[10px] font-black">
                              ₹{p.amountPaid || 0} ({p.paymentMethod || "PAID"})
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full font-rajdhani text-[10px] font-bold ${p.accommodationStatus === "ALLOCATED"
                              ? "bg-slate-100 text-slate-900 border border-slate-300"
                              : "bg-amber-50 text-amber-800 border border-amber-300"
                              }`}>
                              {p.room !== "—" ? `${p.hostel} (${p.room})` : "NOT ALLOCATED"}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedParticipantForQr(p)}
                                className="px-2 py-1 bg-slate-900 text-white font-rajdhani text-[10px] font-bold uppercase rounded-md"
                              >
                                QR
                              </button>
                              <button
                                type="button"
                                onClick={() => setDocUploadParticipant(p)}
                                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-rajdhani text-[10px] font-bold uppercase rounded-md"
                              >
                                DOCS
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedParticipantForPass(p)}
                                className="px-2 py-1 bg-[#FF5A16] text-white font-rajdhani text-[10px] font-bold uppercase rounded-md"
                              >
                                PASS
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 03: ONBOARDED TEAMS & PASSES */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "ONBOARDED" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-rajdhani text-2xl text-slate-900 font-black uppercase">
                  ONBOARDED UNIVERSITY TEAMS &amp; PASSES ({groupedByInstitution.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Accredited University Contingents, athlete rosters, passes, and desk audit slips
                </p>
              </div>
            </div>

            {groupedByInstitution.length === 0 ? (
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-rajdhani text-sm">
                NO ONBOARDED TEAMS YET. COMPLETE REGISTRATIONS TO POPULATE CONTINGENTS.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groupedByInstitution.map((team) => (
                  <div key={team.institution} className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#FF5A16] font-rajdhani text-[10px] font-bold uppercase">
                          {team.state}
                        </span>
                        <h3 className="font-rajdhani text-lg font-black text-slate-900 uppercase mt-1">
                          {team.institution}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">
                          {team.participants.length} Registered Members &bull; Total Paid: ₹{team.totalPaid.toLocaleString()}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-full font-rajdhani text-xs font-black">
                        ACCREDITED ✓
                      </span>
                    </div>

                    {/* Member Avatars */}
                    <div className="space-y-2">
                      <span className="font-rajdhani text-xs font-bold text-slate-600 uppercase">CONTINGENT ROSTER</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {team.participants.map((member) => (
                          <div key={member.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                              {member.photoUrl ? (
                                <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-slate-400 m-auto mt-2" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-900 text-xs truncate">{member.name}</div>
                              <div className="text-[10px] text-[#FF5A16] font-mono">{member.playerId} &bull; {member.role}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedParticipantForPass(member)}
                              className="px-2 py-1 bg-slate-900 hover:bg-[#FF5A16] text-white rounded text-[10px] font-bold uppercase shrink-0 cursor-pointer"
                            >
                              PASS
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 04: DOCUMENT VERIFICATION & UPLOADS QUEUE */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "DOCUMENTS" && (
          <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-rajdhani text-xl font-black text-slate-900 uppercase flex items-center gap-2">
                  <FileBadge className="w-5 h-5 text-[#FF5A16]" />
                  DOCUMENT VERIFICATION &amp; UPLOAD QUEUE
                </h2>
                <p className="text-xs text-slate-500">
                  Inspect student University IDs, SSLC &amp; PUC certificates, and upload documents directly or via Mobile Scanner
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/scanner"
                  className="px-4 py-2 bg-[#FF5A16] hover:bg-[#ea4e0e] text-white font-rajdhani text-xs font-black uppercase rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Camera className="w-4 h-4" /> LAUNCH CAMERA SCANNER (/scanner)
                </Link>
                <button
                  type="button"
                  onClick={fetchParticipants}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 cursor-pointer"
                  title="Refresh list"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {participantsList.map((p) => (
                <div key={p.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0">
                      {p.photoUrl ? (
                        <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-slate-400 m-auto mt-3" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-sm truncate">{p.name}</div>
                      <div className="font-mono text-[11px] text-[#FF5A16] font-bold">{p.playerId} &bull; {p.role}</div>
                      <div className="text-[11px] text-slate-500 truncate">{p.institution}</div>
                    </div>
                  </div>

                  {/* Documents Status */}
                  <div className="space-y-1.5 text-[11px] font-sans">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Verification Status:</span>
                      <span className={`font-rajdhani font-black px-2 py-0.5 rounded text-[10px] ${p.documentsStatus === "VERIFIED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                        }`}>
                        {p.documentsStatus}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>Uploaded Files:</span>
                      <span>{p.documents?.length || 0} Files Attached</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDocUploadParticipant(p)}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-rajdhani text-xs font-bold uppercase rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" /> UPLOAD DOC
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedParticipantForQr(p)}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-rajdhani text-xs font-bold uppercase rounded-lg cursor-pointer"
                      title="View QR for mobile scanner"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL 0: DIRECT DOCUMENT UPLOAD MODAL */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {docUploadParticipant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="bg-white border-2 border-blue-500 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileBadge className="w-5 h-5 text-blue-600" />
                  <h3 className="font-rajdhani text-base font-black text-slate-900 uppercase">
                    UPLOAD VERIFICATION DOCUMENT
                  </h3>
                </div>
                <button type="button" onClick={() => setDocUploadParticipant(null)} className="p-1 text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                <div className="font-bold text-slate-900">{docUploadParticipant.name}</div>
                <div className="font-mono text-[11px] text-[#FF5A16]">{docUploadParticipant.playerId} &bull; {docUploadParticipant.institution}</div>
              </div>

              <div>
                <label className="block font-rajdhani text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  DOCUMENT TYPE *
                </label>
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 text-slate-900 rounded-xl px-3.5 py-2.5 text-xs transition-colors focus:outline-none"
                >
                  <option value="UNIVERSITY_ID">University ID Card</option>
                  <option value="SSLC">SSLC / 10th Marks Card</option>
                  <option value="PUC">PUC / 12th Marks Card</option>
                  <option value="AADHAAR">Identity / Aadhaar Card Document</option>
                  <option value="OTHER">Other Official Document</option>
                </select>
              </div>

              <div>
                <label className="block font-rajdhani text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  SELECT DOCUMENT FILE (IMAGE OR PDF) *
                </label>
                <label className="w-full p-4 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 hover:bg-blue-50/50 transition-colors">
                  <Upload className="w-6 h-6 text-slate-500" />
                  <span className="font-rajdhani text-xs font-bold uppercase text-slate-700">
                    {uploadingDoc ? "UPLOADING & VERIFYING..." : "CLICK TO CHOOSE FILE & UPLOAD"}
                  </span>
                  <span className="text-[10px] text-slate-400">Supports JPEG, PNG, or PDF</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={uploadingDoc}
                    className="hidden"
                    onChange={handleUploadDocumentForParticipant}
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: LIVE CAMERA CAPTURE */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isCameraActive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="bg-white border-2 border-[#FF5A16] rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-rajdhani text-sm font-black text-slate-900 uppercase tracking-wider">
                  MANDATORY PHOTO CAPTURE {activePhotoTarget === "MANAGER" ? "(TEAM MANAGER)" : typeof activePhotoTarget === "number" ? `(ATHLETE 0${activePhotoTarget + 1})` : ""}
                </span>
                <button type="button" onClick={stopCamera} className="p-1 text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cameraError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                  {cameraError}
                </div>
              ) : cameraPreview ? (
                <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-200">
                  <img src={cameraPreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative border border-slate-200">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex gap-2">
                {cameraPreview ? (
                  <>
                    <button
                      type="button"
                      onClick={applyCapturedPhoto}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-rajdhani text-xs font-bold uppercase rounded-xl shadow-xs cursor-pointer"
                    >
                      USE THIS PHOTO ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setCameraPreview(null)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-rajdhani text-xs font-bold uppercase rounded-xl cursor-pointer"
                    >
                      RETAKE
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="w-full py-2.5 bg-[#FF5A16] hover:bg-[#ea4e0e] text-white font-rajdhani text-xs font-bold uppercase rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Camera className="w-4 h-4" /> SNAP PHOTO
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: PARTICIPANT ACCREDITATION PASS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedParticipantForPass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-rajdhani text-xs font-bold text-slate-500 uppercase tracking-widest">
                  OFFICIAL TOURNAMENT PASS
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedParticipantForPass(null)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ID Badge Pass Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 border-4 border-[#FF5A16] shadow-xl text-center space-y-4">
                <div className="space-y-1">
                  <div className="font-rajdhani text-[10px] text-[#FF5A16] font-black uppercase tracking-widest">
                    SOUTH ZONE WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    KLE Technological University, Hubballi
                  </div>
                </div>

                {/* Photo */}
                <div className="w-28 h-28 mx-auto rounded-xl overflow-hidden border-2 border-white shadow-md bg-slate-800">
                  {selectedParticipantForPass.photoUrl ? (
                    <img src={selectedParticipantForPass.photoUrl} alt="Athlete" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-slate-400 m-auto mt-8" />
                  )}
                </div>

                {/* Details */}
                <div>
                  <h3 className="font-rajdhani text-xl font-black uppercase tracking-wide text-white">
                    {selectedParticipantForPass.name}
                  </h3>
                  <div className="font-mono text-xs text-[#FF5A16] font-bold">
                    {selectedParticipantForPass.playerId}
                  </div>
                  <div className="text-xs text-slate-300 font-bold mt-1">
                    {selectedParticipantForPass.institution}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {selectedParticipantForPass.role || "ATHLETE"} &bull; {selectedParticipantForPass.state}
                  </div>
                </div>

                {/* Real Scannable QR */}
                <div className="bg-white p-2.5 rounded-xl inline-block border border-slate-300 shadow-sm">
                  <PortalQrCode
                    value={selectedParticipantForPass.qrToken || `sz26_part_${selectedParticipantForPass.playerId}`}
                    size={120}
                    showActions={false}
                  />
                </div>

                <div className="text-[10px] font-mono text-emerald-400 font-bold tracking-wider uppercase">
                  ACCREDITATION VERIFIED &bull; DESK 01
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 bg-[#FF5A16] hover:bg-[#ea4e0e] text-white font-rajdhani text-xs font-black uppercase rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> PRINT BADGE
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedParticipantForPass(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-rajdhani text-xs font-bold uppercase rounded-xl cursor-pointer"
                >
                  CLOSE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: VIEW QR MODAL */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedParticipantForQr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="bg-white border-2 border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-rajdhani text-xs font-bold text-slate-500 uppercase">OFFICIAL QR PASS</span>
                <button type="button" onClick={() => setSelectedParticipantForQr(null)} className="p-1 text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h4 className="font-rajdhani text-lg font-black uppercase text-slate-900">{selectedParticipantForQr.name}</h4>
                <p className="font-mono text-xs text-[#FF5A16] font-bold">{selectedParticipantForQr.playerId}</p>
                <p className="text-xs text-slate-500">{selectedParticipantForQr.institution}</p>
              </div>

              <div className="bg-white p-3 rounded-2xl border-2 border-slate-300 inline-block shadow-sm">
                <PortalQrCode
                  value={selectedParticipantForQr.qrToken || `sz26_part_${selectedParticipantForQr.playerId}`}
                  size={160}
                  showActions={true}
                />
              </div>

              <p className="text-[11px] text-slate-400 font-sans">
                Scan with phone camera or Document Scanner (/scanner) for instant resolution.
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL 4: FIND DETAILS SEARCH */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isFindDetailsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="bg-white border-2 border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-[#FF5A16]" />
                  <h3 className="font-rajdhani text-lg font-black text-slate-900 uppercase">
                    FIND PARTICIPANT / REGISTRATION DETAILS
                  </h3>
                </div>
                <button type="button" onClick={() => setIsFindDetailsOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <input
                  type="text"
                  autoFocus
                  placeholder="Search by Athlete Name, Participant ID, Mobile, Email, or University..."
                  value={findSearchQuery}
                  onChange={(e) => setFindSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-[#FF5A16] text-slate-900 rounded-xl px-4 py-3 text-xs transition-colors focus:outline-none font-sans"
                />
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {searchResults.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    {findSearchQuery.trim() ? "No matching records found." : "Type above to search existing registrations."}
                  </div>
                ) : (
                  searchResults.map((res) => (
                    <div key={res.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-200 border border-slate-300 shrink-0">
                          {res.photoUrl ? (
                            <img src={res.photoUrl} alt={res.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-slate-400 m-auto mt-2" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{res.name} ({res.role})</div>
                          <div className="font-mono text-[10px] text-[#FF5A16] font-bold">{res.playerId} &bull; {res.institution}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedParticipantForPass(res);
                          setIsFindDetailsOpen(false);
                        }}
                        className="px-3 py-1.5 bg-[#FF5A16] text-white font-rajdhani text-xs font-bold uppercase rounded-lg shadow-xs cursor-pointer"
                      >
                        OPEN RECORD
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL 5: VIEW ALL ROOMS INVENTORY */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isViewAllRoomsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="bg-white border-2 border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Bed className="w-5 h-5 text-[#FF5A16]" />
                  <h3 className="font-rajdhani text-lg font-black text-slate-900 uppercase">
                    ALL ACCOMMODATION ROOMS &amp; BED TOPOLOGY
                  </h3>
                </div>
                <button type="button" onClick={() => setIsViewAllRoomsOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 space-y-4 pr-1">
                {rooms.map((room) => {
                  const availCount = room.beds?.filter((b) => b.status === "AVAILABLE").length || 0;
                  return (
                    <div key={room.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-rajdhani font-black text-sm text-slate-900">
                            {room.hostelName} &bull; Room {room.roomNumber}
                          </span>
                          <span className="text-xs text-slate-500 ml-2">({room.floorNumber})</span>
                        </div>
                        <span className={`font-rajdhani text-xs font-bold px-2.5 py-0.5 rounded-full ${availCount > 0 ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                          }`}>
                          {availCount} / {room.capacity || 5} AVAILABLE
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-2 pt-1">
                        {room.beds?.map((b) => (
                          <div
                            key={b.id}
                            className={`p-2 rounded-lg border text-center font-mono text-[11px] ${b.status === "AVAILABLE"
                              ? "bg-emerald-100 border-emerald-300 text-emerald-900 font-bold"
                              : "bg-slate-200 border-slate-300 text-slate-500"
                              }`}
                          >
                            <div>{b.bedNumber}</div>
                            <div>{b.status}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
