"use client";

import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { Download, Printer, CheckCircle2, Shield, QrCode } from "lucide-react";

export interface PortalQrCodeProps {
  value: string; // The opaque URL or secure token
  title?: string;
  subtitle?: string;
  name?: string;
  participantName?: string;
  institution?: string;
  referenceId?: string;
  referenceCode?: string;
  roleOrType?: string;
  qrType?: "PARTICIPANT" | "TEAM" | string;
  size?: number;
  showActions?: boolean;
  className?: string;
}

/**
 * Authentic, standards-compliant SVG QR pass generator & card renderer.
 * Produces high-resolution, scalable, printable SVG QR codes that scan natively on all mobile devices.
 */
export const PortalQrCode: React.FC<PortalQrCodeProps> = ({
  value,
  title = "SOUTH ZONE WOMEN'S BADMINTON CHAMPIONSHIP 2026",
  subtitle,
  name,
  participantName,
  institution = "Accredited Institution",
  referenceId,
  referenceCode,
  roleOrType,
  qrType = "PARTICIPANT",
  size = 200,
  showActions = true,
  className = "",
}) => {
  const displayName = participantName || name || "Accredited Athlete";
  const displayRef = referenceCode || referenceId || "SZ-2026";
  const displayRole = subtitle || roleOrType || (qrType === "TEAM" ? "OFFICIAL TEAM QR PASS" : "PARTICIPANT ACCREDITATION PASS");
  const [svgContent, setSvgContent] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!value) return;
    QRCode.toString(
      value,
      {
        type: "svg",
        margin: 1,
        color: {
          dark: "#050914",
          light: "#FFFFFF",
        },
        errorCorrectionLevel: "M",
      },
      (err, string) => {
        if (!err && string) {
          setSvgContent(string);
        } else {
          console.error("QR generation error:", err);
        }
      }
    );
  }, [value]);

  const handleDownload = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SZWBT2026_QR_${displayRef || "PASS"}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${displayRef} - Official Accreditation QR Pass</title>
          <style>
            @page { size: A6 portrait; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 20px; color: #0F172A; }
            .card { border: 2px solid #0F172A; padding: 20px; max-width: 320px; margin: 0 auto; }
            .title { font-size: 11px; font-weight: bold; letter-spacing: 1px; color: #FF5500; margin-bottom: 4px; }
            .sub { font-size: 9px; color: #475569; margin-bottom: 12px; }
            .name { font-size: 16px; font-weight: 800; margin-bottom: 2px; }
            .inst { font-size: 11px; color: #334155; margin-bottom: 8px; }
            .ref { font-family: monospace; font-size: 12px; font-weight: bold; background: #F1F5F9; padding: 4px 8px; display: inline-block; margin-bottom: 12px; }
            .qr-container svg { width: 180px; height: 180px; }
            .footer { font-size: 8px; color: #64748B; margin-top: 14px; border-top: 1px dashed #CBD5E1; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="title">${title}</div>
            <div class="sub">${displayRole.toUpperCase()}</div>
            <div class="name">${displayName}</div>
            <div class="inst">${institution}</div>
            <div class="ref">${displayRef}</div>
            <div class="qr-container">${svgContent}</div>
            <div class="footer">OFFICIAL ACCREDITATION PASS • DR. PRABHAKAR KORE SPORTS ARENA • HUBBALLI</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      ref={cardRef}
      className={`bg-white border-2 border-black p-5 shadow-[4px_4px_0px_#000] text-black flex flex-col items-center select-none ${className}`}
      style={{ maxWidth: Math.max(size + 60, 280) }}
    >
      {/* Official Header */}
      <div className="w-full text-center pb-3 border-b border-gray-200 mb-3">
        <p className="font-pixel text-[8.5px] text-[#FF5500] font-black uppercase tracking-wider leading-tight">
          {title}
        </p>
        <p className="font-pixel text-[7.5px] text-gray-500 uppercase tracking-widest mt-0.5">
          {displayRole}
        </p>
      </div>

      {/* Participant Identity */}
      <div className="w-full text-center mb-3">
        <h4 className="font-display text-base sm:text-lg font-black text-[#0F172A] leading-tight">
          {displayName}
        </h4>
        <p className="font-sans text-xs text-gray-600 line-clamp-1 mt-0.5">
          {institution}
        </p>
        <div className="inline-block mt-1.5 px-2.5 py-0.5 bg-gray-100 border border-gray-300 font-mono text-[10px] font-bold text-[#FF5500]">
          {displayRef}
        </div>
      </div>

      {/* SVG QR Code Rendering */}
      <div
        className="p-2.5 bg-white border border-gray-300 flex items-center justify-center my-1"
        style={{ width: size, height: size }}
      >
        {svgContent ? (
          <div
            className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 gap-1">
            <QrCode className="w-10 h-10 animate-pulse text-gray-300" />
            <span className="text-[10px] font-pixel">GENERATING...</span>
          </div>
        )}
      </div>

      {/* Security Note */}
      <p className="text-[7.5px] text-gray-400 text-center uppercase tracking-wider mt-2">
        SCAN VIA OFFICIAL DESK TERMINALS • VERIFIED SECURE TOKEN
      </p>

      {/* Action Buttons: DOWNLOAD / PRINT */}
      {showActions && (
        <div className="w-full flex items-center justify-center gap-2 mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={handleDownload}
            type="button"
            className="flex-1 py-2 px-3 bg-[#0F172A] hover:bg-black text-white font-pixel text-[9px] font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-black shadow-[2px_2px_0px_#888]"
          >
            <Download className="w-3.5 h-3.5 text-[#18D8D0]" />
            <span>DOWNLOAD</span>
          </button>

          <button
            onClick={handlePrint}
            type="button"
            className="flex-1 py-2 px-3 bg-[#FF5500] hover:bg-[#d94e16] text-black font-pixel text-[9px] font-bold tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-black shadow-[2px_2px_0px_#000]"
          >
            <Printer className="w-3.5 h-3.5 text-black" />
            <span>PRINT</span>
          </button>
        </div>
      )}
    </div>
  );
};
