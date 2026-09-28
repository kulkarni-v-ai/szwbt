"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  Mail,
  Smartphone,
  RotateCcw,
  Search,
  Filter,
} from "lucide-react";
import { CommunicationsPortalShell } from "@/components/communications/CommunicationsPortalShell";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelBadge } from "@/components/pixel/PixelBadge";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelSelect } from "@/components/pixel/PixelSelect";

interface DeliveryItem {
  id: string;
  announcementId: string;
  channel: string;
  recipient: string;
  status: string;
  errorMessage?: string | null;
  attemptCount: number;
  sentAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  announcement?: {
    id: string;
    title: string;
    category: string;
    priority: string;
  };
}

export default function DeliveryMonitorPage() {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [channelFilter, setChannelFilter] = useState("ALL");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (channelFilter !== "ALL") params.append("channel", channelFilter);

      const res = await fetch(`/api/admin/communications/deliveries?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) window.location.href = "/login";
        if (res.status === 403) setError("403 Forbidden: Insufficient clearance to view delivery monitoring.");
        throw new Error(res.statusText);
      }

      const data = await res.json();
      if (data.success) {
        setDeliveries(data.deliveries || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load delivery pipeline data.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, channelFilter]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // Handle controlled retry
  const handleRetry = async (deliveryId: string) => {
    try {
      setRetryingId(deliveryId);
      const res = await fetch("/api/admin/communications/deliveries/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Retry failed.");
        return;
      }

      alert("Controlled re-transmission executed successfully.");
      fetchDeliveries();
    } catch (err: any) {
      alert(err.message || "Network error during retry.");
    } finally {
      setRetryingId(null);
    }
  };

  // Compute live pipeline metrics
  const metrics = {
    total: deliveries.length,
    delivered: deliveries.filter((d) => d.status === "DELIVERED").length,
    sent: deliveries.filter((d) => d.status === "SENT").length,
    failed: deliveries.filter((d) => d.status === "FAILED").length,
    processing: deliveries.filter((d) => d.status === "PROCESSING" || d.status === "PENDING" || d.status === "QUEUED").length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return <PixelBadge variant="green" size="sm">DELIVERED</PixelBadge>;
      case "SENT":
        return <PixelBadge variant="cyan" size="sm">SENT</PixelBadge>;
      case "FAILED":
        return <PixelBadge variant="red" size="sm">FAILED</PixelBadge>;
      case "PROCESSING":
      case "QUEUED":
      case "PENDING":
        return <PixelBadge variant="yellow" size="sm">{status}</PixelBadge>;
      default:
        return <PixelBadge variant="dark" size="sm">{status}</PixelBadge>;
    }
  };

  return (
    <CommunicationsPortalShell currentTab="delivery">
      <div className="space-y-6">
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-pixel-navy border-2 border-pixel-orange-fiery/40 p-4 sm:p-6 shadow-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-pixel text-[10px] text-pixel-orange-bright uppercase">PIPELINE TELEMETRY</span>
              <PixelBadge variant="orange" size="sm">
                MULTI-CHANNEL DISPATCH MONITOR
              </PixelBadge>
            </div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-pixel-cream tracking-wide">
              MULTI-CHANNEL DELIVERY MONITOR // DISPATCH HEALTH
            </h1>
            <p className="text-xs text-pixel-gray-300 max-w-xl mt-1">
              Real-time monitoring of in-app notification drops, SMTP relay logs, failure reasons, and controlled retry operations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PixelButton variant="secondary" size="sm" onClick={() => fetchDeliveries()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              REFRESH TELEMETRY
            </PixelButton>
          </div>
        </div>

        {/* DELIVERY HEALTH METRICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-pixel-navy border-2 border-pixel-gray-800">
            <span className="font-pixel text-[9px] text-pixel-muted uppercase">TOTAL MONITORED</span>
            <p className="font-display font-bold text-2xl text-pixel-cream mt-1">{metrics.total}</p>
            <p className="text-[10px] text-pixel-muted">Active delivery jobs</p>
          </div>

          <div className="p-3.5 bg-pixel-navy border-2 border-green-500/50">
            <span className="font-pixel text-[9px] text-green-400 uppercase">DELIVERED</span>
            <p className="font-display font-bold text-2xl text-green-400 mt-1">{metrics.delivered}</p>
            <p className="text-[10px] text-pixel-muted">Confirmed on client node</p>
          </div>

          <div className="p-3.5 bg-pixel-navy border-2 border-yellow-500/50">
            <span className="font-pixel text-[9px] text-yellow-400 uppercase">QUEUED / PROCESSING</span>
            <p className="font-display font-bold text-2xl text-yellow-400 mt-1">{metrics.processing}</p>
            <p className="text-[10px] text-pixel-muted">In pipeline buffer</p>
          </div>

          <div className="p-3.5 bg-pixel-navy border-2 border-red-500/50">
            <span className="font-pixel text-[9px] text-red-400 uppercase">FAILED DELIVERIES</span>
            <p className="font-display font-bold text-2xl text-red-400 mt-1">{metrics.failed}</p>
            <p className="text-[10px] text-pixel-muted">Requires retry/audit</p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="bg-[#050914] border-2 border-pixel-gray-800 p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <PixelSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { label: "ALL STATUSES", value: "ALL" },
                { label: "DELIVERED", value: "DELIVERED" },
                { label: "SENT", value: "SENT" },
                { label: "FAILED", value: "FAILED" },
                { label: "PENDING / QUEUED", value: "PENDING" },
              ]}
            />
            <PixelSelect
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              options={[
                { label: "ALL CHANNELS", value: "ALL" },
                { label: "IN_APP", value: "IN_APP" },
                { label: "EMAIL", value: "EMAIL" },
              ]}
            />
          </div>
          <span className="font-mono text-xs text-pixel-muted">SHOWING {deliveries.length} RECORDS</span>
        </div>

        {/* DELIVERIES GRID */}
        {loading ? (
          <div className="p-12 text-center bg-pixel-navy border border-pixel-gray-800">
            <RefreshCw className="w-8 h-8 text-pixel-orange-fiery animate-spin mx-auto mb-2" />
            <p className="font-pixel text-xs text-pixel-orange-bright">LOADING DELIVERY STATUS...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-950/60 border border-red-500 text-center text-xs text-red-200">
            {error}
          </div>
        ) : deliveries.length === 0 ? (
          <div className="p-12 text-center bg-pixel-navy border border-pixel-gray-800 space-y-2">
            <Bell className="w-8 h-8 text-pixel-muted mx-auto" />
            <p className="font-pixel text-xs text-pixel-gray-300">No delivery logs recorded.</p>
            <p className="text-[11px] text-pixel-muted">Delivery events will populate automatically when broadcasts are transmitted.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliveries.map((item) => (
              <div
                key={item.id}
                className={`bg-pixel-navy/80 border-2 p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  item.status === "FAILED"
                    ? "border-red-500/60 hover:border-red-400"
                    : "border-pixel-gray-800 hover:border-pixel-orange-fiery/40"
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(item.status)}
                    <span className="font-mono text-xs text-pixel-muted">DELIVERY ID: {item.id.slice(0, 8)}...</span>
                    <span className="font-pixel text-[10px] text-cyan-300">
                      CHANNEL: {item.channel}
                    </span>
                    <span className="text-[10px] text-pixel-orange-bright font-mono">
                      AUDIENCE: {item.recipient}
                    </span>
                    <span className="text-[10px] text-pixel-muted font-mono">
                      ATTEMPTS: {item.attemptCount}
                    </span>
                  </div>

                  {item.announcement ? (
                    <h3 className="font-display font-bold text-sm text-pixel-cream">
                      {item.announcement.title}
                    </h3>
                  ) : (
                    <h3 className="font-display font-bold text-sm text-pixel-muted font-mono">
                      MSG_REF: {item.announcementId}
                    </h3>
                  )}

                  {/* Failure reason if failed */}
                  {item.errorMessage && (
                    <div className="p-2 bg-red-950/80 border border-red-800 text-xs text-red-300 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                      <span>FAILURE REASON: {item.errorMessage}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-[10px] text-pixel-muted font-mono pt-1">
                    <span>QUEUED: {new Date(item.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                    {item.sentAt && (
                      <span className="text-cyan-400">
                        SENT: {new Date(item.sentAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                      </span>
                    )}
                    {item.deliveredAt && (
                      <span className="text-green-400">
                        DELIVERED: {new Date(item.deliveredAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Retry action for failed deliveries */}
                {item.status === "FAILED" && (
                  <div className="shrink-0">
                    <button
                      onClick={() => handleRetry(item.id)}
                      disabled={retryingId === item.id}
                      className="px-3 py-1.5 bg-pixel-orange-fiery text-black hover:bg-pixel-orange-bright font-display font-bold text-xs uppercase flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(249,115,22,0.4)] disabled:opacity-50"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${retryingId === item.id ? "animate-spin" : ""}`} />
                      <span>{retryingId === item.id ? "RETRYING..." : "RETRY DELIVERY"}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </CommunicationsPortalShell>
  );
}
