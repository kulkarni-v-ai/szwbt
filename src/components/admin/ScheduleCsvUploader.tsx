"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Upload, FileText, CheckCircle2, AlertCircle, RefreshCw,
  Download, Trash2, Calendar, Eye, ArrowRight, Table
} from "lucide-react";
import {
  ScheduleMatch, getStoredSchedule, saveDaySchedule,
  resetDaySchedule, parseScheduleCSV, getSampleCSV
} from "@/data/scheduleStorage";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import Link from "next/link";

export const ScheduleCsvUploader: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState("OCT19");
  const [csvContent, setCsvContent] = useState("");
  const [parsedPreview, setParsedPreview] = useState<ScheduleMatch[]>([]);
  const [scheduleState, setScheduleState] = useState<Record<string, ScheduleMatch[]>>({});
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshState = async () => {
    try {
      const res = await fetch("/api/schedule");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const map: Record<string, ScheduleMatch[]> = {};
          for (const key of Object.keys(json.data)) {
            map[key] = json.data[key].matches || [];
          }
          setScheduleState(map);
          return;
        }
      }
    } catch {
      // fallback
    }
    setScheduleState(getStoredSchedule());
  };

  useEffect(() => {
    refreshState();
    const handleUpdate = () => refreshState();
    window.addEventListener("szwbt_schedule_updated", handleUpdate);
    return () => window.removeEventListener("szwbt_schedule_updated", handleUpdate);
  }, []);

  // When day changes, parse any existing content
  useEffect(() => {
    setSuccessMsg("");
    setErrorMsg("");
    if (csvContent.trim()) {
      const parsed = parseScheduleCSV(csvContent, selectedDay);
      setParsedPreview(parsed);
    } else {
      setParsedPreview([]);
    }
  }, [selectedDay, csvContent]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      const parsed = parseScheduleCSV(text, selectedDay);
      setParsedPreview(parsed);
      setErrorMsg("");
      setSuccessMsg(`File "${file.name}" loaded successfully. Ready to publish to PostgreSQL.`);
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read the uploaded CSV file.");
    };
    reader.readAsText(file);
  };

  const handlePublish = async () => {
    if (!csvContent.trim()) {
      setErrorMsg("Please upload or paste CSV data first.");
      return;
    }

    try {
      const res = await fetch("/api/schedule/upload-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayId: selectedDay, csvContent }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to upload to database.");
        return;
      }
      setSuccessMsg(`Successfully saved and published ${data.count} matches for ${selectedDay} in PostgreSQL! Live on /schedule.`);
      setErrorMsg("");
      // Sync local storage
      const matches = parseScheduleCSV(csvContent, selectedDay);
      saveDaySchedule(selectedDay, matches);
      refreshState();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to communicate with database server.");
    }
  };

  const handleResetToTBA = async () => {
    try {
      const res = await fetch("/api/schedule/reset-tba", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayId: selectedDay }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to reset day in database.");
        return;
      }
      resetDaySchedule(selectedDay);
      setCsvContent("");
      setParsedPreview([]);
      setSuccessMsg(`Reset ${selectedDay} to TBA in PostgreSQL. Public schedule now shows TBA.`);
      setErrorMsg("");
      refreshState();
    } catch {
      setErrorMsg("Failed to reset in database.");
    }
  };

  const handleLoadSample = () => {
    const sample = getSampleCSV(selectedDay);
    setCsvContent(sample);
    const parsed = parseScheduleCSV(sample, selectedDay);
    setParsedPreview(parsed);
    setSuccessMsg(`Loaded sample fixtures for ${selectedDay}. Click "PUBLISH TO LIVE SCHEDULE" to apply.`);
    setErrorMsg("");
  };

  const handleDownloadTemplate = () => {
    const sample = getSampleCSV(selectedDay);
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `szwbt_schedule_${selectedDay.toLowerCase()}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentDayMatches = scheduleState[selectedDay] || [];
  const isDayTBA = currentDayMatches.length === 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs mb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#FF5A16] animate-pulse" />
            <span className="font-pixel text-[9px] text-[#FF5A16] uppercase tracking-wider font-bold">
              SUPER ADMIN OPERATIONS CONSOLE
            </span>
          </div>
          <h2 className="font-pixel text-xl sm:text-2xl text-slate-900 font-bold">
            DAILY FIXTURES & SCHEDULE <span className="text-[#FF5A16]">CSV INTAKE</span>
          </h2>
          <p className="font-sans text-xs text-slate-500 mt-1">
            Upload the daily tournament schedule CSV file to publish live matches. Days without uploaded CSV automatically display as &quot;TBA&quot; on the public schedule.
          </p>
        </div>

        <Link
          href="/schedule"
          target="_blank"
          className="self-start sm:self-center px-3.5 py-2 bg-slate-50 border border-slate-200 hover:border-[#FF5A16] text-slate-700 hover:text-[#FF5A16] font-pixel text-[10px] rounded-lg flex items-center gap-2 transition-all shrink-0 shadow-xs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>VIEW LIVE /SCHEDULE</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Day Selector Tabs with Live Status Badges */}
      <div className="mb-6">
        <label className="block font-pixel text-[10px] text-slate-500 uppercase mb-2 font-bold">
          SELECT TOURNAMENT DAY FOR INTAKE:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { id: "OCT18", label: "OCT 18 (Day 1)", subtitle: "Round 1" },
            { id: "OCT19", label: "OCT 19 (Day 2)", subtitle: "Round 2 & QF" },
            { id: "OCT20", label: "OCT 20 (Day 3)", subtitle: "Semi-Finals" },
            { id: "OCT21", label: "OCT 21 (Day 4)", subtitle: "Grand Finals" },
          ].map((day) => {
            const isSelected = selectedDay === day.id;
            const matchesCount = (scheduleState[day.id] || []).length;
            const isTba = matchesCount === 0;

            return (
              <button
                key={day.id}
                onClick={() => setSelectedDay(day.id)}
                className={`p-3 text-left border-2 transition-all cursor-pointer rounded-xl ${
                  isSelected
                    ? "bg-orange-50/50 border-[#FF5A16] shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-pixel text-xs text-slate-900 font-bold">
                    {day.label}
                  </span>
                  <span
                    className={`font-pixel text-[7.5px] px-2 py-0.5 rounded border ${
                      isTba
                        ? "bg-amber-50 text-amber-700 border-amber-200 font-bold"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
                    }`}
                  >
                    {isTba ? "TBA" : `${matchesCount} MATCHES`}
                  </span>
                </div>
                <span className="font-sans text-[11px] text-slate-500 block mt-0.5">
                  {day.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Day Status Banner */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans text-xs">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-[#FF5A16]" />
          <span>
            Current Status for <strong className="text-slate-900">{selectedDay}</strong>:{" "}
            {isDayTBA ? (
              <span className="text-amber-700 font-bold uppercase">TBA (No CSV Uploaded — Public View Hidden)</span>
            ) : (
              <span className="text-emerald-700 font-bold uppercase">{currentDayMatches.length} Matches Published & Live</span>
            )}
          </span>
        </div>

        {!isDayTBA && (
          <button
            onClick={handleResetToTBA}
            className="text-rose-600 hover:text-rose-700 font-pixel text-[9px] flex items-center gap-1.5 cursor-pointer self-start sm:self-auto font-bold"
            title="Wipe schedule and set day back to TBA"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>RESET DAY TO TBA</span>
          </button>
        )}
      </div>

      {/* Feedback Alerts */}
      {successMsg && (
        <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-sans text-xs flex items-center gap-2 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-5 p-3 bg-rose-50 border border-rose-200 text-rose-800 font-sans text-xs flex items-center gap-2 rounded-xl">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Zone & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        {/* Left Column: File Dropzone & Template Triggers (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Drag & Drop Click Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-[#FF5A16] bg-slate-50/60 hover:bg-orange-50/20 p-6 rounded-xl text-center cursor-pointer transition-colors group flex flex-col items-center justify-center min-h-[180px]"
          >
            <div className="w-12 h-12 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF5A16] group-hover:scale-110 transition-all mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="font-pixel text-xs text-slate-900 font-bold group-hover:text-[#FF5A16]">
              UPLOAD {selectedDay} CSV FILE
            </p>
            <p className="font-sans text-[11px] text-slate-500 mt-1">
              Click to browse .csv spreadsheet from your device
            </p>
          </div>

          {/* Quick Helper Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleLoadSample}
              className="p-2.5 bg-slate-50 border border-slate-200 hover:border-[#FF5A16] text-slate-700 hover:text-[#FF5A16] font-pixel text-[9px] rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>LOAD SAMPLE CSV</span>
            </button>

            <button
              onClick={handleDownloadTemplate}
              className="p-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 font-pixel text-[9px] rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD TEMPLATE</span>
            </button>
          </div>
        </div>

        {/* Right Column: CSV Text Editor / Paste (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-pixel text-[9px] text-[#FF5A16] uppercase font-bold">
              CSV DATA (EDITABLE RAW SPREADSHEET):
            </label>
            <span className="font-mono text-[10px] text-slate-500">
              Columns: Time, Category, Court, Match, PlayerA, InstA, PlayerB, InstB, Status
            </span>
          </div>

          <textarea
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            placeholder={`Time,Category,Court,MatchNumber,PlayerA,InstitutionA,PlayerB,InstitutionB,Status\n09:00 IST,Women's Singles,Court 01,R2 - Match 1,Sneha Hegde,Mysore University,Divya R.,Madras University,UPCOMING`}
            rows={7}
            className="w-full flex-1 p-3 bg-slate-50 border-2 border-slate-200 focus:border-[#FF5A16] text-slate-900 font-mono text-xs outline-none rounded-xl resize-none"
          />

          <button
            onClick={handlePublish}
            disabled={!csvContent.trim()}
            className="mt-3 w-full py-3 bg-[#FF5A16] hover:bg-[#e04808] disabled:opacity-40 text-white font-pixel text-xs font-bold tracking-wider uppercase transition-all shadow-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>PUBLISH {selectedDay} FIXTURES TO LIVE SCHEDULE</span>
          </button>
        </div>
      </div>

      {/* Parsed Match Preview Table */}
      {parsedPreview.length > 0 && (
        <div className="border-t border-slate-100 pt-5 mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-pixel text-xs text-slate-900 font-bold flex items-center gap-2">
              <Table className="w-4 h-4 text-[#FF5A16]" />
              PARSED CSV PREVIEW ({parsedPreview.length} MATCHES READY FOR {selectedDay})
            </span>
            <span className="font-pixel text-[8px] text-emerald-700 bg-emerald-50 px-2.5 py-1 border border-emerald-200 rounded-md font-bold">
              VALID FORMAT DETECTED
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-slate-50 font-pixel text-[8px] text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3">TIME</th>
                  <th className="p-3">CATEGORY</th>
                  <th className="p-3">COURT</th>
                  <th className="p-3">MATCH</th>
                  <th className="p-3">PLAYERS / INSTITUTIONS</th>
                  <th className="p-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {parsedPreview.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono text-slate-700 font-medium">{m.time}</td>
                    <td className="p-3 text-slate-900 font-medium">{m.category}</td>
                    <td className="p-3 font-pixel text-[9px] text-[#FF5A16] font-bold">{m.court}</td>
                    <td className="p-3 font-pixel text-[9px] text-slate-500">{m.matchNumber}</td>
                    <td className="p-3">
                      <div className="text-slate-900 font-medium">{m.playerA} <span className="text-slate-500 text-[10px]">({m.institutionA})</span></div>
                      <div className="text-xs text-slate-500">vs {m.playerB} <span className="text-[10px]">({m.institutionB})</span></div>
                    </td>
                    <td className="p-3">
                      <span className={`font-pixel text-[8px] px-2 py-0.5 rounded border ${
                        m.status === "LIVE"
                          ? "bg-[#FF5A16] text-white border-[#FF5A16] font-bold"
                          : m.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
