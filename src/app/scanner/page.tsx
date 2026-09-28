"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  QrCode,
  Shield,
  FileText,
  CheckCircle2,
  XCircle,
  Upload,
  RotateCcw,
  AlertCircle,
  User,
  Building,
  ChevronRight,
  Loader2,
  X,
  Eye,
  Check,
  Smartphone,
} from "lucide-react";

const DOC_TYPES = [
  { type: "UNIVERSITY_ID", label: "University ID Card", required: true },
  { type: "SSLC", label: "SSLC / 10th Certificate", required: true },
  { type: "PUC", label: "PUC / 12th Certificate", required: true },
  { type: "OTHER", label: "Other Document", required: false },
];

interface DocumentItem {
  id?: string;
  type: string;
  label: string;
  status: "NOT_CAPTURED" | "CAPTURING" | "UPLOADING" | "READY" | "VERIFIED" | "FAILED";
  dataUrl?: string;
  fileName?: string;
}

interface ParticipantData {
  participantId: string;
  playerId: string;
  name: string;
  institution: string;
  state: string;
  photoUrl: string | null;
  registrationStatus: string;
  documents: {
    id: string;
    type: string;
    status: string;
    fileName: string;
    capturedBy: string;
    updatedAt: string;
  }[];
}

export default function ScannerPage() {
  // Scanner states
  const [mode, setMode] = useState<"IDLE" | "SCANNING" | "PARTICIPANT" | "CAPTURING">("IDLE");
  const [scanInput, setScanInput] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Participant data from QR resolution
  const [participant, setParticipant] = useState<ParticipantData | null>(null);
  
  // Document states
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDocType, setActiveDocType] = useState<string | null>(null);
  
  // Camera refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const triggerToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Resolve QR token
  const handleResolveQr = async () => {
    if (!scanInput.trim()) {
      setError("Enter or scan a QR token.");
      return;
    }
    setIsResolving(true);
    setError(null);
    try {
      const res = await fetch("/api/scanner/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: scanInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setParticipant(data.data);
        // Initialize document list from server state
        const serverDocs = data.data.documents || [];
        const docList: DocumentItem[] = DOC_TYPES.map((dt) => {
          const existing = serverDocs.find((d: any) => d.type === dt.type);
          return {
            id: existing?.id,
            type: dt.type,
            label: dt.label,
            status: existing ? (existing.status as any) : "NOT_CAPTURED",
            fileName: existing?.fileName,
          };
        });
        setDocuments(docList);
        setMode("PARTICIPANT");
        triggerToast(`✓ ${data.data.name} loaded`, "success");
      } else {
        setError(data.error || "QR resolution failed.");
      }
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setIsResolving(false);
    }
  };

  // Start camera for document capture
  const startCamera = useCallback(async (docType: string) => {
    setActiveDocType(docType);
    setMode("CAPTURING");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      triggerToast("Camera access denied. Use file upload instead.", "error");
      setMode("PARTICIPANT");
      setActiveDocType(null);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !activeDocType) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    stopCamera();

    // Update document state
    setDocuments((prev) =>
      prev.map((d) =>
        d.type === activeDocType
          ? { ...d, status: "READY" as const, dataUrl, fileName: `${activeDocType.toLowerCase()}_${Date.now()}.jpg` }
          : d
      )
    );
    setMode("PARTICIPANT");
    setActiveDocType(null);
    triggerToast("✓ Document captured", "success");
  }, [activeDocType, stopCamera]);

  // Handle file upload
  const handleFileUpload = useCallback((docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setDocuments((prev) =>
        prev.map((d) =>
          d.type === docType
            ? { ...d, status: "READY" as const, dataUrl, fileName: file.name }
            : d
        )
      );
      triggerToast(`✓ ${docType.replace(/_/g, " ")} uploaded`, "success");
    };
    reader.readAsDataURL(file);
  }, []);

  // Upload document to server
  const uploadDocument = async (doc: DocumentItem) => {
    if (!participant || !doc.dataUrl) return;
    setDocuments((prev) => prev.map((d) => d.type === doc.type ? { ...d, status: "UPLOADING" as const } : d));

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.participantId,
          type: doc.type,
          fileName: doc.fileName,
          dataUrl: doc.dataUrl,
          mimeType: "image/jpeg",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDocuments((prev) =>
          prev.map((d) =>
            d.type === doc.type ? { ...d, id: data.document?.id, status: "READY" as const } : d
          )
        );
        triggerToast(`✓ ${doc.label} uploaded to server`, "success");
      } else {
        setDocuments((prev) => prev.map((d) => d.type === doc.type ? { ...d, status: "FAILED" as const } : d));
        triggerToast(data.error || "Upload failed", "error");
      }
    } catch (err) {
      setDocuments((prev) => prev.map((d) => d.type === doc.type ? { ...d, status: "FAILED" as const } : d));
      triggerToast("Upload error", "error");
    }
  };

  // Verify document
  const verifyDocument = async (doc: DocumentItem) => {
    if (!doc.id) {
      // Upload first, then verify
      await uploadDocument(doc);
      // Re-fetch the doc to get the ID
      return;
    }

    try {
      const res = await fetch("/api/scanner/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id, action: "VERIFY" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDocuments((prev) =>
          prev.map((d) => d.type === doc.type ? { ...d, status: "VERIFIED" as const } : d)
        );
        triggerToast(`✓ ${doc.label} VERIFIED`, "success");
      } else {
        triggerToast(data.error || "Verification failed", "error");
      }
    } catch (err) {
      triggerToast("Verification error", "error");
    }
  };

  // Upload and verify in one step
  const uploadAndVerify = async (doc: DocumentItem) => {
    if (!participant || !doc.dataUrl) return;
    setDocuments((prev) => prev.map((d) => d.type === doc.type ? { ...d, status: "UPLOADING" as const } : d));

    try {
      // Upload
      const uploadRes = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.participantId,
          type: doc.type,
          fileName: doc.fileName,
          dataUrl: doc.dataUrl,
          mimeType: "image/jpeg",
        }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || "Upload failed");
      }

      const docId = uploadData.document?.id;
      if (!docId) throw new Error("No document ID returned");

      // Verify
      const verifyRes = await fetch("/api/scanner/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId, action: "VERIFY" }),
      });
      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.success) {
        setDocuments((prev) =>
          prev.map((d) => d.type === doc.type ? { ...d, id: docId, status: "VERIFIED" as const } : d)
        );
        triggerToast(`✓ ${doc.label} UPLOADED & VERIFIED`, "success");
      } else {
        setDocuments((prev) =>
          prev.map((d) => d.type === doc.type ? { ...d, id: docId, status: "READY" as const } : d)
        );
        triggerToast(`Uploaded but verify failed: ${verifyData.error}`, "error");
      }
    } catch (err: any) {
      setDocuments((prev) => prev.map((d) => d.type === doc.type ? { ...d, status: "FAILED" as const } : d));
      triggerToast(err.message, "error");
    }
  };

  // Reset scanner
  const resetScanner = () => {
    stopCamera();
    setMode("IDLE");
    setScanInput("");
    setParticipant(null);
    setDocuments([]);
    setActiveDocType(null);
    setError(null);
  };

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  const verifiedCount = documents.filter((d) => d.status === "VERIFIED").length;
  const capturedCount = documents.filter((d) => d.status === "READY" || d.status === "VERIFIED").length;

  return (
    <div className="min-h-screen bg-[#050914] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a1128]/95 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FF5500] flex items-center justify-center">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wider text-white">DOCUMENT SCANNER</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">SZWBT 2026 • VERIFICATION</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/register"
              className="px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold uppercase tracking-wider hover:bg-blue-600/30 transition-colors flex items-center gap-1"
            >
              📋 REGISTRATION DESK
            </a>
            {participant && (
              <button
                onClick={resetScanner}
                className="px-3 py-1.5 bg-red-600/20 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-wider hover:bg-red-600/30 transition-colors"
              >
                NEW SCAN
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className={`fixed top-16 left-4 right-4 z-50 px-4 py-2.5 text-sm font-bold text-center border ${
              notification.type === "success"
                ? "bg-emerald-900/90 border-emerald-500/40 text-emerald-300"
                : notification.type === "error"
                  ? "bg-red-900/90 border-red-500/40 text-red-300"
                  : "bg-blue-900/90 border-blue-500/40 text-blue-300"
            }`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* IDLE: QR Scan Input */}
        {(mode === "IDLE" || mode === "SCANNING") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto bg-[#FF5500]/10 border-2 border-[#FF5500]/30 flex items-center justify-center mb-4">
                <QrCode className="w-10 h-10 text-[#FF5500]" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-wider text-white mb-1">
                SCAN PARTICIPANT QR
              </h2>
              <p className="text-xs text-gray-500 uppercase tracking-widest">
                ENTER OR SCAN THE PARTICIPANT ACCREDITATION QR CODE
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleResolveQr()}
                placeholder="Enter QR token or scan..."
                className="w-full px-4 py-3.5 bg-[#0a1128] border-2 border-white/10 text-white placeholder-gray-600 font-mono text-sm focus:border-[#FF5500]/60 focus:outline-none transition-colors"
                autoFocus
              />
              <button
                onClick={handleResolveQr}
                disabled={isResolving || !scanInput.trim()}
                className="w-full py-3.5 bg-[#FF5500] text-white font-bold uppercase tracking-wider text-sm hover:bg-[#d94e16] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isResolving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    RESOLVING...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    RESOLVE QR
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* PARTICIPANT: Document Scanning Interface */}
        {mode === "PARTICIPANT" && participant && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Participant Identity Card */}
            <div className="bg-[#0a1128] border border-white/10 p-4">
              <div className="flex items-start gap-3">
                {participant.photoUrl ? (
                  <img
                    src={participant.photoUrl}
                    alt={participant.name}
                    className="w-16 h-16 object-cover border-2 border-[#FF5500]/40"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-base text-white uppercase tracking-wide truncate">
                    {participant.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Building className="w-3 h-3 text-gray-500" />
                    <span className="text-[11px] text-gray-400 truncate">{participant.institution}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-mono text-[10px] text-[#FF5500] bg-[#FF5500]/10 px-2 py-0.5 border border-[#FF5500]/20">
                      {participant.playerId}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${
                      participant.registrationStatus === "APPROVED"
                        ? "text-emerald-400 bg-emerald-900/30 border-emerald-500/30"
                        : "text-amber-400 bg-amber-900/30 border-amber-500/30"
                    }`}>
                      {participant.registrationStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
                  <span>DOCUMENTS</span>
                  <span>{verifiedCount} / {DOC_TYPES.filter(d => d.required).length} VERIFIED</span>
                </div>
                <div className="w-full h-1.5 bg-gray-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#FF5500] to-emerald-500 transition-all duration-500"
                    style={{ width: `${(verifiedCount / DOC_TYPES.filter(d => d.required).length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Document List */}
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.type}
                  className={`bg-[#0a1128] border p-3 transition-colors ${
                    doc.status === "VERIFIED"
                      ? "border-emerald-500/30"
                      : doc.status === "READY"
                        ? "border-blue-500/30"
                        : doc.status === "FAILED"
                          ? "border-red-500/30"
                          : "border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {doc.status === "VERIFIED" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : doc.status === "READY" ? (
                        <Eye className="w-5 h-5 text-blue-400 shrink-0" />
                      ) : doc.status === "UPLOADING" ? (
                        <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
                      ) : doc.status === "FAILED" ? (
                        <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                      ) : (
                        <FileText className="w-5 h-5 text-gray-600 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white uppercase tracking-wider truncate">
                          {doc.label}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                          {doc.status === "VERIFIED"
                            ? "✓ VERIFIED"
                            : doc.status === "READY"
                              ? "CAPTURED — READY TO VERIFY"
                              : doc.status === "UPLOADING"
                                ? "UPLOADING..."
                                : doc.status === "FAILED"
                                  ? "FAILED — RETAKE"
                                  : "NOT CAPTURED"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {doc.status === "NOT_CAPTURED" || doc.status === "FAILED" ? (
                        <>
                          <button
                            onClick={() => startCamera(doc.type)}
                            className="p-2 bg-[#FF5500] text-white hover:bg-[#d94e16] transition-colors"
                            title="Capture with camera"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                          <label className="p-2 bg-gray-700 text-white hover:bg-gray-600 transition-colors cursor-pointer" title="Upload file">
                            <Upload className="w-4 h-4" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileUpload(doc.type, e)}
                            />
                          </label>
                        </>
                      ) : doc.status === "READY" && doc.dataUrl ? (
                        <>
                          <button
                            onClick={() => uploadAndVerify(doc)}
                            className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500 transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            VERIFY
                          </button>
                          <button
                            onClick={() => {
                              setDocuments((prev) =>
                                prev.map((d) =>
                                  d.type === doc.type
                                    ? { ...d, status: "NOT_CAPTURED" as const, dataUrl: undefined }
                                    : d
                                )
                              );
                            }}
                            className="p-2 bg-gray-700 text-gray-400 hover:bg-gray-600 transition-colors"
                            title="Retake"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : doc.status === "VERIFIED" ? (
                        <span className="px-2.5 py-1 bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                          DONE
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Preview */}
                  {doc.dataUrl && doc.status !== "UPLOADING" && (
                    <div className="mt-2.5 border border-white/5 p-1.5">
                      <img
                        src={doc.dataUrl}
                        alt={doc.label}
                        className="w-full max-h-32 object-contain bg-gray-900"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* All Verified Summary */}
            {verifiedCount >= DOC_TYPES.filter(d => d.required).length && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-900/20 border-2 border-emerald-500/30 p-4 text-center"
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-black text-emerald-300 uppercase tracking-wider">
                  ALL REQUIRED DOCUMENTS VERIFIED
                </p>
                <p className="text-[10px] text-emerald-500/60 uppercase tracking-widest mt-1">
                  {participant.name} • {participant.playerId}
                </p>
                <button
                  onClick={resetScanner}
                  className="mt-3 px-6 py-2 bg-[#FF5500] text-white font-bold uppercase tracking-wider text-xs hover:bg-[#d94e16] transition-colors"
                >
                  SCAN NEXT PARTICIPANT
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* CAPTURING: Camera Viewfinder */}
        {mode === "CAPTURING" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">CAPTURING</p>
              <p className="text-sm font-bold text-[#FF5500] uppercase tracking-wider">
                {DOC_TYPES.find((d) => d.type === activeDocType)?.label}
              </p>
            </div>

            <div className="relative bg-black border-2 border-[#FF5500]/30 aspect-[4/3] overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Viewfinder guides */}
              <div className="absolute inset-4 border-2 border-white/20 pointer-events-none" />
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#FF5500]" />
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#FF5500]" />
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#FF5500]" />
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#FF5500]" />
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  stopCamera();
                  setMode("PARTICIPANT");
                  setActiveDocType(null);
                }}
                className="flex-1 py-3.5 bg-gray-700 text-white font-bold uppercase tracking-wider text-xs hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                CANCEL
              </button>
              <button
                onClick={capturePhoto}
                className="flex-1 py-3.5 bg-[#FF5500] text-white font-bold uppercase tracking-wider text-xs hover:bg-[#d94e16] transition-colors flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                CAPTURE
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
