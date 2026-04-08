"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getUserSettings, saveUserSettings, type UserSettings } from "@/lib/firestore";
import { useTheme } from "next-themes";

const METRIC_LABELS: Record<string, string> = {
  activeUsers: "Active Users",
  pageviews: "Pageviews",
  sessionDuration: "Session Duration",
  bounceRate: "Bounce Rate",
  trafficSources: "Traffic Sources",
  topPages: "Top Pages",
  geoMap: "Geographic Map",
  deviceBreakdown: "Device Breakdown",
  events: "Events",
  conversions: "Conversions",
  newVsReturning: "New vs Returning",
  pageLoadTime: "Page Load Time",
  sparkline: "Active Users Sparkline",
  topEvents: "Top Events",
  platformBreakdown: "Platform Breakdown",
};

const REFRESH_OPTIONS = [
  { value: 15, label: "15 seconds" },
  { value: 30, label: "30 seconds" },
  { value: 60, label: "1 minute" },
  { value: 300, label: "5 minutes" },
];

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    getUserSettings(user.uid).then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, [user]);

  const save = async (updates: Partial<UserSettings>) => {
    if (!user || !settings) return;
    setSaving(true);
    const merged = { ...settings, ...updates };
    setSettings(merged);
    await saveUserSettings(user.uid, merged);
    setSaving(false);
  };

  const toggleMetric = (key: string) => {
    if (!settings) return;
    const updated = {
      ...settings.visibleMetrics,
      [key]: !settings.visibleMetrics[key],
    };
    save({ visibleMetrics: updated });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-text-primary">Settings</h1>

      {/* Display Preferences */}
      <div className="rounded-xl border border-border bg-bg-card p-5 backdrop-blur-sm space-y-5">
        <h2 className="text-sm font-semibold text-text-primary">Display Preferences</h2>

        {/* Theme */}
        <div>
          <label className="mb-2 block text-xs font-medium text-text-secondary">Theme</label>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTheme(t);
                  save({ theme: t });
                }}
                className={`flex-1 px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  theme === t
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:bg-accent-light"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Refresh interval */}
        <div>
          <label className="mb-2 block text-xs font-medium text-text-secondary">
            Auto-refresh interval
          </label>
          <select
            value={settings?.refreshInterval || 30}
            onChange={(e) => save({ refreshInterval: parseInt(e.target.value) })}
            className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none"
          >
            {REFRESH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Default view */}
        <div>
          <label className="mb-2 block text-xs font-medium text-text-secondary">
            Default stream view
          </label>
          <select
            value={settings?.defaultView || "all"}
            onChange={(e) => save({ defaultView: e.target.value as "all" | "single" })}
            className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none"
          >
            <option value="all">All Streams</option>
            <option value="single">Single Stream</option>
          </select>
        </div>
      </div>

      {/* Visible Metrics */}
      <div className="rounded-xl border border-border bg-bg-card p-5 backdrop-blur-sm">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Visible Metrics</h2>
        <p className="text-xs text-text-muted mb-4">
          Choose which metrics to show on your dashboard
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(METRIC_LABELS).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 cursor-pointer hover:bg-accent-light transition-colors"
            >
              <span className="text-sm text-text-secondary">{label}</span>
              <button
                onClick={() => toggleMetric(key)}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                  settings?.visibleMetrics[key] ? "bg-accent" : "bg-text-muted/30"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    settings?.visibleMetrics[key] ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      </div>

      {/* Account */}
      <div className="rounded-xl border border-border bg-bg-card p-5 backdrop-blur-sm space-y-4">
        <h2 className="text-sm font-semibold text-text-primary">Account</h2>

        {user && (
          <div className="flex items-center gap-3">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt=""
                className="h-12 w-12 rounded-full ring-2 ring-border"
              />
            )}
            <div>
              <p className="font-medium text-text-primary">{user.displayName}</p>
              <p className="text-xs text-text-muted">{user.email}</p>
            </div>
          </div>
        )}

        <p className="text-xs text-text-muted">
          Connected since: {user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : "N/A"}
        </p>

        <button
          onClick={signOut}
          className="rounded-lg border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 transition-colors"
        >
          Sign Out
        </button>
      </div>

      {saving && (
        <p className="text-xs text-text-muted text-center">Saving...</p>
      )}
    </div>
  );
}
