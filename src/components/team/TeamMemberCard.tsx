"use client";

import React from "react";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { TeamMemberInvitation } from "@/data/teams";
import { Mail, User, ShieldCheck, Clock, Trash2 } from "lucide-react";

interface TeamMemberCardProps {
  member: TeamMemberInvitation;
  onRemove?: () => void;
  onResendInvite?: () => void;
}

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  member,
  onRemove,
  onResendInvite,
}) => {
  const getBadgeVariant = (status: TeamMemberInvitation["status"]) => {
    switch (status) {
      case "ACCEPTED":
      case "EMAIL_VERIFIED":
        return "green";
      case "INVITED":
      case "EMAIL_UNVERIFIED":
        return "orange";
      case "DECLINED":
      case "REMOVED":
        return "red";
      default:
        return "dark";
    }
  };

  return (
    <div className="p-4 bg-pixel-dark border-2 border-pixel-gray-800 shadow-pixel-sm flex items-center justify-between gap-4 font-sans text-xs">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-pixel-black border border-pixel-gray-700 flex items-center justify-center font-pixel text-xs text-pixel-orange-bright">
          {member.role === "CAPTAIN" ? "👑" : "🏃"}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-pixel text-xs text-pixel-cream">{member.name || member.email}</span>
            <PixelBadge variant={member.role === "CAPTAIN" ? "orange" : "dark"}>
              {member.role}
            </PixelBadge>
          </div>
          <p className="font-mono text-[11px] text-pixel-gray-400">{member.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <PixelBadge variant={getBadgeVariant(member.status)}>
          {member.status}
        </PixelBadge>

        {member.status === "INVITED" && onResendInvite && (
          <button
            onClick={onResendInvite}
            title="Resend SMTP Invitation Email"
            className="font-pixel text-[9px] text-pixel-amber hover:text-pixel-orange-bright flex items-center gap-1 cursor-pointer"
          >
            <Mail className="w-3 h-3" />
            <span className="hidden sm:inline">RESEND</span>
          </button>
        )}

        {onRemove && (
          <button
            onClick={onRemove}
            title="Remove Member"
            className="p-1 text-pixel-gray-500 hover:text-pixel-red cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
