"use client";

import type { RealtimeData } from "@/lib/ga-api";

export function TopEventsTable({ data }: { data: RealtimeData }) {
  const events = data.byEvent.length ? data.byEvent.slice(0, 8) : [];

  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-semibold text-text-primary">Top Events</h3>
      {events.length === 0 ? (
        <p className="text-xs text-text-muted">No data available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="pb-2 text-left font-medium">Event</th>
                <th className="pb-2 text-right font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.eventName} className="border-b border-border/50">
                  <td className="py-2 text-text-secondary truncate max-w-[200px]">
                    {e.eventName}
                  </td>
                  <td className="py-2 text-right font-medium text-text-primary">
                    {e.count.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
