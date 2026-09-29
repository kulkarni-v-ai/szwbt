"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { TournamentAdminShell } from "@/components/tournament/TournamentAdminShell";
import {
  Trophy,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Radio,
  Clock,
  Layers,
  Search,
  RefreshCw,
  ArrowRight,
  Shield,
  Eye,
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  UserCheck,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { OfficialPoolBracket } from "@/components/tournament/OfficialPoolBracket";
import {
  ROUND_1_MATCH_FLOW,
  BYE_SLOT_OPTIONS,
  getGlobalMatchNumber,
} from "@/lib/tournament/fixtureConstants";

export default function AdminFixturesPage() {
  const [fixturesData, setFixturesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "SUCCESS" | "ERROR" | "INFO"; text: string } | null>(null);

  // Draw input state
  const [searchTeamQuery, setSearchTeamQuery] = useState("");
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [lastAssignedInfo, setLastAssignedInfo] = useState<any | null>(null);

  // Fixed team modal state
  const [showFixedModal, setShowFixedModal] = useState(false);
  const [fixedTeamId, setFixedTeamId] = useState("");
  const [fixedPool, setFixedPool] = useState<"A" | "B" | "C" | "D">("A");
  const [fixedPositionId, setFixedPositionId] = useState("");
  const [fixedReason, setFixedReason] = useState("");

  // Correction modal state
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctPositionId, setCorrectPositionId] = useState("");
  const [correctNewTeamId, setCorrectNewTeamId] = useState("");
  const [correctReason, setCorrectReason] = useState("");

  // Position table filter & search
  const [tableFilterPool, setTableFilterPool] = useState("ALL");
  const [tableFilterSide, setTableFilterSide] = useState("ALL");
  const [tableFilterStatus, setTableFilterStatus] = useState("ALL");
  const [tableSearch, setTableSearch] = useState("");
  const [activeViewMode, setActiveViewMode] = useState<"BRACKET" | "TABLE">("TABLE");
  const [adminTableTab, setAdminTableTab] = useState<"MATCHES" | "POSITIONS">("MATCHES");

  // Flow Controller & Two Boxes VS Pairing State
  const [flowPool, setFlowPool] = useState<"A" | "B" | "C" | "D">("A");
  const [flowMatchIdx, setFlowMatchIdx] = useState<number>(0);
  const [flowMode, setFlowMode] = useState<"ROUND_1" | "SEEDS_BYES">("ROUND_1");

  // Two Boxes VS State
  const [team1Input, setTeam1Input] = useState<string>("");
  const [team1Fetched, setTeam1Fetched] = useState<any | null>(null);
  const [team1Fetching, setTeam1Fetching] = useState<boolean>(false);

  const [team2Input, setTeam2Input] = useState<string>("");
  const [team2Fetched, setTeam2Fetched] = useState<any | null>(null);
  const [team2Fetching, setTeam2Fetching] = useState<boolean>(false);

  const [pairAssigning, setPairAssigning] = useState<boolean>(false);

  // Seeds & Byes Mode State
  const [selectedByeSlot, setSelectedByeSlot] = useState<number>(1);
  const [byeTeamInput, setByeTeamInput] = useState<string>("");
  const [byeTeamFetched, setByeTeamFetched] = useState<any | null>(null);
  const [byeTeamFetching, setByeTeamFetching] = useState<boolean>(false);
  const [byeAssigning, setByeAssigning] = useState<boolean>(false);

  const currentMatch = ROUND_1_MATCH_FLOW[flowMatchIdx] || ROUND_1_MATCH_FLOW[0];
  const globalMatchNum = getGlobalMatchNumber(flowPool, currentMatch.matchInPool);

  const currentPoolSlots = (fixturesData?.bracketSlots || []).filter((s: any) => s.pool === flowPool);
  const currentPoolAssignedCount = currentPoolSlots.filter((s: any) => s.teamId).length;

  const poolCounts = {
    A: (fixturesData?.bracketSlots || []).filter((s: any) => s.pool === "A" && s.teamId).length,
    B: (fixturesData?.bracketSlots || []).filter((s: any) => s.pool === "B" && s.teamId).length,
    C: (fixturesData?.bracketSlots || []).filter((s: any) => s.pool === "C" && s.teamId).length,
    D: (fixturesData?.bracketSlots || []).filter((s: any) => s.pool === "D" && s.teamId).length,
  };

  // Synchronize inputs when active match or pool changes
  useEffect(() => {
    if (!fixturesData?.bracketSlots) return;
    const poolSlots = fixturesData.bracketSlots.filter((s: any) => s.pool === flowPool);
    const slotAMatch = poolSlots.find((s: any) => s.slot === currentMatch.slotA);
    const slotBMatch = poolSlots.find((s: any) => s.slot === currentMatch.slotB);

    if (slotAMatch && slotAMatch.teamId) {
      setTeam1Input(slotAMatch.teamNumber ? String(slotAMatch.teamNumber) : slotAMatch.teamCode || "");
      setTeam1Fetched({
        id: slotAMatch.teamId,
        teamCode: slotAMatch.teamCode,
        teamNumber: slotAMatch.teamNumber,
        name: slotAMatch.teamName,
        state: slotAMatch.state,
      });
    } else {
      setTeam1Input("");
      setTeam1Fetched(null);
    }

    if (slotBMatch && slotBMatch.teamId) {
      setTeam2Input(slotBMatch.teamNumber ? String(slotBMatch.teamNumber) : slotBMatch.teamCode || "");
      setTeam2Fetched({
        id: slotBMatch.teamId,
        teamCode: slotBMatch.teamCode,
        teamNumber: slotBMatch.teamNumber,
        name: slotBMatch.teamName,
        state: slotBMatch.state,
      });
    } else {
      setTeam2Input("");
      setTeam2Fetched(null);
    }
  }, [flowPool, flowMatchIdx, fixturesData?.bracketSlots]);

  // Synchronize Seeds & Byes
  useEffect(() => {
    if (!fixturesData?.bracketSlots) return;
    const poolSlots = fixturesData.bracketSlots.filter((s: any) => s.pool === flowPool);
    const targetSlot = poolSlots.find((s: any) => s.slot === selectedByeSlot);
    if (targetSlot && targetSlot.teamId) {
      setByeTeamInput(targetSlot.teamNumber ? String(targetSlot.teamNumber) : targetSlot.teamCode || "");
      setByeTeamFetched({
        id: targetSlot.teamId,
        teamCode: targetSlot.teamCode,
        teamNumber: targetSlot.teamNumber,
        name: targetSlot.teamName,
        state: targetSlot.state,
      });
    } else {
      setByeTeamInput("");
      setByeTeamFetched(null);
    }
  }, [flowPool, selectedByeSlot, fixturesData?.bracketSlots]);

  // Search / Fetch Team 1
  const handleTeam1Search = async (val: string) => {
    setTeam1Input(val);
    if (!val.trim()) {
      setTeam1Fetched(null);
      return;
    }
    try {
      setTeam1Fetching(true);
      const res = await fetch(`/api/tournament/fixtures/teams?q=${encodeURIComponent(val.trim())}`);
      const data = await res.json();
      if (data.success && data.teams && data.teams.length > 0) {
        setTeam1Fetched(data.teams[0]);
      } else {
        setTeam1Fetched(null);
      }
    } catch (err) {
      console.error("Error fetching team 1:", err);
    } finally {
      setTeam1Fetching(false);
    }
  };

  // Search / Fetch Team 2
  const handleTeam2Search = async (val: string) => {
    setTeam2Input(val);
    if (!val.trim()) {
      setTeam2Fetched(null);
      return;
    }
    try {
      setTeam2Fetching(true);
      const res = await fetch(`/api/tournament/fixtures/teams?q=${encodeURIComponent(val.trim())}`);
      const data = await res.json();
      if (data.success && data.teams && data.teams.length > 0) {
        setTeam2Fetched(data.teams[0]);
      } else {
        setTeam2Fetched(null);
      }
    } catch (err) {
      console.error("Error fetching team 2:", err);
    } finally {
      setTeam2Fetching(false);
    }
  };

  // Search / Fetch Bye Team
  const handleByeTeamSearch = async (val: string) => {
    setByeTeamInput(val);
    if (!val.trim()) {
      setByeTeamFetched(null);
      return;
    }
    try {
      setByeTeamFetching(true);
      const res = await fetch(`/api/tournament/fixtures/teams?q=${encodeURIComponent(val.trim())}`);
      const data = await res.json();
      if (data.success && data.teams && data.teams.length > 0) {
        setByeTeamFetched(data.teams[0]);
      } else {
        setByeTeamFetched(null);
      }
    } catch (err) {
      console.error("Error fetching bye team:", err);
    } finally {
      setByeTeamFetching(false);
    }
  };

  // Handler: Confirm Match Fixture Pairing (Fills Both Slots & Auto-Advances Flow)
  const handleConfirmPairFixture = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!team1Fetched || !team2Fetched) {
      setStatusMessage({
        type: "ERROR",
        text: "Please enter valid team numbers for BOTH Team 1 and Team 2 before confirming.",
      });
      return;
    }
    if (team1Fetched.id === team2Fetched.id) {
      setStatusMessage({
        type: "ERROR",
        text: "Team 1 and Team 2 cannot be the same university.",
      });
      return;
    }

    // Strict 25-team limit per pool check
    const poolSlots = (fixturesData?.bracketSlots || []).filter((s: any) => s.pool === flowPool);
    const otherAssignedCount = poolSlots.filter(
      (s: any) => s.teamId && s.slot !== currentMatch.slotA && s.slot !== currentMatch.slotB
    ).length;

    if (otherAssignedCount + 2 > 25) {
      setStatusMessage({
        type: "ERROR",
        text: `Cannot pair match: Pool ${flowPool} limit is 25 teams! Currently ${otherAssignedCount} other teams are assigned in Pool ${flowPool}. Adding this match would exceed the 25-team limit.`,
      });
      return;
    }

    // Ensure neither team is already assigned elsewhere in the tournament
    const existing1 = (fixturesData?.bracketSlots || []).find(
      (s: any) => s.teamId === team1Fetched.id && !(s.pool === flowPool && s.slot === currentMatch.slotA)
    );
    if (existing1) {
      setStatusMessage({
        type: "ERROR",
        text: `Team #${team1Fetched.teamNumber} (${team1Fetched.name}) is already assigned to Pool ${existing1.pool} Slot ${existing1.slot}! Each team can only be assigned once in the tournament.`,
      });
      return;
    }

    const existing2 = (fixturesData?.bracketSlots || []).find(
      (s: any) => s.teamId === team2Fetched.id && !(s.pool === flowPool && s.slot === currentMatch.slotB)
    );
    if (existing2) {
      setStatusMessage({
        type: "ERROR",
        text: `Team #${team2Fetched.teamNumber} (${team2Fetched.name}) is already assigned to Pool ${existing2.pool} Slot ${existing2.slot}! Each team can only be assigned once in the tournament.`,
      });
      return;
    }

    try {
      setPairAssigning(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_MATCH_FIXTURE",
          pool: flowPool,
          matchNumber: globalMatchNum,
          slotA: currentMatch.slotA,
          slotB: currentMatch.slotB,
          teamANumber: team1Fetched.teamNumber,
          teamBNumber: team2Fetched.teamNumber,
          teamAId: team1Fetched.id,
          teamBId: team2Fetched.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setStatusMessage({
        type: "SUCCESS",
        text: `✓ FIXTURE SAVED: Pool ${flowPool} Match ${currentMatch.matchInPool} (M${String(globalMatchNum).padStart(3, "0")}) — Slot ${currentMatch.slotA} (#${team1Fetched.teamNumber} ${team1Fetched.name}) VS Slot ${currentMatch.slotB} (#${team2Fetched.teamNumber} ${team2Fetched.name})!`,
      });

      // Refresh DB data
      await fetchFixtures(true);
      await fetchTeams();

      // Flow advancement: Auto-advance to next match in the flow!
      if (flowMatchIdx < ROUND_1_MATCH_FLOW.length - 1) {
        setFlowMatchIdx((prev) => prev + 1);
      } else {
        setStatusMessage({
          type: "SUCCESS",
          text: `🎉 ALL 13 ROUND 1 FIXTURES IN POOL ${flowPool} HAVE BEEN COMPLETED!`,
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setPairAssigning(false);
    }
  };

  // Handler: Clear Current Match Fixture Slots
  const handleClearCurrentFixture = async () => {
    if (!confirm(`Are you sure you want to clear both Slot ${currentMatch.slotA} and Slot ${currentMatch.slotB} back to blank?`)) return;
    try {
      setPairAssigning(true);
      await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UNASSIGN_SLOT",
          pool: flowPool,
          slot: currentMatch.slotA,
        }),
      });
      await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UNASSIGN_SLOT",
          pool: flowPool,
          slot: currentMatch.slotB,
        }),
      });
      setStatusMessage({
        type: "SUCCESS",
        text: `Slots ${currentMatch.slotA} & ${currentMatch.slotB} cleared.`,
      });
      setTeam1Input("");
      setTeam1Fetched(null);
      setTeam2Input("");
      setTeam2Fetched(null);
      fetchFixtures(true);
      fetchTeams();
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setPairAssigning(false);
    }
  };

  // Handler: Assign Bye Slot
  const handleConfirmByeSlot = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!byeTeamFetched) {
      setStatusMessage({
        type: "ERROR",
        text: "Please enter a valid Team Number or Code first.",
      });
      return;
    }

    // Strict 25-team limit per pool check
    const poolSlots = (fixturesData?.bracketSlots || []).filter((s: any) => s.pool === flowPool);
    const otherAssignedCount = poolSlots.filter(
      (s: any) => s.teamId && s.slot !== selectedByeSlot
    ).length;

    if (otherAssignedCount + 1 > 25) {
      setStatusMessage({
        type: "ERROR",
        text: `Cannot fill bye: Pool ${flowPool} has reached the maximum tournament limit of 25 teams (Currently: 25/25). No more teams can be added to Pool ${flowPool}.`,
      });
      return;
    }

    // Ensure team is not already assigned elsewhere
    const existing = (fixturesData?.bracketSlots || []).find(
      (s: any) => s.teamId === byeTeamFetched.id && !(s.pool === flowPool && s.slot === selectedByeSlot)
    );
    if (existing) {
      setStatusMessage({
        type: "ERROR",
        text: `Team #${byeTeamFetched.teamNumber} (${byeTeamFetched.name}) is already assigned to Pool ${existing.pool} Slot ${existing.slot}! Each team can only be assigned once in the tournament.`,
      });
      return;
    }

    try {
      setByeAssigning(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_SLOT",
          pool: flowPool,
          slot: selectedByeSlot,
          teamId: byeTeamFetched.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setStatusMessage({
        type: "SUCCESS",
        text: `✓ BYE FILLED: Pool ${flowPool} - Slot ${selectedByeSlot} filled with Team #${byeTeamFetched.teamNumber} (${byeTeamFetched.name})!`,
      });

      fetchFixtures(true);
      fetchTeams();
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setByeAssigning(false);
    }
  };

  // Handler: Clear Bye Slot
  const handleClearByeSlot = async () => {
    try {
      setByeAssigning(true);
      await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UNASSIGN_SLOT",
          pool: flowPool,
          slot: selectedByeSlot,
        }),
      });
      setStatusMessage({
        type: "SUCCESS",
        text: `Pool ${flowPool} Slot ${selectedByeSlot} cleared.`,
      });
      setByeTeamInput("");
      setByeTeamFetched(null);
      fetchFixtures(true);
      fetchTeams();
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setByeAssigning(false);
    }
  };

  // Handler: Reset All 120 Bracket Slots
  const handleResetBracketSlots = async () => {
    if (!confirm("Are you sure you want to clear all 120 bracket slots back to empty?")) return;
    try {
      setActionLoading(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESET_SLOTS" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setStatusMessage({ type: "SUCCESS", text: "All bracket slots cleared to clean unassigned state!" });
      setTeam1Input("");
      setTeam1Fetched(null);
      setTeam2Input("");
      setTeam2Fetched(null);
      setByeTeamInput("");
      setByeTeamFetched(null);
      fetchFixtures(true);
      fetchTeams();
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const fetchFixtures = async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      const res = await fetch("/api/tournament/fixtures");
      const data = await res.json();
      if (data.success) {
        setFixturesData(data.data);
      }
    } catch (err: any) {
      console.error("Error fetching fixtures:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTeams = async (q = "") => {
    try {
      setTeamsLoading(true);
      const res = await fetch(`/api/tournament/fixtures/teams?available=true&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) {
        setAvailableTeams(data.teams);
      }
    } catch (err) {
      console.error("Error fetching teams:", err);
    } finally {
      setTeamsLoading(false);
    }
  };

  useEffect(() => {
    fetchFixtures();
    fetchTeams();
  }, []);

  const config = fixturesData?.config || {};
  const poolStats = fixturesData?.poolStats || {};
  const currentPos = fixturesData?.currentPosition;
  const nextPos = fixturesData?.nextPosition;
  const positions: any[] = fixturesData?.positions || [];
  const history: any[] = fixturesData?.history || [];

  // Handler: Provision 100 Teams
  const handleProvisionTeams = async () => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PROVISION_TEAMS" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setStatusMessage({ type: "SUCCESS", text: "Successfully ensured 100 accredited university teams in database." });
      fetchFixtures(true);
      fetchTeams();
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Start Draw
  const handleStartDraw = async () => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "START_DRAW" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setStatusMessage({ type: "SUCCESS", text: "Championship draw has started! Active pointer set." });
      fetchFixtures(true);
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Assign Fixed Team
  const handleAssignFixed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixedTeamId || !fixedPositionId) {
      setStatusMessage({ type: "ERROR", text: "Please enter Team ID and select Position." });
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_FIXED",
          teamId: fixedTeamId,
          pool: fixedPool,
          positionId: fixedPositionId,
          fixedReason,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setStatusMessage({ type: "SUCCESS", text: `Fixed team assigned to ${fixedPositionId}.` });
      setShowFixedModal(false);
      setFixedTeamId("");
      fetchFixtures(true);
      fetchTeams();
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Assign Team to Current Draw
  const handleConfirmDraw = async () => {
    if (!selectedTeam) {
      setStatusMessage({ type: "ERROR", text: "Please select an accredited team before confirming." });
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ASSIGN_DRAW",
          teamId: selectedTeam.id,
          expectedPositionId: currentPos?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      setLastAssignedInfo({
        team: selectedTeam,
        position: data.data.assignedPosition,
        drawNumber: data.data.drawNumber,
        nextPosition: data.data.nextPosition,
      });

      setStatusMessage({
        type: "SUCCESS",
        text: `✓ TEAM ASSIGNED: ${selectedTeam.name} assigned to ${data.data.assignedPosition.id} (Draw #${data.data.drawNumber}).`,
      });

      setSelectedTeam(null);
      setSearchTeamQuery("");
      fetchFixtures(true);
      fetchTeams();
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Correction
  const handleCorrectAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctPositionId || !correctNewTeamId || !correctReason) {
      setStatusMessage({ type: "ERROR", text: "All fields including audit reason are mandatory." });
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CORRECTION",
          positionId: correctPositionId,
          newTeamId: correctNewTeamId,
          reason: correctReason,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setStatusMessage({ type: "SUCCESS", text: `Position ${correctPositionId} assignment corrected.` });
      setShowCorrectionModal(false);
      setCorrectPositionId("");
      setCorrectNewTeamId("");
      setCorrectReason("");
      fetchFixtures(true);
      fetchTeams();
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Lock Fixture
  const handleLockFixture = async () => {
    if (!confirm("Are you sure you want to lock the 100-team fixture? Normal draw modifications will be disabled.")) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "LOCK" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setStatusMessage({ type: "SUCCESS", text: "Fixture graph validated and permanently LOCKED." });
      fetchFixtures(true);
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Publish Fixture
  const handlePublishFixture = async () => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PUBLISH" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setStatusMessage({ type: "SUCCESS", text: "Championship fixture is now PUBLISHED and live for the public." });
      fetchFixtures(true);
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Reset / Clear Fixture Graph
  const handleResetFixture = async () => {
    if (!confirm("Are you sure you want to CLEAR all fixture positions and reset to clean unassigned state? This will reset matches and allow conducting the draw fresh.")) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch("/api/tournament/fixtures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESET" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setStatusMessage({ type: "SUCCESS", text: "All hardcoded fixture assignments cleared! Ready for draw flow." });
      fetchFixtures(true);
      fetchTeams();
    } catch (err: any) {
      setStatusMessage({ type: "ERROR", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered positions for table
  const filteredPositions = positions.filter((p) => {
    if (tableFilterPool !== "ALL" && p.pool !== tableFilterPool) return false;
    if (tableFilterSide !== "ALL" && p.side !== tableFilterSide) return false;
    if (tableFilterStatus !== "ALL" && p.status !== tableFilterStatus) return false;
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      const idMatch = p.id.toLowerCase().includes(q);
      const teamMatch = p.teamName?.toLowerCase().includes(q);
      const instMatch = p.institution?.toLowerCase().includes(q);
      const numMatch = p.firstMatchNumber?.toLowerCase().includes(q);
      if (!idMatch && !teamMatch && !instMatch && !numMatch) return false;
    }
    return true;
  });

  return (
    <TournamentAdminShell activeTab="fixtures">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ═══ 1. HEADER ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#ff5500]/40 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-[#ff5500] text-black font-pixel text-[10px] font-bold uppercase shadow-[2px_2px_0px_#000]">
                LEVEL 03 COMMAND
              </span>
              <span className="text-cyan-400 font-pixel text-xs tracking-widest uppercase">
                SOUTH ZONE 2026
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#f5e6ca] uppercase tracking-tight">
              FIXTURE &amp; <span className="text-[#ff5500]">DRAW CONTROL</span>
            </h1>
            <p className="font-pixel text-xs text-[#00F0FF] mt-1 uppercase tracking-wider">
              100 TEAM CHAMPIONSHIP FIXTURE &bull; DETERMINISTIC CYCLIC ALL-POOL DRAW
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/fixtures"
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#050A18] text-[#00F0FF] border border-[#00F0FF]/40 font-pixel text-xs uppercase hover:bg-[#00F0FF]/20 transition-colors shadow-[2px_2px_0px_#000]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Bracket View</span>
            </Link>

            <button
              onClick={() => fetchFixtures(false)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b0d2b] text-[#f5e6ca] border border-[#ff5500]/40 font-pixel text-xs uppercase hover:bg-[#ff5500]/20 transition-colors shadow-[2px_2px_0px_#000]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>REFRESH</span>
            </button>
          </div>
        </div>

        {/* Status Alert Banner */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs font-pixel tracking-wider uppercase shadow-md ${
              statusMessage.type === "SUCCESS"
                ? "bg-[#05D550]/15 border-[#05D550] text-[#05D550]"
                : statusMessage.type === "ERROR"
                ? "bg-[#FF2A6D]/15 border-[#FF2A6D] text-[#FF2A6D]"
                : "bg-[#00F0FF]/15 border-[#00F0FF] text-[#00F0FF]"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "SUCCESS" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="hover:opacity-75 text-sm">
              &times;
            </button>
          </div>
        )}

        {/* ═══ 2. TOP STATUS CARDS (SECTION 9) ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Card 1: Total Teams */}
          <div className="p-3 bg-[#0c101c] border border-[#18D8D0]/30 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">TOTAL TEAMS</span>
            <span className="font-pixel text-xl text-[#f5e6ca] font-bold">100</span>
          </div>

          {/* Card 2: Assigned */}
          <div className="p-3 bg-[#0c101c] border border-[#05D550]/40 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">ASSIGNED</span>
            <span className="font-pixel text-xl text-[#05D550] font-bold">
              {fixturesData?.totalAssigned || 0} / 100
            </span>
          </div>

          {/* Card 3: Remaining */}
          <div className="p-3 bg-[#0c101c] border border-[#FFB800]/40 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">REMAINING</span>
            <span className="font-pixel text-xl text-[#FFB800] font-bold">
              {fixturesData?.totalRemaining ?? 100}
            </span>
          </div>

          {/* Card 4: Current Draw */}
          <div className="p-3 bg-[#0c101c] border border-[#ff5500]/40 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">CURRENT DRAW</span>
            <span className="font-pixel text-xl text-[#ff5500] font-bold">
              #{String(fixturesData?.currentDrawNumber || 1).padStart(2, "0")}
            </span>
          </div>

          {/* Card 5: Current Pool */}
          <div className="p-3 bg-[#0c101c] border border-[#00F0FF]/40 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">CURRENT POOL</span>
            <span className="font-pixel text-xl text-[#00F0FF] font-bold">
              {currentPos ? `POOL ${currentPos.pool}` : "DONE"}
            </span>
          </div>

          {/* Card 6: Current Side */}
          <div className="p-3 bg-[#0c101c] border border-[#18D8D0]/30 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">CURRENT SIDE</span>
            <span className="font-pixel text-xl text-[#18D8D0] font-bold">
              {currentPos ? currentPos.side : "DONE"}
            </span>
          </div>

          {/* Card 7: Fixed Teams */}
          <div className="p-3 bg-[#0c101c] border border-[#A78BFA]/40 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">FIXED TEAMS</span>
            <span className="font-pixel text-xl text-[#A78BFA] font-bold">
              {fixturesData?.fixedTeamsCount || 0} / 4
            </span>
          </div>

          {/* Card 8: Status */}
          <div className="p-3 bg-[#0c101c] border border-[#ff5500]/40 rounded-xl">
            <span className="font-pixel text-[9px] text-[#91A0AE] uppercase block">FIXTURE STATUS</span>
            <span
              className={`font-pixel text-xs px-2 py-1 rounded inline-block font-bold tracking-wider mt-1 ${
                config.status === "LOCKED"
                  ? "bg-[#A78BFA] text-black"
                  : config.status === "PUBLISHED"
                  ? "bg-[#05D550] text-black"
                  : config.status === "COMPLETE"
                  ? "bg-[#00F0FF] text-black"
                  : config.status === "DRAWING"
                  ? "bg-[#ff5500] text-black animate-pulse"
                  : "bg-[#2A354E] text-[#91A0AE]"
              }`}
            >
              {config.status || "DRAFT"}
            </span>
          </div>
        </div>

        {/* ═══ 2.5 TWO BOXES VS FIXTURE PAIRING & SEQUENTIAL FLOW CONTROLLER ═══ */}
        <div className="bg-[#0b0f1d] border-2 border-[#00F0FF]/50 p-6 rounded-3xl shadow-[0_15px_45px_rgba(0,240,255,0.12)] space-y-6">
          {/* Top Bar: Title & Global Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1b253b]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-[#FF5A16] to-[#FF2A6D] text-black rounded-xl shadow-[0_0_15px_rgba(255,90,22,0.4)]">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[10px] px-2 py-0.5 bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 uppercase tracking-wider rounded">
                    OFFICIAL AIU FIXTURE CONTROLLER
                  </span>
                  <span className="font-pixel text-[10px] text-[#91A0AE] uppercase">
                    &bull; PAIR TEAMS DYNAMICALLY
                  </span>
                </div>
                <h2 className="font-display text-2xl text-[#f5e6ca] font-extrabold uppercase tracking-tight mt-0.5">
                  TWO BOXES <span className="text-[#FF5A16]">&ldquo;VS&rdquo;</span> FIXTURE PAIRING CONSOLE
                </h2>
              </div>
            </div>

            {/* Pool Selector & Clear Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-[#050A18] border border-[#1b253b] rounded-lg p-1 gap-1">
                {(["A", "B", "C", "D"] as const).map((p) => {
                  const count = poolCounts[p];
                  const isFull = count >= 25;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setFlowPool(p);
                        setFlowMatchIdx(0);
                      }}
                      className={`px-3 py-1.5 font-pixel text-xs uppercase font-bold rounded transition-all flex items-center gap-1.5 ${
                        flowPool === p
                          ? "bg-[#FF5A16] text-black shadow-[0_0_10px_rgba(255,90,22,0.6)]"
                          : "text-[#91A0AE] hover:text-[#f5e6ca]"
                      }`}
                    >
                      <span>POOL {p}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          isFull
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                            : flowPool === p
                            ? "bg-black/30 text-black font-extrabold"
                            : "bg-[#101935] text-[#00F0FF]"
                        }`}
                      >
                        {count}/25
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleResetBracketSlots}
                disabled={actionLoading}
                className="px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-500/40 font-pixel text-xs uppercase transition-colors rounded-lg shadow"
                title="Reset all 120 bracket slots back to blank state"
              >
                CLEAR ALL 120 SLOTS
              </button>
            </div>
          </div>

          {/* Mode Tabs: Round 1 Flow (13 Matches) vs Seeds & Byes (4 Slots) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#050914] p-2 rounded-xl border border-[#1b253b]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFlowMode("ROUND_1")}
                className={`px-4 py-2 font-pixel text-xs uppercase font-bold rounded-lg transition-all flex items-center gap-2 ${
                  flowMode === "ROUND_1"
                    ? "bg-[#00F0FF] text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                    : "text-[#91A0AE] hover:text-white"
                }`}
              >
                <span>ROUND 1 FLOW &bull; 13 MATCHES</span>
                <span className="px-1.5 py-0.5 bg-black/20 text-[10px] rounded">
                  {ROUND_1_MATCH_FLOW.filter((m) => {
                    const poolSlots = (fixturesData?.bracketSlots || []).filter((s: any) => s.pool === flowPool);
                    const sA = poolSlots.find((s: any) => s.slot === m.slotA);
                    const sB = poolSlots.find((s: any) => s.slot === m.slotB);
                    return sA?.teamId && sB?.teamId;
                  }).length} / 13 FILLED
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFlowMode("SEEDS_BYES")}
                className={`px-4 py-2 font-pixel text-xs uppercase font-bold rounded-lg transition-all flex items-center gap-2 ${
                  flowMode === "SEEDS_BYES"
                    ? "bg-[#FFB800] text-black shadow-[0_0_15px_rgba(255,184,0,0.4)]"
                    : "text-[#91A0AE] hover:text-white"
                }`}
              >
                <span>SEEDS &amp; BYES &bull; 4 SLOTS</span>
                <span className="px-1.5 py-0.5 bg-black/20 text-[10px] rounded">
                  {BYE_SLOT_OPTIONS.filter((b) => {
                    const poolSlots = (fixturesData?.bracketSlots || []).filter((s: any) => s.pool === flowPool);
                    const s = poolSlots.find((item: any) => item.slot === b.slot);
                    return !!s?.teamId;
                  }).length} / 4 FILLED
                </span>
              </button>
            </div>

            <div className="font-pixel text-[11px] text-[#91A0AE]">
              {flowMode === "ROUND_1"
                ? `ACTIVE: MATCH ${currentMatch.matchInPool} OF 13 (M${String(globalMatchNum).padStart(3, "0")}) &bull; SLOTS ${currentMatch.slotA} & ${currentMatch.slotB}`
                : `CONFIGURING BYES & SEED 1 FOR POOL ${flowPool}`}
            </div>
          </div>

          {/* Pool Limit Full Banner */}
          {currentPoolAssignedCount >= 25 && (
            <div className="bg-[#FF5A16]/20 border-2 border-[#FF5A16] p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs text-[#FF5A16] font-pixel animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#FF5A16]" />
                <span className="font-bold">
                  POOL {flowPool} HAS REACHED ITS OFFICIAL 25-TEAM LIMIT (25/25 FILLED). ALL ALLOCATED SLOTS ARE COMPLETE.
                </span>
              </div>
              <span className="font-pixel text-[10px] font-bold uppercase px-2.5 py-1 bg-[#FF5A16] text-black rounded-lg whitespace-nowrap">
                POOL CAPACITY FULL
              </span>
            </div>
          )}

          {flowMode === "ROUND_1" ? (
            <div className="space-y-6">
              {/* ── FLOW TRACKER PILL BAR (13 MATCHES) ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-pixel text-[10px] text-[#91A0AE] uppercase tracking-wider">
                    ROUND 1 MATCH FLOW PROGRESSION &bull; CLICK ANY MATCH TO JUMP
                  </span>
                  <span className="font-pixel text-[10px] text-[#00F0FF] uppercase">
                    AUTO-ADVANCES UPON CONFIRMATION &rarr;
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-13 gap-1.5">
                  {ROUND_1_MATCH_FLOW.map((m, idx) => {
                    const poolSlots = (fixturesData?.bracketSlots || []).filter((s: any) => s.pool === flowPool);
                    const sA = poolSlots.find((s: any) => s.slot === m.slotA);
                    const sB = poolSlots.find((s: any) => s.slot === m.slotB);
                    const isFilled = !!(sA?.teamId && sB?.teamId);
                    const isPartial = !!(sA?.teamId || sB?.teamId) && !isFilled;
                    const isActive = flowMatchIdx === idx;
                    const mNum = getGlobalMatchNumber(flowPool, m.matchInPool);

                    return (
                      <button
                        key={m.index}
                        type="button"
                        onClick={() => setFlowMatchIdx(idx)}
                        className={`p-2 rounded-xl text-center border transition-all ${
                          isActive
                            ? "bg-[#00F0FF]/20 border-[#00F0FF] ring-2 ring-[#00F0FF] scale-105 shadow-[0_0_15px_rgba(0,240,255,0.4)]"
                            : isFilled
                            ? "bg-[#05D550]/15 border-[#05D550]/50 hover:bg-[#05D550]/25"
                            : isPartial
                            ? "bg-[#FFB800]/15 border-[#FFB800]/50 hover:bg-[#FFB800]/25"
                            : "bg-[#050A18] border-[#1b253b] hover:border-[#91A0AE]/50"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          {isFilled ? (
                            <CheckCircle2 className="w-3 h-3 text-[#05D550]" />
                          ) : isPartial ? (
                            <Clock className="w-3 h-3 text-[#FFB800]" />
                          ) : (
                            <span className="w-2 h-2 rounded-full border border-slate-600 block" />
                          )}
                          <span
                            className={`font-pixel text-[11px] font-bold ${
                              isActive
                                ? "text-[#00F0FF]"
                                : isFilled
                                ? "text-[#05D550]"
                                : isPartial
                                ? "text-[#FFB800]"
                                : "text-[#91A0AE]"
                            }`}
                          >
                            M{mNum}
                          </span>
                        </div>
                        <div className="font-pixel text-[8px] text-[#91A0AE]">
                          {m.slotA}v{m.slotB}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── THE TWO BOXES "VS" ARENA ── */}
              <form onSubmit={handleConfirmPairFixture} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  {/* ── BOX 1: TEAM 1 (SLOT A) ── */}
                  <div className="lg:col-span-5 bg-[#050A18] border-2 border-[#00F0FF]/40 hover:border-[#00F0FF] transition-all p-5 rounded-2xl space-y-3 relative shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-[#00F0FF] text-black font-pixel text-xs font-bold uppercase rounded shadow">
                        TEAM 1 &bull; SLOT #{currentMatch.slotA}
                      </span>
                      <span className="font-pixel text-[10px] text-[#00F0FF]">
                        POOL {flowPool} &bull; UPPER BRACKET
                      </span>
                    </div>

                    <div>
                      <label className="font-pixel text-[10px] text-[#91A0AE] uppercase tracking-wider block mb-1">
                        ENTER TEAM # (1-101) OR CODE
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="e.g. 1 or TM-SZ-001 or Madras..."
                          value={team1Input}
                          onChange={(e) => handleTeam1Search(e.target.value)}
                          className="w-full bg-[#0b0f1d] border-2 border-[#1b253b] focus:border-[#00F0FF] text-xl font-bold font-mono text-[#00F0FF] px-4 py-3 rounded-xl focus:outline-none transition-all"
                        />
                        {team1Fetching && (
                          <RefreshCw className="w-5 h-5 text-[#00F0FF] animate-spin absolute right-3.5 top-3.5" />
                        )}
                      </div>
                    </div>

                    {/* Team 1 Fetched Preview */}
                    {team1Fetched ? (
                      <div className="p-3.5 bg-[#0e162b] border border-[#00F0FF]/40 rounded-xl space-y-1.5 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 font-pixel text-[10px] font-bold uppercase rounded">
                            TEAM #{team1Fetched.teamNumber || "-"} ({team1Fetched.teamCode})
                          </span>
                          <span className="text-xs text-[#91A0AE] font-mono">{team1Fetched.state}</span>
                        </div>
                        <h4 className="font-display text-base text-[#f5e6ca] font-bold uppercase">
                          {team1Fetched.name}
                        </h4>
                        <div className="text-[11px] text-[#91A0AE] flex justify-between pt-1 border-t border-[#1b253b]">
                          <span>Manager: <strong className="text-[#f5e6ca]">{team1Fetched.managerName || "Accredited"}</strong></span>
                          <span className="text-[#05D550] font-pixel text-[10px]">READY TO FILL SLOT {currentMatch.slotA}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-[#0b0f1d]/60 border border-dashed border-[#1b253b] rounded-xl text-center">
                        <p className="font-pixel text-[11px] text-[#91A0AE]">
                          {team1Input.trim() ? "Searching database..." : `Type Team Number to fetch university details for Slot ${currentMatch.slotA}`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ── CENTER: GLOWING "VS" BADGE ── */}
                  <div className="lg:col-span-2 flex flex-col items-center justify-center p-2 text-center space-y-2">
                    <span className="font-pixel text-[10px] text-[#FF5A16] uppercase tracking-wider font-bold">
                      {currentMatch.label}
                    </span>
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF5A16] via-[#ff7728] to-[#FF2A6D] flex items-center justify-center text-black font-black font-display text-2xl shadow-[0_0_25px_rgba(255,90,22,0.7)] animate-pulse">
                        VS
                      </div>
                    </div>
                    <div>
                      <span className="font-pixel text-xs text-[#00F0FF] font-bold block">
                        POOL {flowPool} &bull; M{String(globalMatchNum).padStart(3, "0")}
                      </span>
                      <span className="font-pixel text-[9px] text-[#91A0AE] block mt-0.5">
                        Slots {currentMatch.slotA} vs {currentMatch.slotB}
                      </span>
                    </div>
                  </div>

                  {/* ── BOX 2: TEAM 2 (SLOT B) ── */}
                  <div className="lg:col-span-5 bg-[#050A18] border-2 border-[#FF5A16]/40 hover:border-[#FF5A16] transition-all p-5 rounded-2xl space-y-3 relative shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-[#FF5A16] text-black font-pixel text-xs font-bold uppercase rounded shadow">
                        TEAM 2 &bull; SLOT #{currentMatch.slotB}
                      </span>
                      <span className="font-pixel text-[10px] text-[#FF5A16]">
                        POOL {flowPool} &bull; LOWER BRACKET
                      </span>
                    </div>

                    <div>
                      <label className="font-pixel text-[10px] text-[#91A0AE] uppercase tracking-wider block mb-1">
                        ENTER TEAM # (1-101) OR CODE
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="e.g. 2 or TM-SZ-002 or Bangalore..."
                          value={team2Input}
                          onChange={(e) => handleTeam2Search(e.target.value)}
                          className="w-full bg-[#0b0f1d] border-2 border-[#1b253b] focus:border-[#FF5A16] text-xl font-bold font-mono text-[#FF5A16] px-4 py-3 rounded-xl focus:outline-none transition-all"
                        />
                        {team2Fetching && (
                          <RefreshCw className="w-5 h-5 text-[#FF5A16] animate-spin absolute right-3.5 top-3.5" />
                        )}
                      </div>
                    </div>

                    {/* Team 2 Fetched Preview */}
                    {team2Fetched ? (
                      <div className="p-3.5 bg-[#0e162b] border border-[#FF5A16]/40 rounded-xl space-y-1.5 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-[#FF5A16]/20 text-[#FF5A16] border border-[#FF5A16]/40 font-pixel text-[10px] font-bold uppercase rounded">
                            TEAM #{team2Fetched.teamNumber || "-"} ({team2Fetched.teamCode})
                          </span>
                          <span className="text-xs text-[#91A0AE] font-mono">{team2Fetched.state}</span>
                        </div>
                        <h4 className="font-display text-base text-[#f5e6ca] font-bold uppercase">
                          {team2Fetched.name}
                        </h4>
                        <div className="text-[11px] text-[#91A0AE] flex justify-between pt-1 border-t border-[#1b253b]">
                          <span>Manager: <strong className="text-[#f5e6ca]">{team2Fetched.managerName || "Accredited"}</strong></span>
                          <span className="text-[#05D550] font-pixel text-[10px]">READY TO FILL SLOT {currentMatch.slotB}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-[#0b0f1d]/60 border border-dashed border-[#1b253b] rounded-xl text-center">
                        <p className="font-pixel text-[11px] text-[#91A0AE]">
                          {team2Input.trim() ? "Searching database..." : `Type Team Number to fetch university details for Slot ${currentMatch.slotB}`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── ACTION BUTTONS: CONFIRM & AUTO-ADVANCE FLOW ── */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#1b253b]">
                  {/* Navigation buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={flowMatchIdx === 0}
                      onClick={() => setFlowMatchIdx((prev) => Math.max(0, prev - 1))}
                      className="px-3.5 py-2.5 bg-[#050A18] hover:bg-[#15234A] disabled:opacity-30 border border-[#1b253b] text-[#f5e6ca] font-pixel text-xs uppercase rounded-lg transition-colors"
                    >
                      &larr; Prev Match
                    </button>
                    <button
                      type="button"
                      disabled={flowMatchIdx >= ROUND_1_MATCH_FLOW.length - 1}
                      onClick={() => setFlowMatchIdx((prev) => Math.min(ROUND_1_MATCH_FLOW.length - 1, prev + 1))}
                      className="px-3.5 py-2.5 bg-[#050A18] hover:bg-[#15234A] disabled:opacity-30 border border-[#1b253b] text-[#f5e6ca] font-pixel text-xs uppercase rounded-lg transition-colors"
                    >
                      Next Match &rarr;
                    </button>
                    {(team1Fetched || team2Fetched) && (
                      <button
                        type="button"
                        onClick={handleClearCurrentFixture}
                        disabled={pairAssigning}
                        className="px-3 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 font-pixel text-xs uppercase rounded-lg transition-colors"
                      >
                        Clear This Match
                      </button>
                    )}
                  </div>

                  {/* Primary Confirm Button */}
                  <button
                    type="submit"
                    disabled={
                      !team1Fetched ||
                      !team2Fetched ||
                      pairAssigning ||
                      (currentPoolAssignedCount >= 25 &&
                        !currentPoolSlots.find((s: any) => s.slot === currentMatch.slotA)?.teamId &&
                        !currentPoolSlots.find((s: any) => s.slot === currentMatch.slotB)?.teamId)
                    }
                    className="flex-1 sm:flex-initial px-8 py-3.5 bg-gradient-to-r from-[#FF5A16] to-[#ff7728] hover:from-[#ff6a2d] hover:to-[#ff8a43] disabled:opacity-40 text-black font-pixel text-sm font-extrabold uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(255,90,22,0.5)] transition-all flex items-center justify-center gap-2"
                  >
                    {pairAssigning ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 fill-black" />
                    )}
                    <span>
                      CONFIRM FIXTURE &amp; FILL BRACKET (ADVANCE TO NEXT MATCH &rarr;)
                    </span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ── SEEDS & BYES ENTRY ARENA ── */
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {BYE_SLOT_OPTIONS.map((opt) => {
                  const poolSlots = (fixturesData?.bracketSlots || []).filter((s: any) => s.pool === flowPool);
                  const assigned = poolSlots.find((s: any) => s.slot === opt.slot);
                  const isSelected = selectedByeSlot === opt.slot;

                  return (
                    <button
                      key={opt.slot}
                      type="button"
                      onClick={() => setSelectedByeSlot(opt.slot)}
                      className={`p-4 rounded-xl text-left border transition-all ${
                        isSelected
                          ? "bg-[#FFB800]/20 border-[#FFB800] ring-2 ring-[#FFB800] shadow-[0_0_15px_rgba(255,184,0,0.3)]"
                          : assigned?.teamId
                          ? "bg-[#05D550]/15 border-[#05D550]/40"
                          : "bg-[#050A18] border-[#1b253b] hover:border-[#91A0AE]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-pixel text-xs font-bold text-[#FFB800]">
                          SLOT #{opt.slot}
                        </span>
                        {assigned?.teamId ? (
                          <span className="px-1.5 py-0.2 bg-[#05D550] text-black font-pixel text-[9px] rounded font-bold">
                            FILLED
                          </span>
                        ) : (
                          <span className="font-pixel text-[9px] text-[#91A0AE]">BLANK</span>
                        )}
                      </div>
                      <div className="font-pixel text-[10px] text-[#91A0AE] mb-2">
                        {opt.isSeed ? "Seed 1 (Pool Final)" : "Round 1 Bye (R2)"}
                      </div>
                      {assigned?.teamId ? (
                        <div className="text-xs text-[#f5e6ca] font-bold truncate">
                          #{assigned.teamNumber} {assigned.teamName}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic">Unassigned</div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Bye slot form */}
              <form onSubmit={handleConfirmByeSlot} className="p-5 bg-[#050A18] border border-[#1b253b] rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-[#FFB800] text-black font-pixel text-xs font-bold uppercase rounded">
                    ASSIGN POOL {flowPool} &bull; SLOT #{selectedByeSlot} {selectedByeSlot === 1 ? "(Seed 1 Bye)" : "(Round 1 Bye)"}
                  </span>
                  {byeTeamFetched && (
                    <button
                      type="button"
                      onClick={handleClearByeSlot}
                      disabled={byeAssigning}
                      className="text-[11px] font-pixel text-rose-400 hover:underline"
                    >
                      Clear Slot #{selectedByeSlot}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-8">
                    <label className="font-pixel text-[10px] text-[#91A0AE] uppercase block mb-1">
                      ENTER TEAM # (1-101), CODE OR UNIVERSITY NAME
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. 1 or TM-SZ-001 or Madras..."
                        value={byeTeamInput}
                        onChange={(e) => handleByeTeamSearch(e.target.value)}
                        className="w-full bg-[#0b0f1d] border border-[#1b253b] text-sm text-[#f5e6ca] px-3.5 py-2.5 rounded-lg focus:outline-none focus:border-[#FFB800]"
                      />
                      {byeTeamFetching && (
                        <RefreshCw className="w-4 h-4 text-[#FFB800] animate-spin absolute right-3 top-3" />
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-4">
                    <button
                      type="submit"
                      disabled={
                        !byeTeamFetched ||
                        byeAssigning ||
                        (currentPoolAssignedCount >= 25 &&
                          !currentPoolSlots.find((s: any) => s.slot === selectedByeSlot)?.teamId)
                      }
                      className="w-full py-2.5 bg-[#FFB800] hover:bg-[#ffc83b] disabled:opacity-40 text-black font-pixel text-xs font-bold uppercase tracking-wider rounded-lg shadow transition-all flex items-center justify-center gap-1.5"
                    >
                      {byeAssigning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>FILL SLOT #{selectedByeSlot}</span>
                    </button>
                  </div>
                </div>

                {byeTeamFetched && (
                  <div className="p-3 bg-[#0e162b] border border-[#FFB800]/40 rounded-xl space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-[#FFB800] text-black font-pixel text-[10px] font-bold uppercase rounded">
                        TEAM #{byeTeamFetched.teamNumber || "-"}
                      </span>
                      <span className="font-pixel text-xs text-[#00F0FF]">{byeTeamFetched.teamCode}</span>
                      <span className="text-xs text-[#91A0AE]">&bull; {byeTeamFetched.state}</span>
                    </div>
                    <h4 className="font-display text-base text-[#f5e6ca] font-bold uppercase">
                      {byeTeamFetched.name}
                    </h4>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>

        {/* ═══ 3. DRAW CONTROLS & MASTER OPERATION SUITE (SECTION 10 & 27) ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Draw Terminal (7 Cols) */}
          <div className="lg:col-span-7 bg-[#0b0f1d] border-2 border-[#ff5500]/50 p-6 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1b253b]">
              <div>
                <span className="font-pixel text-xs text-[#00F0FF] uppercase tracking-wider block">
                  DETERMINISTIC DRAW ENGINE TERMINAL
                </span>
                <h2 className="font-display text-2xl text-[#f5e6ca] font-bold uppercase">
                  ACTIVE DRAW CONSOLE
                </h2>
              </div>

              {/* State Controls */}
              <div className="flex items-center gap-2">
                {config.status === "DRAFT" && (
                  <button
                    onClick={handleStartDraw}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#ff5500] text-black font-pixel text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:bg-[#ff7728] transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>START DRAW</span>
                  </button>
                )}

                {fixturesData?.totalAssigned >= 100 && !config.isLocked && (
                  <button
                    onClick={handleLockFixture}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#A78BFA] text-black font-pixel text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:bg-[#c4b5fd] transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>LOCK FIXTURE</span>
                  </button>
                )}

                {config.isLocked && !config.isPublished && (
                  <button
                    onClick={handlePublishFixture}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#05D550] text-black font-pixel text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:bg-[#34d399] transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>PUBLISH FIXTURE</span>
                  </button>
                )}

                <button
                  onClick={handleResetFixture}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#1A2644] hover:bg-rose-950/80 text-rose-300 hover:text-rose-200 border border-rose-500/40 font-pixel text-xs font-bold uppercase tracking-wider transition-colors shadow-[2px_2px_0px_#000]"
                  title="Clear all fixtures and reset bracket to clean state"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESET DRAW</span>
                </button>
              </div>
            </div>

            {/* Current & Next Pointer HUD (Section 49) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* CURRENT POINTER */}
              <div className="p-4 bg-[#050914] border-2 border-[#ff5500] rounded-xl shadow-[0_0_15px_rgba(255,85,0,0.2)]">
                <span className="font-pixel text-[10px] text-[#ff5500] uppercase tracking-wider block mb-1">
                  CURRENT ACTIVE DRAW
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="font-pixel text-3xl font-black text-[#f5e6ca]">
                    #{String(fixturesData?.currentDrawNumber || 1).padStart(2, "0")}
                  </span>
                  <span className="font-pixel text-xs px-2 py-0.5 bg-[#ff5500] text-black font-bold uppercase">
                    POOL {currentPos?.pool || "-"}
                  </span>
                </div>
                <div className="mt-2 text-xs font-pixel text-[#91A0AE] space-y-1">
                  <div>SIDE: <strong className="text-[#f5e6ca]">{currentPos?.side || "COMPLETED"}</strong></div>
                  <div>POSITION: <strong className="text-[#00F0FF]">{currentPos?.id || "ALL 100 FILLED"}</strong></div>
                  <div>FIRST MATCH: <strong className="text-[#f5e6ca]">{currentPos?.firstMatchNumber || "-"}</strong></div>
                </div>
              </div>

              {/* NEXT POINTER */}
              <div className="p-4 bg-[#050914] border border-[#18D8D0]/40 rounded-xl">
                <span className="font-pixel text-[10px] text-[#18D8D0] uppercase tracking-wider block mb-1">
                  UPCOMING NEXT DRAW
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="font-pixel text-3xl font-black text-[#91A0AE]">
                    #{String((fixturesData?.currentDrawNumber || 1) + 1).padStart(2, "0")}
                  </span>
                  <span className="font-pixel text-xs px-2 py-0.5 bg-[#1A2644] text-[#00F0FF] uppercase border border-[#00F0FF]/30">
                    POOL {nextPos?.pool || "-"}
                  </span>
                </div>
                <div className="mt-2 text-xs font-pixel text-[#91A0AE] space-y-1">
                  <div>SIDE: <strong className="text-[#f5e6ca]">{nextPos?.side || "-"}</strong></div>
                  <div>POSITION: <strong className="text-[#00F0FF]">{nextPos?.id || "-"}</strong></div>
                  <div>FIRST MATCH: <strong className="text-[#f5e6ca]">{nextPos?.firstMatchNumber || "-"}</strong></div>
                </div>
              </div>
            </div>

            {/* Team Selector & Confirmation Form */}
            {config.status === "DRAWING" && currentPos ? (
              <div className="p-5 bg-[#050914] border border-[#1b253b] rounded-xl space-y-4">
                <span className="font-pixel text-xs text-[#f5e6ca] uppercase tracking-wider block">
                  ASSIGN ACCREDITED TEAM TO POSITION: <span className="text-[#ff5500]">{currentPos.id}</span>
                </span>

                {/* Team Search Input */}
                <div>
                  <label className="font-pixel text-[10px] text-[#91A0AE] uppercase block mb-1">
                    SEARCH AVAILABLE TEAM (TEAM ID OR UNIVERSITY)
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#91A0AE] absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. TM-SZ-005 or Bangalore..."
                      value={searchTeamQuery}
                      onChange={(e) => {
                        setSearchTeamQuery(e.target.value);
                        fetchTeams(e.target.value);
                      }}
                      className="w-full bg-[#0b0f1d] border border-[#1b253b] text-sm text-[#f5e6ca] pl-9 pr-3 py-2.5 rounded focus:outline-none focus:border-[#ff5500]"
                    />
                  </div>
                </div>

                {/* Team Selection Dropdown / Quick List */}
                <div>
                  <label className="font-pixel text-[10px] text-[#91A0AE] uppercase block mb-1">
                    SELECT FROM AVAILABLE POOL ({availableTeams.length} AVAILABLE)
                  </label>
                  <select
                    value={selectedTeam?.id || ""}
                    onChange={(e) => {
                      const t = availableTeams.find((item) => item.id === e.target.value);
                      setSelectedTeam(t || null);
                    }}
                    className="w-full bg-[#0b0f1d] border border-[#1b253b] text-xs text-[#f5e6ca] p-2.5 rounded focus:outline-none focus:border-[#ff5500]"
                  >
                    <option value="">-- Select Team --</option>
                    {availableTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.teamCode} &bull; {t.name} ({t.institution} - {t.state})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Team Inspection Badge (Section 7) */}
                {selectedTeam && (
                  <div className="p-4 bg-[#0e162b] border border-[#00F0FF]/40 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-xs text-[#ff5500] font-bold">
                        {selectedTeam.teamCode}
                      </span>
                      <span className="px-2 py-0.5 bg-[#05D550] text-black font-pixel text-[9px] font-bold uppercase">
                        {selectedTeam.eligibility}
                      </span>
                    </div>
                    <h3 className="font-display text-lg text-[#f5e6ca] font-bold uppercase">
                      {selectedTeam.name}
                    </h3>
                    <p className="text-xs text-[#91A0AE]">{selectedTeam.institution} &bull; {selectedTeam.state}</p>
                    <div className="flex items-center gap-4 text-[10px] font-pixel text-[#18D8D0] pt-2 border-t border-[#1b253b]">
                      <span>CATEGORY: {selectedTeam.category}</span>
                      <span>MANAGER: {selectedTeam.managerName || "Assigned"}</span>
                    </div>
                  </div>
                )}

                {/* Confirm Draw Button */}
                <button
                  onClick={handleConfirmDraw}
                  disabled={!selectedTeam || actionLoading}
                  className="w-full py-3 bg-[#05D550] hover:bg-[#28e56b] disabled:opacity-50 text-black font-pixel text-sm font-bold uppercase tracking-wider shadow-[3px_3px_0px_#000] transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>CONFIRM DRAW &bull; ASSIGN TEAM TO {currentPos.id}</span>
                </button>
              </div>
            ) : config.status === "DRAFT" ? (
              <div className="p-6 bg-[#050914] border border-[#1b253b] rounded-xl text-center space-y-3">
                <Clock className="w-8 h-8 text-[#ff5500] mx-auto animate-pulse" />
                <h3 className="font-display text-lg text-[#f5e6ca] uppercase">DRAW HAS NOT STARTED</h3>
                <p className="text-xs text-[#91A0AE] max-w-md mx-auto">
                  Configure the 4 pre-placed / fixed teams first, then click &ldquo;START DRAW&rdquo; to begin deterministic allocation.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setShowFixedModal(true)}
                    className="px-4 py-2 bg-[#A78BFA] text-black font-pixel text-xs font-bold uppercase shadow-[2px_2px_0px_#000] hover:bg-[#c4b5fd]"
                  >
                    CONFIGURE FIXED TEAMS (4)
                  </button>
                  <button
                    onClick={handleProvisionTeams}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[#1b253b] text-[#00F0FF] border border-[#00F0FF]/40 font-pixel text-xs uppercase hover:bg-[#00F0FF]/20 shadow-[2px_2px_0px_#000]"
                  >
                    PROVISION 100 TEAMS IN DB
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-[#050914] border border-[#05D550]/40 rounded-xl text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-[#05D550] mx-auto" />
                <h3 className="font-display text-xl text-[#05D550] uppercase font-bold">ALL 100 TEAMS ASSIGNED</h3>
                <p className="text-xs text-[#91A0AE]">
                  Every pool has exactly 25 teams. Validate and lock the fixture before publication.
                </p>
              </div>
            )}
          </div>

          {/* Draw Cycle Indicator & Tools (5 Cols - Section 11 & 12) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Draw Sequence Visual Indicator (Section 11) */}
            <div className="bg-[#0b0f1d] border border-[#18D8D0]/30 p-5 rounded-2xl shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1b253b]">
                <span className="font-pixel text-xs text-[#00F0FF] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#ff5500]" />
                  <span>CYCLIC DRAW SEQUENCE INDICATOR</span>
                </span>
                <span className="font-pixel text-[10px] text-[#91A0AE]">CYCLE-BASED</span>
              </div>

              <p className="text-[11px] text-[#91A0AE]">
                The draw sequence alternates strictly across all 4 pools by SIDE:
                <br />
                <span className="text-[#05D550] font-bold">A 1st &rarr; B 1st &rarr; C 1st &rarr; D 1st</span> &rarr;{" "}
                <span className="text-[#ff5500] font-bold">A Last &rarr; B Last &rarr; C Last &rarr; D Last</span> &rarr; repeat.
              </p>

              {/* Visual Cycle Matrix */}
              <div className="space-y-3 font-pixel text-xs">
                {/* FIRST Side Box */}
                <div className="p-3 bg-[#050914] border border-[#1b253b] rounded-lg">
                  <span className="text-[10px] text-[#18D8D0] block mb-2">1. ALL POOLS &bull; FIRST SIDE</span>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {(["A", "B", "C", "D"] as const).map((p) => {
                      const isCurr = currentPos?.pool === p && currentPos?.side === "FIRST";
                      const isNext = nextPos?.pool === p && nextPos?.side === "FIRST";
                      const stat = poolStats[p];
                      return (
                        <div
                          key={p}
                          className={`p-2 rounded border ${
                            isCurr
                              ? "bg-[#ff5500] text-black font-bold animate-pulse"
                              : isNext
                              ? "bg-[#18D8D0]/20 border-[#18D8D0] text-[#00F0FF]"
                              : "bg-[#0c101c] border-[#1b253b] text-[#91A0AE]"
                          }`}
                        >
                          <div>[{p}]</div>
                          <div className="text-[9px] mt-0.5">{stat?.firstAssigned || 0}/13</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* LAST Side Box */}
                <div className="p-3 bg-[#050914] border border-[#1b253b] rounded-lg">
                  <span className="text-[10px] text-[#ff5500] block mb-2">2. ALL POOLS &bull; LAST SIDE</span>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {(["A", "B", "C", "D"] as const).map((p) => {
                      const isCurr = currentPos?.pool === p && currentPos?.side === "LAST";
                      const isNext = nextPos?.pool === p && nextPos?.side === "LAST";
                      const stat = poolStats[p];
                      return (
                        <div
                          key={p}
                          className={`p-2 rounded border ${
                            isCurr
                              ? "bg-[#ff5500] text-black font-bold animate-pulse"
                              : isNext
                              ? "bg-[#18D8D0]/20 border-[#18D8D0] text-[#00F0FF]"
                              : "bg-[#0c101c] border-[#1b253b] text-[#91A0AE]"
                          }`}
                        >
                          <div>[{p}]</div>
                          <div className="text-[9px] mt-0.5">{stat?.lastAssigned || 0}/12</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Administrative Quick Actions */}
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => setShowFixedModal(true)}
                  className="flex-1 py-2 bg-[#1A2644] hover:bg-[#2A3B66] text-[#A78BFA] border border-[#A78BFA]/40 font-pixel text-[10px] uppercase shadow rounded"
                >
                  + Add Fixed Team
                </button>
                <button
                  onClick={() => setShowCorrectionModal(true)}
                  className="flex-1 py-2 bg-[#1A2644] hover:bg-[#2A3B66] text-[#FFB800] border border-[#FFB800]/40 font-pixel text-[10px] uppercase shadow rounded"
                >
                  Correction Workflow
                </button>
              </div>
            </div>

            {/* Four Pool Progress Panels (Section 12) */}
            <div className="grid grid-cols-2 gap-3">
              {(["A", "B", "C", "D"] as const).map((p) => {
                const stat = poolStats[p];
                return (
                  <div key={p} className="p-3 bg-[#0b0f1d] border border-[#1b253b] rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-pixel text-xs font-bold text-[#f5e6ca]">POOL {p}</span>
                      <span className="font-pixel text-[9px] px-1.5 py-0.2 bg-[#1A2644] text-[#00F0FF] rounded">
                        {stat?.status || "PENDING"}
                      </span>
                    </div>
                    <div className="text-[11px] font-pixel text-[#05D550]">
                      {stat?.assigned || 0} / 25 POSITIONS
                    </div>
                    <div className="w-full bg-[#050914] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#05D550] h-full"
                        style={{ width: `${((stat?.assigned || 0) / 25) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-pixel text-[#91A0AE] pt-1">
                      <span>1st: {stat?.firstAssigned || 0}/13</span>
                      <span>Last: {stat?.lastAssigned || 0}/12</span>
                      <span>Fixed: {stat?.fixed || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ═══ VIEW MODE SELECTOR (TREE BRACKET vs TABLE DIRECTORY) ═══ */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0b0f1d] border border-[#18D8D0]/30 p-4 rounded-2xl shadow-lg">
          <div>
            <span className="font-pixel text-[11px] text-[#00F0FF] uppercase tracking-wider block">
              TOURNAMENT GRAPH VISUALIZATION & DIRECTORY
            </span>
            <h2 className="font-display text-xl text-[#f5e6ca] font-bold uppercase">
              {activeViewMode === "BRACKET"
                ? "OFFICIAL POOL-WISE KNOCKOUT TREE BRACKET"
                : "COMPLETE 100 POSITIONS DIRECTORY TABLE"}
            </h2>
          </div>

          <div className="flex items-center bg-[#050914] border border-[#1b253b] rounded-lg p-1">
            <button
              onClick={() => setActiveViewMode("BRACKET")}
              className={`px-4 py-2 font-pixel text-xs uppercase font-bold rounded transition-colors ${
                activeViewMode === "BRACKET" ? "bg-[#FF5A16] text-black shadow" : "text-[#91A0AE] hover:text-white"
              }`}
            >
              Visual Tree Bracket
            </button>
            <button
              onClick={() => setActiveViewMode("TABLE")}
              className={`px-4 py-2 font-pixel text-xs uppercase font-bold rounded transition-colors ${
                activeViewMode === "TABLE" ? "bg-[#FF5A16] text-black shadow" : "text-[#91A0AE] hover:text-white"
              }`}
            >
              Directory Table
            </button>
          </div>
        </div>

        {activeViewMode === "BRACKET" ? (
          <div className="w-full">
            <OfficialPoolBracket
              liveMatches={fixturesData?.matches || []}
              bracketSlots={fixturesData?.bracketSlots || []}
              isAdmin={true}
              initialPool={flowPool}
              onSelectMatch={(mNum) => {
                const num = typeof mNum === "number" ? mNum : parseInt(String(mNum).replace(/\D/g, ""), 10);
                let p: "A" | "B" | "C" | "D" = flowPool;
                let matchInPool = num;
                if (num >= 1 && num <= 13) { p = "A"; matchInPool = num; }
                else if (num >= 14 && num <= 26) { p = "B"; matchInPool = num - 13; }
                else if (num >= 27 && num <= 39) { p = "C"; matchInPool = num - 26; }
                else if (num >= 40 && num <= 52) { p = "D"; matchInPool = num - 39; }

                if (matchInPool >= 1 && matchInPool <= 13) {
                  setFlowPool(p);
                  setFlowMode("ROUND_1");
                  setFlowMatchIdx(matchInPool - 1);
                }
              }}
              onSlotAssigned={() => {
                fetchFixtures(true);
                fetchTeams();
              }}
            />
          </div>
        ) : (
          /* ═══ 4. ALL 100 FIXTURES & POSITIONS TABULAR FORM ═══ */
          <div className="bg-[#0b0f1d] border border-[#18D8D0]/30 p-6 rounded-2xl shadow-lg space-y-5">
            {/* Table Sub-Tabs: [MATCH FIXTURES TABLE] vs [25 TEAMS DIRECTORY] */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1b253b]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAdminTableTab("MATCHES")}
                  className={`px-4 py-2 font-pixel text-xs uppercase tracking-wider rounded-xl transition-all ${
                    adminTableTab === "MATCHES"
                      ? "bg-[#00F0FF] text-black font-extrabold shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                      : "bg-[#050914] text-[#91A0AE] hover:text-white border border-[#1b253b]"
                  }`}
                >
                  Match Fixtures Table (100 Matches)
                </button>
                <button
                  onClick={() => setAdminTableTab("POSITIONS")}
                  className={`px-4 py-2 font-pixel text-xs uppercase tracking-wider rounded-xl transition-all ${
                    adminTableTab === "POSITIONS"
                      ? "bg-[#00F0FF] text-black font-extrabold shadow-[0_0_12px_rgba(0,240,255,0.4)]"
                      : "bg-[#050914] text-[#91A0AE] hover:text-white border border-[#1b253b]"
                  }`}
                >
                  25 Teams Per Pool Directory (100 Teams Total)
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={tableFilterPool}
                  onChange={(e) => setTableFilterPool(e.target.value)}
                  className="bg-[#050914] border border-[#1b253b] text-xs text-[#f5e6ca] p-2 rounded"
                >
                  <option value="ALL">All Pools</option>
                  <option value="A">Pool A (25 Teams)</option>
                  <option value="B">Pool B (25 Teams)</option>
                  <option value="C">Pool C (25 Teams)</option>
                  <option value="D">Pool D (25 Teams)</option>
                </select>

                <select
                  value={tableFilterStatus}
                  onChange={(e) => setTableFilterStatus(e.target.value)}
                  className="bg-[#050914] border border-[#1b253b] text-xs text-[#f5e6ca] p-2 rounded"
                >
                  <option value="ALL">All Status</option>
                  <option value="UPCOMING">UPCOMING</option>
                  <option value="LIVE">LIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="AVAILABLE">AVAILABLE</option>
                </select>

                <input
                  type="text"
                  placeholder="Search team / match..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="bg-[#050914] border border-[#1b253b] text-xs text-[#f5e6ca] px-3 py-2 rounded w-44"
                />
              </div>
            </div>

            {adminTableTab === "MATCHES" ? (
              /* ── ADMIN SUB-VIEW 1: MATCH FIXTURES TABLE ── */
              <div className="overflow-x-auto max-h-[550px]">
                <table className="w-full text-left text-xs font-sans border-collapse">
                  <thead className="sticky top-0 bg-[#050914] border-b border-[#1b253b] font-pixel text-[10px] text-[#00F0FF] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">MATCH #</th>
                      <th className="py-2.5 px-3">POOL &amp; ROUND</th>
                      <th className="py-2.5 px-3">DATE &amp; TIME</th>
                      <th className="py-2.5 px-3">COURT</th>
                      <th className="py-2.5 px-3">TEAM 1 (SLOT A)</th>
                      <th className="py-2.5 px-3 text-center">VS / SCORE</th>
                      <th className="py-2.5 px-3">TEAM 2 (SLOT B)</th>
                      <th className="py-2.5 px-3 text-center">STATUS</th>
                      <th className="py-2.5 px-3 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b253b]/50">
                    {(fixturesData?.matches || [])
                      .filter((m: any) => {
                        if (tableFilterPool !== "ALL" && m.pool !== tableFilterPool) return false;
                        if (tableFilterStatus !== "ALL" && m.status !== tableFilterStatus) return false;
                        if (tableSearch.trim()) {
                          const q = tableSearch.toLowerCase();
                          const pA = m.playerA?.toLowerCase() || "";
                          const pB = m.playerB?.toLowerCase() || "";
                          const mNum = m.publicMatchNumber?.toLowerCase() || "";
                          if (!pA.includes(q) && !pB.includes(q) && !mNum.includes(q)) return false;
                        }
                        return true;
                      })
                      .map((m: any) => (
                        <tr key={m.id} className="hover:bg-[#0e162b] transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-xs text-[#00F0FF]">
                            {m.publicMatchNumber || m.matchNumber}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-pixel text-[10px] text-[#FF5A16] font-bold">
                              POOL {m.pool || "-"}
                            </span>
                            <div className="text-[11px] text-slate-300">
                              {m.roundName || m.roundStage}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs text-[#FFD700]">
                            {m.day?.date || "OCT 18"} &bull; {m.time}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-pixel text-[10px] text-[#00F0FF] bg-[#050914] px-2 py-0.5 border border-[#00F0FF]/30 rounded">
                              {m.court}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 max-w-xs font-semibold text-white">
                            <div className="truncate">{m.playerA || "TBD"}</div>
                            {m.institutionA && m.institutionA !== m.playerA && (
                              <div className="text-[10px] text-[#91A0AE] truncate">{m.institutionA}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono font-bold text-[#00FF88]">
                            {m.scoreA || m.scoreB ? `${m.scoreA || 0} - ${m.scoreB || 0}` : "VS"}
                          </td>
                          <td className="py-2.5 px-3 max-w-xs font-semibold text-white">
                            <div className="truncate">{m.playerB || "TBD"}</div>
                            {m.institutionB && m.institutionB !== m.playerB && (
                              <div className="text-[10px] text-[#91A0AE] truncate">{m.institutionB}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 font-pixel text-[9px] rounded font-bold ${
                                m.status === "LIVE"
                                  ? "bg-[#FF2A6D] text-white animate-pulse"
                                  : m.status === "COMPLETED"
                                  ? "bg-[#05D550] text-black"
                                  : "bg-[#2A354E] text-[#91A0AE]"
                              }`}
                            >
                              {m.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/matches/${m.id}`}
                                className="px-2 py-1 bg-[#1A2644] hover:bg-[#00F0FF] text-[#00F0FF] hover:text-black font-pixel text-[9px] rounded transition-all"
                              >
                                HUD
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ── ADMIN SUB-VIEW 2: 25 POSITIONS PER POOL DIRECTORY ── */

          <div className="overflow-x-auto max-h-[480px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="sticky top-0 bg-[#050914] border-b border-[#1b253b] font-pixel text-[10px] text-[#00F0FF]">
                <tr>
                  <th className="py-2.5 px-3">SEQ</th>
                  <th className="py-2.5 px-3">POSITION ID</th>
                  <th className="py-2.5 px-3">POOL</th>
                  <th className="py-2.5 px-3">SIDE</th>
                  <th className="py-2.5 px-3">STATUS</th>
                  <th className="py-2.5 px-3">ASSIGNED TEAM</th>
                  <th className="py-2.5 px-3">UNIVERSITY</th>
                  <th className="py-2.5 px-3">INITIAL MATCH</th>
                  <th className="py-2.5 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b253b]/50">
                {filteredPositions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-[#0e162b] transition-colors">
                    <td className="py-2 px-3 text-[#91A0AE]">{pos.globalSequence}</td>
                    <td className="py-2 px-3 font-pixel text-[#f5e6ca] font-bold">{pos.id}</td>
                    <td className="py-2 px-3 text-[#18D8D0]">Pool {pos.pool}</td>
                    <td className="py-2 px-3 text-[#91A0AE]">{pos.side}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 font-pixel text-[9px] rounded font-bold ${
                          pos.isFixed
                            ? "bg-[#A78BFA] text-black"
                            : pos.status === "ASSIGNED"
                            ? "bg-[#05D550] text-black"
                            : "bg-[#2A354E] text-[#91A0AE]"
                        }`}
                      >
                        {pos.isFixed ? "FIXED" : pos.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[#f5e6ca] font-medium">{pos.teamName || "-"}</td>
                    <td className="py-2 px-3 text-[#91A0AE]">{pos.institution || "-"}</td>
                    <td className="py-2 px-3 text-[#00F0FF]">
                      {pos.firstMatchNumber ? `${pos.firstMatchNumber} (Slot ${pos.firstMatchSlot})` : "-"}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {pos.status !== "AVAILABLE" && (
                        <button
                          onClick={() => {
                            setCorrectPositionId(pos.id);
                            setShowCorrectionModal(true);
                          }}
                          className="text-[10px] font-pixel text-[#FFB800] hover:underline"
                        >
                          CORRECT
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )}

        {/* ═══ 5. CHRONOLOGICAL DRAW HISTORY (SECTION 48) ═══ */}
        {history.length > 0 && (
          <div className="bg-[#0b0f1d] border border-[#1b253b] p-6 rounded-2xl shadow-lg space-y-4">
            <h2 className="font-display text-lg text-[#f5e6ca] font-bold uppercase">
              CHRONOLOGICAL DRAW AUDIT LOG
            </h2>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-2.5 bg-[#050914] rounded border border-[#1b253b] text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-xs text-[#ff5500]">
                      #{String(h.drawNumber).padStart(2, "0")}
                    </span>
                    <span className="font-pixel text-[10px] text-[#00F0FF]">
                      POOL {h.pool} &bull; {h.side}
                    </span>
                    <span className="text-[#f5e6ca] font-bold">{h.positionId}</span>
                    <span className="text-[#91A0AE]">&rarr; {h.teamName} ({h.institution})</span>
                  </div>
                  <span className="text-[10px] text-[#91A0AE]">
                    {new Date(h.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ MODAL: CONFIGURE FIXED TEAMS (SECTION 26) ═══ */}
        {showFixedModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#0b0f1d] border-2 border-[#A78BFA] p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#1b253b]">
                <h3 className="font-display text-lg text-[#A78BFA] font-bold uppercase">
                  CONFIGURE PRE-PLACED / FIXED TEAM
                </h3>
                <button onClick={() => setShowFixedModal(false)} className="text-[#91A0AE] hover:text-white text-lg">
                  &times;
                </button>
              </div>

              <form onSubmit={handleAssignFixed} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[#91A0AE] font-pixel text-[10px] mb-1">SELECT TEAM</label>
                  <select
                    value={fixedTeamId}
                    onChange={(e) => setFixedTeamId(e.target.value)}
                    className="w-full bg-[#050914] border border-[#1b253b] p-2.5 rounded text-[#f5e6ca]"
                    required
                  >
                    <option value="">-- Choose Team --</option>
                    {availableTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.teamCode} &bull; {t.name} ({t.institution})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#91A0AE] font-pixel text-[10px] mb-1">POOL</label>
                    <select
                      value={fixedPool}
                      onChange={(e) => setFixedPool(e.target.value as any)}
                      className="w-full bg-[#050914] border border-[#1b253b] p-2 rounded text-[#f5e6ca]"
                    >
                      <option value="A">Pool A</option>
                      <option value="B">Pool B</option>
                      <option value="C">Pool C</option>
                      <option value="D">Pool D</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#91A0AE] font-pixel text-[10px] mb-1">EXACT POSITION</label>
                    <select
                      value={fixedPositionId}
                      onChange={(e) => setFixedPositionId(e.target.value)}
                      className="w-full bg-[#050914] border border-[#1b253b] p-2 rounded text-[#f5e6ca]"
                      required
                    >
                      <option value="">-- Choose Position --</option>
                      {positions
                        .filter((p) => p.pool === fixedPool && (p.status === "AVAILABLE" || p.isFixed))
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.id} ({p.side})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[#91A0AE] font-pixel text-[10px] mb-1">FIXED REASON / SEEDING</label>
                  <input
                    type="text"
                    value={fixedReason}
                    onChange={(e) => setFixedReason(e.target.value)}
                    className="w-full bg-[#050914] border border-[#1b253b] p-2 rounded text-[#f5e6ca]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFixedModal(false)}
                    className="px-4 py-2 bg-[#1b253b] text-[#91A0AE] font-pixel text-xs rounded"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-[#A78BFA] text-black font-pixel text-xs font-bold rounded shadow-[2px_2px_0px_#000]"
                  >
                    ASSIGN FIXED TEAM
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══ MODAL: CORRECTION WORKFLOW (SECTION 29) ═══ */}
        {showCorrectionModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#0b0f1d] border-2 border-[#FFB800] p-6 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#1b253b]">
                <h3 className="font-display text-lg text-[#FFB800] font-bold uppercase">
                  AUTHORIZE FIXTURE CORRECTION
                </h3>
                <button onClick={() => setShowCorrectionModal(false)} className="text-[#91A0AE] hover:text-white text-lg">
                  &times;
                </button>
              </div>

              <form onSubmit={handleCorrectAssignment} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[#91A0AE] font-pixel text-[10px] mb-1">TARGET POSITION ID</label>
                  <input
                    type="text"
                    value={correctPositionId}
                    onChange={(e) => setCorrectPositionId(e.target.value)}
                    className="w-full bg-[#050914] border border-[#1b253b] p-2 rounded text-[#f5e6ca]"
                    placeholder="e.g. POOL-A-FIRST-01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#91A0AE] font-pixel text-[10px] mb-1">NEW REPLACEMENT TEAM</label>
                  <select
                    value={correctNewTeamId}
                    onChange={(e) => setCorrectNewTeamId(e.target.value)}
                    className="w-full bg-[#050914] border border-[#1b253b] p-2.5 rounded text-[#f5e6ca]"
                    required
                  >
                    <option value="">-- Choose New Team --</option>
                    {availableTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.teamCode} &bull; {t.name} ({t.institution})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#91A0AE] font-pixel text-[10px] mb-1">MANDATORY AUDIT REASON</label>
                  <textarea
                    value={correctReason}
                    onChange={(e) => setCorrectReason(e.target.value)}
                    rows={3}
                    placeholder="Provide specific administrative reason for correcting this slot..."
                    className="w-full bg-[#050914] border border-[#1b253b] p-2 rounded text-[#f5e6ca]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCorrectionModal(false)}
                    className="px-4 py-2 bg-[#1b253b] text-[#91A0AE] font-pixel text-xs rounded"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-[#FFB800] text-black font-pixel text-xs font-bold rounded shadow-[2px_2px_0px_#000]"
                  >
                    SAVE CORRECTION &bull; LOG AUDIT
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </TournamentAdminShell>
  );
}
