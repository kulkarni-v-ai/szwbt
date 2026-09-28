"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Layers,
  CheckSquare,
  Calendar,
  AlertTriangle,
  Megaphone,
  User,
  Clock,
  MapPin,
  LifeBuoy,
  PlusCircle,
  Play,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RefreshCw,
  Send,
  Radio,
  FileText,
  Phone,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { VolunteerPortalShell } from "@/components/volunteer/VolunteerPortalShell";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { useAuth } from "@/lib/rbac/useAuth";

function VolunteerDashboardContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const [currentTab, setCurrentTab] = useState<string>(initialTab);

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
  const [reportIssueModalOpen, setReportIssueModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Issue Form state
  const [issueCategory, setIssueCategory] = useState("VENUE");
  const [issuePriority, setIssuePriority] = useState("NORMAL");
  const [issueLocation, setIssueLocation] = useState("");
  const [issueDesc, setIssueDesc] = useState("");
  const [submittingIssue, setSubmittingIssue] = useState(false);

  // Help Request Form state
  const [helpDestination, setHelpDestination] = useState("Operations");
  const [helpMessage, setHelpMessage] = useState("");
  const [helpLocation, setHelpLocation] = useState("");
  const [submittingHelp, setSubmittingHelp] = useState(false);

  // Shift action state
  const [mutatingShift, setMutatingShift] = useState(false);

  // Task Filter state
  const [taskFilterStatus, setTaskFilterStatus] = useState("ALL");

  // Fetch volunteer overview
  const loadVolunteerData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/volunteer");
      if (res.status === 401 || res.status === 403) {
        setError(
          res.status === 403
            ? "403 Forbidden: Only authorized Tournament Volunteers or Super Administrators can access the volunteer portal."
            : "Authentication required. Please sign in."
        );
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setOverviewData(data);
      } else {
        setError(data.error || "Failed to load volunteer telemetry.");
      }
    } catch (err: any) {
      setError("Network or volunteer server interruption: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVolunteerData();
  }, []);

  // Handle Shift action
  const handleShiftAction = async (action: "START_SHIFT" | "END_SHIFT" | "BREAK" | "RESUME") => {
    try {
      setMutatingShift(true);
      const res = await fetch("/api/volunteer/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        loadVolunteerData();
      } else {
        alert("Shift error: " + data.error);
      }
    } catch (err: any) {
      alert("Shift action failed: " + err.message);
    } finally {
      setMutatingShift(false);
    }
  };

  // Handle Task status update
  const handleUpdateTask = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/volunteer/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        if (selectedTask && selectedTask.id === taskId) {
          setSelectedTask(data.task);
        }
        loadVolunteerData();
      } else {
        alert("Task update failed: " + data.error);
      }
    } catch (err: any) {
      alert("Task update failed: " + err.message);
    }
  };

  // Handle Issue report submit
  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueLocation || !issueDesc) return;
    try {
      setSubmittingIssue(true);
      const res = await fetch("/api/volunteer/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: issueCategory,
          priority: issuePriority,
          location: issueLocation,
          description: issueDesc,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReportIssueModalOpen(false);
        setIssueLocation("");
        setIssueDesc("");
        loadVolunteerData();
      } else {
        alert("Issue reporting error: " + data.error);
      }
    } catch (err: any) {
      alert("Submission error: " + err.message);
    } finally {
      setSubmittingIssue(false);
    }
  };

  // Handle Help Request submit
  const handleRequestHelp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!helpMessage) return;
    try {
      setSubmittingHelp(true);
      const res = await fetch("/api/volunteer/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: helpDestination,
          message: helpMessage,
          location: helpLocation || overviewData?.volunteer?.assignedArea || "Field Venue",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHelpModalOpen(false);
        setHelpMessage("");
        setHelpLocation("");
        loadVolunteerData();
        alert(data.message);
      } else {
        alert("Help request failed: " + data.error);
      }
    } catch (err: any) {
      alert("Dispatch failed: " + err.message);
    } finally {
      setSubmittingHelp(false);
    }
  };

  // Loading State
  if (loading && !overviewData) {
    return (
      <VolunteerPortalShell
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        shiftStatus="NOT_STARTED"
        activeTasksCount={0}
        openIssuesCount={0}
      >
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <div className="w-12 h-12 border-4 border-pixel-orange-fiery border-t-transparent animate-spin rounded-none" />
          <p className="font-pixel text-xs text-pixel-orange-fiery animate-pulse">
            LOADING FIELD VOLUNTEER WORKSPACE...
          </p>
        </div>
      </VolunteerPortalShell>
    );
  }

  // Error State
  if (error && !overviewData) {
    return (
      <VolunteerPortalShell
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        shiftStatus="NOT_STARTED"
        activeTasksCount={0}
        openIssuesCount={0}
      >
        <div className="max-w-xl mx-auto p-6 bg-[#07101D] border-2 border-pixel-red text-center space-y-4 shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-pixel-red mx-auto animate-bounce" />
          <h2 className="font-pixel text-base text-pixel-red">OPS SIGNAL LOST</h2>
          <p className="text-xs text-pixel-gray-300 font-sans leading-relaxed">{error}</p>
          <PixelButton variant="primary" size="md" onClick={loadVolunteerData}>
            RETRY CONNECTION
          </PixelButton>
        </div>
      </VolunteerPortalShell>
    );
  }

  const {
    volunteer = {},
    currentShift = {},
    currentAssignment = null,
    nextAssignment = null,
    kpis = {},
    tasks = [],
    openIssues = [],
    announcements = [],
  } = overviewData || {};

  const shiftStatus = currentShift.status || "NOT_STARTED";
  const isOnShift = shiftStatus === "ON_SHIFT";

  // Filter tasks
  const filteredTasks = tasks.filter((t: any) => {
    if (taskFilterStatus !== "ALL" && t.status !== taskFilterStatus) return false;
    return true;
  });

  return (
    <VolunteerPortalShell
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      shiftStatus={shiftStatus}
      activeTasksCount={kpis.activeTasksCount || 0}
      openIssuesCount={kpis.openIssuesCount || 0}
      assignedArea={volunteer.assignedArea}
      onRefresh={loadVolunteerData}
      onRequestHelp={() => setHelpModalOpen(true)}
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: OVERVIEW */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {currentTab === "overview" && (
          <>
            {/* WHO AM I & GREETING */}
            <div className="p-4 sm:p-5 bg-[#07101D] border-2 border-pixel-orange-fiery/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[10px] text-pixel-cyan tracking-wider">
                    OPERATOR // {volunteer.volunteerCode || "VLT-2026-FIELD"}
                  </span>
                  <span className="text-[10px] font-mono text-pixel-gray-400">
                    [{volunteer.badge || "MOBILE FIELD"}]
                  </span>
                </div>
                <h1 className="font-pixel text-base sm:text-xl text-pixel-cream tracking-wide mt-1">
                  WELCOME, {volunteer.name || "ARENA FIELD VOLUNTEER"}
                </h1>
                <p className="text-xs text-pixel-gray-400 font-sans mt-0.5">
                  Assigned Sector: <strong className="text-pixel-cream">{volunteer.assignedArea}</strong>
                </p>
              </div>

              {/* Quick Shift State pill */}
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    isOnShift ? "bg-pixel-green animate-pulse" : "bg-pixel-gray-600"
                  }`}
                />
                <span className="font-pixel text-xs text-pixel-cream uppercase tracking-wider">
                  {shiftStatus.replace("_", " ")}
                </span>
              </div>
            </div>

            {/* SHIFT STATUS CARD & ACTIONS (Requirement 10) */}
            <PixelCard
              headerTitle="MY CURRENT SHIFT STATUS"
              headerBadge={shiftStatus}
              headerBadgeVariant={isOnShift ? "green" : "gray"}
              glow={isOnShift}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-xs text-pixel-cream">
                      {isOnShift ? "ACTIVE ON-SITE DEPLOYMENT" : "OFF-DUTY STANDBY"}
                    </span>
                  </div>
                  <p className="text-xs text-pixel-gray-400 font-sans mt-1">
                    {isOnShift
                      ? `Shift active since: ${new Date(currentShift.startedAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : "Click 'START SHIFT' to begin logging on-ground event operations."}
                  </p>
                </div>

                {/* Shift Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {!isOnShift && shiftStatus !== "COMPLETED" && (
                    <PixelButton
                      variant="primary"
                      size="sm"
                      disabled={mutatingShift}
                      onClick={() => handleShiftAction("START_SHIFT")}
                    >
                      <Play className="w-3.5 h-3.5 mr-1" />
                      <span>START SHIFT</span>
                    </PixelButton>
                  )}

                  {isOnShift && (
                    <>
                      <button
                        onClick={() => handleShiftAction("BREAK")}
                        disabled={mutatingShift}
                        className="px-3 py-1.5 bg-[#050914] border border-pixel-gray-700 hover:border-pixel-amber text-pixel-amber font-pixel text-[10px] tracking-wider transition-colors"
                      >
                        TAKE BREAK
                      </button>

                      <button
                        onClick={() => handleShiftAction("END_SHIFT")}
                        disabled={mutatingShift}
                        className="px-3 py-1.5 bg-pixel-red/20 hover:bg-pixel-red/30 border border-pixel-red/60 text-pixel-red font-pixel text-[10px] tracking-wider transition-colors"
                      >
                        END SHIFT
                      </button>
                    </>
                  )}

                  {shiftStatus === "BREAK" && (
                    <PixelButton
                      variant="primary"
                      size="sm"
                      disabled={mutatingShift}
                      onClick={() => handleShiftAction("RESUME")}
                    >
                      <Play className="w-3.5 h-3.5 mr-1" />
                      <span>RESUME SHIFT</span>
                    </PixelButton>
                  )}
                </div>
              </div>
            </PixelCard>

            {/* CURRENT ASSIGNMENT HERO PANEL (Requirement 9) */}
            <PixelCard
              headerTitle="CURRENT ASSIGNMENT"
              headerBadge={currentAssignment?.status || "STANDBY"}
              headerBadgeVariant={currentAssignment?.status === "ACTIVE" ? "orange" : "cyan"}
              glow={!!currentAssignment}
            >
              {currentAssignment ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <span className="font-pixel text-[10px] text-pixel-cyan uppercase">
                        {currentAssignment.venue}
                      </span>
                      <h2 className="font-pixel text-base sm:text-lg text-pixel-cream mt-0.5">
                        {currentAssignment.title}
                      </h2>
                      <p className="text-xs text-pixel-gray-300 font-sans mt-0.5">
                        Area: <strong className="text-pixel-orange-fiery">{currentAssignment.area}</strong>
                      </p>
                    </div>

                    <div className="p-2.5 bg-[#050914] border border-pixel-gray-800 text-right sm:min-w-[140px]">
                      <span className="text-[10px] font-pixel text-pixel-gray-400">SHIFT TIME</span>
                      <p className="font-mono text-sm text-pixel-amber font-bold">
                        {currentAssignment.shiftStart} — {currentAssignment.shiftEnd}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#050914] border border-pixel-gray-800 text-xs font-sans">
                    <div>
                      <span className="text-pixel-gray-500 font-mono text-[10px]">REPORTING POINT:</span>
                      <p className="text-pixel-cream font-bold mt-0.5">{currentAssignment.reportingPoint}</p>
                    </div>
                    <div>
                      <span className="text-pixel-gray-500 font-mono text-[10px]">SUPERVISOR:</span>
                      <p className="text-pixel-cyan font-bold mt-0.5">
                        {currentAssignment.supervisor}
                        {currentAssignment.supervisorPhone && (
                          <span className="text-pixel-gray-400 font-mono text-[10px] ml-1">
                            ({currentAssignment.supervisorPhone})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {currentAssignment.instructions && (
                    <div className="p-3 bg-[#0A1628] border-l-2 border-pixel-orange-fiery text-xs font-sans">
                      <strong className="text-pixel-orange-fiery font-pixel text-[10px] block mb-1">
                        OPERATIONAL INSTRUCTIONS:
                      </strong>
                      <p className="text-pixel-gray-300 leading-relaxed">
                        {currentAssignment.instructions}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-[#050914] border border-dashed border-pixel-gray-800">
                  <p className="font-pixel text-xs text-pixel-cream">NO ACTIVE ASSIGNMENT</p>
                  <p className="text-xs text-pixel-gray-400 mt-1">
                    You currently have no active operational assignment. Check upcoming assignments or report to Desk 02.
                  </p>
                </div>
              )}
            </PixelCard>

            {/* KPI / STATUS CARDS (Requirement 11) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#07101D] border border-pixel-gray-800 flex flex-col justify-between">
                <span className="font-pixel text-[9px] text-pixel-gray-400">ACTIVE TASKS</span>
                <p className="font-pixel text-xl text-pixel-cyan my-1">
                  {kpis.activeTasksCount || 0}
                </p>
                <span className="text-[10px] font-mono text-pixel-gray-500">Assigned queue</span>
              </div>

              <div className="p-3 bg-[#07101D] border border-pixel-gray-800 flex flex-col justify-between">
                <span className="font-pixel text-[9px] text-pixel-gray-400">COMPLETED</span>
                <p className="font-pixel text-xl text-pixel-green my-1">
                  {kpis.completedTasksCount || 0}
                </p>
                <span className="text-[10px] font-mono text-pixel-gray-500">Tasks finished</span>
              </div>

              <div className="p-3 bg-[#07101D] border border-pixel-gray-800 flex flex-col justify-between">
                <span className="font-pixel text-[9px] text-pixel-gray-400">OPEN ISSUES</span>
                <p className="font-pixel text-xl text-pixel-amber my-1">
                  {kpis.openIssuesCount || 0}
                </p>
                <span className="text-[10px] font-mono text-pixel-gray-500">Reported by you</span>
              </div>

              <div className="p-3 bg-[#07101D] border border-pixel-gray-800 flex flex-col justify-between">
                <span className="font-pixel text-[9px] text-pixel-gray-400">NEXT SHIFT</span>
                <p className="font-pixel text-xs text-pixel-cream my-1 truncate">
                  {kpis.nextAssignmentTitle || "—"}
                </p>
                <span className="text-[10px] font-mono text-pixel-gray-500">Upcoming roster</span>
              </div>
            </div>

            {/* TODAY'S TASKS PREVIEW */}
            <PixelCard
              headerTitle={`TODAY'S TASKS (${tasks.length})`}
              headerBadge="PRIORITY QUEUE"
              headerBadgeVariant="orange"
            >
              {tasks.length === 0 ? (
                <div className="p-8 text-center bg-[#050914] border border-pixel-gray-800">
                  <CheckCircle2 className="w-10 h-10 text-pixel-cyan mx-auto mb-2 opacity-80" />
                  <p className="font-pixel text-xs text-pixel-cyan">TASK QUEUE CLEAR</p>
                  <p className="text-xs text-pixel-gray-400 mt-1">No tasks are currently assigned to you.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {tasks.slice(0, 4).map((task: any) => (
                    <div
                      key={task.id}
                      className="p-3 bg-[#050914] border border-pixel-gray-800 hover:border-pixel-orange-fiery/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="flex-1 min-w-0">
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
                          <span className="font-pixel text-[10px] text-pixel-gray-400 uppercase">
                            {task.category}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-pixel-cream mt-1 truncate">
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-pixel-gray-400 mt-0.5">
                          <span>Loc: {task.location}</span>
                          <span className="text-pixel-amber">Due: {task.dueTime}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <PixelBadge
                          variant={
                            task.status === "COMPLETED"
                              ? "green"
                              : task.status === "IN_PROGRESS"
                              ? "orange"
                              : "gray"
                          }
                          size="sm"
                        >
                          {task.status}
                        </PixelBadge>

                        {task.status === "ASSIGNED" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateTask(task.id, "IN_PROGRESS");
                            }}
                            className="px-2 py-1 bg-pixel-orange-fiery/20 hover:bg-pixel-orange-fiery/30 text-pixel-orange-fiery font-pixel text-[9px] border border-pixel-orange-fiery/40"
                          >
                            START
                          </button>
                        )}

                        {task.status === "IN_PROGRESS" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateTask(task.id, "COMPLETED");
                            }}
                            className="px-2 py-1 bg-pixel-green/20 hover:bg-pixel-green/30 text-pixel-green font-pixel text-[9px] border border-pixel-green/40"
                          >
                            COMPLETE
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-pixel-gray-800 flex justify-between items-center text-xs">
                <span className="text-[10px] font-mono text-pixel-gray-500">
                  Showing {Math.min(tasks.length, 4)} of {tasks.length} tasks
                </span>
                <button
                  onClick={() => setCurrentTab("tasks")}
                  className="font-pixel text-[10px] text-pixel-cyan hover:underline flex items-center gap-1"
                >
                  <span>VIEW ALL TASKS</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </PixelCard>

            {/* QUICK ACTIONS ROW (Touch Friendly) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => setReportIssueModalOpen(true)}
                className="p-3 bg-pixel-amber/20 hover:bg-pixel-amber/30 border border-pixel-amber/60 text-pixel-amber font-pixel text-[10px] flex flex-col items-center justify-center gap-1 transition-all"
              >
                <AlertTriangle className="w-5 h-5" />
                <span>REPORT ISSUE</span>
              </button>

              <button
                onClick={() => setHelpModalOpen(true)}
                className="p-3 bg-pixel-red/20 hover:bg-pixel-red/30 border border-pixel-red/60 text-pixel-red font-pixel text-[10px] flex flex-col items-center justify-center gap-1 transition-all"
              >
                <LifeBuoy className="w-5 h-5" />
                <span>REQUEST HELP</span>
              </button>

              <button
                onClick={() => setCurrentTab("assignments")}
                className="p-3 bg-[#0A1628] hover:bg-[#102038] border border-pixel-gray-700 text-pixel-cream font-pixel text-[10px] flex flex-col items-center justify-center gap-1 transition-all"
              >
                <Calendar className="w-5 h-5 text-pixel-cyan" />
                <span>MY SHIFTS</span>
              </button>

              <button
                onClick={() => setCurrentTab("notifications")}
                className="p-3 bg-[#0A1628] hover:bg-[#102038] border border-pixel-gray-700 text-pixel-cream font-pixel text-[10px] flex flex-col items-center justify-center gap-1 transition-all"
              >
                <Megaphone className="w-5 h-5 text-pixel-orange-fiery" />
                <span>BULLETINS</span>
              </button>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: TASKS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {currentTab === "tasks" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[#07101D] border-2 border-pixel-orange-fiery/40">
              <div>
                <h2 className="font-pixel text-base text-pixel-cream">VOLUNTEER TASK QUEUE</h2>
                <p className="text-xs text-pixel-gray-400 font-sans mt-0.5">
                  Complete operational responsibilities assigned to you by field supervisors.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={taskFilterStatus}
                  onChange={(e) => setTaskFilterStatus(e.target.value)}
                  className="bg-[#050914] border border-pixel-gray-800 text-pixel-cream px-2.5 py-1 text-xs focus:outline-none"
                >
                  <option value="ALL">ALL TASKS</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center bg-[#07101D] border border-pixel-gray-800">
                <CheckCircle2 className="w-12 h-12 text-pixel-cyan mx-auto mb-2 opacity-80" />
                <p className="font-pixel text-xs text-pixel-cyan">TASK QUEUE CLEAR</p>
                <p className="text-xs text-pixel-gray-400 mt-1">No tasks matching your selection.</p>
              </div>
            ) : (
              <div className="space-y-3">
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
                            : "gray"
                        }
                        size="sm"
                      >
                        {task.status}
                      </PixelBadge>
                    </div>

                    <p className="text-xs text-pixel-gray-300 font-sans">{task.description}</p>

                    {task.instructions && (
                      <div className="p-2.5 bg-[#050914] border border-pixel-gray-800 text-[11px] text-pixel-gray-300">
                        <strong className="text-pixel-cyan">Instructions:</strong> {task.instructions}
                      </div>
                    )}

                    <div className="pt-2 border-t border-pixel-gray-800 flex items-center justify-between text-xs font-mono">
                      <span className="text-pixel-gray-400">Location: {task.location}</span>
                      <span className="text-pixel-amber">Due: {task.dueTime}</span>
                    </div>

                    <div className="pt-2 border-t border-pixel-gray-800 flex items-center justify-between">
                      <span className="text-[11px] text-pixel-gray-500 font-mono">
                        Supervisor: {task.supervisor || "Venue Desk"}
                      </span>

                      <div className="flex gap-2">
                        {task.status === "ASSIGNED" && (
                          <button
                            onClick={() => handleUpdateTask(task.id, "IN_PROGRESS")}
                            className="px-2.5 py-1 bg-pixel-orange-fiery/20 hover:bg-pixel-orange-fiery/30 text-pixel-orange-fiery font-pixel text-[10px] border border-pixel-orange-fiery/40"
                          >
                            START TASK
                          </button>
                        )}
                        {task.status === "IN_PROGRESS" && (
                          <button
                            onClick={() => handleUpdateTask(task.id, "COMPLETED")}
                            className="px-2.5 py-1 bg-pixel-green/20 hover:bg-pixel-green/30 text-pixel-green font-pixel text-[10px] border border-pixel-green/40"
                          >
                            MARK COMPLETED
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedTask(task)}
                          className="px-2.5 py-1 bg-[#050914] hover:bg-[#0A1628] text-pixel-cyan font-pixel text-[10px] border border-pixel-gray-700"
                        >
                          SPEC
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
        {/* TAB 3: ASSIGNMENTS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {currentTab === "assignments" && (
          <div className="space-y-6">
            <div className="p-4 bg-[#07101D] border-2 border-pixel-orange-fiery/40">
              <h2 className="font-pixel text-base text-pixel-cream">DEPLOYMENT ROSTER</h2>
              <p className="text-xs text-pixel-gray-400 font-sans mt-0.5">
                Your assigned field stations and reporting supervisors.
              </p>
            </div>

            {currentAssignment ? (
              <PixelCard headerTitle="ACTIVE DEPLOYMENT" headerBadge="CURRENT" glow>
                <div className="space-y-3 text-xs font-sans">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-pixel text-sm text-pixel-cream">{currentAssignment.title}</h3>
                      <p className="text-pixel-orange-fiery font-mono mt-0.5">{currentAssignment.venue} — {currentAssignment.area}</p>
                    </div>
                    <PixelBadge variant="orange" size="sm">ACTIVE</PixelBadge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-[#050914] border border-pixel-gray-800 font-mono text-[11px]">
                    <div>
                      <span className="text-pixel-gray-500">SHIFT:</span>
                      <p className="text-pixel-cream">{currentAssignment.shiftStart} — {currentAssignment.shiftEnd}</p>
                    </div>
                    <div>
                      <span className="text-pixel-gray-500">REPORTING POINT:</span>
                      <p className="text-pixel-cream">{currentAssignment.reportingPoint}</p>
                    </div>
                    <div>
                      <span className="text-pixel-gray-500">SUPERVISOR:</span>
                      <p className="text-pixel-cyan">{currentAssignment.supervisor}</p>
                    </div>
                    <div>
                      <span className="text-pixel-gray-500">CONTACT:</span>
                      <p className="text-pixel-cream">{currentAssignment.supervisorPhone || "Venue Radio Desk"}</p>
                    </div>
                  </div>

                  <p className="text-pixel-gray-300 leading-relaxed">{currentAssignment.instructions}</p>
                </div>
              </PixelCard>
            ) : null}

            {nextAssignment && (
              <PixelCard headerTitle="UPCOMING DEPLOYMENT" headerBadge="SCHEDULED">
                <div className="space-y-3 text-xs font-sans">
                  <h3 className="font-pixel text-sm text-pixel-cream">{nextAssignment.title}</h3>
                  <p className="text-pixel-cyan font-mono">{nextAssignment.venue} — {nextAssignment.area}</p>
                  <p className="font-mono text-pixel-amber">
                    Shift: {nextAssignment.shiftStart} — {nextAssignment.shiftEnd}
                  </p>
                  <p className="text-pixel-gray-400">{nextAssignment.instructions}</p>
                </div>
              </PixelCard>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: REPORTED ISSUES */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {currentTab === "issues" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-[#07101D] border-2 border-pixel-orange-fiery/40">
              <div>
                <h2 className="font-pixel text-base text-pixel-cream">MY REPORTED ISSUES</h2>
                <p className="text-xs text-pixel-gray-400 font-sans mt-0.5">
                  Track resolution status of venue problems reported from the field.
                </p>
              </div>

              <PixelButton variant="primary" size="sm" onClick={() => setReportIssueModalOpen(true)}>
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                <span>REPORT ISSUE</span>
              </PixelButton>
            </div>

            {openIssues.length === 0 ? (
              <div className="p-12 text-center bg-[#07101D] border border-pixel-gray-800">
                <CheckCircle2 className="w-12 h-12 text-pixel-green mx-auto mb-2 opacity-80" />
                <p className="font-pixel text-xs text-pixel-green">NO OPEN ISSUES</p>
                <p className="text-xs text-pixel-gray-400 mt-1">
                  Everything assigned to you is currently clear.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {openIssues.map((issue: any) => (
                  <div
                    key={issue.id}
                    className="p-4 bg-[#07101D] border-2 border-pixel-gray-800 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <PixelBadge
                            variant={issue.priority === "URGENT" ? "red" : "amber"}
                            size="sm"
                          >
                            {issue.priority}
                          </PixelBadge>
                          <span className="font-pixel text-[10px] text-pixel-cyan uppercase">
                            {issue.category}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-pixel-cream mt-1">{issue.title}</h4>
                      </div>

                      <PixelBadge
                        variant={
                          issue.status === "RESOLVED"
                            ? "green"
                            : issue.status === "OPEN"
                            ? "red"
                            : "orange"
                        }
                        size="sm"
                      >
                        {issue.status}
                      </PixelBadge>
                    </div>

                    <p className="text-pixel-gray-300 font-sans">{issue.description}</p>

                    <div className="pt-2 border-t border-pixel-gray-800 flex items-center justify-between text-[11px] font-mono text-pixel-gray-400">
                      <span>Loc: {issue.location}</span>
                      <span>Latest: {issue.latestUpdate || "Pending assignment"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 5: NOTIFICATIONS & BULLETINS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {currentTab === "notifications" && (
          <div className="space-y-6">
            <div className="p-4 bg-[#07101D] border-2 border-pixel-orange-fiery/40">
              <h2 className="font-pixel text-base text-pixel-cream">VOLUNTEER NOTIFICATIONS & BULLETINS</h2>
              <p className="text-xs text-pixel-gray-400 font-sans mt-0.5">
                Official circulars and announcements applicable to field operations.
              </p>
            </div>

            {announcements.length === 0 ? (
              <div className="p-12 text-center bg-[#07101D] border border-pixel-gray-800">
                <Megaphone className="w-12 h-12 text-pixel-gray-600 mx-auto mb-2" />
                <p className="font-pixel text-xs text-pixel-gray-400">NO ANNOUNCEMENTS</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((ann: any) => (
                  <PixelCard key={ann.id} headerTitle={ann.title} headerBadge="OFFICIAL">
                    <p className="text-xs text-pixel-gray-300 font-sans leading-relaxed whitespace-pre-wrap">
                      {ann.content}
                    </p>
                    <div className="mt-3 pt-3 border-t border-pixel-gray-800 flex justify-between text-[10px] font-mono text-pixel-gray-500">
                      <span>Broadcast by: {ann.authorEmail}</span>
                      <span>{new Date(ann.createdAt).toLocaleString("en-IN")}</span>
                    </div>
                  </PixelCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB 6: PROFILE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {currentTab === "profile" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <PixelCard headerTitle="VOLUNTEER CREDENTIAL CARD" headerBadge="MOBILE FIELD" glow>
              <div className="space-y-4 text-xs font-sans">
                <div className="flex items-center gap-4 p-4 bg-[#050914] border border-pixel-gray-800">
                  <div className="w-16 h-16 bg-pixel-orange-fiery/20 border-2 border-pixel-orange-fiery flex items-center justify-center font-pixel text-lg text-pixel-orange-fiery">
                    VL
                  </div>
                  <div>
                    <h3 className="font-pixel text-sm text-pixel-cream">{volunteer.name || "Field Volunteer"}</h3>
                    <p className="text-pixel-cyan font-mono text-xs mt-0.5">{volunteer.volunteerCode}</p>
                    <p className="text-pixel-gray-400 text-xs font-mono">{volunteer.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-4 bg-[#050914] border border-pixel-gray-800 font-mono text-xs">
                  <div>
                    <span className="text-pixel-gray-500">ASSIGNED AREA:</span>
                    <p className="text-pixel-cream">{volunteer.assignedArea}</p>
                  </div>
                  <div>
                    <span className="text-pixel-gray-500">SHIFT STATUS:</span>
                    <p className="text-pixel-orange-fiery">{shiftStatus}</p>
                  </div>
                  <div>
                    <span className="text-pixel-gray-500">BADGE:</span>
                    <p className="text-pixel-cream">{volunteer.badge || "MOBILE FIELD"}</p>
                  </div>
                  <div>
                    <span className="text-pixel-gray-500">ROLE:</span>
                    <p className="text-pixel-cream">{volunteer.role || "Volunteer"}</p>
                  </div>
                </div>
              </div>
            </PixelCard>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: REPORT ISSUE */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {reportIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#07101D] border-2 border-pixel-amber p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-pixel-amber">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-pixel text-xs text-pixel-cream">REPORT OPERATIONAL ISSUE</h3>
              </div>
              <button
                onClick={() => setReportIssueModalOpen(false)}
                className="text-pixel-gray-400 hover:text-pixel-cream text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReportIssue} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                    ISSUE CATEGORY:
                  </label>
                  <select
                    value={issueCategory}
                    onChange={(e) => setIssueCategory(e.target.value)}
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
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                    PRIORITY:
                  </label>
                  <select
                    value={issuePriority}
                    onChange={(e) => setIssuePriority(e.target.value)}
                    className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                  >
                    <option value="URGENT">URGENT</option>
                    <option value="HIGH">HIGH</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                  LOCATION:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Concourse Gate 01 or Court Block A"
                  value={issueLocation}
                  onChange={(e) => setIssueLocation(e.target.value)}
                  className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                  DESCRIPTION:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the issue and assistance needed..."
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-pixel-gray-800">
                <button
                  type="button"
                  onClick={() => setReportIssueModalOpen(false)}
                  className="px-3 py-1.5 bg-[#050914] border border-pixel-gray-700 text-pixel-gray-400 hover:text-pixel-cream font-pixel text-[10px]"
                >
                  CANCEL
                </button>
                <PixelButton variant="primary" size="sm" disabled={submittingIssue}>
                  {submittingIssue ? "SUBMITTING..." : "SUBMIT REPORT"}
                </PixelButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: REQUEST HELP */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {helpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#07101D] border-2 border-pixel-red p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-pixel-red">
                <LifeBuoy className="w-5 h-5 animate-pulse" />
                <h3 className="font-pixel text-xs text-pixel-cream">OPERATIONAL ESCALATION / REQUEST HELP</h3>
              </div>
              <button
                onClick={() => setHelpModalOpen(false)}
                className="text-pixel-gray-400 hover:text-pixel-cream text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestHelp} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                  ESCALATION DESTINATION:
                </label>
                <select
                  value={helpDestination}
                  onChange={(e) => setHelpDestination(e.target.value)}
                  className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                >
                  <option value="Supervisor">Supervisor (Field Lead)</option>
                  <option value="Operations">Operations Command Desk</option>
                  <option value="Organizer">Organizer Secretariat</option>
                  <option value="Transport">Transport Coordinator</option>
                  <option value="Accommodation">Hostel / Accommodation Desk</option>
                  <option value="Match Operations">Match Operations / Umpire Desk</option>
                  <option value="Medical">Medical Bay / First Aid</option>
                </select>
              </div>

              <div>
                <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                  LOCATION:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Court Block A"
                  value={helpLocation}
                  onChange={(e) => setHelpLocation(e.target.value)}
                  className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-pixel-gray-400 mb-1 font-pixel text-[10px]">
                  NATURE OF EMERGENCY / ASSISTANCE:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="State the immediate problem requiring assistance..."
                  value={helpMessage}
                  onChange={(e) => setHelpMessage(e.target.value)}
                  className="w-full p-2 bg-[#050914] border border-pixel-gray-800 text-pixel-cream text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-pixel-gray-800">
                <button
                  type="button"
                  onClick={() => setHelpModalOpen(false)}
                  className="px-3 py-1.5 bg-[#050914] border border-pixel-gray-700 text-pixel-gray-400 hover:text-pixel-cream font-pixel text-[10px]"
                >
                  CANCEL
                </button>
                <PixelButton variant="primary" size="sm" disabled={submittingHelp}>
                  {submittingHelp ? "DISPATCHING..." : "DISPATCH SIGNAL"}
                </PixelButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: TASK DETAIL */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#07101D] border-2 border-pixel-cyan p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-pixel-gray-800 pb-3 mb-4">
              <div>
                <span className="font-pixel text-[10px] text-pixel-cyan uppercase">
                  TASK // {selectedTask.id.slice(-6)}
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
                <p className="text-pixel-gray-300">{selectedTask.description}</p>
              </div>

              {selectedTask.instructions && (
                <div className="p-3 bg-[#0A1628] border-l-2 border-pixel-cyan text-xs">
                  <strong className="text-pixel-cyan block mb-1">Operational Instructions:</strong>
                  <p className="text-pixel-gray-300">{selectedTask.instructions}</p>
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
              </div>

              <div className="pt-3 border-t border-pixel-gray-800 flex justify-end gap-2">
                {selectedTask.status === "ASSIGNED" && (
                  <button
                    onClick={() => handleUpdateTask(selectedTask.id, "IN_PROGRESS")}
                    className="px-3 py-1.5 bg-pixel-orange-fiery/20 hover:bg-pixel-orange-fiery/30 text-pixel-orange-fiery font-pixel text-[10px] border border-pixel-orange-fiery/40"
                  >
                    START TASK
                  </button>
                )}
                {selectedTask.status === "IN_PROGRESS" && (
                  <button
                    onClick={() => handleUpdateTask(selectedTask.id, "COMPLETED")}
                    className="px-3 py-1.5 bg-pixel-green/20 hover:bg-pixel-green/30 text-pixel-green font-pixel text-[10px] border border-pixel-green/40"
                  >
                    COMPLETE
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
    </VolunteerPortalShell>
  );
}

export default function VolunteerDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050914] flex items-center justify-center text-pixel-cream font-pixel text-xs">
          INITIALIZING VOLUNTEER OPERATIONS PORTAL...
        </div>
      }
    >
      <VolunteerDashboardContent />
    </Suspense>
  );
}
