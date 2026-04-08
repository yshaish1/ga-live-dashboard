"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { getStreams, getUserSettings, type GAStream, type UserSettings } from "@/lib/firestore";
import { fetchRealtimeData, type RealtimeData } from "@/lib/ga-api";
import { MetricCard } from "@/components/metric-card";
import {
  TrafficSourcesChart,
  DeviceChart,
  TopPagesTable,
  CountryChart,
} from "@/components/dashboard-charts";
import { Users, Eye, Clock, TrendingDown, RefreshCw, LayoutGrid, Layers } from "lucide-react";

const EMPTY_DATA: RealtimeData = {
  activeUsers: 0,
  pageviews: 0,
  events: 0,
  conversions: 0,
  byCountry: [],
  byDevice: [],
  byPage: [],
  bySource: [],
};

type ViewMode = "all" | "by-app";

export default function DashboardPage() {
  const { user, gaAccessToken } = useAuth();
  const [streams, setStreams] = useState<GAStream[]>([]);
  const [selectedStream, setSelectedStream] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("ga-view-mode") as ViewMode) || "all";
    }
    return "all";
  });

  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("ga-view-mode", mode);
  };
  const [data, setData] = useState<RealtimeData>(EMPTY_DATA);
  const [perStreamData, setPerStreamData] = useState<Map<string, RealtimeData>>(new Map());
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getStreams(user.uid), getUserSettings(user.uid)]).then(
      ([s, settings]) => {
        setStreams(s.filter((st) => st.active));
        setSettings(settings);
        setLoading(false);
      }
    );
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!gaAccessToken || streams.length === 0) return;

    try {
      setError(null);
      const activeStreams =
        selectedStream === "all"
          ? streams
          : streams.filter((s) => s.id === selectedStream);

      const results = await Promise.all(
        activeStreams.map((s) => fetchRealtimeData(s.propertyId, gaAccessToken))
      );

      // Store per-stream data
      const newPerStream = new Map<string, RealtimeData>();
      activeStreams.forEach((s, i) => {
        newPerStream.set(s.id!, results[i]);
      });
      setPerStreamData(newPerStream);

      // Merged data
      const merged: RealtimeData = results.reduce(
        (acc, r) => ({
          activeUsers: acc.activeUsers + r.activeUsers,
          pageviews: acc.pageviews + r.pageviews,
          events: acc.events + r.events,
          conversions: acc.conversions + r.conversions,
          byCountry: mergeByKey(acc.byCountry, r.byCountry, "country", "users"),
          byDevice: mergeByKey(acc.byDevice, r.byDevice, "device", "users"),
          byPage: mergePages(acc.byPage, r.byPage),
          bySource: mergeByKey(acc.bySource, r.bySource, "source", "users"),
        }),
        EMPTY_DATA
      );

      setData(merged);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message || "Failed to fetch data");
    }
  }, [gaAccessToken, streams, selectedStream]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const interval = (settings?.refreshInterval || 30) * 1000;
    intervalRef.current = setInterval(fetchData, interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, settings?.refreshInterval]);

  const vm = settings?.visibleMetrics;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-text-primary">Dashboard</h1>
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => handleViewMode("all")}
              title="View All"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "all"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:bg-accent-light"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View All</span>
            </button>
            <button
              onClick={() => handleViewMode("by-app")}
              title="By App"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "by-app"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:bg-accent-light"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">By App</span>
            </button>
          </div>

          {viewMode === "all" && (
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
              className="rounded-lg border border-border bg-bg-card px-3 py-1.5 text-sm text-text-primary outline-none"
            >
              <option value="all">All Streams ({streams.length})</option>
              {streams.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.streamName}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1.5 text-xs text-success">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse-dot" />
            Live
          </div>

          <button
            onClick={fetchData}
            className="rounded-lg p-1.5 text-text-muted hover:bg-accent-light hover:text-text-primary transition-colors"
            title="Refresh now"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {lastUpdated && (
            <span className="text-xs text-text-muted hidden sm:inline">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {streams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-text-muted mb-2">No active streams</p>
          <a href="/streams" className="text-sm text-accent hover:underline">
            Add your first GA stream
          </a>
        </div>
      ) : viewMode === "by-app" ? (
        <ByAppView streams={streams} perStreamData={perStreamData} vm={vm} />
      ) : (
        <AllView data={data} vm={vm} />
      )}
    </div>
  );
}

function AllView({ data, vm }: { data: RealtimeData; vm?: Record<string, boolean> | null }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(!vm || vm.activeUsers) && (
          <MetricCard
            title="Active Users"
            value={data.activeUsers.toLocaleString()}
            icon={<Users className="h-4 w-4" />}
            live
          />
        )}
        {(!vm || vm.pageviews) && (
          <MetricCard
            title="Pageviews"
            value={data.pageviews.toLocaleString()}
            icon={<Eye className="h-4 w-4" />}
          />
        )}
        {(!vm || vm.events) && (
          <MetricCard
            title="Events"
            value={data.events.toLocaleString()}
            icon={<Clock className="h-4 w-4" />}
          />
        )}
        {(!vm || vm.conversions) && (
          <MetricCard
            title="Conversions"
            value={data.conversions.toLocaleString()}
            icon={<TrendingDown className="h-4 w-4" />}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {(!vm || vm.geoMap) && (
          <div className="lg:col-span-3">
            <CountryChart data={data} />
          </div>
        )}
        {(!vm || vm.trafficSources) && (
          <div className="lg:col-span-2">
            <TrafficSourcesChart data={data} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {(!vm || vm.topPages) && (
          <div className="lg:col-span-3">
            <TopPagesTable data={data} />
          </div>
        )}
        {(!vm || vm.deviceBreakdown) && (
          <div className="lg:col-span-2">
            <DeviceChart data={data} />
          </div>
        )}
      </div>
    </>
  );
}

function ByAppView({
  streams,
  perStreamData,
  vm,
}: {
  streams: GAStream[];
  perStreamData: Map<string, RealtimeData>;
  vm?: Record<string, boolean> | null;
}) {
  const [expandedStream, setExpandedStream] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Summary cards - one per stream */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {streams.map((stream) => {
          const d = perStreamData.get(stream.id!) || EMPTY_DATA;
          const isExpanded = expandedStream === stream.id;

          return (
            <button
              key={stream.id}
              onClick={() => setExpandedStream(isExpanded ? null : stream.id!)}
              className={`text-left rounded-xl border bg-bg-card p-4 backdrop-blur-sm transition-all ${
                isExpanded ? "border-accent ring-1 ring-accent/30" : "border-border hover:border-accent/40"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-text-primary text-sm truncate">
                    {stream.streamName}
                  </h3>
                  <p className="text-[10px] text-text-muted mt-0.5">GA4 - {stream.propertyId}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-success shrink-0 ml-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-dot" />
                  Live
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-bg-secondary p-2.5">
                  <p className="text-[10px] text-text-muted">Active Users</p>
                  <p className="text-lg font-bold text-text-primary">{d.activeUsers.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-bg-secondary p-2.5">
                  <p className="text-[10px] text-text-muted">Pageviews</p>
                  <p className="text-lg font-bold text-text-primary">{d.pageviews.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-bg-secondary p-2.5">
                  <p className="text-[10px] text-text-muted">Events</p>
                  <p className="text-lg font-bold text-text-primary">{d.events.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-bg-secondary p-2.5">
                  <p className="text-[10px] text-text-muted">Conversions</p>
                  <p className="text-lg font-bold text-text-primary">{d.conversions.toLocaleString()}</p>
                </div>
              </div>

              {/* Top pages preview */}
              {d.byPage.length > 0 && (
                <div className="mt-3 space-y-1">
                  {d.byPage.slice(0, 3).map((p) => (
                    <div key={p.page} className="flex items-center justify-between text-[11px]">
                      <span className="text-text-secondary truncate max-w-[70%]">{p.page}</span>
                      <span className="text-text-primary font-medium">{p.users}</span>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-3 text-[10px] text-accent text-center">
                {isExpanded ? "Click to collapse" : "Click for details"}
              </p>
            </button>
          );
        })}
      </div>

      {/* Expanded detail view */}
      {expandedStream && (
        <StreamDetailView
          stream={streams.find((s) => s.id === expandedStream)!}
          data={perStreamData.get(expandedStream) || EMPTY_DATA}
          vm={vm}
        />
      )}
    </div>
  );
}

function StreamDetailView({
  stream,
  data,
  vm,
}: {
  stream: GAStream;
  data: RealtimeData;
  vm?: Record<string, boolean> | null;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-accent/20 bg-bg-card/50 p-4">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-accent" />
        <h2 className="text-sm font-semibold text-text-primary">{stream.streamName} - Detailed View</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {(!vm || vm.geoMap) && (
          <div className="lg:col-span-3">
            <CountryChart data={data} />
          </div>
        )}
        {(!vm || vm.trafficSources) && (
          <div className="lg:col-span-2">
            <TrafficSourcesChart data={data} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {(!vm || vm.topPages) && (
          <div className="lg:col-span-3">
            <TopPagesTable data={data} />
          </div>
        )}
        {(!vm || vm.deviceBreakdown) && (
          <div className="lg:col-span-2">
            <DeviceChart data={data} />
          </div>
        )}
      </div>
    </div>
  );
}

function mergeByKey<T extends Record<string, any>>(
  a: T[],
  b: T[],
  key: string,
  valueKey: string
): T[] {
  const map = new Map<string, number>();
  for (const item of [...a, ...b]) {
    map.set(item[key], (map.get(item[key]) || 0) + item[valueKey]);
  }
  return Array.from(map.entries())
    .map(([k, v]) => ({ [key]: k, [valueKey]: v } as unknown as T))
    .sort((x, y) => (y as any)[valueKey] - (x as any)[valueKey]);
}

function mergePages(
  a: RealtimeData["byPage"],
  b: RealtimeData["byPage"]
): RealtimeData["byPage"] {
  const map = new Map<string, { users: number; pageviews: number }>();
  for (const item of [...a, ...b]) {
    const existing = map.get(item.page) || { users: 0, pageviews: 0 };
    map.set(item.page, {
      users: existing.users + item.users,
      pageviews: existing.pageviews + item.pageviews,
    });
  }
  return Array.from(map.entries())
    .map(([page, data]) => ({ page, ...data }))
    .sort((a, b) => b.users - a.users);
}
