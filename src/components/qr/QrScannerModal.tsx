"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Camera, QrCode, Upload, AlertCircle, RefreshCw, ArrowRight } from "lucide-react";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (token: string) => void;
  title?: string;
  subtitle?: string;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = "ACCREDITATION QR SCANNER",
  subtitle = "Align participant or team QR pass within the viewfinder or enter token manually",
}) => {
  const [manualToken, setManualToken] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Start camera stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera device not supported on this browser or connection is insecure (requires HTTPS).");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission denied. Please allow camera access in your browser settings or use manual input below."
          : "Camera unavailable or in use by another application. Please enter the token below."
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setManualToken("");
      setCameraError(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    stopCamera();
    onScan(manualToken.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#07101D] border-2 border-[#18D8D0] shadow-[0_0_40px_rgba(24,216,208,0.3)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#050914] border-b border-[#18D8D0]/30">
          <div className="flex items-center gap-2.5">
            <QrCode className="w-5 h-5 text-[#18D8D0]" />
            <div>
              <h3 className="font-pixel text-xs text-[#F4E6CE] font-bold tracking-wider">
                {title}
              </h3>
              <p className="text-[10px] text-[#91A0AE]">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white bg-[#0A1628] border border-gray-700 hover:border-gray-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder / Camera Area */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${isCameraActive ? "block" : "hidden"}`}
          />

          {isCameraActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Target Reticle */}
              <div className="relative w-56 h-56 border-2 border-[#18D8D0]/70 rounded-xs shadow-[0_0_20px_rgba(24,216,208,0.5)]">
                {/* Corner Accents */}
                <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-4 border-l-4 border-[#FF5500]" />
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-4 border-r-4 border-[#FF5500]" />
                <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-4 border-l-4 border-[#FF5500]" />
                <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-4 border-r-4 border-[#FF5500]" />
                {/* Laser scan line */}
                <div className="absolute left-0 right-0 h-0.5 bg-[#FF5500] shadow-[0_0_8px_#FF5500] animate-[scan_2s_ease-in-out_infinite]" />
              </div>
            </div>
          )}

          {!isCameraActive && (
            <div className="p-6 text-center max-w-sm flex flex-col items-center">
              <Camera className="w-12 h-12 text-[#91A0AE] mb-3 opacity-60" />
              {cameraError ? (
                <div className="p-3 bg-red-950/40 border border-red-500/50 text-red-300 text-xs text-left mb-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{cameraError}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#91A0AE] mb-3">
                  Initializing camera hardware...
                </p>
              )}
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-[#0A1628] hover:bg-[#11243E] text-[#18D8D0] border border-[#18D8D0]/60 font-pixel text-[10px] tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>RETRY CAMERA</span>
              </button>
            </div>
          )}
        </div>

        {/* Manual Input Fallback */}
        <div className="p-4 bg-[#050914] border-t border-[#18D8D0]/30">
          <p className="text-[10px] font-pixel text-[#91A0AE] uppercase tracking-wider mb-2">
            MANUAL PASS TOKEN OR PLAYER ID LOOKUP
          </p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="e.g. sz26_part_... or SZ-2026-001 or TM-SZ-001"
              className="flex-1 px-3 py-2 bg-[#07101D] border border-[#18D8D0]/40 text-white font-mono text-xs focus:outline-none focus:border-[#FF5500]"
            />
            <button
              type="submit"
              disabled={!manualToken.trim()}
              className="px-4 py-2 bg-[#FF5500] hover:bg-[#d94e16] disabled:opacity-40 text-black font-pixel text-xs font-bold tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[2px_2px_0px_#000]"
            >
              <span>RESOLVE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
