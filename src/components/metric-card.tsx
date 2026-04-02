"use client";

import { ReactNode } from "react";

type Props = {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: number; positive: boolean };
  live?: boolean;
};

export function MetricCard({ title, value, icon, trend, live }: Props) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-muted">{title}</span>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-2xl font-bold text-text-primary">{value}</span>
        {live && (
          <span className="mb-1 flex items-center gap-1 text-xs text-success">
            <span className="inline-block h-2 w-2 rounded-full bg-success animate-pulse-dot" />
            Live
          </span>
        )}
        {trend && (
          <span
            className={`mb-1 text-xs font-medium ${
              trend.positive ? "text-success" : "text-danger"
            }`}
          >
            {trend.positive ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}
