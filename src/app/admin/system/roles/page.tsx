"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  KeyRound,
  Users,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from "lucide-react";
import { SystemAdminShell } from "@/components/system/SystemAdminShell";

export default function SystemRolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  useEffect(() => {
    async function loadRoles() {
      try {
        setLoading(true);
        const res = await fetch("/api/system/roles");
        if (!res.ok) {
          if (res.status === 403) {
            setAccessDenied("403 Forbidden: Insufficient clearance for Role Administration.");
            return;
          }
          throw new Error("Failed to load roles");
        }
        const data = await res.json();
        if (data.success) {
          setRoles(data.roles || []);
        }
      } catch (err: any) {
        console.error("Roles fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadRoles();
  }, []);

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

  return (
    <SystemAdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#2d3748] pb-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/system" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-pixel text-sm text-white uppercase">ROLE ADMINISTRATION &amp; PERMISSIONS MATRIX</h1>
              <p className="font-pixel text-[10px] text-gray-400">{roles.length} DEFINED SYSTEM ROLES</p>
            </div>
          </div>
          <Link
            href="/admin/system/permissions"
            className="px-3 py-1.5 bg-[#0b0c10] hover:bg-[#1f2430] text-[#f5a623] border border-[#2d3748] font-pixel text-xs flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>PERMISSIONS MATRIX →</span>
          </Link>
        </div>

        {loading ? (
          <div className="py-20 text-center font-pixel text-xs text-[#f5a623] animate-pulse">
            LOADING ROLES REGISTRY...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((r) => {
              const isExpanded = expandedRole === r.id;
              return (
                <div key={r.id} className="p-4 bg-[#0b0c10] border border-[#2d3748] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#ff5500]" />
                      <span className="font-pixel text-xs text-white">{r.name}</span>
                    </div>
                    <span className="px-1.5 py-0.5 bg-[#1b0d2b] text-[#f5a623] font-pixel text-[9px]">
                      {r.userCount} USERS
                    </span>
                  </div>

                  <p className="text-xs text-gray-300">{r.description || "System authority role."}</p>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400">
                    <span>Permissions: <strong className="text-white">{r.permissionCount}</strong> assigned</span>
                    <button
                      onClick={() => setExpandedRole(isExpanded ? null : r.id)}
                      className="text-[#ff5500] hover:text-[#d94e16] font-pixel text-[9px] flex items-center gap-0.5"
                    >
                      <span>{isExpanded ? "HIDE DETAILS" : "INSPECT MATRIX"}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-[#1f2430] space-y-1">
                      <p className="font-pixel text-[9px] text-[#f5a623]">ASSIGNED PERMISSION CODES:</p>
                      <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto p-1.5 bg-[#060608] border border-[#2d3748]">
                        {r.permissions.map((pCode: string) => (
                          <span
                            key={pCode}
                            className="px-1.5 py-0.5 bg-[#1f2430] text-gray-200 font-pixel text-[8px]"
                          >
                            {pCode}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SystemAdminShell>
  );
}
