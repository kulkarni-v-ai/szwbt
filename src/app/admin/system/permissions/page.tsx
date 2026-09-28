"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  KeyRound,
  ArrowLeft,
  Search,
  ShieldAlert,
} from "lucide-react";
import { SystemAdminShell } from "@/components/system/SystemAdminShell";

export default function SystemPermissionsPage() {
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, any[]>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadPermissions() {
      try {
        setLoading(true);
        const res = await fetch("/api/system/permissions");
        if (!res.ok) {
          if (res.status === 403) {
            setAccessDenied("403 Forbidden: Insufficient clearance for Permissions Registry.");
            return;
          }
          throw new Error("Failed to load permissions");
        }
        const data = await res.json();
        if (data.success) {
          setGroupedPermissions(data.grouped || {});
          setTotalCount(data.totalCount || 0);
        }
      } catch (err: any) {
        console.error("Permissions fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPermissions();
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

  const filteredResources = Object.keys(groupedPermissions).filter((resName) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      resName.toLowerCase().includes(s) ||
      groupedPermissions[resName].some(
        (p) =>
          p.code.toLowerCase().includes(s) ||
          p.action.toLowerCase().includes(s) ||
          p.description?.toLowerCase().includes(s)
      )
    );
  });

  return (
    <SystemAdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#2d3748] pb-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/system" className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-pixel text-sm text-white uppercase">GRANULAR PERMISSIONS REGISTRY</h1>
              <p className="font-pixel text-[10px] text-gray-400">{totalCount} CANONICAL RESOURCE ACTIONS</p>
            </div>
          </div>
          <Link
            href="/admin/system/roles"
            className="px-3 py-1.5 bg-[#0b0c10] hover:bg-[#1f2430] text-[#f5a623] border border-[#2d3748] font-pixel text-xs"
          >
            ← ROLES REGISTRY
          </Link>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search permissions by code, resource, or action (e.g. registration:read, allocate)..."
            className="w-full bg-[#0b0c10] border border-[#2d3748] pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5500]"
          />
        </div>

        {loading ? (
          <div className="py-20 text-center font-pixel text-xs text-[#f5a623] animate-pulse">
            LOADING PERMISSIONS MATRIX...
          </div>
        ) : (
          <div className="space-y-4">
            {filteredResources.map((resource) => (
              <div key={resource} className="p-4 bg-[#0b0c10] border border-[#2d3748] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1f2430] pb-2">
                  <span className="font-pixel text-xs text-[#ff5500] uppercase tracking-wider">
                    RESOURCE: {resource}
                  </span>
                  <span className="font-pixel text-[10px] text-gray-400">
                    {groupedPermissions[resource].length} ACTIONS
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {groupedPermissions[resource].map((p) => (
                    <div key={p.id} className="p-2.5 bg-[#060608] border border-[#1f2430] space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-pixel text-[10px] text-cyan-400">{p.code}</span>
                        <span className="px-1 py-0.2 bg-[#1b0d2b] text-[#f5a623] font-pixel text-[8px] uppercase">
                          {p.action}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400">{p.description || "Standard operation."}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SystemAdminShell>
  );
}
