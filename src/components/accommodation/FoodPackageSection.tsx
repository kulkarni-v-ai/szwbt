"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Utensils, CheckCircle2, Clock, Calendar, Check, AlertCircle, RefreshCw, History, X } from "lucide-react";

interface FoodPackageItem {
  id: string;
  date: string;
  dayNumber: string;
  name: string;
  components: string;
  status: string;
  assignment: {
    id: string;
    status: string;
    assignedBy: string;
    assignedAt: string;
  } | null;
}

interface FoodPackageSectionProps {
  participantId: string;
  participantName: string;
  institution?: string;
  roomInfo?: string;
  onPackageAssigned?: () => void;
}

export const FoodPackageSection: React.FC<FoodPackageSectionProps> = ({
  participantId,
  participantName,
  institution,
  roomInfo,
  onPackageAssigned,
}) => {
  const [packages, setPackages] = useState<FoodPackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingPackageId, setSubmittingPackageId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accommodation/food-packages?participantId=${participantId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.packages)) {
          setPackages(data.packages);
        }
      }
    } catch (err) {
      console.error("Failed to load food packages:", err);
    } finally {
      setLoading(false);
    }
  }, [participantId]);

  useEffect(() => {
    if (participantId) {
      fetchPackages();
    }
  }, [participantId, fetchPackages]);

  const handleAssignPackage = async (packageId: string, dayLabel: string) => {
    setSubmittingPackageId(packageId);
    try {
      const res = await fetch("/api/accommodation/food-packages/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          participantId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`✓ DAY PACKAGE ASSIGNED FOR ${dayLabel}`, "success");
        await fetchPackages();
        if (onPackageAssigned) onPackageAssigned();
      } else {
        showToast(data.error || "Failed to assign package", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error", "error");
    } finally {
      setSubmittingPackageId(null);
    }
  };

  const handleAssignToday = async () => {
    // Find unassigned package for today or first unassigned
    const unassigned = packages.find((p) => !p.assignment);
    if (!unassigned) {
      showToast("All daily food packages are already assigned for this participant.", "error");
      return;
    }
    await handleAssignPackage(unassigned.id, unassigned.date);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-2.5 font-pixel text-xs border rounded-lg flex items-center justify-between shadow-xs ${
            toastMessage.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : "bg-rose-50 border-rose-300 text-rose-800"
          }`}
        >
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Module Header Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-center text-[#FF5A16]">
            <Utensils className="w-4 h-4" />
          </div>
          <div>
            <div className="font-pixel text-[9px] text-[#FF5A16] uppercase tracking-widest font-bold">
              CHAMPIONSHIP CATERING & MEAL ACCREDITATION
            </div>
            <h3 className="font-pixel text-sm text-slate-900 font-bold">
              DAILY FOOD PACKAGE ASSIGNMENT
            </h3>
            {roomInfo && (
              <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                Accommodated in: <span className="text-slate-800 font-semibold">{roomInfo}</span>
              </div>
            )}
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleAssignToday}
            className="flex-1 sm:flex-none px-3.5 py-1.5 bg-[#FF5A16] hover:bg-[#e04808] text-white rounded-lg font-pixel text-[10px] font-bold tracking-wider cursor-pointer shadow-xs transition-colors"
          >
            [ ASSIGN TODAY&apos;S PACKAGE ]
          </button>
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-pixel text-[10px] flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>[ VIEW FOOD HISTORY ]</span>
          </button>
        </div>
      </div>

      {/* Participant Operational Status Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono">
        <div>
          <span className="text-slate-500 text-[10px] block font-pixel">PARTICIPANT</span>
          <span className="text-slate-900 font-bold text-xs truncate block">{participantName}</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block font-pixel">REGISTRATION</span>
          <span className="text-emerald-600 font-pixel text-[10px] font-bold">✓ COMPLETED</span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-slate-500 text-[10px] block font-pixel">MEAL STATUS</span>
          <span className="text-orange-600 font-pixel text-[10px] font-bold">
            {packages.filter((p) => p.assignment).length} / {packages.length} DAYS ASSIGNED
          </span>
        </div>
      </div>

      {/* Daily Packages Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 font-pixel text-xs animate-pulse">
          LOADING DAILY FOOD PACKAGES...
        </div>
      ) : packages.length === 0 ? (
        <div className="p-6 text-center text-slate-500 font-pixel text-xs border border-dashed border-slate-300 rounded-xl">
          NO TOURNAMENT FOOD PACKAGES CONFIGURED
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {packages.map((pkg) => {
            const isAssigned = !!pkg.assignment;
            const isSubmitting = submittingPackageId === pkg.id;

            return (
              <div
                key={pkg.id}
                className={`p-3.5 border-2 rounded-xl flex flex-col justify-between space-y-3 transition-colors ${
                  isAssigned
                    ? "bg-emerald-50/30 border-emerald-300 shadow-xs"
                    : "bg-white border-slate-200 hover:border-orange-400 shadow-xs"
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5 font-pixel text-xs text-slate-900 font-bold">
                    <Calendar className="w-3.5 h-3.5 text-[#FF5A16]" />
                    <span>{pkg.date}</span>
                  </div>
                  <span
                    className={`font-pixel text-[8px] px-2 py-0.5 rounded border ${
                      isAssigned
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {isAssigned ? "✓ ASSIGNED" : "NOT ASSIGNED"}
                  </span>
                </div>

                {/* Package Unit Title */}
                <div>
                  <div className="font-pixel text-[11px] text-slate-900 font-bold">
                    DAILY FOOD PACKAGE
                  </div>
                  <div className="font-sans text-[10px] text-slate-500 mt-0.5">
                    {pkg.name}
                  </div>
                </div>

                {/* Bundled Package Components Checklist */}
                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-sans text-xs">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Check className="w-3.5 h-3.5" />
                    <span className="text-slate-800 text-[11px]">Breakfast</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Check className="w-3.5 h-3.5" />
                    <span className="text-slate-800 text-[11px]">Lunch</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Check className="w-3.5 h-3.5" />
                    <span className="text-slate-800 text-[11px]">Snacks</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Check className="w-3.5 h-3.5" />
                    <span className="text-slate-800 text-[11px]">Dinner</span>
                  </div>
                </div>

                {/* Assignment Control */}
                <div>
                  {isAssigned ? (
                    <div className="text-center p-2 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg font-pixel text-[9px] flex items-center justify-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>✓ DAY PACKAGE ASSIGNED</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleAssignPackage(pkg.id, pkg.date)}
                      className="w-full py-2 bg-[#FF5A16] hover:bg-[#e04808] disabled:opacity-50 text-white rounded-lg font-pixel text-[10px] font-bold tracking-wider cursor-pointer shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {isSubmitting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Utensils className="w-3.5 h-3.5" />
                      )}
                      <span>[ ASSIGN PACKAGE ]</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white border-2 border-orange-500 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-[#FF5A16] font-pixel text-xs font-bold">
                <History className="w-4 h-4" />
                <span>FOOD PACKAGE AUDIT HISTORY</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto font-mono text-xs">
              {packages.filter((p) => p.assignment).length === 0 ? (
                <div className="text-center py-6 text-slate-400">No food packages assigned yet.</div>
              ) : (
                packages
                  .filter((p) => p.assignment)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{p.date} — {p.name}</div>
                        <div className="text-[10px] text-slate-500">
                          Assigned by: <span className="text-[#FF5A16] font-semibold">{p.assignment?.assignedBy}</span>
                        </div>
                      </div>
                      <div className="text-right text-[10px]">
                        <span className="text-emerald-600 font-bold block">ACTIVE</span>
                        <span className="text-slate-500">
                          {p.assignment?.assignedAt ? new Date(p.assignment.assignedAt).toLocaleTimeString() : ""}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="text-right pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-pixel text-xs cursor-pointer transition-colors"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
