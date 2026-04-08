"use client";

import { useState } from "react";
import { Bell, X, Plus, Trash2 } from "lucide-react";
import type { AlertConfig } from "@/lib/firestore";

type Props = {
  alerts: AlertConfig[];
  onAdd: (config: Omit<AlertConfig, "id" | "userId" | "createdAt">) => Promise<void>;
  onToggle: (id: string, enabled: boolean) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
};

export function AlertManagerButton({ alerts, onAdd, onToggle, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const activeCount = alerts.filter((a) => a.enabled).length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative rounded-lg p-1.5 text-text-muted hover:bg-accent-light hover:text-text-primary transition-colors"
        title="Manage alerts"
      >
        <Bell className="h-4 w-4" />
        {activeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <AlertModal
          alerts={alerts}
          onAdd={onAdd}
          onToggle={onToggle}
          onRemove={onRemove}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function AlertModal({
  alerts,
  onAdd,
  onToggle,
  onRemove,
  onClose,
}: Props & { onClose: () => void }) {
  const [metricKey, setMetricKey] = useState<AlertConfig["metricKey"]>("activeUsers");
  const [condition, setCondition] = useState<AlertConfig["condition"]>("below");
  const [threshold, setThreshold] = useState("");
  const [adding, setAdding] = useState(false);

  const requestPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const handleAdd = async () => {
    const val = parseInt(threshold);
    if (isNaN(val) || val < 0) return;
    setAdding(true);
    await requestPermission();
    await onAdd({ metricKey, condition, threshold: val, enabled: true });
    setThreshold("");
    setAdding(false);
  };

  const metricLabels: Record<string, string> = {
    activeUsers: "Active Users",
    pageviews: "Pageviews",
    events: "Events",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-bg-primary p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text-primary">Alert Rules</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Add new alert */}
        <div className="rounded-lg border border-border p-3 mb-4">
          <p className="text-xs font-medium text-text-secondary mb-2">New Alert</p>
          <div className="flex flex-wrap gap-2">
            <select
              value={metricKey}
              onChange={(e) => setMetricKey(e.target.value as AlertConfig["metricKey"])}
              className="rounded-lg border border-border bg-bg-card px-2 py-1.5 text-xs text-text-primary outline-none"
            >
              <option value="activeUsers">Active Users</option>
              <option value="pageviews">Pageviews</option>
              <option value="events">Events</option>
            </select>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as AlertConfig["condition"])}
              className="rounded-lg border border-border bg-bg-card px-2 py-1.5 text-xs text-text-primary outline-none"
            >
              <option value="below">drops below</option>
              <option value="above">exceeds</option>
            </select>
            <input
              type="number"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="value"
              className="w-20 rounded-lg border border-border bg-bg-card px-2 py-1.5 text-xs text-text-primary outline-none"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !threshold}
              className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>
        </div>

        {/* Existing alerts */}
        {alerts.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-4">
            No alerts configured. Add one above to get notified when metrics change.
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => alert.id && onToggle(alert.id, !alert.enabled)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      alert.enabled ? "bg-accent" : "bg-bg-secondary"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        alert.enabled ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </button>
                  <span className="text-xs text-text-primary truncate">
                    {metricLabels[alert.metricKey]} {alert.condition === "above" ? ">" : "<"}{" "}
                    {alert.threshold}
                  </span>
                </div>
                <button
                  onClick={() => alert.id && onRemove(alert.id)}
                  className="text-text-muted hover:text-danger transition-colors shrink-0 ml-2"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {"Notification" in globalThis && Notification.permission !== "granted" && (
          <button
            onClick={requestPermission}
            className="mt-4 w-full rounded-lg border border-border px-3 py-2 text-xs text-text-secondary hover:bg-accent-light transition-colors"
          >
            Enable browser notifications
          </button>
        )}
      </div>
    </div>
  );
}
