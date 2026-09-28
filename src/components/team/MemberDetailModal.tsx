"use client";

import React, { useEffect } from "react";
import { X, Shield, User, FileText, Home, Bus, Trophy, AlertCircle, CheckCircle2 } from "lucide-react";
import { PixelBadge } from "@/components/pixel/PixelBadge";

export interface MemberDetailData {
  id: string;
  playerId: string;
  name: string;
  email: string | null;
  phone: string | null;
  institution: string;
  state: string;
  category: string;
  gender: string | null;
  registrationStatus: string;
  teamRole: string;
  documents: Array<{
    id: string;
    type: string;
    fileName: string;
    status: string;
    updatedAt: string | Date;
  }>;
  accommodation: {
    hostel: string;
    roomNumber: string;
    bedNumber: string;
    status: string;
  };
  transport: {
    tripCode: string;
    routeName: string;
    pickupPoint: string;
    dropPoint: string;
    boardingStatus: string;
  } | null;
}

interface MemberDetailModalProps {
  member: MemberDetailData | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  member,
  isOpen,
  onClose,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !member) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-modal-title"
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-pixel-dark border-2 border-pixel-orange-fiery shadow-pixel-orange text-pixel-cream font-sans custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-pixel-black border-b-2 border-pixel-orange-fiery">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-pixel-orange-fiery" />
            <h2
              id="member-modal-title"
              className="font-pixel text-xs sm:text-sm text-pixel-cream uppercase tracking-wider"
            >
              CONTINGENT DOSSIER &bull; {member.playerId}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dossier"
            className="p-1.5 text-pixel-gray-400 hover:text-pixel-orange-fiery hover:bg-pixel-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Identity Section */}
          <div className="p-4 bg-pixel-black/60 border border-pixel-gray-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pixel-gray-800 pb-2.5">
              <div>
                <span className="font-pixel text-[10px] text-pixel-muted uppercase">ATHLETE / OFFICIAL NAME</span>
                <h3 className="text-lg font-bold font-display text-pixel-cream tracking-wide">
                  {member.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <PixelBadge variant={member.teamRole === "CAPTAIN" ? "orange" : member.teamRole === "MANAGER" ? "cyan" : "dark"}>
                  {member.teamRole}
                </PixelBadge>
                <PixelBadge variant={member.registrationStatus === "APPROVED" || member.registrationStatus === "COMPLETED" ? "green" : "yellow"}>
                  {member.registrationStatus}
                </PixelBadge>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-pixel-muted font-pixel uppercase block">PLAYER ID</span>
                <span className="font-mono text-pixel-amber font-semibold">{member.playerId}</span>
              </div>
              <div>
                <span className="text-[10px] text-pixel-muted font-pixel uppercase block">CATEGORY</span>
                <span className="text-pixel-cream">{member.category}</span>
              </div>
              <div>
                <span className="text-[10px] text-pixel-muted font-pixel uppercase block">GENDER</span>
                <span className="text-pixel-cream">{member.gender || "FEMALE"}</span>
              </div>
              <div>
                <span className="text-[10px] text-pixel-muted font-pixel uppercase block">STATE</span>
                <span className="text-pixel-cream">{member.state}</span>
              </div>
            </div>

            <div className="pt-1 text-xs">
              <span className="text-[10px] text-pixel-muted font-pixel uppercase block">AFFILIATED INSTITUTION</span>
              <span className="text-pixel-cream font-medium">{member.institution}</span>
            </div>
          </div>

          {/* Document Verification Readiness */}
          <div className="p-4 bg-pixel-black/60 border border-pixel-gray-800 space-y-3">
            <div className="flex items-center gap-2 border-b border-pixel-gray-800 pb-2">
              <FileText className="w-4 h-4 text-pixel-cyan" />
              <h4 className="font-pixel text-xs text-pixel-cyan uppercase tracking-wider">
                DOCUMENT VERIFICATION READINESS
              </h4>
            </div>

            {member.documents.length === 0 ? (
              <p className="text-xs text-pixel-muted italic py-1">
                No physical documents captured yet. Participant must report to Registration Desk 02 with original certificates.
              </p>
            ) : (
              <div className="space-y-2">
                {member.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2.5 bg-pixel-dark border border-pixel-gray-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-pixel text-[11px] text-pixel-cream">{doc.type.replace(/_/g, " ")}</p>
                      <p className="font-mono text-[10px] text-pixel-muted truncate max-w-[200px] sm:max-w-xs">{doc.fileName}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <PixelBadge variant={doc.status === "VERIFIED" || doc.status === "READY" ? "green" : "yellow"}>
                        {doc.status}
                      </PixelBadge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-pixel-muted italic flex items-center gap-1">
              <Shield className="w-3 h-3 text-pixel-orange-fiery shrink-0" />
              Raw document files remain confidential in the security vault. Registration Staff manages capture.
            </p>
          </div>

          {/* Accommodation & Room Slot */}
          <div className="p-4 bg-pixel-black/60 border border-pixel-gray-800 space-y-3">
            <div className="flex items-center gap-2 border-b border-pixel-gray-800 pb-2">
              <Home className="w-4 h-4 text-pixel-green" />
              <h4 className="font-pixel text-xs text-pixel-green uppercase tracking-wider">
                ACCOMMODATION ALLOCATION
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 bg-pixel-dark border border-pixel-gray-800">
                <span className="text-[10px] text-pixel-muted font-pixel uppercase block">HOSTEL BLOCK</span>
                <span className="font-semibold text-pixel-cream">{member.accommodation.hostel}</span>
              </div>
              <div className="p-2.5 bg-pixel-dark border border-pixel-gray-800">
                <span className="text-[10px] text-pixel-muted font-pixel uppercase block">ROOM NUMBER</span>
                <span className="font-mono text-pixel-amber font-semibold">{member.accommodation.roomNumber}</span>
              </div>
              <div className="p-2.5 bg-pixel-dark border border-pixel-gray-800">
                <span className="text-[10px] text-pixel-muted font-pixel uppercase block">BED SLOT</span>
                <span className="font-mono text-pixel-cyan font-semibold">{member.accommodation.bedNumber}</span>
              </div>
            </div>
          </div>

          {/* Transport Fleet Assignment */}
          <div className="p-4 bg-pixel-black/60 border border-pixel-gray-800 space-y-3">
            <div className="flex items-center gap-2 border-b border-pixel-gray-800 pb-2">
              <Bus className="w-4 h-4 text-pixel-amber" />
              <h4 className="font-pixel text-xs text-pixel-amber uppercase tracking-wider">
                TRANSIT & BOARDING (COMPLIMENTARY)
              </h4>
            </div>

            {member.transport ? (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-pixel-dark border border-pixel-gray-800">
                    <span className="text-[10px] text-pixel-muted font-pixel uppercase block">TRIP & ROUTE</span>
                    <span className="font-semibold text-pixel-cream">{member.transport.tripCode} &bull; {member.transport.routeName}</span>
                  </div>
                  <div className="p-2 bg-pixel-dark border border-pixel-gray-800">
                    <span className="text-[10px] text-pixel-muted font-pixel uppercase block">BOARDING STATUS</span>
                    <PixelBadge variant={member.transport.boardingStatus === "BOARDED" ? "green" : "orange"}>
                      {member.transport.boardingStatus}
                    </PixelBadge>
                  </div>
                </div>
                <div className="text-[11px] text-pixel-gray-300">
                  <span className="text-pixel-muted">Pickup:</span> {member.transport.pickupPoint} &rarr; <span className="text-pixel-muted">Drop:</span> {member.transport.dropPoint}
                </div>
              </div>
            ) : (
              <p className="text-xs text-pixel-muted italic py-1">
                No individual shuttle booking recorded yet. General team transit shuttle remains available.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-3 bg-pixel-black border-t-2 border-pixel-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-pixel text-xs bg-pixel-gray-800 text-pixel-cream hover:bg-pixel-orange-fiery hover:text-black border border-pixel-gray-700 transition-colors"
          >
            CLOSE DOSSIER
          </button>
        </div>
      </div>
    </div>
  );
};
