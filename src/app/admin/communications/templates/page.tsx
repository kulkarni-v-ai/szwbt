"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutTemplate,
  PlusCircle,
  Search,
  RefreshCw,
  Copy,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Code,
  ShieldCheck,
  X,
} from "lucide-react";
import { CommunicationsPortalShell } from "@/components/communications/CommunicationsPortalShell";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelInput } from "@/components/pixel/PixelInput";
import { PixelSelect } from "@/components/pixel/PixelSelect";

interface Template {
  id: string;
  name: string;
  code: string;
  category: string;
  priority: string;
  audience: string;
  channels: string;
  subject: string;
  bodyTemplate: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TemplatesManagementPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Create Template Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplCode, setTplCode] = useState("");
  const [tplCategory, setTplCategory] = useState("GENERAL");
  const [tplPriority, setTplPriority] = useState("NORMAL");
  const [tplAudience, setTplAudience] = useState("ALL");
  const [tplSubject, setTplSubject] = useState("");
  const [tplBody, setTplBody] = useState("");
  const [tplDescription, setTplDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/communications/templates");
      if (!res.ok) {
        if (res.status === 401) window.location.href = "/login";
        if (res.status === 403) setError("403 Forbidden: Insufficient clearance to view templates.");
        throw new Error(res.statusText);
      }
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Insert variable into template body
  const insertVariable = (variable: string) => {
    setTplBody((prev) => `${prev} {{${variable}}}`);
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    // ZERO TRANSPORT PAYMENT CHECK
    const fullText = `${tplName} ${tplSubject} ${tplBody}`.toLowerCase();
    if (
      fullText.includes("transport") &&
      (fullText.includes("fee") ||
        fullText.includes("payment") ||
        fullText.includes("upi") ||
        fullText.includes("utr") ||
        fullText.includes("balance") ||
        fullText.includes("paid"))
    ) {
      setCreateError("Charter Violation: Championship transport is university-provided and complimentary. Payment requests cannot be templated.");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/admin/communications/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tplName,
          code: tplCode,
          category: tplCategory,
          priority: tplPriority,
          audience: tplAudience,
          channels: "IN_APP,EMAIL",
          subject: tplSubject,
          bodyTemplate: tplBody,
          description: tplDescription,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setCreateError(data.error || "Failed to create template.");
        return;
      }

      setCreateModalOpen(false);
      setTplName("");
      setTplCode("");
      setTplSubject("");
      setTplBody("");
      setTplDescription("");
      fetchTemplates();
    } catch (err: any) {
      setCreateError(err.message || "Network error.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete template "${name}"? This action is audited.`)) return;

    try {
      const res = await fetch(`/api/admin/communications/templates/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to delete template.");
        return;
      }
      fetchTemplates();
    } catch (err: any) {
      alert(err.message || "Delete error.");
    }
  };

  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || tpl.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <CommunicationsPortalShell currentTab="templates">
      <div className="space-y-6">
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-pixel-navy border-2 border-pixel-orange-fiery/40 p-4 sm:p-6 shadow-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase">ACCELERATED BROADCASTING</span>
              <PixelBadge variant="orange" size="sm">
                TEMPLATE REPOSITORY
              </PixelBadge>
            </div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-pixel-cream tracking-wide">
              COMMUNICATION TEMPLATES // SAFE VARIABLE ENGINE
            </h1>
            <p className="text-xs text-pixel-gray-300 max-w-xl mt-1">
              Standardized broadcast drafts for matches, transport notices, hostel announcements, and registrations.
            </p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="self-start sm:self-center px-4 py-2 bg-pixel-orange-fiery text-black font-display font-bold text-xs uppercase tracking-wider hover:bg-pixel-orange-bright transition-all shadow-[0_0_12px_rgba(249,115,22,0.4)] flex items-center gap-2 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>CREATE TEMPLATE</span>
          </button>
        </div>

        {/* SAFE VARIABLES HUD BANNER */}
        <div className="bg-[#050914] border-2 border-cyan-800/60 p-4 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-pixel text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>SUPPORTED SAFE TEMPLATE VARIABLES</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            {[
              "participant_name",
              "team_name",
              "match_id",
              "event_name",
              "venue",
              "date",
              "time",
            ].map((v) => (
              <span key={v} className="bg-pixel-navy px-2 py-1 border border-cyan-900 text-cyan-300">
                {`{{${v}}}`}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-pixel-muted">
            All template variables are sanitized and escaped server-side. Arbitrary code execution or direct HTML injection is strictly blocked.
          </p>
        </div>

        {/* SEARCH & CATEGORY FILTER */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-pixel-muted absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search templates by code, title, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#050914] border border-pixel-gray-700 py-2 pl-9 pr-3 text-xs text-pixel-cream focus:border-pixel-orange-fiery focus:outline-none placeholder:text-pixel-gray-500 font-sans"
            />
          </div>
          <div className="flex gap-2">
            <PixelSelect
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { label: "ALL CATEGORIES", value: "ALL" },
                { label: "REGISTRATION REMINDER", value: "REGISTRATION" },
                { label: "ACCOMMODATION NOTICE", value: "ACCOMMODATION" },
                { label: "TRANSPORT UPDATE", value: "TRANSPORT" },
                { label: "MATCH SCHEDULE UPDATE", value: "SCHEDULE" },
                { label: "MATCH RESULT ANNOUNCEMENT", value: "MATCH" },
                { label: "VENUE NOTICE", value: "VENUE" },
                { label: "EMERGENCY NOTICE", value: "EMERGENCY" },
                { label: "GENERAL ANNOUNCEMENT", value: "GENERAL" },
              ]}
            />
            <PixelButton variant="secondary" size="sm" onClick={() => fetchTemplates()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              REFRESH
            </PixelButton>
          </div>
        </div>

        {/* TEMPLATES GRID */}
        {loading ? (
          <div className="p-12 text-center bg-pixel-navy border border-pixel-gray-800">
            <RefreshCw className="w-8 h-8 text-pixel-orange-fiery animate-spin mx-auto mb-2" />
            <p className="font-pixel text-xs text-pixel-orange-bright">LOADING TEMPLATES...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-950/60 border border-red-500 text-center text-xs text-red-200">
            {error}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-12 text-center bg-pixel-navy border border-pixel-gray-800 space-y-2">
            <LayoutTemplate className="w-8 h-8 text-pixel-muted mx-auto" />
            <p className="font-pixel text-xs text-pixel-gray-300">No templates configured.</p>
            <p className="text-[11px] text-pixel-muted">Create a template to accelerate tournament broadcasting.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-pixel-navy/80 border-2 border-pixel-gray-800 hover:border-pixel-orange-fiery/60 p-4 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-pixel-orange-bright font-bold">{tpl.code}</span>
                    <div className="flex items-center gap-1.5">
                      <PixelBadge variant="orange" size="sm">
                        {tpl.category}
                      </PixelBadge>
                      <PixelBadge variant="cyan" size="sm">
                        {tpl.audience}
                      </PixelBadge>
                    </div>
                  </div>

                  <h3 className="font-display font-bold text-sm text-pixel-cream">{tpl.name}</h3>
                  <div className="p-2.5 bg-[#050914] border border-pixel-gray-800 text-xs space-y-1">
                    <p className="font-bold text-cyan-300">{tpl.subject}</p>
                    <p className="text-pixel-gray-300 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                      {tpl.bodyTemplate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-pixel-gray-800 text-xs">
                  <Link
                    href={`/admin/communications/create?template=${encodeURIComponent(tpl.code)}`}
                    className="px-3 py-1.5 bg-pixel-orange-fiery text-black hover:bg-pixel-orange-bright font-display font-bold text-xs uppercase flex items-center gap-1.5 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>USE TEMPLATE</span>
                  </Link>
                  <button
                    onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                    className="p-1.5 text-pixel-muted hover:text-red-400 transition-colors"
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CREATE TEMPLATE MODAL */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0a0e1a] border-2 border-pixel-orange-fiery w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-start border-b border-pixel-gray-800 pb-3">
                <div>
                  <PixelBadge variant="orange" size="sm">
                    TEMPLATE COMPOSER
                  </PixelBadge>
                  <h2 className="font-display font-bold text-lg text-pixel-cream mt-1">NEW COMMUNICATION TEMPLATE</h2>
                </div>
                <button onClick={() => setCreateModalOpen(false)} className="p-1 text-pixel-muted hover:text-pixel-cream">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {createError && (
                <div className="p-3 bg-red-950/80 border border-red-500 text-red-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateTemplate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-pixel text-[10px] text-pixel-orange-bright mb-1">TEMPLATE NAME *</label>
                    <PixelInput
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                      placeholder="e.g. Day 2 Match Call Notice"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-pixel text-[10px] text-pixel-orange-bright mb-1">TEMPLATE CODE *</label>
                    <PixelInput
                      value={tplCode}
                      onChange={(e) => setTplCode(e.target.value.toUpperCase())}
                      placeholder="e.g. TPL_MATCH_CALL"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-pixel text-[10px] text-pixel-orange-bright mb-1">CATEGORY</label>
                    <PixelSelect
                      value={tplCategory}
                      onChange={(e) => setTplCategory(e.target.value)}
                      options={[
                        { label: "GENERAL", value: "GENERAL" },
                        { label: "SCHEDULE", value: "SCHEDULE" },
                        { label: "MATCH", value: "MATCH" },
                        { label: "ACCOMMODATION", value: "ACCOMMODATION" },
                        { label: "TRANSPORT", value: "TRANSPORT" },
                        { label: "REGISTRATION", value: "REGISTRATION" },
                        { label: "VENUE", value: "VENUE" },
                        { label: "EMERGENCY", value: "EMERGENCY" },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block font-pixel text-[10px] text-pixel-orange-bright mb-1">PRIORITY</label>
                    <PixelSelect
                      value={tplPriority}
                      onChange={(e) => setTplPriority(e.target.value)}
                      options={[
                        { label: "NORMAL", value: "NORMAL" },
                        { label: "HIGH", value: "HIGH" },
                        { label: "URGENT", value: "URGENT" },
                        { label: "EMERGENCY", value: "EMERGENCY" },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block font-pixel text-[10px] text-pixel-orange-bright mb-1">AUDIENCE</label>
                    <PixelSelect
                      value={tplAudience}
                      onChange={(e) => setTplAudience(e.target.value)}
                      options={[
                        { label: "ALL", value: "ALL" },
                        { label: "PARTICIPANTS", value: "PARTICIPANTS" },
                        { label: "TEAM MANAGERS", value: "TEAM_MANAGERS" },
                        { label: "VOLUNTEERS", value: "VOLUNTEERS" },
                        { label: "MATCH OFFICIALS", value: "MATCH_OFFICIALS" },
                        { label: "ORGANIZERS", value: "ORGANIZERS" },
                      ]}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-pixel text-[10px] text-pixel-orange-bright mb-1">DEFAULT SUBJECT *</label>
                  <PixelInput
                    value={tplSubject}
                    onChange={(e) => setTplSubject(e.target.value)}
                    placeholder="e.g. Match Call: Court {{match_id}} is ready"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-pixel text-[10px] text-pixel-orange-bright">BODY TEMPLATE *</label>
                    <span className="text-[10px] text-pixel-muted font-mono">CLICK TO INSERT VARIABLE:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {["participant_name", "team_name", "match_id", "venue", "date", "time"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className="px-2 py-0.5 bg-pixel-navy border border-cyan-800 text-[10px] text-cyan-300 font-mono hover:bg-cyan-900/60"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={tplBody}
                    onChange={(e) => setTplBody(e.target.value)}
                    rows={6}
                    placeholder="Enter template body with optional {{variables}}..."
                    className="w-full bg-[#050914] border border-pixel-gray-700 p-3 text-xs text-pixel-cream font-sans focus:border-pixel-orange-fiery focus:outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-pixel-gray-800">
                  <PixelButton variant="secondary" size="sm" type="button" onClick={() => setCreateModalOpen(false)}>
                    CANCEL
                  </PixelButton>
                  <PixelButton variant="primary" size="sm" type="submit" disabled={creating}>
                    {creating ? "CREATING..." : "SAVE TEMPLATE"}
                  </PixelButton>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </CommunicationsPortalShell>
  );
}
