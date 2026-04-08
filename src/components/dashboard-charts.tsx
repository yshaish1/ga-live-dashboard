"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download } from "lucide-react";
import type { RealtimeData } from "@/lib/ga-api";
import { exportCountries, exportPages, exportSources } from "@/lib/csv-export";

const COLORS = ["#6366f1", "#22d3ee", "#a78bfa", "#f59e0b", "#ef4444", "#22c55e"];

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="text-text-muted hover:text-text-primary transition-colors"
      title="Export CSV"
    >
      <Download className="h-3.5 w-3.5" />
    </button>
  );
}

export function TrafficSourcesChart({ data }: { data: RealtimeData }) {
  const sources = data.bySource.length
    ? data.bySource.map((s) => ({ name: s.source, value: s.users }))
    : [{ name: "No data", value: 0 }];

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Traffic Sources</h3>
        {data.bySource.length > 0 && <ExportButton onClick={() => exportSources(data)} />}
      </div>
      <div className="flex items-center gap-6">
        <div className="h-48 w-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sources}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                dataKey="value"
                stroke="none"
              >
                {sources.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2">
          {sources.map((s, i) => (
            <div key={s.name} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: COLORS[i] }}
              />
              <span className="text-text-secondary">{s.name}</span>
              <span className="ml-auto font-medium text-text-primary">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DeviceChart({ data }: { data: RealtimeData }) {
  const [tab, setTab] = useState<"device" | "platform">("device");

  const devices = data.byDevice.length
    ? data.byDevice
    : [
        { device: "Desktop", users: 0 },
        { device: "Mobile", users: 0 },
        { device: "Tablet", users: 0 },
      ];

  const platforms = data.byPlatform.length
    ? data.byPlatform
    : [{ platform: "Web", users: 0 }];

  const items = tab === "device"
    ? devices.map((d) => ({ name: d.device, users: d.users }))
    : platforms.map((p) => ({ name: p.platform, users: p.users }));

  const total = items.reduce((a, b) => a + b.users, 0) || 1;

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("device")}
            className={`text-sm font-semibold transition-colors ${
              tab === "device" ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Device
          </button>
          <span className="text-text-muted text-xs">/</span>
          <button
            onClick={() => setTab("platform")}
            className={`text-sm font-semibold transition-colors ${
              tab === "platform" ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Platform
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {items.map((d) => {
          const pct = Math.round((d.users / total) * 100);
          return (
            <div key={d.name}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-text-secondary capitalize">{d.name}</span>
                <span className="font-medium text-text-primary">{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-bg-secondary">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TopPagesTable({ data }: { data: RealtimeData }) {
  const pages = data.byPage.length ? data.byPage.slice(0, 8) : [];

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Top Active Pages</h3>
        {pages.length > 0 && <ExportButton onClick={() => exportPages(data)} />}
      </div>
      {pages.length === 0 ? (
        <p className="text-xs text-text-muted">No data available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="pb-2 text-left font-medium">Page</th>
                <th className="pb-2 text-right font-medium">Users</th>
                <th className="pb-2 text-right font-medium">Views</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.page} className="border-b border-border/50">
                  <td className="py-2 text-text-secondary truncate max-w-[200px]">{p.page}</td>
                  <td className="py-2 text-right font-medium text-text-primary">{p.users}</td>
                  <td className="py-2 text-right font-medium text-text-primary">{p.pageviews}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function CountryChart({ data }: { data: RealtimeData }) {
  const countries = data.byCountry.length ? data.byCountry.slice(0, 8) : [];

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Users by Country</h3>
        {countries.length > 0 && <ExportButton onClick={() => exportCountries(data)} />}
      </div>
      {countries.length === 0 ? (
        <p className="text-xs text-text-muted">No data available</p>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={countries} layout="vertical">
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="country"
                width={80}
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                }}
              />
              <Bar dataKey="users" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
