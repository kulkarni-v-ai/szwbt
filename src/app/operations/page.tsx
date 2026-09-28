"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Layers,
  Shield,
  Activity,
  CheckSquare,
  AlertTriangle,
  Users,
  Building,
  Megaphone,
  Clock,
  Search,
  RefreshCw,
  PlusCircle,
  Eye,
  Filter,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Flame,
  Radio,
  MapPin,
  ExternalLink,
  ChevronRight,
  LifeBuoy,
  FileText,
  UserCheck,
  Bus,
  Home,
  AlertCircle,
  CornerDownRight,
  Send,
} from "lucide-react";
import {
  OperationsPortalShell,
} from "@/components/operations/OperationsPortalShell";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { useAuth } from "@/lib/rbac/useAuth";

function OperationsCommandCenterContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const [currentTab, setCurrentTab] = useState<string>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");

  const { user } = useAuth();

  // Sync tab with URL
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) setCurrentTab(tabParam);
  }, [searchParams]);

  // Main state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overviewData, setOverviewData] = useState<any>(null);

  // Modals & Drawers
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [assignStaffModalOpen, setAssignStaffModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Incident Form state
  const [incTitle, setIncTitle] = useState("");
  const [incCategory, setIncCategory] = useState("VENUE");
  const [incSeverity, setIncSeverity] = useState("MEDIUM");
  const [incLocation, setIncLocation] = useState("");
  const [incDesc, setIncDesc] = useState("");
  const [submittingIncident, setSubmittingIncident] = useState(false);

  // Task Form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState("VENUE");
  const [taskPriority, setTaskPriority] = useState("NORMAL");
  const [taskLocation, setTaskLocation] = useState("");
  const [taskDueTime, setTaskDueTime] = useState("");
  const [taskInstructions, setTaskInstructions] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [submittingTask, setSubmittingTask] = useState(false);

  // Staff Assignment Form state
  const [assignStaffId, setAssignStaffId] = useState("");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignVenue, setAssignVenue] = useState("KLE Tech Arena");
  const [assignArea, setAssignArea] = useState("Court Block A");
  const [assignShiftStart, setAssignShiftStart] = useState("09:00");
  const [assignShiftEnd, setAssignShiftEnd] = useState("13:00");
  const [assignSupervisor, setAssignSupervisor] = useState("Dr. Rajesh K");
  const [assignInstructions, setAssignInstructions] = useState("");
  const [submittingAssignment, setSubmittingAssignment] = useState(false);

  // Filters for tabs
  const [incidentFilterCategory, setIncidentFilterCategory] = useState("ALL");
  const [incidentFilterSeverity, setIncidentFilterSeverity] = useState("ALL");
  const [incidentFilterStatus, setIncidentFilterStatus] = useState("ALL");
  const [taskFilterStatus, setTaskFilterStatus] = useState("ALL");
  const [taskFilterPriority, setTaskFilterPriority] = useState("ALL");

  // Load telemetry
  const loadOperationsTelemetry = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/operations");
      if (res.status === 401 || res.status === 403) {
        setError(
          res.status === 403
            ? "403 Forbidden: Only authorized On-Ground Operations Staff or Super Administrators can access the operations command center."
            : "Authentication required. Please sign in."
        );
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setOverviewData(data);
      } else {
        setError(data.error || "Failed to load operational telemetry.");
      }
    } catch (err: any) {
      setError("Network or operational server interruption: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOperationsTelemetry();
  }, []);

  // Handle Report Incident Submit
  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incTitle || !incLocation || !incDesc) return;
    try {
      setSubmittingIncident(true);
      const res = await fetch("/api/operations/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: incTitle,
          category: incCategory,
          severity: incSeverity,
          location: incLocation,
          description: incDesc,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReportModalOpen(false);
        setIncTitle("");
        setIncLocation("");
        setIncDesc("");
        loadOperationsTelemetry();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err: any) {
      alert("Submission failed: " + err.message);
    } finally {
      setSubmittingIncident(false);
    }
  };

  // Handle Create Task Submit
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskLocation || !taskDueTime) return;
    try {
      setSubmittingTask(true);
      const res = await fetch("/api/operations/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          category: taskCategory,
          priority: taskPriority,
          location: taskLocation,
          dueTime: taskDueTime,
          instructions: taskInstructions,
          assignedUserId: taskAssigneeId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreateTaskModalOpen(false);
        setTaskTitle("");
        setTaskLocation("");
        setTaskDueTime("");
        setTaskInstructions("");
        loadOperationsTelemetry();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err: any) {
      alert("Submission failed: " + err.message);
    } finally {
      setSubmittingTask(false);
    }
  };

  // Handle Assign Staff Submit
  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStaffId || !assignTitle || !assignVenue || !assignArea) return;
    try {
      setSubmittingAssignment(true);
      const res = await fetch("/api/operations/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: assignStaffId,
          title: assignTitle,
          venue: assignVenue,
          area: assignArea,
          shiftStart: assignShiftStart,
          shiftEnd: assignShiftEnd,
          supervisor: assignSupervisor,
          instructions: assignInstructions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAssignStaffModalOpen(false);
        setAssignTitle("");
        loadOperationsTelemetry();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err: any) {
      alert("Assignment failed: " + err.message);
    } finally {
      setSubmittingAssignment(false);
    }
  };

  // Handle Incident Status Update
  const handleUpdateIncidentStatus = async (
    incidentId: string,
    newStatus: string,
    responder?: string,
    escalation?: string,
    notes?: string
  ) => {
    try {
      const res = await fetch(`/api/operations/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          assignedResponder: responder,
          escalatedTo: escalation,
          resolutionNotes: notes,
          latestUpdate: `Status changed to ${newStatus} by Operations Command`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (selectedIncident && selectedIncident.id === incidentId) {
          setSelectedIncident(data.incident);
        }
        loadOperationsTelemetry();
      } else {
        alert("Update failed: " + data.error);
      }
    } catch (err: any) {
      alert("Network error: " + err.message);
    }
  };

  // Handle Task Status Update
  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/operations/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(data.task);
        }
        loadOperationsTelemetry();
      } else {
        alert("Task update failed: " + data.error);
      }
    } catch (err: any) {
      alert("Network error: " + err.message);
    }
  };

  // Handle Venue Area Status Update
  const handleUpdateVenueStatus = async (areaId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/operations/venue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: areaId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        loadOperationsTelemetry();
      } else {
        alert("Venue update failed: " + data.error);
      }
    } catch (err: any) {
      alert("Network error: " + err.message);
    }
  };

  // Loading State
  if (loading && !overviewData) {
    return (
      <OperationsPortalShell
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        operationsState="NORMAL"
        activeIncidentsCount={0}
        criticalIncidentsCount={0}
        activeTasksCount={0}
        activeVolunteersCount={0}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <div className="w-12 h-12 border-4 border-pixel-orange-fiery border-t-transparent animate-spin rounded-none" />
          <p className="font-pixel text-xs text-pixel-orange-fiery animate-pulse">
            SYNCHRONIZING FIELD TELEMETRY MATRIX...
          </p>
          <p className="text-xs text-pixel-gray-400 font-mono">
            Connecting to KLE Tech Field Node & Court Operations
          </p>
        </div>
      </OperationsPortalShell>
    );
  }

  // Error State
  if (error && !overviewData) {
    return (
      <OperationsPortalShell
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        operationsState="ALERT"
        activeIncidentsCount={0}
        criticalIncidentsCount={0}
        activeTasksCount={0}
        activeVolunteersCount={0}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <div className="max-w-xl mx-auto p-6 bg-[#07101D] border-2 border-pixel-red text-center space-y-4 shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-pixel-red mx-auto animate-bounce" />
          <h2 className="font-pixel text-base text-pixel-red">OPS SIGNAL LOST</h2>
          <p className="text-xs text-pixel-gray-300 font-sans leading-relaxed">{error}</p>
          <PixelButton variant="primary" size="md" onClick={loadOperationsTelemetry}>
            RETRY TELEMETRY LINK
          </PixelButton>
        </div>
      </OperationsPortalShell>
    );
  }

  const {
    operationsState = "NORMAL",
    globalStatus = {},
    metrics = {},
    incidents = [],
    tasks = [],
    venueAreas = [],
    courts = [],
    activeMatches = [],
    volunteers = [],
    recentActivity = [],
    announcements = [],
  } = overviewData || {};

  // Filtered lists
  const filteredIncidents = incidents.filter((inc: any) => {
    if (incidentFilterCategory !== "ALL" && inc.category !== incidentFilterCategory) return false;
    if (incidentFilterSeverity !== "ALL" && inc.severity !== incidentFilterSeverity) return false;
    if (incidentFilterStatus !== "ALL" && inc.status !== incidentFilterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        inc.title?.toLowerCase().includes(q) ||
        inc.location?.toLowerCase().includes(q) ||
        inc.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredTasks = tasks.filter((t: any) => {
    if (taskFilterStatus !== "ALL" && t.status !== taskFilterStatus) return false;
    if (taskFilterPriority !== "ALL" && t.priority !== taskFilterPriority) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.title?.toLowerCase().includes(q) ||
        t.location?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <OperationsPortalShell
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      operationsState={operationsState}
      activeIncidentsCount={metrics.activeIncidentsCount || incidents.length}
      criticalIncidentsCount={metrics.criticalIncidentsCount || 0}
      activeTasksCount={metrics.activeTasksCount || tasks.length}
      activeVolunteersCount={metrics.activeVolunteersCount || 0}
      onRefresh={loadOperationsTelemetry}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onOpenReportIncident={() => setReportModalOpen(true)}
      onOpenCreateTask={() => setCreateTaskModalOpen(true)}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: OVERVIEW (Main Command Center) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {currentTab === "overview" && (
          <>
            {/* HERO COMMAND CENTER BANNER */}
            <div className="p-4 sm:p-6 bg-gradient-to-r from-[#07101D] via-[#0A1628] to-[#07101D] border-2 border-pixel-orange-fiery/40 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-[10px] text-pixel-cyan tracking-widest uppercase">
                      TOURNAMENT FIELD STATUS
                    </span>
                    <span className="text-[10px] font-mono text-pixel-gray-400">
                      // KLE TECH ARENA GROUND ZERO
                    </span>
                  </div>
                  <h1 className="font-pixel text-lg sm:text-2xl text-pixel-cream tracking-wide mt-1">
                    ON-GROUND OPERATIONS COMMAND CENTER
                  </h1>
                  <p className="text-xs text-pixel-gray-300 font-sans mt-1 max-w-2xl">
                    Central venue orchestration: court readiness, field tasks, rapid incident resolution,
                    and cross-departmental operations tracking.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <PixelButton
                    variant="primary"
                    size="sm"
                    onClick={() => setReportModalOpen(true)}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mr-1 text-pixel-cream" />
                    <span>REPORT INCIDENT</span>
                  </PixelButton>

                  <PixelButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setCreateTaskModalOpen(true)}
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1" />
                    <span>CREATE TASK</span>
                  </PixelButton>

                  <button
                    onClick={() => setAssignStaffModalOpen(true)}
                    className="px-3 py-1.5 bg-[#050914] border border-pixel-gray-700 hover:border-pixel-cyan text-pixel-cyan font-pixel text-[10px] tracking-wider transition-colors"
                  >
                    ASSIGN STAFF
                  </button>
                </div>
              </div>
            </div>

            {/* GLOBAL OPERATIONS STATUS MATRIX (Requirement 7) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-pixel text-xs text-pixel-amber tracking-wider">
                  [GLOBAL OPERATIONS STATUS]
                </span>
                <span className="font-mono text-[10px] text-pixel-gray-500">LIVE SENSOR TELEMETRY</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {/* 1. Venue */}
                <div className="p-3 bg-[#07101D] border border-pixel-gray-800 flex flex-col justify-between">
                  <span className="font-pixel text-[9px] text-pixel-gray-400">VENUE</span>
                  <div className="my-1.5">
                    <PixelBadge
                      variant={
                        globalStatus.venue === "READY"
                          ? "green"
                          : globalStatus.venue === "ATTENTION"
                          ? "amber"
                          : "red"
                      }
                      size="sm"
                    >
                      ● {globalStatus.venue || "READY"}
                    </PixelBadge>
                  </div>
                  <span className="text-[10px] font-mono text-pixel-gray-400">
                    {venueAreas.length} Areas Configured
                  </span>
                </div>

                {/* 2. Registration */}
                <div className="p-3 bg-[#07101D] border border-pixel-gray-800 flex flex-col justify-between">
                  <span className="font-pixel text-[9px] text-pixel-gray-400">REGISTRATION</span>
                  <div className="my-1.5">
                    <PixelBadge variant={globalStatus.registration === "ACTIVE" ? "green" : "gray"} size="sm">
                      ● {globalStatus.registration || "ACTIVE"}
                    </PixelBadge>
                  </div>
                  <span className="text-[10px] font-mono text-pixel-gray-400">
                    {metrics.approvedParticipants || 0}/{metrics.totalParticipants || 0} Cleared
                  </span>
                </div>

                {/* 3. Accommodation */}
                <div className="p-3 bg-[#07101D] border border-pixel-gray-800 flex flex-col justify-between">
                  <span className="font-pixel text-[9px] text-pixel-gray-400">ACCOMMODATION</span>
                  <div className="my-1.5">
                    <PixelBadge variant="green" size="sm">
                      ● {globalStatus.accommodation || "ALLOCATED"}
                    </PixelBadge>
                  </div>
                  <span className="text-[10px] font-mono text-pixel-gray-400">
                    {metrics.allocatedBeds || 0} Beds Occupied
                  </span>
                </div>

                {/* 4. Transport (Complimentary Zero-Payment) */}
                <div className="p-3 bg-[#07101D] border border-pixel-gray-800 flex flex-col justify-between">
                  <span className="font-pixel text-[9px] text-pixel-gray-400">TRANSPORT</span>
                  <div className="my-1.5">
                    <PixelBadge variant="green" size="sm">
                      ● {globalStatus.transport || "IN SERVICE"}
                    </PixelBadge>
                  </div>
                  <span className="text-[10px] font-mono text-pixel-cyan">
                    FREE SHUTTLE
                  </span>
                </div>

                {/* 5. Match Operations */}
                <div className="p-3 bg-[#07101D] border border-pixel-gray-800 flex flex-col justify-between">
                  <span className="font-pixel text-[9px] text-pixel-gray-400">MATCH OPS</span>
                  <div className="my-1.5">
                    <PixelBadge variant={globalStatus.matchOperations === "LIVE" ? "orange" : "gray"} size="sm">
                      ● {globalStatus.matchOperations || "READY"}
                    </PixelBadge>
                  </div>
                  <span className="text-[10px] font-mono text-pixel-gray-400">
                    {metrics.liveMatchesCount || 0} Live Courts
                  </span>
                </div>

                {/* 6. Volunteers */}
                <div className="p-3 bg-[#07101D] border border-pixel-gray-800 flex flex-col justify-between">
                  <span className="font-pixel text-[9px] text-pixel-gray-400">VOLUNTEERS</span>
                  <div className="my-1.5">
                    <PixelBadge variant="green" size="sm">
                      ● {globalStatus.volunteers || "ACTIVE"}
                    </PixelBadge>
                  </div>
                  <span className="text-[10px] font-mono text-pixel-gray-400">
                    {metrics.activeVolunteersCount || 0} On Duty
                  </span>
                </div>

                {/* 7. Communications */}
                <div className="p-3 bg-[#07101D] border border-pixel-gray-800 flex flex-col justify-between">
                  <span className="font-pixel text-[9px] text-pixel-gray-400">BROADCAST</span>
                  <div className="my-1.5">
                    <PixelBadge variant="cyan" size="sm">
                      ● {globalStatus.communications || "ACTIVE"}
                    </PixelBadge>
                  </div>
                  <span className="text-[10px] font-mono text-pixel-gray-400">
                    {announcements.length} Bulletins
                  </span>
                </div>
              </div>
            </div>

            {/* CRITICAL ALERTS & INCIDENT QUEUE (Requirement 8 & 9) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Critical Alerts / Active Incidents */}
              <PixelCard
                headerTitle={`ACTIVE INCIDENTS (${incidents.length})`}
                headerBadge={metrics.criticalIncidentsCount > 0 ? "URGENT ATTENTION" : "MONITORING"}
                headerBadgeVariant={metrics.criticalIncidentsCount > 0 ? "red" : "orange"}
                glow={metrics.criticalIncidentsCount > 0}
              >
                {incidents.length === 0 ? (
                  <div className="p-8 text-center bg-[#07101D] border border-pixel-gray-800/60">
                    <CheckCircle2 className="w-10 h-10 text-pixel-green mx-auto mb-2 opacity-80" />
                    <p className="font-pixel text-xs text-pixel-green">NO ACTIVE INCIDENTS</p>
                    <p className="text-xs text-pixel-gray-400 mt-1">
                      No unresolved operational incidents currently require attention.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {incidents.slice(0, 5).map((inc: any) => (
                      <div
                        key={inc.id}
                        className={`p-3 bg-[#07101D] border-l-4 transition-all hover:bg-[#0A1628] cursor-pointer ${
                          inc.severity === "CRITICAL"
                            ? "border-pixel-red"
                            : inc.severity === "HIGH"
                            ? "border-pixel-orange-fiery"
                            : "border-pixel-amber"
                        }`}
                        onClick={() => setSelectedIncident(inc)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <PixelBadge
                                variant={
                                  inc.severity === "CRITICAL"
                                    ? "red"
                                    : inc.severity === "HIGH"
                                    ? "orange"
                                    : "amber"
                                }
                                size="sm"
                              >
                                {inc.severity}
                              </PixelBadge>
                              <span className="font-pixel text-[10px] text-pixel-gray-400 uppercase">
                                {inc.category}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs text-pixel-cream mt-1 truncate">
                              {inc.title}
                            </h4>
                            <p className="text-[11px] text-pixel-gray-400 line-clamp-1 mt-0.5">
                              {inc.description}
                            </p>
                          </div>

                          <div className="text-right flex flex-col items-end">
                            <PixelBadge variant={inc.status === "OPEN" ? "red" : "cyan"} size="sm">
                              {inc.status}
                            </PixelBadge>
                            <span className="text-[10px] text-pixel-gray-500 font-mono mt-1">
                              {inc.location}
                            </span>
                          </div>
                        </div>

                        {/* Quick action strip */}
                        <div className="mt-2 pt-2 border-t border-pixel-gray-800/80 flex items-center justify-between text-[10px]">
                          <span className="text-pixel-gray-500 font-mono">
                            Resp: {inc.assignedResponder || "Unassigned"}
                          </span>
                          <div className="flex items-center gap-2">
                            {inc.status === "OPEN" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateIncidentStatus(inc.id, "ACKNOWLEDGED");
                                }}
                                className="px-2 py-0.5 bg-pixel-amber/20 hover:bg-pixel-amber/30 text-pixel-amber font-pixel text-[9px] border border-pixel-amber/40"
                              >
                                ACKNOWLEDGE
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIncident(inc);
                              }}
                              className="text-pixel-cyan hover:underline flex items-center gap-0.5"
                            >
                              <span>DETAILS</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-pixel-gray-800 flex justify-between items-center text-xs">
                  <span className="text-[10px] font-mono text-pixel-gray-500">
                    Showing {Math.min(incidents.length, 5)} of {incidents.length} incidents
                  </span>
                  <button
                    onClick={() => setCurrentTab("incidents")}
                    className="font-pixel text-[10px] text-pixel-orange-fiery hover:underline flex items-center gap-1"
                  >
                    <span>VIEW ALL INCIDENTS</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </PixelCard>

              {/* Task Command Center Queue */}
              <PixelCard
                headerTitle={`TASK QUEUE (${tasks.length})`}
                headerBadge={`${metrics.completedTasksCount || 0} COMPLETED`}
                headerBadgeVariant="green"
              >
                {tasks.length === 0 ? (
                  <div className="p-8 text-center bg-[#07101D] border border-pixel-gray-800/60">
                    <CheckCircle2 className="w-10 h-10 text-pixel-cyan mx-auto mb-2 opacity-80" />
                    <p className="font-pixel text-xs text-pixel-cyan">TASK QUEUE CLEAR</p>
                    <p className="text-xs text-pixel-gray-400 mt-1">
                      There are currently no operational tasks requiring immediate action.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {tasks.slice(0, 5).map((t: any) => (
                      <div
                        key={t.id}
                        className="p-3 bg-[#07101D] border border-pixel-gray-800 hover:border-pixel-orange-fiery/50 transition-all hover:bg-[#0A1628] cursor-pointer"
                        onClick={() => setSelectedTask(t)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <PixelBadge
                                variant={
                                  t.priority === "URGENT"
                                    ? "red"
                                    : t.priority === "HIGH"
                                    ? "orange"
                                    : "gray"
                                }
                                size="sm"
                              >
                                {t.priority}
                              </PixelBadge>
                              <span className="font-pixel text-[10px] text-pixel-gray-400 uppercase">
                                {t.category}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs text-pixel-cream mt-1 truncate">
                              {t.title}
                            </h4>
                            <p className="text-[11px] text-pixel-gray-400 line-clamp-1 mt-0.5">
                              {t.description || t.instructions || "Operational field task"}
                            </p>
                          </div>

                          <div className="text-right flex flex-col items-end">
                            <PixelBadge
                              variant={
                                t.status === "COMPLETED"
                                  ? "green"
                                  : t.status === "IN_PROGRESS"
                                  ? "orange"
                                  : "gray"
                              }
                              size="sm"
                            >
                              {t.status}
                            </PixelBadge>
                            <span className="text-[10px] text-pixel-amber font-mono mt-1">
                              Due: {t.dueTime}
                            </span>
                          </div>
                        </div>

                        {/* Assignee & Action */}
                        <div className="mt-2 pt-2 border-t border-pixel-gray-800/80 flex items-center justify-between text-[10px]">
                          <span className="text-pixel-gray-400 font-mono">
                            Assignee: <strong className="text-pixel-cream">{t.assignedStaffName || t.user?.name || "Staff"}</strong>
                          </span>

                          <div className="flex items-center gap-2">
                            {t.status === "ASSIGNED" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateTaskStatus(t.id, "IN_PROGRESS");
                                }}
                                className="px-2 py-0.5 bg-pixel-orange-fiery/20 hover:bg-pixel-orange-fiery/30 text-pixel-orange-fiery font-pixel text-[9px] border border-pixel-orange-fiery/40"
                              >
                                START
                              </button>
                            )}
                            {t.status === "IN_PROGRESS" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateTaskStatus(t.id, "COMPLETED");
                                }}
                                className="px-2 py-0.5 bg-pixel-green/20 hover:bg-pixel-green/30 text-pixel-green font-pixel text-[9px] border border-pixel-green/40"
                              >
                                COMPLETE
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTask(t)}
                              }
                              className="text-pixel-cyan hover:underline flex items-center gap-0.5"
                            >
                              <span>DETAILS</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-pixel-gray-800 flex justify-between items-center text-xs">
                  <span className="text-[10px] font-mono text-pixel-gray-500">
                    Showing {Math.min(tasks.length, 5)} of {tasks.length} tasks
                  </span>
                  <button
                    onClick={() => setCurrentTab("tasks")}
                    className="font-pixel text-[10px] text-pixel-cyan hover:underline flex items-center gap-1"
                  >
                    <span>OPEN TASK QUEUE</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </PixelCard>
            </div>

            {/* LIVE COURT SNAPSHOT & VENUE READINESS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Courts Overview (2 cols) */}
              <div className="lg:col-span-2">
                <PixelCard
                  headerTitle="COURT OPERATIONS OVERVIEW"
                  headerBadge="LIVE TELEMETRY"
                  headerBadgeVariant="orange"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {courts.map((c: any) => {
                      const liveM = activeMatches.find((m: any) => m.court === c.courtNumber);
                      return (
                        <div
                          key={c.id}
                          className="p-3 bg-[#07101D] border-2 border-pixel-gray-800 flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-pixel text-xs text-pixel-cream">{c.courtNumber}</span>
                            <PixelBadge
                              variant={
                                c.status === "LIVE"
                                  ? "red"
                                  : c.status === "READY"
                                  ? "green"
                                  : "amber"
                              }
                              size="sm"
                            >
                              {c.status}
                            </PixelBadge>
                          </div>

                          <div className="my-2.5">
                            {liveM ? (
                              <div className="space-y-1">
                                <p className="font-bold text-xs text-pixel-orange-fiery">
                                  {liveM.playerA} vs {liveM.playerB}
                                </p>
                                <p className="text-[10px] text-pixel-gray-400 truncate">
                                  {liveM.institutionA} / {liveM.institutionB}
                                </p>
                                <p className="font-mono text-xs text-pixel-cyan font-bold">
                                  SETS: {liveM.scoreA || "0"} - {liveM.scoreB || "0"}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-pixel-gray-500 font-mono py-1">
                                [STANDBY FOR FIXTURE CALL]
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-pixel-gray-800 flex items-center justify-between text-[10px] text-pixel-gray-400">
                            <span>Umpire: {c.umpire || "Assigned"}</span>
                            <button
                              onClick={() => setCurrentTab("live")}
                              className="text-pixel-cyan hover:underline text-[9px] font-pixel"
                            >
                              DETAILS
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </PixelCard>
              </div>

              {/* Quick Actions Panel */}
              <div>
                <PixelCard headerTitle="QUICK OPS ACTIONS" headerBadge="FIELD CONTROLS">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <button
                      onClick={() => setReportModalOpen(true)}
                      className="p-3 bg-pixel-red/20 hover:bg-pixel-red/30 border border-pixel-red/60 text-pixel-red flex flex-col items-center justify-center transition-all group"
                    >
                      <AlertTriangle className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="font-pixel text-[10px]">REPORT INCIDENT</span>
                    </button>

                    <button
                      onClick={() => setCreateTaskModalOpen(true)}
                      className="p-3 bg-pixel-orange-fiery/20 hover:bg-pixel-orange-fiery/30 border border-pixel-orange-fiery/60 text-pixel-orange-fiery flex flex-col items-center justify-center transition-all group"
                    >
                      <PlusCircle className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="font-pixel text-[10px]">CREATE TASK</span>
                    </button>

                    <button
                      onClick={() => setAssignStaffModalOpen(true)}
                      className="p-3 bg-pixel-cyan/20 hover:bg-pixel-cyan/30 border border-pixel-cyan/60 text-pixel-cyan flex flex-col items-center justify-center transition-all group"
                    >
                      <Users className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="font-pixel text-[10px]">ASSIGN STAFF</span>
                    </button>

                    <button
                      onClick={() => setCurrentTab("venue")}
                      className="p-3 bg-pixel-amber/20 hover:bg-pixel-amber/30 border border-pixel-amber/60 text-pixel-amber flex flex-col items-center justify-center transition-all group"
                    >
                      <Building className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="font-pixel text-[10px]">VENUE MATRIX</span>
                    </button>
                  </div>

                  {/* Bulletins / Announcements ticker */}
                  <div className="mt-4 pt-3 border-t border-pixel-gray-800">
                    <div className="flex items-center gap-1.5 text-pixel-amber font-pixel text-[10px] mb-2">
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>LATEST FIELD BULLETINS</span>
                    </div>

                    <div className="space-y-2">
                      {announcements.slice(0, 2).map((ann: any) => (
                        <div key={ann.id} className="p-2 bg-[#0A1628] border border-pixel-gray-800 text-[11px]">
                          <p className="font-bold text-pixel-cream truncate">{ann.title}</p>
                          <p className="text-pixel-gray-400 line-clamp-1 text-[10px] mt-0.5">
                            {ann.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </PixelCard>
              </div>
            </div>

            {/* RECENT ACTIVITY AUDIT LOG (Requirement 25) */}
            <PixelCard headerTitle="OPERATIONAL ACTIVITY FEED" headerBadge="TAMPER-EVIDENT LOGS">
              {recentActivity.length === 0 ? (
                <p className="text-xs text-pixel-gray-500 font-mono p-4 text-center">
                  NO RECENT ACTIVITY RECORDED
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {recentActivity.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-2.5 bg-[#07101D] border-l-2 border-pixel-cyan flex items-start justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <PixelBadge variant="gray" size="sm">
                            {log.action}
                          </PixelBadge>
                          <span className="text-[10px] text-pixel-gray-400 font-mono">
                            by {log.actorEmail?.split("@")[0] || "operator"}
                          </span>
                        </div>
                        <p className="text-[11px] text-pixel-gray-300 font-sans mt-1">
                          Resource: <strong className="text-pixel-cream">{log.resourceType}</strong>
                          {log.resourceId && <span className="text-pixel-gray-500 ml-1">({log.resourceId.slice(0, 8)})</span>}
                        </p>
                      </div>
                      <span className="font-mono text-[10px] text-pixel-gray-500 whitespace-nowrap ml-2">
                        {new Date(log.timestamp).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </PixelCard>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: LIVE OPERATIONS (Courts, Matches, Interruptions) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {currentTab === "live" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[#07101D] border-2 border-pixel-orange-fiery/40">
              <div>
                <h2 className="font-pixel text-base text-pixel-cream">COURT & MATCH OPERATIONS</h2>
                <p className="text-xs text-pixel-gray-400 font-sans mt-0.5">
                  Real-time status of competition courts, Hawk-Eye cameras, and court delays.
                </p>
              </div>
              <PixelButton variant="primary" size="sm" onClick={loadOperationsTelemetry}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                <span>REFRESH COURTS</span>
              </PixelButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courts.map((court: any) => {
                const liveM = activeMatches.find((m: any) => m.court === court.courtNumber);
                return (
                  <PixelCard
                    key={court.id}
                    headerTitle={court.courtNumber}
                    headerBadge={court.status}
                    headerBadgeVariant={court.status === "LIVE" ? "red" : court.status === "READY" ? "green" : "amber"}
                    glow={court.status === "LIVE"}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-pixel-gray-400">Assigned Umpire:</span>
                        <span className="text-pixel-cream font-bold">{court.umpire || "BWF Technical Official"}</span>
                      </div>

                      {liveM ? (
                        <div className="p-3 bg-[#0A1628] border border-pixel-orange-fiery/40 space-y-2">
                          <div className="flex justify-between text-[11px] font-pixel text-pixel-orange-fiery">
                            <span>{liveM.matchNumber}</span>
                            <span>{liveM.category}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                            <div className="p-2 bg-[#050914] border border-pixel-gray-800">
                              <p className="font-bold text-pixel-cream">{liveM.playerA}</p>
                              <p className="text-[10px] text-pixel-gray-400">{liveM.institutionA}</p>
                            </div>
                            <div className="p-2 bg-[#050914] border border-pixel-gray-800">
                              <p className="font-bold text-pixel-cream">{liveM.playerB}</p>
                              <p className="text-[10px] text-pixel-gray-400">{liveM.institutionB}</p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-pixel-gray-800 font-mono text-xs">
                            <span className="text-pixel-gray-400">Score Matrix:</span>
                            <span className="text-pixel-cyan font-bold">
                              {liveM.scoreA || "0"} - {liveM.scoreB || "0"}
                            </span>
                          </div>

                          {liveM.interruptionReason && (
                            <div className="p-2 bg-pixel-red/10 border border-pixel-red/30 text-pixel-red text-xs">
                              <strong>INTERRUPTION:</strong> {liveM.interruptionReason} - {liveM.interruptionNotes}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-[#0A1628] border border-dashed border-pixel-gray-800 text-center text-xs text-pixel-gray-400">
                          Court ready for next scheduled match call.
                        </div>
                      )}

                      <div className="pt-2 border-t border-pixel-gray-800 flex items-center justify-between text-xs">
                        <span className="text-pixel-gray-500 font-mono text-[10px]">
                          Surface: Wooden + Taraflex
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              const newStatus = court.status === "READY" ? "LIVE" : "READY";
                              fetch("/api/operations/courts", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ courtNumber: court.courtNumber, status: newStatus }),
                              }).then(() => loadOperationsTelemetry());
                            }}
                            className="px-2 py-1 bg-[#050914] hover:bg-[#0A1628] border border-pixel-gray-700 text-pixel-cream text-[10px] font-pixel"
                          >
                            TOGGLE STATUS
                          </button>
                        </div>
                      </div>
                    </div>
                  </PixelCard>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: TASKS (Task Command Center) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {currentTab === "tasks" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[#07101D] border-2 border-pixel-orange-fiery/40">
              <div>
                <h2 className="font-pixel text-base text-pixel-cream">OPERATIONS TASK COMMAND CENTER</h2>
                <p className="text-xs text-pixel-gray-400 font-sans mt-0.5">
                  Dispatch and coordinate tasks across venue, court preparation, and participant assistance.
                </p>
              </div>

              <PixelButton variant="primary" size="sm" onClick={() => setCreateTaskModalOpen(true)}>
                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                <span>DISPATCH NEW TASK</span>
              </PixelButton>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-[#0A1628] border border-pixel-gray-800 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-pixel-gray-400 font-pixel text-[10px]">STATUS:</span>
                <select
                  value={taskFilterStatus}
                  onChange={(e) => setTaskFilterStatus(e.target.value)}
                  className="bg-[#050914] border border-pixel-gray-800 text-pixel-cream px-2 py-1 text-xs focus:outline-none"
                >
                  <option value="ALL">ALL STATUSES</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="BLOCKED">BLOCKED</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-pixel-gray-400 font-pixel text-[10px]">PRIORITY:</span>
                <select
                  value={taskFilterPriority}
                  onChange={(e) => setTaskFilterPriority(e.target.value)}
                  className="bg-[#050914] border border-pixel-gray-800 text-pixel-cream px-2 py-1 text-xs focus:outline-none"
                >
                  <option value="ALL">ALL PRIORITIES</option>
                  <option value="URGENT">URGENT</option>
                  <option value="HIGH">HIGH</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            </div>

            {/* Tasks List */}
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center bg-[#07101D] border border-pixel-gray-800">
                <CheckSquare className="w-12 h-12 text-pixel-gray-600 mx-auto mb-2" />
                <p className="font-pixel text-xs text-pixel-gray-400">NO TASKS MATCH THE CURRENT FILTER</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="p-4 bg-[#07101D] border-2 border-pixel-gray-800 hover:border-pixel-orange-fiery transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <PixelBadge
                            variant={
                              task.priority === "URGENT"
                                ? "red"
                                : task.priority === "HIGH"
                                ? "orange"
                                : "gray"
                            }
                            size="sm"
                          >
                            {task.priority}
                          </PixelBadge>
                          <span className="font-pixel text-[10px] text-pixel-cyan uppercase">
                            {task.category}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-pixel-cream mt-1">{task.title}</h4>
                      </div>

                      <PixelBadge
                        variant={
                          task.status === "COMPLETED"
                            ? "green"
                            : task.status === "IN_PROGRESS"
                            ? "orange"
                            : task.status === "BLOCKED"
                            ? "red"
                            : "gray"
                        }
                        size="sm"
                      >
                        {task.status}
                      </PixelBadge>
                    </div>

                    <p className="text-xs text-pixel-gray-300 font-sans">{task.description}</p>

                    {task.instructions && (
                      <div className="p-2.5 bg-[#050914] border border-pixel-gray-800 text-[11px] text-pixel-gray-400">
                        <strong className="text-pixel-cream">Instructions:</strong> {task.instructions}
                      </div>
                    )}

                    <div className="pt-2 border-t border-pixel-gray-800 flex items-center justify-between text-xs font-mono">
                      <span className="text-pixel-gray-400">Location: {task.location}</span>
                      <span className="text-pixel-amber">Due: {task.dueTime}</span>
                    </div>

                    <div className="pt-2 border-t border-pixel-gray-800 flex items-center justify-between">
                      <span className="text-[11px] text-pixel-gray-400">
                        Assignee: <strong className="text-pixel-cream">{task.assignedStaffName || task.user?.name || "Staff"}</strong>
                      </span>

                      <div className="flex gap-2">
                        {task.status !== "COMPLETED" && (
                          <button
                            onClick={() => handleUpdateTaskStatus(task.id, "COMPLETED")}
                            className="px-2.5 py-1 bg-pixel-green/20 hover:bg-pixel-green/30 text-pixel-green font-pixel text-[10px] border border-pixel-green/40"
                          >
                            MARK COMPLETED
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedTask(task)}
                          className="px-2.5 py-1 bg-[#050914] hover:bg-[#0A1628] text-pixel-cyan font-pixel text-[10px] border border-pixel-gray-700"
                        >
                          DETAILS
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: INCIDENTS & ISSUES (Requirement 9, 10, 11) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {currentTab === "incidents" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[#07101D] border-2 border-pixel-orange-fiery/40">
              <div>
                <h2 className="font-pixel text-base text-pixel-cream">INCIDENTS & EMERGENCY ESCALATIONS</h2>
                <p className="text-xs text-pixel-gray-400 font-sans mt-0.5">
                  Track, acknowledge, assign responders, and resolve field disruptions.
                </p>
              </div>

              <PixelButton variant="primary" size="sm" onClick={() => setReportModalOpen(true)}>
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                <span>REPORT NEW INCIDENT</span>
              </PixelButton>
            </div>

            {/* Incident Filters */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-[#0A1628] border border-pixel-gray-800 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-pixel-gray-400 font-pixel text-[10px]">CATEGORY:</span>
                <select
                  value={incidentFilterCategory}
                  onChange={(e) => setIncidentFilterCategory(e.target.value)}
                  className="bg-[#050914] border border-pixel-gray-800 text-pixel-cream px-2 py-1 text-xs focus:outline-none"
                >
                  <option value="ALL">ALL CATEGORIES</option>
                  <option value="VENUE">VENUE</option>
                  <option value="PARTICIPANT">PARTICIPANT</option>
                  <option value="ACCOMMODATION">ACCOMMODATION</option>
                  <option value="TRANSPORT">TRANSPORT</option>
                  <option value="MATCH">MATCH</option>
                  <option value="EQUIPMENT">EQUIPMENT</option>
                  <option value="SAFETY">SAFETY</option>
                  <option value="TECHNICAL">TECHNICAL</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-pixel-gray-400 font-pixel text-[10px]">SEVERITY:</span>
                <select
                  value={incidentFilterSeverity}
                  onChange={(e) => setIncidentFilterSeverity(e.target.value)}
                  className="bg-[#050914] border border-pixel-gray-800 text-pixel-cream px-2 py-1 text-xs focus:outline-none"
                >
                  <option value="ALL">ALL SEVERITIES</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-pixel-gray-400 font-pixel text-[10px]">STATUS:</span>
                <select
                  value={incidentFilterStatus}
                  onChange={(e) => setIncidentFilterStatus(e.target.value)}
                  className="bg-[#050914] border border-pixel-gray-800 text-pixel-cream px-2 py-1 text-xs focus:outline-none"
                >
                  <option value="ALL">ALL STATUSES</option>
                  <option value="OPEN">OPEN</option>
                  <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="ESCALATED">ESCALATED</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>
            </div>

            {/* Incidents List */}
            {filteredIncidents.length === 0 ? (
              <div className="p-12 text-center bg-[#07101D] border border-pixel-gray-800">
                <CheckCircle2 className="w-12 h-12 text-pixel-green mx-auto mb-2 opacity-80" />
                <p className="font-pixel text-xs text-pixel-green">NO ACTIVE INCIDENTS IN FILTER</p>
                <p className="text-xs text-pixel-gray-400 mt-1">All venue telemetry clear.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredIncidents.map((inc: any) => (
                  <div
                    key={inc.id}
                    className={`p-4 bg-[#07101D] border-l-4 border-2 border-r-pixel-gray-800 border-t-pixel-gray-800 border-b-pixel-gray-800 space-y-3 ${
                      inc.severity === "CRITICAL"
                        ? "border-l-pixel-red"
                        : inc.severity === "HIGH"
                        ? "border-l-pixel-orange-fiery"
                        : "border-l-pixel-amber"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <PixelBadge
                            variant={
                              inc.severity === "CRITICAL"
                                ? "red"
                                : inc.severity === "HIGH"
                                ? "orange"
                                : "amber"
                            }
                            size="sm"
                          >
                            {inc.severity} SEVERITY
                          </PixelBadge>
                          <span className="font-pixel text-[10px] text-pixel-gray-400 uppercase">
                            CAT: {inc.category}
                          </span>
                          <span className="text-pixel-gray-500 font-mono text-[10px]">
                            ID: {inc.id.slice(-6)}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-pixel-cream mt-1">{inc.title}</h3>
                        <p className="text-xs text-pixel-gray-300 font-sans mt-1">{inc.description}</p>
                      </div>

                      <div className="flex flex-col sm:items-end gap-1">
                        <PixelBadge
                          variant={
                            inc.status === "RESOLVED"
                              ? "green"
                              : inc.status === "OPEN"
                              ? "red"
                              : "orange"
                          }
                          size="sm"
                        >
                          {inc.status}
                        </PixelBadge>
                        <span className="text-[10px] font-mono text-pixel-gray-400">
                          Location: <strong className="text-pixel-cream">{inc.location}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Workflow status strip */}
                    <div className="p-2.5 bg-[#050914] border border-pixel-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="space-x-4 text-[11px] text-pixel-gray-400">
                        <span>
                          Reporter: <strong className="text-pixel-cream">{inc.reporterEmail || inc.user?.name}</strong>
                        </span>
                        <span>
                          Responder: <strong className="text-pixel-cyan">{inc.assignedResponder || "Unassigned"}</strong>
                        </span>
                        {inc.escalatedTo && (
                          <span className="text-pixel-red font-bold">
                            Escalated: {inc.escalatedTo}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {inc.status === "OPEN" && (
                          <button
                            onClick={() => handleUpdateIncidentStatus(inc.id, "ACKNOWLEDGED")}
                            className="px-2.5 py-1 bg-pixel-amber/20 hover:bg-pixel-amber/30 text-pixel-amber font-pixel text-[9px] border border-pixel-amber/40"
                          >
                            ACKNOWLEDGE
                          </button>
                        )}
                        {inc.status !== "RESOLVED" && inc.status !== "CLOSED" && (
                          <button
                            onClick={() =>
                              handleUpdateIncidentStatus(
                                inc.id,
                                "RESOLVED",
                                user?.name || "Operations Controller",
                                undefined,
                                "Resolved on ground by operations dispatch team"
                              )
                            }
                            className="px-2.5 py-1 bg-pixel-green/20 hover:bg-pixel-green/30 text-pixel-green font-pixel text-[9px] border border-pixel-green/40"
                          >
                            MARK RESOLVED
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedIncident(inc)}
                          className="px-2.5 py-1 bg-[#0A1628] hover:bg-[#102038] text-pixel-cyan font-pixel text-[9px] border border-pixel-gray-700"
                        >
                          FULL WORKSPACE
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 5: STAFF & VOLUNTEERS (Requirement 14 & 15) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {currentTab === "staff" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[#07101D] border-2 border-pixel-orange-fiery/40">
              <div>
                <h2 className="font-pixel text-base text-pixel-cream">STAFF & VOLUNTEER COORDINATION</h2>
                <p className="text-xs text-pixel-gray-400 font-sans mt-0.5">
                  Deployment roster, shift status, and area coverage for on-site personnel.
                </p>
              </div>

              <PixelButton variant="primary" size="sm" onClick={() => setAssignStaffModalOpen(true)}>
                <Users className="w-3.5 h-3.5 mr-1" />
                <span>CREATE DEPLOYMENT</span>
              </PixelButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {volunteers.map((vol: any) => {
                const shift = vol.volunteerShifts?.[0];
                const assignment = vol.volunteerAssignments?.[0];
                const isOn = shift?.status === "ON_SHIFT";

                return (
                  <PixelCard
                    key={vol.id}
                    headerTitle={vol.name}
                    headerBadge={isOn ? "ON SHIFT" : shift?.status || "OFF SHIFT"}
                    headerBadgeVariant={isOn ? "green" : "gray"}
                  >
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-pixel-gray-400">Email:</span>
                        <span className="font-mono text-pixel-cream truncate max-w-[150px]">{vol.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-pixel-gray-400">Badge:</span>
                        <span className="text-pixel-orange-fiery font-bold">{vol.badge || "VOLUNTEER"}</span>
                      </div>

                      {assignment ? (
                        <div className="p-2.5 bg-[#050914] border border-pixel-gray-800 space-y-1">
                          <p className="font-pixel text-[10px] text-pixel-cyan uppercase">
                            CURRENT DEPLOYMENT:
                          </p>
                          <p className="font-bold text-pixel-cream">{assignment.title}</p>
                          <p className="text-[11px] text-pixel-gray-400">
                            {assignment.venue} — {assignment.area}
                          </p>
                          <p className="font-mono text-[10px] text-pixel-amber">
                            Shift: {assignment.shiftStart} — {assignment.shiftEnd}
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-[#050914] border border-dashed border-pixel-gray-800 text-center text-pixel-gray-500 font-mono text-[11px]">
                          NO ACTIVE ASSIGNMENT
                        </div>
                      )}

                      <div className="pt-2 border-t border-pixel-gray-800 flex justify-end">
                        <button
                          onClick={() => {
                            setAssignStaffId(vol.id);
                            setAssignStaffModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-pixel-orange-fiery/20 hover:bg-pixel-orange-fiery/30 text-pixel-orange-fiery font-pixel text-[9px] border border-pixel-orange-fiery/40"
                        >
                          ASSIGN SHIFT
                        </button>
                      </div>
                    </div>
                  </PixelCard>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 6: VENUE (Requirement 16) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {currentTab === "venue" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[#07101D] border-2 border-pixel-orange-fiery/40">
              <div>
                <h2 className="font-pixel text-base text-pixel-cream">VENUE READINESS & SECTORS</h2>
                <p className="text-xs text-pixel-gray-400 font-sans mt-0.5">
                  Real-time operational readiness of entrances, halls, courts, medical desks, and transit bays.
                </p>
              </div>
              <PixelButton variant="primary" size="sm" onClick={loadOperationsTelemetry}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                <span>REFRESH SECTORS</span>
              </PixelButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {venueAreas.map((va: any) => (
                <div
                  key={va.id}
                  className="p-4 bg-[#07101D] border-2 border-pixel-gray-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-pixel text-[9px] text-pixel-gray-500 uppercase tracking-wider">
                        {va.category}
                      </span>
                      <h3 className="font-pixel text-xs text-pixel-cream mt-0.5">{va.name}</h3>
                      <p className="text-xs text-pixel-gray-400 font-sans">{va.location}</p>
                    </div>

                    <PixelBadge
                      variant={
                        va.status === "READY"
                          ? "green"
                          : va.status === "ACTIVE"
                          ? "cyan"
                          : va.status === "ATTENTION"
                          ? "amber"
                          : "red"
                      }
                      size="sm"
                    >
                      {va.status}
                    </PixelBadge>
                  </div>

                  <p className="text-xs text-pixel-gray-300 font-sans">{va.notes || "No special notes recorded."}</p>

                  <div className="pt-2 border-t border-pixel-gray-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-pixel-gray-500">In Charge:</span>
                    <span className="text-pixel-cream">{va.inCharge || "Sector Lead"}</span>
                  </div>

                  {/* Status Toggle Dropdown */}
                  <div className="pt-2 border-t border-pixel-gray-800 flex items-center justify-between">
                    <span className="font-pixel text-[9px] text-pixel-gray-400">SET SECTOR STATUS:</span>
                    <select
                      value={va.status}
                      onChange={(e) => handleUpdateVenueStatus(va.id, e.target.value)}
                      className="bg-[#050914] border border-pixel-gray-800 text-pixel-cream px-2 py-1 text-xs focus:outline-none"
                    >
                      <option value="READY">READY</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="ATTENTION">ATTENTION</option>
                      <option value="ISSUE">ISSUE</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 7: ANNOUNCEMENTS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {currentTab === "announcements" && (
          <div className="space-y-6">
            <div className="p-4 bg-[#07101D] border-2 border-pixel-orange-fiery/40">
              <h2 className="font-pixel text-base text-pixel-cream">FIELD OPERATIONAL ANNOUNCEMENTS</h2>
              <p className="text-xs text-pixel-gray-400 font-sans mt-0.5">
                Official circulars and bulletins broadcast by Secretariat and Operations.
              </p>
            </div>

            {announcements.length === 0 ? (
              <div className="p-12 text-center bg-[#07101D] border border-pixel-gray-800">
                <Megaphone className="w-12 h-12 text-pixel-gray-600 mx-auto mb-2" />
                <p className="font-pixel text-xs text-pixel-gray-400">NO ANNOUNCEMENTS PUBLISHED</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((ann: any) => (
                  <PixelCard key={ann.id} headerTitle={ann.title} headerBadge={ann.targetAudience}>
                    <p className="text-xs text-pixel-gray-300 font-sans leading-relaxed whitespace-pre-wrap">
                      {ann.content}
                    </p>
                    <div className="mt-3 pt-3 border-t border-pixel-gray-800 flex justify-between text-[10px] font-mono text-pixel-gray-500">
                      <span>Author: {ann.authorEmail}</span>
                      <span>Published: {new Date(ann.createdAt).toLocaleString("en-IN")}</span>
                    </div>
                  </PixelCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 8: ACTIVITY AUDIT */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {currentTab === "activity" && (
          <div className="space-y-6">
            <div className="p-4 bg-[#07101D] border-2 border-pixel-orange-fiery/40">
              <h2 className="font-pixel text-base text-pixel-cream">TAMPER-EVIDENT AUDIT TRAIL</h2>
              <p className="text-xs text-pixel-gray-400 font-sans mt-0.5">
                Cryptographically tracked lifecycle events across tasks, incidents, and venue deployments.
              </p>
            </div>

            <div className="space-y-2">
              {recentActivity.map((log: any) => (
                <div
                  key={log.id}
                  className="p-3 bg-[#07101D] border-l-4 border-pixel-cyan flex items-start justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <PixelBadge variant="orange" size="sm">
                        {log.action}
                      </PixelBadge>
                      <span className="font-mono text-pixel-gray-400">{log.actorEmail}</span>
                    </div>
                    <p className="text-pixel-gray-300">
                      Resource: <strong className="text-pixel-cream">{log.resourceType}</strong> ({log.resourceId || "N/A"})
                    </p>
                    {log.metadata && (
                      <p className="text-[10px] font-mono text-pixel-gray-500 truncate max-w-xl">
                        Meta: {log.metadata}
                      </p>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-pixel-amber whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 9: PROFILE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {currentTab === "profile" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <PixelCard headerTitle="OPERATIONS CONTROLLER CLEARANCE" headerBadge="FIELD COMMAND" glow>
              <div className="space-y-4 text-xs font-sans">
                <div className="flex items-center gap-4 p-4 bg-[#050914] border border-pixel-gray-800">
                  <div className="w-16 h-16 bg-pixel-orange-fiery/20 border-2 border-pixel-orange-fiery flex items-center justify-center font-pixel text-lg text-pixel-orange-fiery">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : "OP"}
                  </div>
                  <div>
                    <h3 className="font-pixel text-sm text-pixel-cream">{user?.name || "Operations Controller"}</h3>
                    <p className="text-pixel-gray-400 font-mono text-xs mt-0.5">{user?.email || "ops@szwbt2026.edu"}</p>
                    <div className="mt-1.5 flex gap-2">
                      <PixelBadge variant="orange" size="sm">OPERATIONS STAFF</PixelBadge>
                      <PixelBadge variant="cyan" size="sm">KLE TECH ARENA</PixelBadge>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#050914] border border-pixel-gray-800 space-y-2">
                  <h4 className="font-pixel text-[11px] text-pixel-cyan uppercase">AUTHORIZED PRIVILEGES:</h4>
                  <ul className="space-y-1 text-pixel-gray-300 text-xs list-disc list-inside">
                    <li>Create, acknowledge, escalate, and resolve operational incidents</li>
                    <li>Dispatch and update operational task queues</li>
                    <li>Coordinate volunteer roster & venue sector status</li>
                    <li>Inspect live court scoreboards and schedule telemetry</li>
                    <li>Protected against unauthorized finance or user administration mutations</li>
                  </ul>
                </div>
              </div>
            </PixelCard>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: REPORT INCIDENT */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#07101D] border-2 border-pixel-red p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-pixel-red">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-pixel text-xs text-pixel-cream">LOG OPERATIONAL INCIDENT</h3>
              </div>
              <button
                onClick={() => setReportModalOpen(false)}
                className="text-pixel-gray-400 hover:text-pixel-cream text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReportIncident} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                  INCIDENT TITLE:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Court 02 Baseline Tape Lifting"
                  value={incTitle}
                  onChange={(e) => setIncTitle(e.target.value)}
                  className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none focus:border-pixel-red"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                    CATEGORY:
                  </label>
                  <select
                    value={incCategory}
                    onChange={(e) => setIncCategory(e.target.value)}
                    className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                  >
                    <option value="VENUE">VENUE</option>
                    <option value="PARTICIPANT">PARTICIPANT</option>
                    <option value="ACCOMMODATION">ACCOMMODATION</option>
                    <option value="TRANSPORT">TRANSPORT</option>
                    <option value="MATCH">MATCH</option>
                    <option value="EQUIPMENT">EQUIPMENT</option>
                    <option value="SAFETY">SAFETY</option>
                    <option value="TECHNICAL">TECHNICAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                    SEVERITY:
                  </label>
                  <select
                    value={incSeverity}
                    onChange={(e) => setIncSeverity(e.target.value)}
                    className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                  EXACT LOCATION:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Court Block A, Baseline Court 02"
                  value={incLocation}
                  onChange={(e) => setIncLocation(e.target.value)}
                  className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none focus:border-pixel-red"
                />
              </div>

              <div>
                <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                  DESCRIPTION / FIELD SITUATION:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the operational disruption and any required response teams..."
                  value={incDesc}
                  onChange={(e) => setIncDesc(e.target.value)}
                  className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none focus:border-pixel-red"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-pixel-gray-800">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-3 py-1.5 bg-[#050914] border border-pixel-gray-700 text-pixel-gray-400 hover:text-pixel-cream font-pixel text-[10px]"
                >
                  CANCEL
                </button>
                <PixelButton variant="primary" size="sm" disabled={submittingIncident}>
                  {submittingIncident ? "LOGGING..." : "DISPATCH INCIDENT"}
                </PixelButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: CREATE TASK */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {createTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#07101D] border-2 border-pixel-orange-fiery p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-pixel-orange-fiery">
                <PlusCircle className="w-5 h-5" />
                <h3 className="font-pixel text-xs text-pixel-cream">CREATE OPERATIONAL TASK</h3>
              </div>
              <button
                onClick={() => setCreateTaskModalOpen(false)}
                className="text-pixel-gray-400 hover:text-pixel-cream text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                  TASK TITLE:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Verify Court 01 Net Height & Tension"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none focus:border-pixel-orange-fiery"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                    CATEGORY:
                  </label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                  >
                    <option value="VENUE">VENUE</option>
                    <option value="COURT">COURT</option>
                    <option value="EQUIPMENT">EQUIPMENT</option>
                    <option value="PARTICIPANT">PARTICIPANT</option>
                    <option value="TRANSPORT">TRANSPORT</option>
                    <option value="CROWD">CROWD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                    PRIORITY:
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                  >
                    <option value="URGENT">URGENT</option>
                    <option value="HIGH">HIGH</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                    LOCATION:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Court Block A"
                    value={taskLocation}
                    onChange={(e) => setTaskLocation(e.target.value)}
                    className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                    DUE TIME:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 11:30 IST"
                    value={taskDueTime}
                    onChange={(e) => setTaskDueTime(e.target.value)}
                    className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                  INSTRUCTIONS:
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide precise step-by-step instructions for volunteer/staff..."
                  value={taskInstructions}
                  onChange={(e) => setTaskInstructions(e.target.value)}
                  className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-pixel-gray-800">
                <button
                  type="button"
                  onClick={() => setCreateTaskModalOpen(false)}
                  className="px-3 py-1.5 bg-[#050914] border border-pixel-gray-700 text-pixel-gray-400 hover:text-pixel-cream font-pixel text-[10px]"
                >
                  CANCEL
                </button>
                <PixelButton variant="primary" size="sm" disabled={submittingTask}>
                  {submittingTask ? "DISPATCHING..." : "CREATE & QUEUE"}
                </PixelButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: ASSIGN STAFF */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {assignStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#07101D] border-2 border-pixel-cyan p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-pixel-cyan">
                <Users className="w-5 h-5" />
                <h3 className="font-pixel text-xs text-pixel-cream">DEPLOY STAFF / VOLUNTEER</h3>
              </div>
              <button
                onClick={() => setAssignStaffModalOpen(false)}
                className="text-pixel-gray-400 hover:text-pixel-cream text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignStaff} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                  SELECT VOLUNTEER / STAFF:
                </label>
                <select
                  required
                  value={assignStaffId}
                  onChange={(e) => setAssignStaffId(e.target.value)}
                  className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                >
                  <option value="">-- Select Personnel --</option>
                  {volunteers.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.badge || "VOLUNTEER"}) - {v.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                  ASSIGNMENT TITLE:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Court Block A Operations Assistant"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                    VENUE:
                  </label>
                  <input
                    type="text"
                    required
                    value={assignVenue}
                    onChange={(e) => setAssignVenue(e.target.value)}
                    className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                    AREA / SECTOR:
                  </label>
                  <input
                    type="text"
                    required
                    value={assignArea}
                    onChange={(e) => setAssignArea(e.target.value)}
                    className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                    SHIFT START:
                  </label>
                  <input
                    type="text"
                    required
                    value={assignShiftStart}
                    onChange={(e) => setAssignShiftStart(e.target.value)}
                    className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                    SHIFT END:
                  </label>
                  <input
                    type="text"
                    required
                    value={assignShiftEnd}
                    onChange={(e) => setAssignShiftEnd(e.target.value)}
                    className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                  SUPERVISOR IN CHARGE:
                </label>
                <input
                  type="text"
                  value={assignSupervisor}
                  onChange={(e) => setAssignSupervisor(e.target.value)}
                  className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-pixel-gray-800">
                <button
                  type="button"
                  onClick={() => setAssignStaffModalOpen(false)}
                  className="px-3 py-1.5 bg-[#050914] border border-pixel-gray-700 text-pixel-gray-400 hover:text-pixel-cream font-pixel text-[10px]"
                >
                  CANCEL
                </button>
                <PixelButton variant="primary" size="sm" disabled={submittingAssignment}>
                  {submittingAssignment ? "DEPLOYING..." : "DISPATCH DEPLOYMENT"}
                </PixelButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 4: INCIDENT DETAIL WORKSPACE */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-[#07101D] border-2 border-pixel-orange-fiery p-6 shadow-2xl relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-3 mb-4">
              <div>
                <span className="font-pixel text-[10px] text-pixel-cyan uppercase">
                  INCIDENT WORKSPACE // {selectedIncident.id.slice(-6)}
                </span>
                <h3 className="font-bold text-sm text-pixel-cream">{selectedIncident.title}</h3>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-pixel-gray-400 hover:text-pixel-cream text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="flex flex-wrap gap-2">
                <PixelBadge variant={selectedIncident.severity === "CRITICAL" ? "red" : "orange"} size="sm">
                  {selectedIncident.severity}
                </PixelBadge>
                <PixelBadge variant="gray" size="sm">{selectedIncident.category}</PixelBadge>
                <PixelBadge variant="cyan" size="sm">{selectedIncident.status}</PixelBadge>
              </div>

              <div className="p-3 bg-[#050914] border border-pixel-gray-800 space-y-1">
                <p className="font-bold text-pixel-cream">Description:</p>
                <p className="text-pixel-gray-300 leading-relaxed">{selectedIncident.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-[#050914] border border-pixel-gray-800 text-[11px] font-mono">
                <div>
                  <span className="text-pixel-gray-500">Location:</span>
                  <p className="text-pixel-cream">{selectedIncident.location}</p>
                </div>
                <div>
                  <span className="text-pixel-gray-500">Reported Time:</span>
                  <p className="text-pixel-cream">{new Date(selectedIncident.createdAt).toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <span className="text-pixel-gray-500">Reporter:</span>
                  <p className="text-pixel-cream">{selectedIncident.reporterEmail || selectedIncident.user?.name}</p>
                </div>
                <div>
                  <span className="text-pixel-gray-500">Assigned Responder:</span>
                  <p className="text-pixel-cyan">{selectedIncident.assignedResponder || "None"}</p>
                </div>
              </div>

              {selectedIncident.escalatedTo && (
                <div className="p-2.5 bg-pixel-red/10 border border-pixel-red/30 text-pixel-red text-xs">
                  <strong>ESCALATED TO:</strong> {selectedIncident.escalatedTo}
                </div>
              )}

              {selectedIncident.resolutionNotes && (
                <div className="p-2.5 bg-pixel-green/10 border border-pixel-green/30 text-pixel-green text-xs">
                  <strong>RESOLUTION NOTES:</strong> {selectedIncident.resolutionNotes}
                </div>
              )}

              {/* Action Controls */}
              <div className="pt-3 border-t border-pixel-gray-800 flex flex-wrap gap-2 justify-end">
                {selectedIncident.status === "OPEN" && (
                  <button
                    onClick={() => handleUpdateIncidentStatus(selectedIncident.id, "ACKNOWLEDGED")}
                    className="px-3 py-1.5 bg-pixel-amber/20 hover:bg-pixel-amber/30 text-pixel-amber font-pixel text-[10px] border border-pixel-amber/40"
                  >
                    ACKNOWLEDGE
                  </button>
                )}

                {selectedIncident.status !== "IN_PROGRESS" && selectedIncident.status !== "RESOLVED" && (
                  <button
                    onClick={() =>
                      handleUpdateIncidentStatus(
                        selectedIncident.id,
                        "IN_PROGRESS",
                        user?.name || "Operations Controller"
                      )
                    }
                    className="px-3 py-1.5 bg-pixel-orange-fiery/20 hover:bg-pixel-orange-fiery/30 text-pixel-orange-fiery font-pixel text-[10px] border border-pixel-orange-fiery/40"
                  >
                    ASSIGN TO ME
                  </button>
                )}

                {selectedIncident.status !== "RESOLVED" && (
                  <button
                    onClick={() =>
                      handleUpdateIncidentStatus(
                        selectedIncident.id,
                        "RESOLVED",
                        user?.name || "Operations Controller",
                        undefined,
                        "Resolved by on-site operations team."
                      )
                    }
                    className="px-3 py-1.5 bg-pixel-green/20 hover:bg-pixel-green/30 text-pixel-green font-pixel text-[10px] border border-pixel-green/40"
                  >
                    RESOLVE INCIDENT
                  </button>
                )}

                <button
                  onClick={() => setSelectedIncident(null)}
                  className="px-3 py-1.5 bg-[#050914] border border-pixel-gray-700 text-pixel-gray-400 hover:text-pixel-cream font-pixel text-[10px]"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 5: TASK DETAIL WORKSPACE */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#07101D] border-2 border-pixel-cyan p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-3 mb-4">
              <div>
                <span className="font-pixel text-[10px] text-pixel-cyan uppercase">
                  TASK SPECIFICATION // {selectedTask.id.slice(-6)}
                </span>
                <h3 className="font-bold text-sm text-pixel-cream">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-pixel-gray-400 hover:text-pixel-cream text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="flex gap-2">
                <PixelBadge variant={selectedTask.priority === "URGENT" ? "red" : "orange"} size="sm">
                  {selectedTask.priority}
                </PixelBadge>
                <PixelBadge variant="cyan" size="sm">{selectedTask.category}</PixelBadge>
                <PixelBadge variant={selectedTask.status === "COMPLETED" ? "green" : "gray"} size="sm">
                  {selectedTask.status}
                </PixelBadge>
              </div>

              <div className="p-3 bg-[#050914] border border-pixel-gray-800 space-y-1">
                <p className="font-bold text-pixel-cream">Description:</p>
                <p className="text-pixel-gray-300">{selectedTask.description || "Field task."}</p>
              </div>

              {selectedTask.instructions && (
                <div className="p-3 bg-[#0A1628] border border-pixel-cyan/40 text-[11px] text-pixel-cream">
                  <strong className="text-pixel-cyan">Operational Instructions:</strong>
                  <p className="mt-1 text-pixel-gray-300">{selectedTask.instructions}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 p-3 bg-[#050914] border border-pixel-gray-800 text-[11px] font-mono">
                <div>
                  <span className="text-pixel-gray-500">Location:</span>
                  <p className="text-pixel-cream">{selectedTask.location}</p>
                </div>
                <div>
                  <span className="text-pixel-gray-500">Due Time:</span>
                  <p className="text-pixel-amber">{selectedTask.dueTime}</p>
                </div>
                <div>
                  <span className="text-pixel-gray-500">Assignee:</span>
                  <p className="text-pixel-cream">{selectedTask.assignedStaffName || selectedTask.user?.name || "Staff"}</p>
                </div>
                <div>
                  <span className="text-pixel-gray-500">Supervisor:</span>
                  <p className="text-pixel-cream">{selectedTask.supervisor || "Venue Director"}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-pixel-gray-800 flex justify-end gap-2">
                {selectedTask.status !== "COMPLETED" && (
                  <button
                    onClick={() => handleUpdateTaskStatus(selectedTask.id, "COMPLETED")}
                    className="px-3 py-1.5 bg-pixel-green/20 hover:bg-pixel-green/30 text-pixel-green font-pixel text-[10px] border border-pixel-green/40"
                  >
                    MARK COMPLETED
                  </button>
                )}
                <button
                  onClick={() => setSelectedTask(null)}
                  className="px-3 py-1.5 bg-[#050914] border border-pixel-gray-700 text-pixel-gray-400 hover:text-pixel-cream font-pixel text-[10px]"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </OperationsPortalShell>
  );
}

export default function OperationsDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050914] flex items-center justify-center text-pixel-cream font-pixel text-xs">
          INITIALIZING OPERATIONS COMMAND CENTER...
        </div>
      }
    >
      <OperationsCommandCenterContent />
    </Suspense>
  );
}
