"use client";

import React, { useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import { PixelStat } from "@/components/pixel/PixelStat";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelTable } from "@/components/pixel/PixelTable";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { TeamMemberCard } from "@/components/team/TeamMemberCard";
import { TEAMS_DATA } from "@/data/teams";
import { PARTICIPANTS_DATA } from "@/data/participants";
import { INITIAL_ROOMS_DATA } from "@/data/accommodation";
import { Users, Calendar, Home, Bus, Mail, Plus } from "lucide-react";

export default function TeamManagerDashboard() {
  const currentRole = ROLE_MATRIX.find(r => r.roleId === "team_manager")!;
  const team = TEAMS_DATA[0]; // KARNATAKA TITANS
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviting(true);
    setInviteMsg("");

    try {
      const res = await fetch("/api/teams/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          teamName: team.name,
          inviterName: team.managerName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInviteMsg(`✓ Invitation sent to ${inviteEmail} via SMTP!`);
        setInviteEmail("");
      } else {
        setInviteMsg(`⚠ ${data.error || "Failed to send invitation."}`);
      }
    } catch (err) {
      setInviteMsg("⚠ Error connecting to invitation server.");
    } finally {
      setInviting(false);
    }
  };

  return (
    <DashboardShell currentRole={currentRole}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PixelStat label="MY TEAM MEMBERS" value={`${team.members.length} ATHLETES`} subtext={team.institution} icon={<Users className="w-5 h-5" />} accent="orange" />
        <PixelStat label="TEAM STATUS" value={team.status} subtext="Official Registration" icon={<Calendar className="w-5 h-5" />} accent="amber" />
        <PixelStat label="MY ACCOMMODATION" value="SHALMALA & VINDHYA" subtext="4-Bed Rooms" icon={<Home className="w-5 h-5" />} accent="green" />
        <PixelStat label="SHUTTLE PASS" value="ACTIVE PASS" subtext="Route 02 Express" icon={<Bus className="w-5 h-5" />} accent="cyan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Team Members Roster & SMTP Invitations */}
        <div className="lg:col-span-2 space-y-4">
          <PixelCard headerTitle="TEAM MEMBERS & INVITATIONS" headerBadge="ROSTER">
            {/* SMTP Invitation Form */}
            <form onSubmit={handleSendInvite} className="mb-4 p-3 bg-pixel-black border border-pixel-gray-800 flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="Invite athlete email address..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 bg-pixel-dark text-pixel-cream font-sans text-xs px-3 py-2 border border-pixel-gray-700 focus:outline-none focus:border-pixel-orange-fiery"
                required
              />
              <PixelButton type="submit" variant="primary" size="sm" glow disabled={inviting}>
                <Mail className="w-3.5 h-3.5" />
                <span>{inviting ? "SENDING..." : "INVITE MEMBER (SMTP)"}</span>
              </PixelButton>
            </form>

            {inviteMsg && (
              <p className="font-pixel text-[10px] text-pixel-amber mb-3">{inviteMsg}</p>
            )}

            <div className="space-y-2">
              {team.members.map((m) => (
                <TeamMemberCard key={m.id} member={m} />
              ))}
            </div>
          </PixelCard>

          {/* Team Accommodation Section */}
          <PixelCard headerTitle="MY TEAM ACCOMMODATION ALLOCATIONS" headerBadge="HOSTELS">
            <div className="space-y-2 font-sans text-xs my-2">
              <div className="p-3 bg-pixel-black border border-pixel-gray-800 flex justify-between items-center">
                <div>
                  <p className="font-pixel text-xs text-pixel-cream">Ananya Sharma (Captain)</p>
                  <p className="text-pixel-gray-400">SHALMALA HOSTEL • Room S-101 (BED 01)</p>
                </div>
                <PixelBadge variant="green">ALLOCATED</PixelBadge>
              </div>

              <div className="p-3 bg-pixel-black border border-pixel-gray-800 flex justify-between items-center">
                <div>
                  <p className="font-pixel text-xs text-pixel-cream">Priya Nair (Athlete)</p>
                  <p className="text-pixel-gray-400">SHALMALA HOSTEL • Room S-101 (BED 02)</p>
                </div>
                <PixelBadge variant="green">ALLOCATED</PixelBadge>
              </div>

              <div className="p-3 bg-pixel-black border border-pixel-gray-800 flex justify-between items-center">
                <div>
                  <p className="font-pixel text-xs text-pixel-cream">Rajesh Kumar (Team Manager)</p>
                  <p className="text-pixel-gray-400">VINDHYA BOYS HOSTEL • Room V-101 (BED 01)</p>
                </div>
                <PixelBadge variant="green">ALLOCATED</PixelBadge>
              </div>
            </div>
          </PixelCard>
        </div>

        {/* Manager & Captain Info Cards */}
        <div className="space-y-4">
          <PixelCard headerTitle="TEAM MANAGER DETAILS" headerBadge="OFFICIAL">
            <div className="space-y-2 font-sans text-xs my-1">
              <p className="font-pixel text-xs text-pixel-cream">{team.managerName}</p>
              <p className="text-pixel-gray-400">Email: {team.managerEmail}</p>
              <p className="text-pixel-gray-400">Phone: {team.managerPhone}</p>
              <p className="text-pixel-amber">Hostel: Vindhya Boys Hostel (V-101)</p>
            </div>
          </PixelCard>

          <PixelCard headerTitle="TEAM CAPTAIN DETAILS" headerBadge="CAPTAIN">
            <div className="space-y-2 font-sans text-xs my-1">
              <p className="font-pixel text-xs text-pixel-cream">{team.captainName}</p>
              <p className="text-pixel-gray-400">Email: {team.captainEmail}</p>
              <p className="text-pixel-amber">Hostel: Shalmala Hostel (S-101)</p>
            </div>
          </PixelCard>
        </div>
      </div>
    </DashboardShell>
  );
}
