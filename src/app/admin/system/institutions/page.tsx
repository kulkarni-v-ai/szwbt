"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ROLE_MATRIX } from "@/data/dashboard";
import {
  Building,
  Upload,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Eye,
  Plus,
  ChevronRight,
  X,
  Loader2,
  Check,
} from "lucide-react";

interface Institution {
  id: string;
  institutionCode: string;
  name: string;
  state: string;
  city: string | null;
  district: string | null;
  status: string;
}

export default function InstitutionManagementPage() {
  const currentRole = ROLE_MATRIX.find((r) => r.roleId === "super_admin")!;

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // CSV Upload State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const SOUTH_ZONE_STATES = [
    "ALL", "Andhra Pradesh", "Goa", "Karnataka", "Kerala", "Maharashtra", "Puducherry", "Tamil Nadu", "Telangana",
  ];

  const triggerToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchInstitutions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (stateFilter !== "ALL") params.set("state", stateFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/institutions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setInstitutions(data.institutions || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch institutions:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, stateFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchInstitutions(), 300);
    return () => clearTimeout(timer);
  }, [fetchInstitutions]);

  // Handle CSV file selection
  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setCsvContent(reader.result as string);
    };
    reader.readAsText(file);
  };

  // Upload CSV for validation & preview
  const handleCsvUpload = async () => {
    if (!csvContent.trim()) {
      triggerToast("Select a CSV file first.", "error");
      return;
    }
    setUploading(true);
    setPreview(null);
    try {
      const res = await fetch("/api/admin/institutions/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent, fileName: csvFileName }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPreview(data);
        triggerToast(`✓ ${data.validCount} records validated. Review and confirm.`, "success");
      } else {
        setPreview(data);
        triggerToast(data.error || "Validation failed", "error");
      }
    } catch (err: any) {
      triggerToast(err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  // Confirm import
  const handleConfirmImport = async () => {
    if (!preview?.importId) return;
    setImporting(true);
    try {
      const res = await fetch("/api/admin/institutions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importId: preview.importId, csvContent }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(`✓ Import complete: ${data.createdCount} created, ${data.updatedCount} updated`, "success");
        setIsUploadOpen(false);
        setPreview(null);
        setCsvContent("");
        setCsvFileName("");
        fetchInstitutions();
      } else {
        triggerToast(data.error || "Import failed", "error");
      }
    } catch (err: any) {
      triggerToast(err.message, "error");
    } finally {
      setImporting(false);
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    const template = "institution_code,university_name,state,city,district,status\nKAR001,KLE Technological University,Karnataka,Hubballi,Dharwad,ACTIVE\nKER001,University of Kerala,Kerala,Thiruvananthapuram,,ACTIVE";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "institution_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const byState = institutions.reduce<Record<string, Institution[]>>((acc, inst) => {
    if (!acc[inst.state]) acc[inst.state] = [];
    acc[inst.state].push(inst);
    return acc;
  }, {});

  return (
    <DashboardShell currentRole={currentRole}>
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className={`fixed top-4 right-4 z-50 px-5 py-3 text-sm font-bold border shadow-xl ${
              notification.type === "success"
                ? "bg-emerald-900/95 border-emerald-500/40 text-emerald-300"
                : notification.type === "error"
                  ? "bg-red-900/95 border-red-500/40 text-red-300"
                  : "bg-blue-900/95 border-blue-500/40 text-blue-300"
            }`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6 pb-20 text-[#F4E6CE]">
        {/* Header Strip */}
        <div className="bg-[#07101D] border-2 border-[#18D8D0]/40 p-4 sm:p-6 shadow-[3px_3px_0px_#000] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="font-pixel text-[9px] text-[#18D8D0] tracking-widest uppercase mb-1">
              SYSTEM CONFIGURATION • SUPER ADMIN CLEARANCE
            </div>
            <h1 className="font-pixel text-xl sm:text-2xl text-[#F4E6CE] font-bold tracking-tight">
              UNIVERSITY & INSTITUTION <span className="text-[#FF5A16]">MASTER</span>
            </h1>
            <p className="font-sans text-xs text-[#91A0AE] mt-0.5">
              CSV-managed master database of participating universities, states, and institutions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF5A16] hover:bg-[#FF5A16]/80 text-[#07101D] font-pixel text-xs font-bold shadow-[2px_2px_0px_#000]"
            >
              <Upload className="w-4 h-4" />
              <span>IMPORT INSTITUTIONS (CSV)</span>
            </button>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-[#0a1128] border border-white/20 hover:border-[#18D8D0] text-[#18D8D0] font-pixel text-xs font-bold"
            >
              <Download className="w-4 h-4" />
              <span>DOWNLOAD TEMPLATE</span>
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search institutions..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#0a1128] border border-white/10 text-white text-sm placeholder-gray-600 focus:border-[#FF5500]/50 focus:outline-none"
            />
          </div>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-3 py-2.5 bg-[#0a1128] border border-white/10 text-white text-sm focus:border-[#FF5500]/50 focus:outline-none"
          >
            {SOUTH_ZONE_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-[#0a1128] border border-white/10 text-white text-sm focus:border-[#FF5500]/50 focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#0a1128] border border-white/10 p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">TOTAL</p>
            <p className="text-2xl font-black text-white mt-1">{institutions.length}</p>
          </div>
          <div className="bg-[#0a1128] border border-white/10 p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">ACTIVE</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {institutions.filter((i) => i.status === "ACTIVE").length}
            </p>
          </div>
          <div className="bg-[#0a1128] border border-white/10 p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">STATES</p>
            <p className="text-2xl font-black text-[#FF5500] mt-1">{Object.keys(byState).length}</p>
          </div>
          <div className="bg-[#0a1128] border border-white/10 p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">INACTIVE</p>
            <p className="text-2xl font-black text-gray-500 mt-1">
              {institutions.filter((i) => i.status === "INACTIVE").length}
            </p>
          </div>
        </div>

        {/* Institution List */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-xs uppercase tracking-widest">Loading institutions...</p>
          </div>
        ) : institutions.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10">
            <Building className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No institutions found.</p>
            <p className="text-xs text-gray-600 mt-1">Use IMPORT CSV to add institution master data.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-3 py-2.5 text-[10px] text-gray-500 uppercase tracking-widest font-bold">Code</th>
                  <th className="text-left px-3 py-2.5 text-[10px] text-gray-500 uppercase tracking-widest font-bold">University / Institution</th>
                  <th className="text-left px-3 py-2.5 text-[10px] text-gray-500 uppercase tracking-widest font-bold">State</th>
                  <th className="text-left px-3 py-2.5 text-[10px] text-gray-500 uppercase tracking-widest font-bold">City</th>
                  <th className="text-center px-3 py-2.5 text-[10px] text-gray-500 uppercase tracking-widest font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((inst) => (
                  <tr key={inst.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-[#FF5500]">{inst.institutionCode}</td>
                    <td className="px-3 py-2.5 text-white font-medium">{inst.name}</td>
                    <td className="px-3 py-2.5 text-gray-400">{inst.state}</td>
                    <td className="px-3 py-2.5 text-gray-500">{inst.city || "—"}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                        inst.status === "ACTIVE"
                          ? "text-emerald-400 bg-emerald-900/30 border-emerald-500/30"
                          : "text-gray-500 bg-gray-800/30 border-gray-600/30"
                      }`}>
                        {inst.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CSV Upload Modal */}
      <AnimatePresence>
        {isUploadOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !uploading && !importing && setIsUploadOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0a1128] border border-white/10 w-full max-w-lg max-h-[80vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-[#0a1128] border-b border-white/10 px-5 py-4 flex items-center justify-between z-10">
                <h3 className="font-black text-sm text-white uppercase tracking-wider">CSV IMPORT</h3>
                <button onClick={() => !uploading && !importing && setIsUploadOpen(false)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* File Select */}
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">SELECT CSV FILE</label>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFile}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-3 px-4 bg-gray-800 border border-white/10 text-left text-sm text-gray-400 hover:border-[#FF5500]/40 transition-colors"
                    >
                      {csvFileName || "Choose file..."}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1.5">
                    Required columns: university_name, state. Optional: institution_code, city, district, status
                  </p>
                </div>

                {/* Validate Button */}
                {csvContent && !preview && (
                  <button
                    onClick={handleCsvUpload}
                    disabled={uploading}
                    className="w-full py-3 bg-[#FF5500] text-white font-bold uppercase tracking-wider text-xs hover:bg-[#d94e16] disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {uploading ? "VALIDATING..." : "VALIDATE CSV"}
                  </button>
                )}

                {/* Preview */}
                {preview && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-800/50 p-2.5">
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="text-lg font-bold text-white">{preview.totalRows}</p>
                      </div>
                      <div className="bg-emerald-900/20 border border-emerald-500/20 p-2.5">
                        <p className="text-xs text-emerald-500">New</p>
                        <p className="text-lg font-bold text-emerald-400">{preview.newCount || 0}</p>
                      </div>
                      <div className="bg-amber-900/20 border border-amber-500/20 p-2.5">
                        <p className="text-xs text-amber-500">Updates</p>
                        <p className="text-lg font-bold text-amber-400">{preview.existingCount || 0}</p>
                      </div>
                    </div>

                    {/* Errors */}
                    {preview.errors && preview.errors.length > 0 && (
                      <div className="bg-red-900/20 border border-red-500/20 p-3">
                        <p className="text-xs text-red-400 font-bold uppercase mb-2">VALIDATION ERRORS</p>
                        {preview.errors.slice(0, 10).map((e: any, i: number) => (
                          <p key={i} className="text-[11px] text-red-300">
                            Row {e.row}: {e.field} — {e.message}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Preview rows */}
                    {preview.preview && preview.preview.length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">PREVIEW (FIRST 20)</p>
                        <div className="max-h-40 overflow-y-auto">
                          {preview.preview.map((row: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 py-1 border-b border-white/5 text-[11px]">
                              <span className="text-[#FF5500] font-mono w-16 shrink-0">{row.institution_code}</span>
                              <span className="text-white flex-1 truncate">{row.university_name}</span>
                              <span className="text-gray-500 shrink-0">{row.state}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Confirm */}
                    {preview.success && (
                      <button
                        onClick={handleConfirmImport}
                        disabled={importing}
                        className="w-full py-3 bg-emerald-600 text-white font-bold uppercase tracking-wider text-xs hover:bg-emerald-500 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                      >
                        {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {importing ? "IMPORTING..." : `CONFIRM IMPORT ${preview.validCount} INSTITUTIONS`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
