"use client";

import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { RealtimeData } from "@/lib/ga-api";

export function SparklineChart({ data }: { data: RealtimeData }) {
  const chartData = data.byMinute.length
    ? data.byMinute.map((d) => ({ label: `${d.minute}m ago`, users: d.users }))
    : [];

  const peak = Math.max(...chartData.map((d) => d.users), 0);

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">Active Users (Last 30 min)</h3>
        {peak > 0 && (
          <span className="text-xs text-text-muted">Peak: {peak}</span>
        )}
      </div>
      {chartData.length === 0 ? (
        <p className="text-xs text-text-muted">No data available</p>
      ) : (
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" hide />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "var(--text-secondary)" }}
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#sparkGradient)"
                dot={false}
                activeDot={{ r: 3, fill: "#6366f1" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
