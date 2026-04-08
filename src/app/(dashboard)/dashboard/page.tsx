"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { getStreams, getUserSettings, type GAStream, type UserSettings } from "@/lib/firestore";
import { fetchRealtimeData, fetchHistoricalComparison, type RealtimeData, type HistoricalComparison } from "@/lib/ga-api";
import { MetricCard } from "@/components/metric-card";
import {
  TrafficSourcesChart,
  DeviceChart,
  TopPagesTable,
  CountryChart,
} from "@/components/dashboard-charts";
import { SparklineChart } from "@/components/sparkline-chart";
import { TopEventsTable } from "@/components/top-events-table";
import { AlertManagerButton } from "@/components/alert-manager";
import { useAlerts } from "@/lib/use-alerts";
import { useTVMode } from "@/lib/tv-mode-context";
import { Users, Eye, Clock, TrendingDown, RefreshCw, LayoutGrid, Layers, Maximize2, Minimize2 } from "lucide-react";

const EMPTY_DATA: RealtimeData = {
  activeUsers: 0,
  pageviews: 0,
  events: 0,
  conversions: 0,
  byCountry: [],
  byDevice: [],
  byPage: [],
  bySource: [],
  byMinute: [],
  byEvent: [],
  byPlatform: [],
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
  const [historical, setHistorical] = useState<HistoricalComparison | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const historicalRef = useRef<NodeJS.Timeout | null>(null);
  const { alerts, addAlert, toggleAlert, removeAlert } = useAlerts(user?.uid, data);
  const { isTVMode, toggleTVMode, currentStreamIndex, setStreamCount } = useTVMode();

  useEffect(() => {
    setStreamCount(streams.length);
  }, [streams.length, setStreamCount]);

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
          byMinute: mergeByMinute(acc.byMinute, r.byMinute),
          byEvent: mergeByKey(acc.byEvent, r.byEvent, "eventName", "count"),
          byPlatform: mergeByKey(acc.byPlatform, r.byPlatform, "platform", "users"),
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

  // Historical comparison — fetch once per minute
  useEffect(() => {
    if (!gaAccessToken || streams.length === 0) return;

    const fetchHistorical = async () => {
      try {
        const results = await Promise.all(
          streams.map((s) => fetchHistoricalComparison(s.propertyId, gaAccessToken))
        );
        const merged = results.reduce((acc, r) => ({
          today: {
            sessions: acc.today.sessions + r.today.sessions,
            users: acc.today.users + r.today.users,
            pageviews: acc.today.pageviews + r.today.pageviews,
            keyEvents: acc.today.keyEvents + r.today.keyEvents,
          },
          yesterday: {
            sessions: acc.yesterday.sessions + r.yesterday.sessions,
            users: acc.yesterday.users + r.yesterday.users,
            pageviews: acc.yesterday.pageviews + r.yesterday.pageviews,
            keyEvents: acc.yesterday.keyEvents + r.yesterday.keyEvents,
          },
        }));
        setHistorical(merged);
      } catch {
        // Historical data is supplementary — don't block on errors
      }
    };

    fetchHistorical();
    historicalRef.current = setInterval(fetchHistorical, 60_000);
    return () => {
      if (historicalRef.current) clearInterval(historicalRef.current);
    };
  }, [gaAccessToken, streams]);

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
          {!isTVMode && <div className="flex rounded-lg border border-border overflow-hidden">
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

          }

          {!isTVMode && viewMode === "all" && (
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

          <AlertManagerButton
            alerts={alerts}
            onAdd={addAlert}
            onToggle={toggleAlert}
            onRemove={removeAlert}
          />

          <button
            onClick={fetchData}
            className="rounded-lg p-1.5 text-text-muted hover:bg-accent-light hover:text-text-primary transition-colors"
            title="Refresh now"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            onClick={toggleTVMode}
            className="rounded-lg p-1.5 text-text-muted hover:bg-accent-light hover:text-text-primary transition-colors"
            title={isTVMode ? "Exit TV mode" : "TV mode"}
          >
            {isTVMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
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
      ) : isTVMode ? (
        <TVModeView
          streams={streams}
          perStreamData={perStreamData}
          mergedData={data}
          currentIndex={currentStreamIndex}
          vm={vm}
        />
      ) : viewMode === "by-app" ? (
        <ByAppView streams={streams} perStreamData={perStreamData} vm={vm} />
      ) : (
        <AllView data={data} vm={vm} historical={historical} />
      )}
    </div>
  );
}

function TVModeView({
  streams,
  perStreamData,
  mergedData,
  currentIndex,
  vm,
}: {
  streams: GAStream[];
  perStreamData: Map<string, RealtimeData>;
  mergedData: RealtimeData;
  currentIndex: number;
  vm?: Record<string, boolean> | null;
}) {
  const stream = streams[currentIndex];
  const data = stream ? (perStreamData.get(stream.id!) || EMPTY_DATA) : mergedData;
  const label = streams.length > 1
    ? `${stream?.streamName || "All"} (${currentIndex + 1}/${streams.length})`
    : stream?.streamName || "Dashboard";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-primary">{label}</h2>
        <div className="flex items-center gap-1.5 text-sm text-success">
          <span className="h-2.5 w-2.5 rounded-full bg-success animate-pulse-dot" />
          Live
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {(!vm || vm.activeUsers) && (
          <div className="rounded-xl border border-border bg-bg-card p-6 backdrop-blur-sm">
            <p className="text-sm text-text-muted">Active Users</p>
            <p className="text-4xl font-bold text-text-primary mt-1">{data.activeUsers.toLocaleString()}</p>
          </div>
        )}
        {(!vm || vm.pageviews) && (
          <div className="rounded-xl border border-border bg-bg-card p-6 backdrop-blur-sm">
            <p className="text-sm text-text-muted">Pageviews</p>
            <p className="text-4xl font-bold text-text-primary mt-1">{data.pageviews.toLocaleString()}</p>
          </div>
        )}
        {(!vm || vm.events) && (
          <div className="rounded-xl border border-border bg-bg-card p-6 backdrop-blur-sm">
            <p className="text-sm text-text-muted">Events</p>
            <p className="text-4xl font-bold text-text-primary mt-1">{data.events.toLocaleString()}</p>
          </div>
        )}
        {(!vm || vm.conversions) && (
          <div className="rounded-xl border border-border bg-bg-card p-6 backdrop-blur-sm">
            <p className="text-sm text-text-muted">Conversions</p>
            <p className="text-4xl font-bold text-text-primary mt-1">{data.conversions.toLocaleString()}</p>
          </div>
        )}
      </div>

      {(!vm || vm.sparkline) && <SparklineChart data={data} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(!vm || vm.geoMap) && <CountryChart data={data} />}
        {(!vm || vm.topPages) && <TopPagesTable data={data} />}
      </div>
    </div>
  );
}

function computeTrend(today: number, yesterday: number) {
  if (yesterday === 0) return undefined;
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  return { value: Math.abs(pct), positive: pct >= 0 };
}

function AllView({
  data,
  vm,
  historical,
}: {
  data: RealtimeData;
  vm?: Record<string, boolean> | null;
  historical?: HistoricalComparison | null;
}) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(!vm || vm.activeUsers) && (
          <MetricCard
            title="Active Users"
            value={data.activeUsers.toLocaleString()}
            icon={<Users className="h-4 w-4" />}
            trend={historical ? computeTrend(historical.today.users, historical.yesterday.users) : undefined}
            live
          />
        )}
        {(!vm || vm.pageviews) && (
          <MetricCard
            title="Pageviews"
            value={data.pageviews.toLocaleString()}
            icon={<Eye className="h-4 w-4" />}
            trend={historical ? computeTrend(historical.today.pageviews, historical.yesterday.pageviews) : undefined}
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
            trend={historical ? computeTrend(historical.today.keyEvents, historical.yesterday.keyEvents) : undefined}
          />
        )}
      </div>

      {(!vm || vm.sparkline) && (
        <SparklineChart data={data} />
      )}

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

      {(!vm || vm.topEvents) && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <TopEventsTable data={data} />
          </div>
        </div>
      )}
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

      {(!vm || vm.sparkline) && <SparklineChart data={data} />}

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

      {(!vm || vm.topEvents) && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <TopEventsTable data={data} />
          </div>
        </div>
      )}
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

function mergeByMinute(
  a: RealtimeData["byMinute"],
  b: RealtimeData["byMinute"]
): RealtimeData["byMinute"] {
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  return a.map((item, i) => ({
    minute: item.minute,
    users: item.users + (b[i]?.users || 0),
  }));
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
