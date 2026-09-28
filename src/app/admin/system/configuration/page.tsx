"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Settings,
  ArrowLeft,
  CheckCircle2,
  Save,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { SystemAdminShell } from "@/components/system/SystemAdminShell";

export default function SystemConfigurationPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/system/configuration");
      if (!res.ok) {
        if (res.status === 403) {
          setAccessDenied("403 Forbidden: Insufficient clearance for System Configuration.");
          return;
        }
        throw new Error("Failed to load system settings");
      }
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings || []);
        const initialMap: Record<string, string> = {};
        for (const s of data.settings) {
          initialMap[s.key] = s.value;
        }
        setEditedValues(initialMap);
      }
    } catch (err: any) {
      console.error("Configuration fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveSetting = async (key: string) => {
    const val = editedValues[key];
    if (val === undefined) return;

    try {
      setSavingKey(key);
      const res = await fetch("/api/system/configuration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: val }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: `Updated configuration key: ${key}`, type: "success" });
        fetchSettings();
      } else {
        setToast({ message: data.error || "Update failed.", type: "error" });
      }
    } catch (err: any) {
      setToast({ message: "Network error: " + err.message, type: "error" });
    } finally {
      setSavingKey(null);
    }
  };

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#060608] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0b0c10] border-2 border-red-600 p-6 text-center space-y-4">
          <ShieldAlert className="w-10 h-10 mx-auto text-red-500 animate-pulse" />
          <h1 className="font-pixel text-sm text-red-500 uppercase">ACCESS RESTRICTED // 403 FORBIDDEN</h1>
          <p className="text-xs text-gray-300">{accessDenied}</p>
          <Link href="/admin/system" className="inline-block px-4 py-2 bg-[#ff5500] text-white font-pixel text-xs">
            BACK TO SYSTEM OVERVIEW
          </Link>
        </div>
      </div>
    );
  }

  // Group settings by category
  const categories: Record<string, any[]> = {};
  for (const s of settings) {
    const cat = s.category || "GENERAL";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(s);
  }

  return (
    <SystemAdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#2d3748] pb-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/system" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-pixel text-sm text-white uppercase">SYSTEM RUNTIME CONFIGURATION</h1>
              <p className="font-pixel text-[10px] text-gray-400">CHAMPIONSHIP PARAMETERS &amp; POLICIES</p>
            </div>
          </div>
          <button
            onClick={fetchSettings}
            className="px-3 py-1 bg-[#0b0c10] hover:bg-[#1f2430] text-[#f5a623] border border-[#2d3748] font-pixel text-xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" /> RELOAD
          </button>
        </div>

        {toast && (
          <div
            className={`p-3 text-xs flex items-center justify-between border ${
              toast.type === "success"
                ? "bg-emerald-950/60 border-emerald-600 text-emerald-300"
                : "bg-red-950/60 border-red-600 text-red-300"
            }`}
          >
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-gray-400">✕</button>
          </div>
        )}

        {/* Transport Zero-Payment Notice */}
        <div className="p-3 bg-emerald-950/40 border border-emerald-600/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Zero Transport Payment Policy:</strong> Transport parameters are locked as university-provided complimentary transit. No fare or payment fields can be configured.
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center font-pixel text-xs text-[#f5a623] animate-pulse">
            LOADING SYSTEM SETTINGS...
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(categories).map((catName) => (
              <div key={catName} className="p-4 bg-[#0b0c10] border border-[#2d3748] space-y-3">
                <span className="font-pixel text-xs text-[#ff5500] uppercase tracking-wider">
                  CATEGORY // {catName}
                </span>

                <div className="space-y-3">
                  {categories[catName].map((setting) => {
                    const isSaving = savingKey === setting.key;
                    const currentValue = editedValues[setting.key] ?? setting.value;
                    const isDirty = currentValue !== setting.value;

                    return (
                      <div
                        key={setting.key}
                        className="p-3 bg-[#060608] border border-[#1f2430] flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5 max-w-md">
                          <p className="font-pixel text-xs text-white">{setting.key}</p>
                          <p className="text-[11px] text-gray-400">{setting.description || "System runtime key"}</p>
                          <p className="font-pixel text-[9px] text-[#f5a623]">Updated by: {setting.updatedBy}</p>
                        </div>

                        <div className="flex items-center gap-2 flex-1 max-w-lg">
                          <input
                            type="text"
                            value={currentValue}
                            onChange={(e) =>
                              setEditedValues({
                                ...editedValues,
                                [setting.key]: e.target.value,
                              })
                            }
                            className="flex-1 bg-[#0b0c10] border border-[#2d3748] p-1.5 text-xs text-white focus:outline-none focus:border-[#ff5500]"
                          />
                          <button
                            onClick={() => handleSaveSetting(setting.key)}
                            disabled={!isDirty || isSaving}
                            className={`px-3 py-1.5 font-pixel text-xs flex items-center gap-1 transition-colors ${
                              isDirty
                                ? "bg-[#ff5500] hover:bg-[#d94e16] text-white"
                                : "bg-[#0b0c10] text-gray-500 border border-[#2d3748] cursor-not-allowed"
                            }`}
                          >
                            <Save className="w-3 h-3" />
                            <span>{isSaving ? "SAVING..." : "SAVE"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SystemAdminShell>
  );
}
