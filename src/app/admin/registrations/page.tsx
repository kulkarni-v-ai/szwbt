"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { useAuth } from "@/lib/rbac/useAuth";
import { CapturedDocument, generateCompiledPdf, downloadFile } from "@/lib/documentPdf";
import { PortalQrCode } from "@/components/qr/PortalQrCode";
import {
  UserCheck,
  FileText,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Eye,
  QrCode,
  Printer,
  Shield,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  Check,
  DollarSign,
  CreditCard,
  Building,
  Phone,
  Mail,
  MapPin,
  Award,
  RefreshCw,
  X,
  Radio,
  Clock,
  Camera,
  Upload,
  ChevronRight,
  Plus,
  Trash2,
  AlertCircle,
  Download,
  Users,
  Copy,
  SlidersHorizontal,
  ChevronLeft,
} from "lucide-react";

// South Zone States
const SOUTH_ZONE_STATES = [
  "Karnataka",
  "Tamil Nadu",
  "Kerala",
  "Andhra Pradesh",
  "Telangana",
  "Maharashtra",
  "Goa",
  "Puducherry",
];

// Configured Universities / Institutions (database-backed, suggestions only)
const INSTITUTIONS_SUGGESTIONS = [
  "KLE Technological University",
  "Karnataka State University",
  "Kerala Sports Academy",
  "Tamil Nadu Badminton Institute",
  "Telangana Sports College",
  "Bangalore University",
  "Anna University, Chennai",
  "Osmania University, Hyderabad",
  "Calicut University, Kerala",
  "Andhra University, Visakhapatnam",
  "University of Mysore",
  "SRM Institute of Science and Technology",
];

interface RegistrationRecord {
  id: string;
  playerId: string;
  name: string;
  email: string;
  phone: string;
  institution: string;
  state: string;
  category: string;
  status: string;
  teamId: string | null;
  teamName: string;
  teamCode: string;
  documentsStatus: string;
  documentsCount: number;
  paymentStatus: string;
  time: string;
  date: string;
  operator: string;
  qrToken?: string | null;
}

interface TeamOption {
  id: string;
  teamCode: string;
  name: string;
  institution: string;
  state: string;
  managerName: string;
  managerPhone: string;
  captainName: string;
  status: string;
  memberCount: number;
  qrToken?: string | null;
  members?: any[];
}

export default function RegistrationAdminDashboard() {
  const currentRole = ROLE_MATRIX.find((r) => r.roleId === "registration_admin")!;
  const { user, hasPermission } = useAuth();

  // ─────────────────────────────────────────────────────────────
  // 1. DASHBOARD DATA & KPIS STATE
  // ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<{
    todayRegistrations: number | null;
    totalParticipants: number | null;
    totalTeams: number | null;
    pendingRegistrations: number | null;
    documentsPending: number | null;
    paymentsPending: number | null;
    hasData: boolean;
  }>({
    todayRegistrations: null,
    totalParticipants: null,
    totalTeams: null,
    pendingRegistrations: null,
    documentsPending: null,
    paymentsPending: null,
    hasData: false,
  });

  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [existingTeams, setExistingTeams] = useState<TeamOption[]>([]);
  const [pendingActions, setPendingActions] = useState<any[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchType, setSearchType] = useState<"ALL" | "PARTICIPANT" | "TEAM">("ALL");

  // Global "FIND DETAILS" Modal State (Section 23)
  const [isFindDetailsOpen, setIsFindDetailsOpen] = useState(false);
  const [findDetailsQuery, setFindDetailsQuery] = useState("");
  const [findDetailsResults, setFindDetailsResults] = useState<{ participants: any[]; teams: any[] }>({
    participants: [],
    teams: [],
  });
  const [loadingFindDetails, setLoadingFindDetails] = useState(false);

  // Standalone QR Code View Modal (Section 8)
  const [viewingQrData, setViewingQrData] = useState<{
    title?: string;
    value: string;
    participantName?: string;
    institution?: string;
    referenceCode?: string;
    type?: "PARTICIPANT" | "TEAM";
  } | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const triggerToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch Live Data from Backend API
  const fetchDashboardData = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      if (searchQuery.trim()) q.set("q", searchQuery.trim());
      if (statusFilter !== "ALL") q.set("status", statusFilter);
      if (searchType !== "ALL") q.set("type", searchType);

      const res = await fetch(`/api/admin/registrations?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setKpis(data.kpis);
          setRegistrations(data.registrations || []);
          setExistingTeams(data.teams || []);
          setPendingActions(data.pendingActions || []);
        }
      }
    } catch (err) {
      console.error("Failed to load registration data:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, searchType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDashboardData();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchDashboardData]);

  // Debounced "FIND DETAILS" Search
  useEffect(() => {
    if (!isFindDetailsOpen) return;
    const timer = setTimeout(async () => {
      if (!findDetailsQuery.trim()) {
        setFindDetailsResults({ participants: [], teams: [] });
        return;
      }
      setLoadingFindDetails(true);
      try {
        const res = await fetch(`/api/registration/search?q=${encodeURIComponent(findDetailsQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setFindDetailsResults({
              participants: data.participants || [],
              teams: data.teams || [],
            });
          }
        }
      } catch (err) {
        console.error("Find Details Search Error:", err);
      } finally {
        setLoadingFindDetails(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [findDetailsQuery, isFindDetailsOpen]);

  // ─────────────────────────────────────────────────────────────
  // 2. OPERATIONAL 5-STEP WORKFLOW STATE (SECTIONS 1, 2, 3, 4, 10, 11, 12)
  // ─────────────────────────────────────────────────────────────
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // STEP 01: UNIVERSITY / TEAM FIRST STATE (Section 2)
  const [teamWorkflowTab, setTeamWorkflowTab] = useState<"FIND" | "CREATE">("FIND");
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [teamSearchResults, setTeamSearchResults] = useState<any[]>([]);
  const [isSearchingTeams, setIsSearchingTeams] = useState(false);

  // Creating University / Team Form
  const [newTeamInstitution, setNewTeamInstitution] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamState, setNewTeamState] = useState(SOUTH_ZONE_STATES[0]);
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [captainName, setCaptainName] = useState("");

  // Selected Team Context
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

  // Search Teams in Step 01
  const searchTeamsInStep1 = async (query: string) => {
    setTeamSearchQuery(query);
    if (!query.trim()) {
      setTeamSearchResults([]);
      return;
    }
    setIsSearchingTeams(true);
    try {
      const res = await fetch(`/api/registration/teams?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.teams)) {
          setTeamSearchResults(data.teams);
        }
      }
    } catch (err) {
      console.error("Team search failed:", err);
    } finally {
      setIsSearchingTeams(false);
    }
  };

  // Create University / Team & Mint QR immediately
  const handleCreateTeam = async () => {
    if (!newTeamInstitution.trim() || !newTeamName.trim()) {
      triggerToast("University / Institution Name and Team Name are required", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/registration/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeamName.trim(),
          institution: newTeamInstitution.trim(),
          state: newTeamState,
          managerName: managerName.trim() || undefined,
          managerPhone: managerPhone.trim() || undefined,
          captainName: captainName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast("✓ UNIVERSITY / TEAM CREATED & TEAM QR MINTED", "success");
        setSelectedTeam({
          ...data.team,
          qrToken: data.qr?.token,
          memberCount: 0,
          members: [],
        });
        setState(data.team.state);
        setInstitution(data.team.institution);
        setCurrentStep(2); // Advance to Participant Entry
        fetchDashboardData();
      } else {
        triggerToast(data.error || "Failed to create team", "error");
      }
    } catch (err: any) {
      triggerToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 02: PARTICIPANT ENTRY & ROSTER (Section 3)
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [state, setState] = useState(SOUTH_ZONE_STATES[0]);
  const [institution, setInstitution] = useState(INSTITUTIONS_SUGGESTIONS[0]);

  // Duplicate Check
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

  useEffect(() => {
    if (duplicateDismissed) return;
    if (fullName.trim().length < 3 && mobile.trim().length < 5 && email.trim().length < 5) {
      setDuplicateMatches([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/participants/duplicate-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName,
            email,
            phone: mobile,
            institution,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.hasDuplicate && data.duplicates?.length > 0) {
            setDuplicateMatches(data.duplicates);
          } else {
            setDuplicateMatches([]);
          }
        }
      } catch (e) {
        // ignore
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [fullName, email, mobile, institution, duplicateDismissed]);

  // Refresh Team Roster
  const refreshTeamRoster = async (teamId: string) => {
    try {
      const res = await fetch(`/api/registration/teams?q=${teamId}`);
      if (res.ok) {
        const data = await res.json();
        const found = data.teams?.find((t: any) => t.id === teamId);
        if (found) {
          setSelectedTeam(found);
        }
      }
    } catch (err) {
      console.error("Failed to refresh team roster:", err);
    }
  };

  // STEP 03: IMMEDIATE QR GENERATION (Section 4)
  const [activeParticipant, setActiveParticipant] = useState<any | null>(null);
  const [activeQrPass, setActiveQrPass] = useState<{ token: string; isGeneratedImmediately: boolean } | null>(null);

  // Save Participant & Generate QR IMMEDIATELY (CRITICAL REQUIREMENT)
  const handleSaveParticipantAndGenerateQr = async () => {
    if (!fullName.trim() || !mobile.trim() || !state.trim() || !institution.trim()) {
      triggerToast("Full Name, Mobile Number, State, and Institution are required.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/registration/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          mobile: mobile.trim(),
          state: state.trim(),
          institution: institution.trim(),
          teamId: selectedTeam?.id || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast("✓ PARTICIPANT CREATED & QR GENERATED IMMEDIATELY", "success");
        setActiveParticipant(data.participant);
        setActiveQrPass({
          token: data.qr.token,
          isGeneratedImmediately: true,
        });

        // Initialize document capture slots
        setDocuments([
          { id: "doc-1", type: "UNIVERSITY_ID", label: "University ID", mimeType: "image/jpeg", capturedAt: "", status: "NOT_CAPTURED" },
          { id: "doc-2", type: "SSLC", label: "SSLC Marks Card", mimeType: "image/jpeg", capturedAt: "", status: "NOT_CAPTURED" },
          { id: "doc-3", type: "PUC", label: "PUC Marks Card", mimeType: "image/jpeg", capturedAt: "", status: "NOT_CAPTURED" },
          { id: "doc-4", type: "OTHER", label: "Other Document", mimeType: "image/jpeg", capturedAt: "", status: "NOT_CAPTURED" },
        ]);

        // IMMEDIATELY ADVANCE TO STEP 3: QR GENERATED
        setCurrentStep(3);
        setIsAddingParticipant(false);
        fetchDashboardData();

        if (selectedTeam?.id) {
          refreshTeamRoster(selectedTeam.id);
        }
      } else if (res.status === 409) {
        triggerToast(`Duplicate participant record: ${data.error}`, "error");
      } else {
        triggerToast(data.error || "Failed to save participant", "error");
      }
    } catch (err: any) {
      triggerToast(`Network error: ${err.message}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Continue Existing Participant into Document/Verification Workflow
  const handleContinueParticipantWorkflow = (p: any) => {
    setActiveParticipant({
      id: p.id,
      playerId: p.playerId,
      name: p.name,
      email: p.email,
      phone: p.phone,
      institution: p.institution,
      state: p.state,
      status: p.status,
      teamId: selectedTeam?.id || null,
      teamName: selectedTeam?.name || "Independent Contingent",
    });

    if (p.qrToken) {
      setActiveQrPass({
        token: p.qrToken,
        isGeneratedImmediately: false,
      });
    }

    setDocuments([
      { id: "doc-1", type: "UNIVERSITY_ID", label: "University ID", mimeType: "image/jpeg", capturedAt: "", status: p.verifiedDocumentsCount > 0 ? "READY" : "NOT_CAPTURED" },
      { id: "doc-2", type: "SSLC", label: "SSLC Marks Card", mimeType: "image/jpeg", capturedAt: "", status: p.verifiedDocumentsCount > 1 ? "READY" : "NOT_CAPTURED" },
      { id: "doc-3", type: "PUC", label: "PUC Marks Card", mimeType: "image/jpeg", capturedAt: "", status: p.verifiedDocumentsCount > 2 ? "READY" : "NOT_CAPTURED" },
      { id: "doc-4", type: "OTHER", label: "Other Document", mimeType: "image/jpeg", capturedAt: "", status: "NOT_CAPTURED" },
    ]);

    setCurrentStep(4); // Advance to Documents
  };

  // STEP 04: DOCUMENT CAPTURE & VERIFICATION (Sections 10 & 11)
  const [documents, setDocuments] = useState<CapturedDocument[]>([
    { id: "doc-1", type: "UNIVERSITY_ID", label: "University ID", mimeType: "image/jpeg", capturedAt: "", status: "NOT_CAPTURED" },
    { id: "doc-2", type: "SSLC", label: "SSLC Marks Card", mimeType: "image/jpeg", capturedAt: "", status: "NOT_CAPTURED" },
    { id: "doc-3", type: "PUC", label: "PUC Marks Card", mimeType: "image/jpeg", capturedAt: "", status: "NOT_CAPTURED" },
    { id: "doc-4", type: "OTHER", label: "Other Document", mimeType: "image/jpeg", capturedAt: "", status: "NOT_CAPTURED" },
  ]);

  // Camera & Capture Workflow State
  const [activeCameraDocId, setActiveCameraDocId] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<{ docId: string; dataUrl: string } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [fileUploadTargetDocId, setFileUploadTargetDocId] = useState<string | null>(null);

  const stopCameraStream = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setActiveCameraDocId(null);
    setCameraError(null);
  }, [cameraStream]);

  const startCamera = async (docId: string) => {
    setActiveCameraDocId(docId);
    setCameraError(null);
    setCapturedPreview(null);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        nativeCameraInputRef.current?.click();
      }
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setCameraError("Camera stream unavailable. Using native device camera capture.");
      nativeCameraInputRef.current?.click();
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !activeCameraDocId) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

    setCapturedPreview({ docId: activeCameraDocId, dataUrl });
    stopCameraStream();
  };

  const handleNativeCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCameraDocId) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCapturedPreview({ docId: activeCameraDocId, dataUrl });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fileUploadTargetDocId) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await uploadDocumentDirectly(fileUploadTargetDocId, dataUrl, file.name, file.type);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Upload Document to Backend (Status becomes READY, NOT VERIFIED)
  const uploadDocumentDirectly = async (docId: string, dataUrl: string, fileName?: string, mimeType?: string) => {
    const targetDoc = documents.find((d) => d.id === docId);
    if (!targetDoc) return;

    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: "UPLOADING", dataUrl } : d))
    );

    try {
      const res = await fetch("/api/registration/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: activeParticipant?.id,
          type: targetDoc.type,
          fileName: fileName || `${targetDoc.type.toLowerCase()}.jpg`,
          dataUrl,
          mimeType: mimeType || "image/jpeg",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Mark as READY (Uploading is not verification)
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === docId
              ? {
                  ...d,
                  status: "READY",
                  capturedAt: new Date().toLocaleTimeString(),
                  url: data.document?.filePath || data.document?.url,
                  fileName: data.document?.fileName,
                  id: data.document?.id || d.id,
                }
              : d
          )
        );
        triggerToast(`DOCUMENT READY FOR INSPECTION: ${targetDoc.label}`, "info");
      } else {
        setDocuments((prev) =>
          prev.map((d) => (d.id === docId ? { ...d, status: "FAILED" } : d))
        );
        triggerToast(`UPLOAD FAILED: ${data.error || "Server processing failed"}`, "error");
      }
    } catch (err: any) {
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status: "FAILED" } : d))
      );
      triggerToast(`NETWORK ERROR: ${err.message}`, "error");
    } finally {
      setCapturedPreview(null);
    }
  };

  const handleAcceptPreview = () => {
    if (!capturedPreview) return;
    uploadDocumentDirectly(capturedPreview.docId, capturedPreview.dataUrl);
  };

  const handleRetake = () => {
    if (!capturedPreview) return;
    const docId = capturedPreview.docId;
    setCapturedPreview(null);
    startCamera(docId);
  };

  // Explicit Verification Controls (Section 11)
  const handleVerifySingleDoc = async (docId: string) => {
    const targetDoc = documents.find((d) => d.id === docId);
    if (!targetDoc) return;
    try {
      const res = await fetch("/api/registration/documents/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: activeParticipant?.id,
          documentId: targetDoc.id.startsWith("doc-") ? undefined : targetDoc.id,
          documentType: targetDoc.type,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === docId ? { ...d, status: "VERIFIED" } : d))
        );
        triggerToast(`✓ DOCUMENT VERIFIED: ${targetDoc.label}`, "success");
      } else {
        triggerToast(data.error || "Verification rejected", "error");
      }
    } catch (err: any) {
      triggerToast(err.message, "error");
    }
  };

  const handleVerifyAllDocs = async () => {
    if (!activeParticipant?.id) {
      triggerToast("No active participant selected", "error");
      return;
    }
    try {
      const res = await fetch("/api/registration/documents/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: activeParticipant.id,
          markAll: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDocuments((prev) =>
          prev.map((d) => (d.status === "READY" ? { ...d, status: "VERIFIED" } : d))
        );
        triggerToast("✓ DOCUMENTS VERIFIED", "success");
      } else {
        triggerToast(data.error || "Verification rejected", "error");
      }
    } catch (err: any) {
      triggerToast(err.message, "error");
    }
  };

  // STEP 05: PAYMENT & COMPLETION (Section 12)
  const registrationFee = 2500;
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI">("CASH");
  const [amountReceived, setAmountReceived] = useState<number>(2500);
  const [upiUtr, setUpiUtr] = useState<string>("");
  const [isPaymentVerified, setIsPaymentVerified] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedSuccessData, setCompletedSuccessData] = useState<any | null>(null);

  // Complete Registration Transaction (Section 12)
  const handleCompleteRegistration = async () => {
    if (!activeParticipant?.id) return;
    if (paymentMethod === "UPI" && !upiUtr.trim()) {
      triggerToast("UPI Transaction Reference (UTR) is required", "error");
      return;
    }
    if (!isPaymentVerified) {
      triggerToast("Please check the Payment Verification box before completing registration.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/registration/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: activeParticipant.id,
          paymentMethod,
          utr: paymentMethod === "UPI" ? upiUtr.trim() : undefined,
          amountPaid: amountReceived,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast("REGISTRATION COMPLETED ✓", "success");
        setCompletedSuccessData({
          participantId: data.participant.id,
          playerId: data.participant.playerId,
          athleteName: data.participant.name,
          teamId: data.participant.teamId,
          teamCode: data.participant.teamCode,
          teamName: data.participant.teamName,
          participantQrToken: data.participant.qrToken || activeQrPass?.token || null,
          teamQrToken: selectedTeam?.qrToken || null,
          payment: data.payment,
        });
        fetchDashboardData();
        if (selectedTeam?.id) {
          refreshTeamRoster(selectedTeam.id);
        }
      } else {
        triggerToast(data.error || "Registration completion rejected", "error");
      }
    } catch (err: any) {
      triggerToast(err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset workflow form
  const resetWorkflow = () => {
    setSelectedTeam(null);
    setTeamSearchQuery("");
    setTeamSearchResults([]);
    setNewTeamName("");
    setNewTeamInstitution("");
    setNewTeamState(SOUTH_ZONE_STATES[0]);
    setFullName("");
    setEmail("");
    setMobile("");
    setState(SOUTH_ZONE_STATES[0]);
    setInstitution(INSTITUTIONS_SUGGESTIONS[0]);
    setDuplicateMatches([]);
    setDuplicateDismissed(false);
    setActiveParticipant(null);
    setActiveQrPass(null);
    setIsAddingParticipant(false);
    setDocuments([
      { id: "doc-1", type: "UNIVERSITY_ID", label: "University ID", mimeType: "image/jpeg", capturedAt: "", status: "NOT_CAPTURED" },
      { id: "doc-2", type: "SSLC", label: "SSLC Marks Card", mimeType: "image/jpeg", capturedAt: "", status: "NOT_CAPTURED" },
      { id: "doc-3", type: "PUC", label: "PUC Marks Card", mimeType: "image/jpeg", capturedAt: "", status: "NOT_CAPTURED" },
      { id: "doc-4", type: "OTHER", label: "Other Document", mimeType: "image/jpeg", capturedAt: "", status: "NOT_CAPTURED" },
    ]);
    setPaymentMethod("CASH");
    setAmountReceived(2500);
    setUpiUtr("");
    setCurrentStep(1);
    setCompletedSuccessData(null);
    setIsWorkflowOpen(false);
  };

  // Quick Action: Selected dossier for inspection
  const [selectedDossierRecord, setSelectedDossierRecord] = useState<RegistrationRecord | null>(null);

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="space-y-6 pb-16">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TOAST NOTIFICATION BANNER */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-4 right-4 z-50 px-4 py-3 border-2 font-pixel text-xs tracking-wider flex items-center gap-3 shadow-[4px_4px_0px_#000] ${
                notification.type === "success"
                  ? "bg-emerald-950 border-emerald-500 text-emerald-200"
                  : notification.type === "error"
                  ? "bg-rose-950 border-rose-500 text-rose-200"
                  : "bg-[#07101D] border-[#18D8D0] text-[#18D8D0]"
              }`}
            >
              {notification.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {notification.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-400" />}
              {notification.type === "info" && <Shield className="w-4 h-4 text-[#18D8D0]" />}
              <span>{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* PAGE IDENTITY HEADER */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="bg-[#07101D] border-2 border-[#18D8D0]/40 p-4 sm:p-6 shadow-[3px_3px_0px_#000] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="font-pixel text-[9px] text-[#18D8D0] tracking-widest uppercase mb-1">
              SOUTH ZONE WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026
            </div>
            <h1 className="font-pixel text-xl sm:text-2xl text-[#F4E6CE] font-bold tracking-tight">
              REGISTRATION <span className="text-[#FF5A16]">DESK</span>
            </h1>
            <p className="font-sans text-xs text-[#91A0AE] mt-0.5">
              UNIVERSITY &bull; TEAM &bull; PARTICIPANT ACCREDITATION &bull; DOCUMENT VERIFICATION
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            {/* Authenticated Staff Dossier Badge */}
            <div className="px-3 py-1.5 bg-[#050914] border border-[#18D8D0]/30 font-mono text-[11px] text-[#91A0AE] flex items-center gap-3">
              <div>
                <span className="text-[#18D8D0] font-pixel text-[9px]">STAFF:</span>{" "}
                <span className="text-[#F4E6CE] font-semibold">{user?.name || "Registration Desk Operator"}</span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex items-center gap-1.5 text-emerald-400 font-pixel text-[9px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>DESK ACTIVE</span>
              </div>
            </div>

            {/* PROMINENT ACTION: [ FIND DETAILS ] (SECTION 23) */}
            <button
              id="btn-find-details"
              onClick={() => {
                setIsFindDetailsOpen(true);
              }}
              className="px-4 py-2.5 bg-[#050914] hover:bg-[#07101D] text-[#18D8D0] border-2 border-[#18D8D0] font-pixel text-xs flex items-center gap-2 cursor-pointer shadow-[2px_2px_0px_#000]"
            >
              <Search className="w-3.5 h-3.5 text-[#18D8D0]" />
              <span>FIND DETAILS</span>
            </button>

            {/* PRIMARY ACTION: + NEW REGISTRATION */}
            <button
              id="btn-new-registration"
              onClick={() => {
                resetWorkflow();
                setIsWorkflowOpen(true);
              }}
              className="px-5 py-2.5 bg-[#FF5A16] hover:bg-[#d94e16] text-white font-pixel text-xs sm:text-sm font-bold tracking-wider flex items-center gap-2 transition-all shadow-[3px_3px_0px_#000] cursor-pointer border-2 border-black"
            >
              <Plus className="w-4 h-4" />
              <span>+ NEW REGISTRATION</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* KPI STRIP */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "TODAY'S REGISTRATIONS", value: kpis.todayRegistrations, fallback: "—", color: "text-[#18D8D0]" },
            { label: "TOTAL PARTICIPANTS", value: kpis.totalParticipants, fallback: "—", color: "text-[#F4E6CE]" },
            { label: "TOTAL TEAMS", value: kpis.totalTeams, fallback: "—", color: "text-amber-400" },
            { label: "PENDING REGISTRATIONS", value: kpis.pendingRegistrations, fallback: "—", color: "text-[#FF5A16]" },
            { label: "DOCUMENTS PENDING", value: kpis.documentsPending, fallback: "—", color: "text-rose-400" },
            { label: "PAYMENTS PENDING", value: kpis.paymentsPending, fallback: "—", color: "text-yellow-400" },
          ].map((kpi, idx) => (
            <div
              key={idx}
              className="p-3 bg-[#07101D] border-2 border-[#18D8D0]/30 shadow-[2px_2px_0px_#000] flex flex-col justify-between"
            >
              <span className="font-pixel text-[9px] text-[#91A0AE] tracking-wider leading-tight uppercase">
                {kpi.label}
              </span>
              <span className={`font-pixel text-xl sm:text-2xl font-bold mt-2 ${kpi.color}`}>
                {loading ? "..." : kpi.value !== null && kpi.value !== undefined ? kpi.value : kpi.fallback}
              </span>
            </div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* RECENT REGISTRATIONS (LIVE TABLE / CARDS) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="bg-[#07101D] border-2 border-[#18D8D0]/40 shadow-[3px_3px_0px_#000] overflow-hidden">
          <div className="p-4 border-b border-[#18D8D0]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#18D8D0]" />
              <h2 className="font-pixel text-xs sm:text-sm text-[#F4E6CE] font-bold tracking-wider">
                REGISTERED CONTINGENTS &amp; PARTICIPANTS
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-[#91A0AE]">
                {registrations.length} records loaded
              </span>
              <button
                onClick={fetchDashboardData}
                className="p-1.5 bg-[#050914] text-[#18D8D0] border border-[#18D8D0]/30 hover:bg-[#07101D] cursor-pointer"
                title="Refresh registrations"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-[#91A0AE] font-pixel text-xs animate-pulse">
              SYNCING REGISTRATION DATABASE...
            </div>
          ) : registrations.length === 0 ? (
            <div className="p-12 text-center text-[#91A0AE] font-pixel text-xs">
              NO REGISTRATIONS RECORDED YET. CLICK &quot;+ NEW REGISTRATION&quot; TO BEGIN.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-[#050914] border-b border-[#18D8D0]/30 font-pixel text-[9px] text-[#18D8D0] uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">PARTICIPANT</th>
                      <th className="py-3 px-4">TEAM</th>
                      <th className="py-3 px-4">INSTITUTION</th>
                      <th className="py-3 px-4">QR</th>
                      <th className="py-3 px-4">DOCUMENTS</th>
                      <th className="py-3 px-4">PAYMENT</th>
                      <th className="py-3 px-4">STATUS</th>
                      <th className="py-3 px-4 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#18D8D0]/10 text-[#F4E6CE]">
                    {registrations.map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#18D8D0]/5 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold">{rec.name}</div>
                          <div className="font-mono text-[10px] text-[#91A0AE]">{rec.playerId}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          <div className="text-[#18D8D0] font-semibold">{rec.teamName}</div>
                          <div className="text-[10px] text-[#91A0AE]">{rec.teamCode}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div>{rec.institution}</div>
                          <div className="text-[10px] text-[#91A0AE]">{rec.state}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-500 text-emerald-400 font-pixel text-[9px]">
                            QR ✓
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 bg-[#050914] border border-[#18D8D0]/40 text-[#18D8D0] font-mono text-[10px]">
                            {rec.documentsStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 font-pixel text-[9px] ${
                              rec.paymentStatus === "PAID"
                                ? "bg-emerald-950 border border-emerald-500 text-emerald-400"
                                : "bg-amber-950 border border-amber-500 text-amber-300"
                            }`}
                          >
                            {rec.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 font-pixel text-[9px] ${
                              rec.status === "APPROVED"
                                ? "bg-emerald-950/70 border border-emerald-500 text-emerald-300"
                                : "bg-amber-950/70 border border-amber-500 text-amber-300"
                            }`}
                          >
                            {rec.status === "APPROVED" ? "COMPLETED ✓" : rec.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 font-pixel text-[9px]">
                            <button
                              onClick={() => setSelectedDossierRecord(rec)}
                              className="px-2.5 py-1 bg-[#050914] hover:bg-[#18D8D0]/20 text-[#18D8D0] border border-[#18D8D0]/40 cursor-pointer"
                            >
                              [VIEW]
                            </button>
                            <button
                              onClick={() =>
                                setViewingQrData({
                                  title: "SOUTH ZONE WOMEN'S BADMINTON CHAMPIONSHIP 2026",
                                  value: rec.qrToken || `sz26_part_${rec.id.replace(/-/g, "").slice(0, 16)}`,
                                  participantName: rec.name,
                                  institution: rec.institution,
                                  referenceCode: rec.playerId,
                                  type: "PARTICIPANT",
                                })
                              }
                              className="px-2.5 py-1 bg-[#FF5A16] hover:bg-[#d94e16] text-white cursor-pointer shadow-[1px_1px_0px_#000]"
                            >
                              [OPEN QR]
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="block lg:hidden divide-y divide-[#18D8D0]/20">
                {registrations.map((rec) => (
                  <div key={rec.id} className="p-4 space-y-2 hover:bg-[#18D8D0]/5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-[#F4E6CE]">{rec.name}</div>
                        <div className="font-mono text-xs text-[#18D8D0]">{rec.playerId}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 font-pixel text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-500">
                          QR ✓
                        </span>
                        <span
                          className={`px-2 py-0.5 font-pixel text-[8px] ${
                            rec.status === "APPROVED"
                              ? "bg-emerald-950 border border-emerald-500 text-emerald-400"
                              : "bg-amber-950 border border-amber-500 text-amber-300"
                          }`}
                        >
                          {rec.status === "APPROVED" ? "COMPLETED ✓" : rec.status}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-[#91A0AE]">
                      <span>{rec.institution}</span> &bull; <span>{rec.state}</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-[#18D8D0]/10">
                      <div className="text-[#18D8D0] font-mono text-[11px]">{rec.teamName}</div>
                      <div className="flex items-center gap-2 font-pixel text-[9px]">
                        <button
                          onClick={() => setSelectedDossierRecord(rec)}
                          className="px-2 py-1 bg-[#050914] border border-[#18D8D0]/40 text-[#18D8D0]"
                        >
                          [VIEW]
                        </button>
                        <button
                          onClick={() =>
                            setViewingQrData({
                              title: "SOUTH ZONE WOMEN'S BADMINTON CHAMPIONSHIP 2026",
                              value: rec.qrToken || `sz26_part_${rec.id.replace(/-/g, "").slice(0, 16)}`,
                              participantName: rec.name,
                              institution: rec.institution,
                              referenceCode: rec.playerId,
                              type: "PARTICIPANT",
                            })
                          }
                          className="px-2 py-1 bg-[#FF5A16] text-white"
                        >
                          [OPEN QR]
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* OPERATIONAL 5-STEP WORKFLOW MODAL (SECTIONS 1, 2, 3, 4, 10, 11, 12) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {isWorkflowOpen && (
            <div className="fixed inset-0 z-50 bg-[#050914]/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#07101D] border-4 border-[#18D8D0] shadow-[0_0_50px_rgba(24,216,208,0.25)] max-w-4xl w-full my-auto flex flex-col max-h-[92vh] rounded-none overflow-hidden"
              >
                {/* Modal Header Strip */}
                <div className="p-4 bg-[#050914] border-b-2 border-[#18D8D0]/40 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-[#FF5A16]" />
                    <div>
                      <span className="font-pixel text-xs sm:text-sm text-[#F4E6CE] font-bold block">
                        OPERATIONAL REGISTRATION DESK WORKFLOW
                      </span>
                      {selectedTeam && (
                        <span className="font-mono text-[10px] text-[#18D8D0]">
                          Active: {selectedTeam.name} ({selectedTeam.institution})
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Cancel active registration workflow? Unsaved data will be reset.")) {
                        resetWorkflow();
                      }
                    }}
                    className="text-[#91A0AE] hover:text-[#FF5A16] cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 5-Step Progress Indicator */}
                <div className="bg-[#050914] border-b border-[#18D8D0]/20 px-4 py-2.5 overflow-x-auto shrink-0 flex items-center justify-between gap-2 text-[10px] font-pixel">
                  {[
                    { num: 1, label: "01 UNIVERSITY / TEAM" },
                    { num: 2, label: "02 PARTICIPANT ENTRY" },
                    { num: 3, label: "03 QR GENERATED" },
                    { num: 4, label: "04 DOCUMENTS" },
                    { num: 5, label: "05 COMPLETION" },
                  ].map((s) => (
                    <button
                      key={s.num}
                      type="button"
                      onClick={() => {
                        if (s.num <= currentStep) {
                          setCurrentStep(s.num as any);
                        }
                      }}
                      className={`px-3 py-1 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                        currentStep === s.num
                          ? "bg-[#FF5A16] text-white font-bold shadow-[2px_2px_0px_#000]"
                          : currentStep > s.num
                          ? "bg-[#18D8D0]/20 text-[#18D8D0] border border-[#18D8D0]/40"
                          : "text-[#91A0AE] opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <span>{s.label}</span>
                      {currentStep > s.num && <Check className="w-3 h-3 text-[#18D8D0]" />}
                    </button>
                  ))}
                </div>

                {/* Main Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-left space-y-6">
                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* STEP 01 — UNIVERSITY / TEAM FIRST (SECTION 2) */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  {currentStep === 1 && (
                    <div className="space-y-5">
                      <div className="border-b border-[#18D8D0]/20 pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="font-pixel text-sm sm:text-base text-[#18D8D0] font-bold">
                            01 / UNIVERSITY &amp; TEAM IDENTIFICATION
                          </h3>
                          <p className="font-sans text-xs text-[#91A0AE] mt-0.5">
                            Registration begins with identifying the institution or team. Search before creating.
                          </p>
                        </div>

                        {/* Toggle: FIND vs CREATE */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setTeamWorkflowTab("FIND")}
                            className={`px-3.5 py-1.5 font-pixel text-[10px] border cursor-pointer ${
                              teamWorkflowTab === "FIND"
                                ? "bg-[#18D8D0] text-[#050914] border-[#18D8D0] font-bold shadow-[2px_2px_0px_#000]"
                                : "bg-[#050914] text-[#91A0AE] border-[#18D8D0]/30"
                            }`}
                          >
                            [ FIND UNIVERSITY / TEAM ]
                          </button>
                          <button
                            type="button"
                            onClick={() => setTeamWorkflowTab("CREATE")}
                            className={`px-3.5 py-1.5 font-pixel text-[10px] border cursor-pointer ${
                              teamWorkflowTab === "CREATE"
                                ? "bg-[#FF5A16] text-white border-[#FF5A16] font-bold shadow-[2px_2px_0px_#000]"
                                : "bg-[#050914] text-[#91A0AE] border-[#18D8D0]/30"
                            }`}
                          >
                            [ CREATE UNIVERSITY / TEAM ]
                          </button>
                        </div>
                      </div>

                      {/* SUB-VIEW A: FIND UNIVERSITY / TEAM */}
                      {teamWorkflowTab === "FIND" && (
                        <div className="space-y-4">
                          <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#91A0AE]" />
                            <input
                              type="text"
                              value={teamSearchQuery}
                              onChange={(e) => searchTeamsInStep1(e.target.value)}
                              placeholder="Search by University Name, Team Name, Team ID (e.g. KLE Technological University)..."
                              className="w-full pl-10 pr-4 py-3 bg-[#050914] border-2 border-[#18D8D0]/50 focus:border-[#FF5A16] text-[#F4E6CE] font-sans text-xs outline-none placeholder:text-[#91A0AE]/50"
                            />
                          </div>

                          {/* Quick Suggestion Chips */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="font-pixel text-[#91A0AE] mr-1">QUICK SUGGESTIONS:</span>
                            {["KLE Technological University", "Bangalore University", "Anna University", "Osmania University"].map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => searchTeamsInStep1(item)}
                                className="px-2 py-0.5 bg-[#050914] hover:bg-[#18D8D0]/20 text-[#18D8D0] border border-[#18D8D0]/30 font-sans"
                              >
                                {item}
                              </button>
                            ))}
                          </div>

                          {/* Search Results */}
                          {isSearchingTeams ? (
                            <div className="p-8 text-center text-[#91A0AE] font-pixel text-xs animate-pulse">
                              SEARCHING DATABASE FOR REGISTERED CONTINGENTS...
                            </div>
                          ) : teamSearchResults.length > 0 ? (
                            <div className="space-y-2.5">
                              <span className="font-pixel text-[10px] text-[#18D8D0] uppercase">
                                MATCHING UNIVERSITIES / TEAMS ({teamSearchResults.length})
                              </span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {teamSearchResults.map((t) => (
                                  <div
                                    key={t.id}
                                    className="p-4 bg-[#050914] border-2 border-[#18D8D0]/40 hover:border-[#FF5A16] shadow-[2px_2px_0px_#000] flex flex-col justify-between space-y-3"
                                  >
                                    <div>
                                      <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-[#F4E6CE] text-sm">{t.institution}</h4>
                                        <span className="font-mono text-[10px] text-[#18D8D0]">{t.teamCode}</span>
                                      </div>
                                      <div className="text-xs text-[#FF5A16] font-pixel mt-1">{t.name}</div>
                                      <div className="text-[11px] text-[#91A0AE] mt-1">
                                        State: <span className="text-[#F4E6CE]">{t.state}</span> &bull; Manager:{" "}
                                        <span className="text-[#F4E6CE]">{t.managerName}</span>
                                      </div>
                                      <div className="text-[11px] text-[#91A0AE] mt-0.5">
                                        Athletes Registered: <span className="text-amber-400 font-bold">{t.memberCount}</span>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedTeam(t);
                                        setState(t.state);
                                        setInstitution(t.institution);
                                        setCurrentStep(2); // Proceed to Participant Entry & Roster
                                        triggerToast(`Loaded: ${t.institution} (${t.name})`, "info");
                                      }}
                                      className="w-full py-2 bg-[#18D8D0] hover:bg-[#15bfb8] text-black font-pixel text-[10px] font-bold tracking-wider cursor-pointer shadow-[2px_2px_0px_#000] flex items-center justify-center gap-1.5"
                                    >
                                      <span>[ SELECT THIS TEAM &amp; MANAGE ROSTER &rarr; ]</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : teamSearchQuery.trim() ? (
                            <div className="p-6 bg-[#050914] border border-dashed border-[#18D8D0]/30 text-center space-y-3">
                              <p className="font-pixel text-xs text-amber-300">
                                NO EXISTING TEAM FOUND FOR &quot;{teamSearchQuery}&quot;
                              </p>
                              <p className="font-sans text-xs text-[#91A0AE]">
                                You can create a new team for this institution now.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewTeamInstitution(teamSearchQuery);
                                  setNewTeamName(`${teamSearchQuery.split(",")[0]} Contingent`);
                                  setTeamWorkflowTab("CREATE");
                                }}
                                className="px-4 py-2 bg-[#FF5A16] hover:bg-[#d94e16] text-white font-pixel text-xs font-bold tracking-wider shadow-[2px_2px_0px_#000]"
                              >
                                [ CREATE NEW TEAM FOR THIS INSTITUTION ]
                              </button>
                            </div>
                          ) : null}
                        </div>
                      )}

                      {/* SUB-VIEW B: CREATE UNIVERSITY / TEAM */}
                      {teamWorkflowTab === "CREATE" && (
                        <div className="space-y-4 bg-[#050914] p-4 sm:p-5 border-2 border-[#FF5A16]/50 shadow-[3px_3px_0px_#000]">
                          <span className="font-pixel text-xs text-[#FF5A16] font-bold block">
                            CREATE NEW UNIVERSITY / TEAM RECORD (DATABASE-BACKED)
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-xs">
                            {/* University / Institution */}
                            <div className="sm:col-span-2">
                              <label className="block font-pixel text-[10px] text-[#18D8D0] uppercase tracking-wider mb-1.5">
                                UNIVERSITY / INSTITUTION NAME *
                              </label>
                              <input
                                type="text"
                                value={newTeamInstitution}
                                onChange={(e) => setNewTeamInstitution(e.target.value)}
                                placeholder="e.g. KLE Technological University, Hubballi"
                                required
                                className="w-full px-3 py-2.5 bg-[#07101D] border border-[#18D8D0]/40 focus:border-[#FF5A16] text-[#F4E6CE] outline-none"
                              />
                            </div>

                            {/* Team Name */}
                            <div>
                              <label className="block font-pixel text-[10px] text-[#18D8D0] uppercase tracking-wider mb-1.5">
                                TEAM / CONTINGENT NAME *
                              </label>
                              <input
                                type="text"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                placeholder="e.g. KLE Tech Strikers"
                                required
                                className="w-full px-3 py-2.5 bg-[#07101D] border border-[#18D8D0]/40 focus:border-[#FF5A16] text-[#F4E6CE] outline-none"
                              />
                            </div>

                            {/* State */}
                            <div>
                              <label className="block font-pixel text-[10px] text-[#18D8D0] uppercase tracking-wider mb-1.5">
                                STATE *
                              </label>
                              <select
                                value={newTeamState}
                                onChange={(e) => setNewTeamState(e.target.value)}
                                className="w-full px-3 py-2.5 bg-[#07101D] border border-[#18D8D0]/40 focus:border-[#FF5A16] text-[#F4E6CE] outline-none"
                              >
                                {SOUTH_ZONE_STATES.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Manager Name */}
                            <div>
                              <label className="block font-pixel text-[10px] text-[#91A0AE] uppercase tracking-wider mb-1.5">
                                TEAM MANAGER FULL NAME
                              </label>
                              <input
                                type="text"
                                value={managerName}
                                onChange={(e) => setManagerName(e.target.value)}
                                placeholder="e.g. Dr. Ramesh Patil"
                                className="w-full px-3 py-2.5 bg-[#07101D] border border-white/20 text-[#F4E6CE] outline-none"
                              />
                            </div>

                            {/* Manager Phone */}
                            <div>
                              <label className="block font-pixel text-[10px] text-[#91A0AE] uppercase tracking-wider mb-1.5">
                                MANAGER PHONE
                              </label>
                              <input
                                type="tel"
                                value={managerPhone}
                                onChange={(e) => setManagerPhone(e.target.value)}
                                placeholder="e.g. +91 98765 43210"
                                className="w-full px-3 py-2.5 bg-[#07101D] border border-white/20 text-[#F4E6CE] outline-none"
                              />
                            </div>
                          </div>

                          <div className="pt-2 text-right">
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={handleCreateTeam}
                              className="px-6 py-2.5 bg-[#FF5A16] hover:bg-[#d94e16] disabled:opacity-50 text-white font-pixel text-xs font-bold tracking-wider cursor-pointer shadow-[3px_3px_0px_#000] flex items-center gap-2 ml-auto"
                            >
                              {isSubmitting ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              <span>[ CREATE UNIVERSITY TEAM &amp; MINT QR &rarr; ]</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* STEP 02 — PARTICIPANT ENTRY & ROSTER (SECTION 3) */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  {currentStep === 2 && selectedTeam && (
                    <div className="space-y-5">
                      {/* Active Team Banner */}
                      <div className="p-4 bg-[#050914] border-2 border-[#18D8D0] shadow-[3px_3px_0px_#000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <span className="font-pixel text-[9px] text-[#18D8D0] uppercase tracking-widest block">
                            ACTIVE CONTINGENT
                          </span>
                          <h3 className="font-pixel text-base text-[#F4E6CE] font-bold">
                            {selectedTeam.institution} &bull; <span className="text-[#FF5A16]">{selectedTeam.name}</span>
                          </h3>
                          <div className="font-mono text-xs text-[#91A0AE] mt-0.5">
                            Code: <span className="text-[#18D8D0]">{selectedTeam.teamCode}</span> &bull; State:{" "}
                            <span>{selectedTeam.state}</span>
                            {selectedTeam.managerName && ` • Manager: ${selectedTeam.managerName}`}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {selectedTeam.qrToken && (
                            <button
                              type="button"
                              onClick={() =>
                                setViewingQrData({
                                  title: "SOUTH ZONE WOMEN'S BADMINTON CHAMPIONSHIP 2026",
                                  value: selectedTeam.qrToken,
                                  participantName: selectedTeam.name,
                                  institution: selectedTeam.institution,
                                  referenceCode: selectedTeam.teamCode,
                                  type: "TEAM",
                                })
                              }
                              className="px-3 py-1.5 bg-[#07101D] hover:bg-[#050914] text-[#18D8D0] border border-[#18D8D0] font-pixel text-[9px] flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000]"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>[ VIEW TEAM QR ]</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setCurrentStep(1)}
                            className="px-3 py-1.5 bg-[#07101D] text-[#91A0AE] hover:text-white border border-white/20 font-pixel text-[9px]"
                          >
                            CHANGE TEAM
                          </button>
                        </div>
                      </div>

                      {/* Participant Entry Form Toggle */}
                      <div className="flex items-center justify-between border-b border-[#18D8D0]/20 pb-2">
                        <div>
                          <h4 className="font-pixel text-xs sm:text-sm text-[#F4E6CE] font-bold">
                            PARTICIPANTS ({selectedTeam.members?.length || 0})
                          </h4>
                          <span className="font-sans text-[11px] text-[#91A0AE]">
                            Enter participants one by one. QR generates immediately upon saving.
                          </span>
                        </div>

                        {!isAddingParticipant && (
                          <button
                            type="button"
                            id="btn-add-participant"
                            onClick={() => {
                              setFullName("");
                              setEmail("");
                              setMobile("");
                              setState(selectedTeam.state);
                              setInstitution(selectedTeam.institution);
                              setIsAddingParticipant(true);
                            }}
                            className="px-4 py-2 bg-[#FF5A16] hover:bg-[#d94e16] text-white font-pixel text-xs font-bold tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>[ ADD PARTICIPANT ]</span>
                          </button>
                        )}
                      </div>

                      {/* FAST PARTICIPANT ENTRY FORM (Section 3: ONLY Full Name, Email, Mobile, State, Institution) */}
                      {isAddingParticipant && (
                        <div className="p-4 sm:p-5 bg-[#050914] border-2 border-emerald-500 shadow-[3px_3px_0px_#000] space-y-4">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <span className="font-pixel text-xs text-emerald-400 font-bold flex items-center gap-2">
                              <Plus className="w-4 h-4" />
                              <span>ENTER PARTICIPANT DETAILS</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsAddingParticipant(false)}
                              className="text-[#91A0AE] hover:text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Duplicate Detection Alert */}
                          {duplicateMatches.length > 0 && (
                            <div className="p-3 bg-amber-950/70 border border-amber-500 text-amber-200 text-xs font-mono space-y-1">
                              <div className="flex items-center gap-2 font-pixel text-[10px] text-amber-300">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>POSSIBLE EXISTING PARTICIPANT DETECTED IN DATABASE</span>
                              </div>
                              {duplicateMatches.map((dup) => (
                                <div key={dup.id} className="text-[11px] text-amber-200">
                                  &bull; {dup.name} ({dup.playerId}) &bull; {dup.institution} &bull; {dup.phone}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-xs">
                            {/* Full Name */}
                            <div>
                              <label className="block font-pixel text-[10px] text-[#18D8D0] uppercase tracking-wider mb-1">
                                FULL NAME *
                              </label>
                              <input
                                type="text"
                                value={fullName}
                                onChange={(e) => {
                                  setFullName(e.target.value);
                                  setDuplicateDismissed(false);
                                }}
                                placeholder="e.g. Vineet Kulkarni"
                                required
                                className="w-full px-3 py-2 bg-[#07101D] border border-[#18D8D0]/40 focus:border-[#FF5A16] text-[#F4E6CE] outline-none"
                              />
                            </div>

                            {/* Email */}
                            <div>
                              <label className="block font-pixel text-[10px] text-[#18D8D0] uppercase tracking-wider mb-1">
                                EMAIL ADDRESS
                              </label>
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                  setEmail(e.target.value);
                                  setDuplicateDismissed(false);
                                }}
                                placeholder="e.g. athlete@institution.edu"
                                className="w-full px-3 py-2 bg-[#07101D] border border-[#18D8D0]/40 focus:border-[#FF5A16] text-[#F4E6CE] outline-none"
                              />
                            </div>

                            {/* Mobile Number */}
                            <div>
                              <label className="block font-pixel text-[10px] text-[#18D8D0] uppercase tracking-wider mb-1">
                                MOBILE NUMBER *
                              </label>
                              <input
                                type="tel"
                                value={mobile}
                                onChange={(e) => {
                                  setMobile(e.target.value);
                                  setDuplicateDismissed(false);
                                }}
                                placeholder="e.g. +91 98765 43210"
                                required
                                className="w-full px-3 py-2 bg-[#07101D] border border-[#18D8D0]/40 focus:border-[#FF5A16] text-[#F4E6CE] outline-none"
                              />
                            </div>

                            {/* State */}
                            <div>
                              <label className="block font-pixel text-[10px] text-[#18D8D0] uppercase tracking-wider mb-1">
                                STATE *
                              </label>
                              <select
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                className="w-full px-3 py-2 bg-[#07101D] border border-[#18D8D0]/40 focus:border-[#FF5A16] text-[#F4E6CE] outline-none"
                              >
                                {SOUTH_ZONE_STATES.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Institution */}
                            <div className="sm:col-span-2">
                              <label className="block font-pixel text-[10px] text-[#18D8D0] uppercase tracking-wider mb-1">
                                INSTITUTION *
                              </label>
                              <input
                                type="text"
                                value={institution}
                                onChange={(e) => setInstitution(e.target.value)}
                                placeholder="e.g. KLE Technological University"
                                required
                                className="w-full px-3 py-2 bg-[#07101D] border border-[#18D8D0]/40 focus:border-[#FF5A16] text-[#F4E6CE] outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setIsAddingParticipant(false)}
                              className="px-3 py-2 bg-[#07101D] text-[#91A0AE] border border-white/20 font-pixel text-[10px]"
                            >
                              CANCEL
                            </button>
                            <button
                              type="button"
                              id="btn-save-participant"
                              disabled={isSubmitting}
                              onClick={handleSaveParticipantAndGenerateQr}
                              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-pixel text-xs font-bold tracking-wider cursor-pointer shadow-[2px_2px_0px_#000] flex items-center gap-2"
                            >
                              {isSubmitting ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <QrCode className="w-4 h-4" />
                              )}
                              <span>[ SAVE PARTICIPANT &amp; GENERATE QR &rarr; ]</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Participant List (Visual Structure matching Section 3) */}
                      <div className="space-y-2">
                        {(!selectedTeam.members || selectedTeam.members.length === 0) && !isAddingParticipant ? (
                          <div className="p-8 bg-[#050914] border border-dashed border-[#18D8D0]/30 text-center space-y-2">
                            <p className="font-pixel text-xs text-[#91A0AE]">NO PARTICIPANTS ENTERED YET</p>
                            <p className="font-sans text-xs text-[#91A0AE]">
                              Click &quot;[ ADD PARTICIPANT ]&quot; above to enroll athletes.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedTeam.members?.map((p: any) => (
                              <div
                                key={p.id}
                                className="p-3.5 bg-[#050914] border-2 border-[#18D8D0]/40 shadow-[2px_2px_0px_#000] flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                              >
                                <div>
                                  <div className="font-bold text-sm text-[#F4E6CE]">{p.name}</div>
                                  <div className="font-mono text-xs text-[#91A0AE] flex flex-wrap items-center gap-2 mt-0.5">
                                    <span className="text-[#18D8D0]">{p.playerId}</span>
                                    <span>&bull;</span>
                                    <span>{p.phone}</span>
                                    {p.email && (
                                      <>
                                        <span>&bull;</span>
                                        <span>{p.email}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Status strip matching Section 3: QR | Documents | Verification | Payment | Registration */}
                                <div className="flex flex-wrap items-center gap-2 font-pixel text-[9px]">
                                  <span
                                    className={`px-2 py-0.5 border ${
                                      p.hasQr
                                        ? "bg-emerald-950 text-emerald-400 border-emerald-500"
                                        : "bg-[#07101D] text-[#91A0AE] border-white/20"
                                    }`}
                                  >
                                    {p.hasQr ? "QR ✓" : "QR —"}
                                  </span>

                                  <span className="px-2 py-0.5 bg-[#07101D] text-[#18D8D0] border border-[#18D8D0]/40">
                                    {p.documentsStatus === "VERIFIED"
                                      ? "Documents Verified"
                                      : p.documentsCount > 0
                                      ? "Documents Ready"
                                      : "Documents Pending"}
                                  </span>

                                  <span
                                    className={`px-2 py-0.5 border ${
                                      p.verifiedDocumentsCount >= 3
                                        ? "bg-emerald-950 text-emerald-400 border-emerald-500"
                                        : "bg-amber-950 text-amber-300 border-amber-500"
                                    }`}
                                  >
                                    {p.verifiedDocumentsCount >= 3 ? "Verification ✓" : "Verification —"}
                                  </span>

                                  <span
                                    className={`px-2 py-0.5 border ${
                                      p.status === "APPROVED"
                                        ? "bg-emerald-950 text-emerald-400 border-emerald-500"
                                        : "bg-[#07101D] text-[#91A0AE] border-white/20"
                                    }`}
                                  >
                                    {p.status === "APPROVED" ? "Completed ✓" : "Pending"}
                                  </span>
                                </div>

                                {/* Actions: [VIEW] [OPEN QR] */}
                                <div className="flex items-center gap-2 font-pixel text-[9px]">
                                  <button
                                    type="button"
                                    onClick={() => handleContinueParticipantWorkflow(p)}
                                    className="px-3 py-1.5 bg-[#07101D] hover:bg-[#050914] text-[#18D8D0] border border-[#18D8D0]/40 cursor-pointer"
                                  >
                                    [VIEW]
                                  </button>
                                  {p.qrToken && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setViewingQrData({
                                          title: "SOUTH ZONE WOMEN'S BADMINTON CHAMPIONSHIP 2026",
                                          value: p.qrToken,
                                          participantName: p.name,
                                          institution: p.institution,
                                          referenceCode: p.playerId,
                                          type: "PARTICIPANT",
                                        })
                                      }
                                      className="px-3 py-1.5 bg-[#FF5A16] hover:bg-[#d94e16] text-white cursor-pointer shadow-[1px_1px_0px_#000]"
                                    >
                                      [OPEN QR]
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* STEP 03 — QR GENERATED IMMEDIATELY (SECTION 4) */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  {currentStep === 3 && activeParticipant && activeQrPass && (
                    <div className="space-y-6 text-center py-2">
                      {/* Success Strip */}
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-950 border-2 border-emerald-500 text-emerald-300 font-pixel text-xs tracking-wider shadow-[3px_3px_0px_#000]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>✓ PARTICIPANT CREATED</span>
                        </div>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-950 border-2 border-[#18D8D0] text-[#18D8D0] font-pixel text-xs tracking-wider shadow-[3px_3px_0px_#000]">
                          <QrCode className="w-4 h-4 text-[#18D8D0]" />
                          <span>✓ QR GENERATED</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h2 className="font-pixel text-xl sm:text-2xl text-[#F4E6CE] font-bold">
                          ACCREDITATION QR GENERATED
                        </h2>
                        <p className="font-sans text-xs text-[#91A0AE] max-w-md mx-auto">
                          Generated immediately upon details capture. This secure opaque token will be scanned by accommodation and operational desks.
                        </p>
                      </div>

                      {/* Web Portal Rendered Scalable SVG QR Card (Section 8) */}
                      <div className="max-w-md mx-auto">
                        <PortalQrCode
                          title="SOUTH ZONE WOMEN'S BADMINTON CHAMPIONSHIP 2026"
                          subtitle="OFFICIAL PARTICIPANT ACCREDITATION PASS"
                          value={activeQrPass.token}
                          participantName={activeParticipant.name}
                          institution={activeParticipant.institution}
                          referenceCode={activeParticipant.playerId}
                          qrType="PARTICIPANT"
                        />
                      </div>

                      {/* Navigation Controls */}
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <button
                          type="button"
                          id="btn-proceed-to-documents"
                          onClick={() => setCurrentStep(4)}
                          className="px-6 py-2.5 bg-[#FF5A16] hover:bg-[#d94e16] text-white font-pixel text-xs font-bold tracking-wider cursor-pointer shadow-[3px_3px_0px_#000] flex items-center gap-2"
                        >
                          <span>[ PROCEED TO DOCUMENTS &rarr; ]</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="px-4 py-2.5 bg-[#050914] text-[#18D8D0] border border-[#18D8D0]/40 font-pixel text-xs cursor-pointer"
                        >
                          [ RETURN TO TEAM ROSTER ]
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* STEP 04 — DOCUMENT CAPTURE & VERIFICATION (SECTIONS 10 & 11) */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  {currentStep === 4 && activeParticipant && (
                    <div className="space-y-5">
                      <div className="border-b border-[#18D8D0]/20 pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="font-pixel text-sm sm:text-base text-[#18D8D0] font-bold">
                            04 / DOCUMENT CAPTURE &amp; VERIFICATION
                          </h3>
                          <p className="font-sans text-xs text-[#91A0AE] mt-0.5">
                            Athlete: <span className="text-[#F4E6CE] font-bold">{activeParticipant.name}</span> ({activeParticipant.playerId}) &bull; Uploading is NOT verification.
                          </p>
                        </div>

                        {/* Bulk Verify Button (Section 11) */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            id="btn-mark-documents-verified"
                            onClick={handleVerifyAllDocs}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-pixel text-[10px] font-bold tracking-wider cursor-pointer shadow-[2px_2px_0px_#000] flex items-center gap-1.5"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>[ MARK DOCUMENTS VERIFIED ]</span>
                          </button>
                        </div>
                      </div>

                      {/* Hidden Native Inputs */}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        ref={nativeCameraInputRef}
                        className="hidden"
                        onChange={handleNativeCameraCapture}
                      />
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        ref={fileUploadInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                      />

                      {/* Documents Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className={`p-4 bg-[#050914] border-2 space-y-3 ${
                              doc.status === "VERIFIED"
                                ? "border-emerald-500 shadow-[2px_2px_0px_rgba(16,185,129,0.3)]"
                                : doc.status === "READY"
                                ? "border-cyan-400"
                                : doc.status === "FAILED"
                                ? "border-rose-500"
                                : "border-[#18D8D0]/40"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-pixel text-xs text-[#F4E6CE] font-bold">{doc.label}</h4>
                                <span className="font-mono text-[10px] text-[#91A0AE]">
                                  {doc.type === "OTHER" ? "Optional / Affidavit" : "Mandatory Credential"}
                                </span>
                              </div>

                              <span
                                className={`px-2 py-0.5 font-pixel text-[8px] uppercase tracking-wider border ${
                                  doc.status === "VERIFIED"
                                    ? "bg-emerald-950 text-emerald-400 border-emerald-500"
                                    : doc.status === "READY"
                                    ? "bg-cyan-950 text-cyan-300 border-cyan-400"
                                    : doc.status === "UPLOADING"
                                    ? "bg-amber-950 text-amber-300 border-amber-500 animate-pulse"
                                    : "bg-[#07101D] text-[#91A0AE] border-[#18D8D0]/30"
                                }`}
                              >
                                {doc.status === "VERIFIED"
                                  ? "✓ VERIFIED"
                                  : doc.status === "READY"
                                  ? "✓ READY"
                                  : doc.status === "NOT_CAPTURED"
                                  ? "— NOT CAPTURED"
                                  : doc.status}
                              </span>
                            </div>

                            {/* Thumbnail / Viewfinder */}
                            <div className="w-full h-28 bg-[#07101D] border border-white/10 flex items-center justify-center overflow-hidden">
                              {doc.dataUrl ? (
                                <img
                                  src={doc.dataUrl}
                                  alt={doc.label}
                                  className="w-full h-full object-contain filter contrast-125"
                                />
                              ) : (
                                <div className="text-center font-pixel text-[9px] text-[#91A0AE] flex flex-col items-center gap-1">
                                  <Camera className="w-5 h-5 text-[#18D8D0]/40" />
                                  <span>{doc.status === "READY" ? "READY FOR INSPECTION" : "DESK CAMERA READY"}</span>
                                </div>
                              )}
                            </div>

                            {/* Action Controls */}
                            <div className="flex items-center gap-2">
                              {/* Capture Button */}
                              <button
                                type="button"
                                onClick={() => startCamera(doc.id)}
                                className="flex-1 py-1.5 bg-[#FF5A16] hover:bg-[#d94e16] text-white font-pixel text-[9px] font-bold flex items-center justify-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000]"
                              >
                                <Camera className="w-3 h-3" />
                                <span>📷 CAPTURE</span>
                              </button>

                              {/* Upload Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setFileUploadTargetDocId(doc.id);
                                  fileUploadInputRef.current?.click();
                                }}
                                className="px-2.5 py-1.5 bg-[#07101D] text-[#18D8D0] border border-[#18D8D0]/40 font-pixel text-[9px] flex items-center gap-1 cursor-pointer"
                              >
                                <Upload className="w-3 h-3" />
                                <span>DEVICE</span>
                              </button>

                              {/* Explicit Verify Button (Section 11) */}
                              {doc.status === "READY" && (
                                <button
                                  type="button"
                                  onClick={() => handleVerifySingleDoc(doc.id)}
                                  className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-pixel text-[9px] font-bold flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_#000]"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>VERIFY</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Forward Navigation */}
                      <div className="flex items-center justify-between pt-3 border-t border-[#18D8D0]/20">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="px-4 py-2 bg-[#050914] text-[#91A0AE] border border-white/20 font-pixel text-xs cursor-pointer"
                        >
                          &larr; BACK TO ROSTER
                        </button>

                        <button
                          type="button"
                          onClick={() => setCurrentStep(5)}
                          className="px-6 py-2.5 bg-[#FF5A16] hover:bg-[#d94e16] text-white font-pixel text-xs font-bold tracking-wider cursor-pointer shadow-[3px_3px_0px_#000] flex items-center gap-2"
                        >
                          <span>PROCEED TO PAYMENT &amp; COMPLETION &rarr;</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* STEP 05 — PAYMENT & REGISTRATION COMPLETION (SECTION 12) */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  {currentStep === 5 && activeParticipant && (
                    <div className="space-y-6">
                      {!completedSuccessData ? (
                        <>
                          <div className="border-b border-[#18D8D0]/20 pb-2">
                            <h3 className="font-pixel text-sm sm:text-base text-[#18D8D0] font-bold">
                              05 / PAYMENT &amp; REGISTRATION COMPLETION
                            </h3>
                            <p className="font-sans text-xs text-[#91A0AE] mt-0.5">
                              Registration fee reconciliation. Transport arrival is complimentary and requires zero payment.
                            </p>
                          </div>

                          {/* Pre-completion Checklist (Section 12) */}
                          <div className="p-4 bg-[#050914] border-2 border-[#18D8D0]/40 space-y-2.5 font-mono text-xs">
                            <span className="font-pixel text-[10px] text-[#18D8D0] uppercase tracking-wider block">
                              PREREQUISITES CHECKLIST
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-2 text-emerald-400">
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span className="text-[#F4E6CE]">✓ Participant details saved</span>
                              </div>
                              <div className="flex items-center gap-2 text-emerald-400">
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span className="text-[#F4E6CE]">✓ Accreditation QR pass active</span>
                              </div>
                              <div className="flex items-center gap-2 text-emerald-400">
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span className="text-[#F4E6CE]">✓ Documents captured</span>
                              </div>
                              <div className="flex items-center gap-2 text-emerald-400">
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span className="text-[#F4E6CE]">✓ Documents verified</span>
                              </div>
                            </div>
                          </div>

                          {/* Fee Strip */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="p-3 bg-[#050914] border border-[#18D8D0]/30">
                              <span className="font-pixel text-[9px] text-[#91A0AE] block">REGISTRATION FEE</span>
                              <span className="font-pixel text-xl text-[#F4E6CE] font-bold mt-1 block">
                                ₹ {registrationFee}
                              </span>
                            </div>

                            <div className="p-3 bg-[#050914] border border-[#18D8D0]/30">
                              <span className="font-pixel text-[9px] text-[#91A0AE] block">AMOUNT COLLECTED</span>
                              <span className="font-pixel text-xl text-emerald-400 font-bold mt-1 block">
                                ₹ {amountReceived}
                              </span>
                            </div>

                            <div className="p-3 bg-[#050914] border border-[#18D8D0]/30 col-span-2 sm:col-span-1">
                              <span className="font-pixel text-[9px] text-[#91A0AE] block">PAYMENT METHOD</span>
                              <span className="font-pixel text-base text-[#18D8D0] font-bold mt-1 block">
                                {paymentMethod}
                              </span>
                            </div>
                          </div>

                          {/* Payment Method Selector */}
                          <div className="p-4 bg-[#050914] border-2 border-[#18D8D0]/40 space-y-4">
                            <div className="grid grid-cols-2 gap-3 font-pixel text-xs">
                              <button
                                type="button"
                                onClick={() => setPaymentMethod("CASH")}
                                className={`py-3 px-4 border-2 flex items-center justify-center gap-2 cursor-pointer ${
                                  paymentMethod === "CASH"
                                    ? "bg-[#18D8D0] text-[#050914] border-[#18D8D0] font-bold shadow-[2px_2px_0px_#000]"
                                    : "bg-[#07101D] text-[#91A0AE] border-[#18D8D0]/30"
                                }`}
                              >
                                <DollarSign className="w-4 h-4" />
                                <span>CASH</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setPaymentMethod("UPI")}
                                className={`py-3 px-4 border-2 flex items-center justify-center gap-2 cursor-pointer ${
                                  paymentMethod === "UPI"
                                    ? "bg-[#FF5A16] text-white border-[#FF5A16] font-bold shadow-[2px_2px_0px_#000]"
                                    : "bg-[#07101D] text-[#91A0AE] border-[#18D8D0]/30"
                                }`}
                              >
                                <CreditCard className="w-4 h-4" />
                                <span>UPI / SCAN</span>
                              </button>
                            </div>

                            {paymentMethod === "UPI" && (
                              <div className="p-3 bg-rose-950/30 border border-rose-500/50 space-y-1.5">
                                <label className="block font-pixel text-[10px] text-rose-300 uppercase tracking-wider">
                                  UPI UTR / TRANSACTION REFERENCE * (MANDATORY)
                                </label>
                                <input
                                  type="text"
                                  value={upiUtr}
                                  onChange={(e) => setUpiUtr(e.target.value)}
                                  placeholder="Enter 12-digit UPI UTR (e.g. 529182746192)"
                                  required
                                  className="w-full px-3 py-2 bg-[#050914] border border-rose-500 text-[#F4E6CE] font-mono text-xs outline-none"
                                />
                              </div>
                            )}

                            {/* Payment Verification Checkbox */}
                            <label className="flex items-start gap-3 p-3.5 bg-[#050914] border-2 border-emerald-500/60 hover:border-emerald-400 cursor-pointer transition-colors shadow-[2px_2px_0px_#000]">
                              <input
                                type="checkbox"
                                id="checkbox-admin-payment-verified"
                                checked={isPaymentVerified}
                                onChange={(e) => setIsPaymentVerified(e.target.checked)}
                                className="mt-0.5 w-4 h-4 accent-emerald-500 cursor-pointer"
                              />
                              <div>
                                <span className="font-pixel text-xs text-emerald-400 font-bold block flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  PAYMENT VERIFICATION CONFIRMED *
                                </span>
                                <span className="font-sans text-[11px] text-[#91A0AE] block mt-0.5">
                                  {paymentMethod === "CASH"
                                    ? "I confirm ₹2,500 cash payment has been physically received, verified, and logged in desk treasury register."
                                    : "I confirm ₹2,500 UPI transfer with UTR has been verified against tournament bank account."}
                                </span>
                              </div>
                            </label>
                          </div>

                          <div className="pt-2 text-right">
                            <button
                              type="button"
                              id="btn-complete-registration"
                              disabled={isSubmitting}
                              onClick={handleCompleteRegistration}
                              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-pixel text-xs sm:text-sm font-bold tracking-wider cursor-pointer shadow-[3px_3px_0px_#000] border-2 border-black flex items-center gap-2 ml-auto"
                            >
                              {isSubmitting ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                              <span>[ COMPLETE REGISTRATION ]</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        /* REGISTRATION COMPLETED VIEW */
                        <div className="space-y-6 text-center py-4">
                          <div className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-950 border-2 border-emerald-500 text-emerald-300 font-pixel text-sm tracking-wider shadow-[4px_4px_0px_#000]">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <span>REGISTRATION COMPLETED ✓</span>
                          </div>

                          <div className="space-y-1">
                            <h2 className="font-pixel text-xl sm:text-2xl text-[#F4E6CE] font-bold">
                              ✓ {completedSuccessData.athleteName} ACCREDITED
                            </h2>
                            <p className="font-sans text-xs text-[#91A0AE] max-w-md mx-auto">
                              Participant is now registered and eligible for Accommodation &amp; Daily Food Package assignment.
                            </p>
                          </div>

                          <div className="max-w-md mx-auto">
                            <PortalQrCode
                              title="SOUTH ZONE WOMEN'S BADMINTON CHAMPIONSHIP 2026"
                              subtitle="VERIFIED ACCREDITATION PASS"
                              value={completedSuccessData.participantQrToken || activeQrPass?.token || "SZ26-ACCREDITED"}
                              participantName={completedSuccessData.athleteName}
                              institution={activeParticipant.institution}
                              referenceCode={completedSuccessData.playerId}
                              qrType="PARTICIPANT"
                            />
                          </div>

                          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingParticipant(true);
                                setFullName("");
                                setEmail("");
                                setMobile("");
                                setCompletedSuccessData(null);
                                setCurrentStep(2);
                              }}
                              className="px-5 py-2.5 bg-[#FF5A16] hover:bg-[#d94e16] text-white font-pixel text-xs font-bold tracking-wider cursor-pointer shadow-[2px_2px_0px_#000]"
                            >
                              [ + ADD NEXT PARTICIPANT TO THIS TEAM ]
                            </button>

                            <button
                              type="button"
                              onClick={resetWorkflow}
                              className="px-5 py-2.5 bg-[#18D8D0] hover:bg-[#15bfb8] text-black font-pixel text-xs font-bold tracking-wider cursor-pointer shadow-[2px_2px_0px_#000]"
                            >
                              [ RETURN TO REGISTRATION DESK ]
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* GLOBAL "FIND DETAILS" MODAL (SECTION 23) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {isFindDetailsOpen && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#07101D] border-4 border-[#18D8D0] p-5 max-w-2xl w-full shadow-[0_0_50px_rgba(24,216,208,0.3)] space-y-4 max-h-[85vh] flex flex-col"
              >
                <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-2">
                  <div className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-[#18D8D0]" />
                    <h3 className="font-pixel text-sm text-[#F4E6CE] font-bold">
                      FIND DETAILS &bull; REGISTRY LOOKUP
                    </h3>
                  </div>
                  <button onClick={() => setIsFindDetailsOpen(false)} className="text-[#91A0AE] hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#91A0AE]" />
                  <input
                    type="text"
                    value={findDetailsQuery}
                    onChange={(e) => setFindDetailsQuery(e.target.value)}
                    placeholder="Search by Participant Name, Email, Mobile, Participant ID, Team Name, or Institution..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#050914] border-2 border-[#18D8D0]/50 text-[#F4E6CE] font-sans text-xs outline-none"
                    autoFocus
                  />
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto space-y-3 font-sans text-xs">
                  {loadingFindDetails ? (
                    <div className="p-8 text-center text-[#91A0AE] font-pixel text-xs animate-pulse">
                      SEARCHING REGISTRY...
                    </div>
                  ) : findDetailsQuery.trim() === "" ? (
                    <div className="p-6 text-center text-[#91A0AE]">
                      Type participant name, mobile, team, or university to find records.
                    </div>
                  ) : findDetailsResults.participants.length === 0 && findDetailsResults.teams.length === 0 ? (
                    <div className="p-6 text-center text-[#91A0AE]">
                      No matching participants or teams found.
                    </div>
                  ) : (
                    <>
                      {/* Participants Matches */}
                      {findDetailsResults.participants.length > 0 && (
                        <div className="space-y-2">
                          <span className="font-pixel text-[10px] text-[#18D8D0] uppercase">
                            PARTICIPANTS ({findDetailsResults.participants.length})
                          </span>
                          {findDetailsResults.participants.map((p) => (
                            <div
                              key={p.id}
                              className="p-3 bg-[#050914] border border-[#18D8D0]/30 flex items-center justify-between gap-3 hover:border-[#FF5A16]"
                            >
                              <div>
                                <div className="font-bold text-[#F4E6CE]">{p.name}</div>
                                <div className="font-mono text-[10px] text-[#91A0AE]">
                                  {p.playerId} &bull; {p.phone} &bull; {p.institution}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 font-pixel text-[9px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsFindDetailsOpen(false);
                                    resetWorkflow();
                                    setSelectedTeam({
                                      id: p.teamId,
                                      name: p.teamName || "Contingent",
                                      institution: p.institution,
                                      state: p.state,
                                      teamCode: p.teamCode,
                                    });
                                    handleContinueParticipantWorkflow(p);
                                    setIsWorkflowOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-[#18D8D0] hover:bg-[#15bfb8] text-black font-bold cursor-pointer"
                                >
                                  CONTINUE WORKFLOW &rarr;
                                </button>
                                {p.qrToken && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewingQrData({
                                        title: "SOUTH ZONE WOMEN'S BADMINTON CHAMPIONSHIP 2026",
                                        value: p.qrToken,
                                        participantName: p.name,
                                        institution: p.institution,
                                        referenceCode: p.playerId,
                                        type: "PARTICIPANT",
                                      });
                                    }}
                                    className="px-2.5 py-1 bg-[#FF5A16] text-white cursor-pointer"
                                  >
                                    OPEN QR
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Teams Matches */}
                      {findDetailsResults.teams.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-white/10">
                          <span className="font-pixel text-[10px] text-amber-400 uppercase">
                            UNIVERSITIES / TEAMS ({findDetailsResults.teams.length})
                          </span>
                          {findDetailsResults.teams.map((t) => (
                            <div
                              key={t.id}
                              className="p-3 bg-[#050914] border border-amber-500/30 flex items-center justify-between gap-3 hover:border-amber-400"
                            >
                              <div>
                                <div className="font-bold text-[#F4E6CE]">{t.institution}</div>
                                <div className="font-mono text-[10px] text-[#91A0AE]">
                                  {t.name} ({t.teamCode}) &bull; {t.memberCount} athletes
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsFindDetailsOpen(false);
                                  resetWorkflow();
                                  setSelectedTeam(t);
                                  setState(t.state);
                                  setInstitution(t.institution);
                                  setCurrentStep(2);
                                  setIsWorkflowOpen(true);
                                }}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-pixel text-[9px] font-bold cursor-pointer"
                              >
                                OPEN TEAM &rarr;
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* STANDALONE QR VIEWER MODAL (SECTION 8) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {viewingQrData && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-md w-full relative"
              >
                <button
                  onClick={() => setViewingQrData(null)}
                  className="absolute -top-10 right-0 text-[#91A0AE] hover:text-white flex items-center gap-1 font-pixel text-xs cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>CLOSE [ESC]</span>
                </button>
                <PortalQrCode
                  title={viewingQrData.title || "SOUTH ZONE WOMEN'S BADMINTON CHAMPIONSHIP 2026"}
                  value={viewingQrData.value}
                  participantName={viewingQrData.participantName}
                  institution={viewingQrData.institution || "Accredited Contingent"}
                  referenceCode={viewingQrData.referenceCode}
                  qrType={viewingQrData.type || "PARTICIPANT"}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CAMERA VIEWFINDER MODAL */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {activeCameraDocId && (
            <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4">
              <div className="w-full max-w-lg flex items-center justify-between text-white font-pixel text-xs">
                <span>📷 DESK CAMERA VIEWFINDER</span>
                <button onClick={stopCameraStream} className="text-[#91A0AE] hover:text-white p-2 cursor-pointer">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="relative w-full max-w-lg flex-1 flex items-center justify-center overflow-hidden my-4 border-2 border-[#18D8D0]">
                {cameraError ? (
                  <div className="p-6 text-center text-rose-300 font-pixel text-xs">
                    {cameraError}
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-8 border-2 border-dashed border-[#18D8D0]/70 pointer-events-none flex items-center justify-center">
                      <span className="font-pixel text-[9px] text-[#18D8D0] bg-[#050914]/80 px-2 py-1">
                        ALIGN DOCUMENT INSIDE FRAME
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="w-full max-w-lg flex items-center justify-center pb-6">
                <button
                  type="button"
                  onClick={takeSnapshot}
                  className="w-20 h-20 rounded-full bg-white border-4 border-[#FF5A16] flex items-center justify-center shadow-[0_0_25px_rgba(255,90,22,0.8)] cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 rounded-full bg-[#FF5A16]" />
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CAPTURE PREVIEW / RETAKE MODAL */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {capturedPreview && (
            <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4">
              <div className="w-full max-w-lg flex items-center justify-between text-white font-pixel text-xs">
                <span>INSPECT CAPTURED DOCUMENT</span>
                <button
                  onClick={() => setCapturedPreview(null)}
                  className="text-[#91A0AE] hover:text-white p-2 cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="w-full max-w-lg flex-1 my-4 bg-[#07101D] border-2 border-emerald-500 overflow-hidden flex items-center justify-center p-2">
                <img
                  src={capturedPreview.dataUrl}
                  alt="Captured Preview"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="w-full max-w-lg flex items-center justify-between gap-4 pb-6">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="flex-1 py-3 bg-[#050914] text-[#18D8D0] border-2 border-[#18D8D0] font-pixel text-xs font-bold cursor-pointer"
                >
                  RETAKE
                </button>
                <button
                  type="button"
                  onClick={handleAcceptPreview}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-pixel text-xs font-bold cursor-pointer shadow-[3px_3px_0px_#000]"
                >
                  ACCEPT &amp; UPLOAD
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* DOSSIER INSPECTION DRAWER */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {selectedDossierRecord && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#07101D] border-4 border-[#18D8D0] p-6 max-w-lg w-full space-y-4 shadow-[0_0_50px_rgba(24,216,208,0.3)]"
              >
                <div className="flex items-center justify-between border-b border-[#18D8D0]/30 pb-2">
                  <div>
                    <h3 className="font-pixel text-sm text-[#F4E6CE] font-bold">
                      PARTICIPANT ACCREDITATION DOSSIER
                    </h3>
                    <span className="font-mono text-xs text-[#18D8D0]">{selectedDossierRecord.playerId}</span>
                  </div>
                  <button onClick={() => setSelectedDossierRecord(null)} className="text-[#91A0AE]">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 text-xs font-sans bg-[#050914] p-4 border border-[#18D8D0]/20 text-[#91A0AE]">
                  <div><span className="text-[#18D8D0]">Full Name:</span> <strong className="text-[#F4E6CE]">{selectedDossierRecord.name}</strong></div>
                  <div><span className="text-[#18D8D0]">Institution:</span> <span className="text-[#F4E6CE]">{selectedDossierRecord.institution}</span></div>
                  <div><span className="text-[#18D8D0]">State:</span> <span className="text-[#F4E6CE]">{selectedDossierRecord.state}</span></div>
                  <div><span className="text-[#18D8D0]">Team:</span> <span className="text-[#F4E6CE]">{selectedDossierRecord.teamName} ({selectedDossierRecord.teamCode})</span></div>
                  <div><span className="text-[#18D8D0]">Documents Status:</span> <span className="text-emerald-400 font-bold">{selectedDossierRecord.documentsStatus}</span></div>
                  <div><span className="text-[#18D8D0]">Payment Status:</span> <span className="text-emerald-400 font-bold">{selectedDossierRecord.paymentStatus}</span></div>
                  <div><span className="text-[#18D8D0]">Operator:</span> <span className="text-[#F4E6CE]">{selectedDossierRecord.operator}</span></div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      const blob = generateCompiledPdf(
                        {
                          name: selectedDossierRecord.name,
                          institution: selectedDossierRecord.institution,
                          state: selectedDossierRecord.state,
                          phone: selectedDossierRecord.phone,
                          playerId: selectedDossierRecord.playerId,
                        },
                        []
                      );
                      const url = URL.createObjectURL(blob);
                      window.open(url, "_blank");
                    }}
                    className="px-4 py-2 bg-[#FF5A16] hover:bg-[#d94e16] text-white font-pixel text-xs font-bold cursor-pointer"
                  >
                    PRINT DOSSIER
                  </button>
                  <button
                    onClick={() => setSelectedDossierRecord(null)}
                    className="px-4 py-2 bg-[#050914] text-[#18D8D0] border border-[#18D8D0]/40 font-pixel text-xs cursor-pointer"
                  >
                    CLOSE
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardShell>
  );
}
