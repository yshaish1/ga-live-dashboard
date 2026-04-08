export type RealtimeData = {
  activeUsers: number;
  pageviews: number;
  events: number;
  conversions: number;
  byCountry: { country: string; users: number }[];
  byDevice: { device: string; users: number }[];
  byPage: { page: string; users: number; pageviews: number }[];
  bySource: { source: string; users: number }[];
};

function parseRows(rows: any[] | undefined): any[] {
  return rows || [];
}

export function parseRealtimeReport(data: any): RealtimeData {
  const rows = parseRows(data.rows);

  let activeUsers = 0;
  let pageviews = 0;
  let events = 0;
  let conversions = 0;

  const countryMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();
  const pageMap = new Map<string, { users: number; pageviews: number }>();

  for (const row of rows) {
    const country = row.dimensionValues?.[0]?.value || "Unknown";
    const device = row.dimensionValues?.[1]?.value || "Unknown";
    const page = row.dimensionValues?.[2]?.value || "Unknown";

    const users = parseInt(row.metricValues?.[0]?.value || "0");
    const pv = parseInt(row.metricValues?.[1]?.value || "0");
    const evt = parseInt(row.metricValues?.[2]?.value || "0");

    activeUsers += users;
    pageviews += pv;
    events += evt;

    countryMap.set(country, (countryMap.get(country) || 0) + users);
    deviceMap.set(device, (deviceMap.get(device) || 0) + users);

    const existing = pageMap.get(page) || { users: 0, pageviews: 0 };
    pageMap.set(page, { users: existing.users + users, pageviews: existing.pageviews + pv });
  }

  const byCountry = Array.from(countryMap.entries())
    .map(([country, users]) => ({ country, users }))
    .sort((a, b) => b.users - a.users)
    .slice(0, 10);

  const byDevice = Array.from(deviceMap.entries())
    .map(([device, users]) => ({ device, users }))
    .sort((a, b) => b.users - a.users);

  const byPage = Array.from(pageMap.entries())
    .map(([page, data]) => ({ page, ...data }))
    .sort((a, b) => b.users - a.users)
    .slice(0, 10);

  const sourceRows = parseRows(data.sourceRows);
  const sourceMap = new Map<string, number>();
  for (const row of sourceRows) {
    const source = row.dimensionValues?.[0]?.value || "(direct)";
    const users = parseInt(row.metricValues?.[0]?.value || "0");
    sourceMap.set(source, (sourceMap.get(source) || 0) + users);
  }
  const bySource = Array.from(sourceMap.entries())
    .map(([source, users]) => ({ source, users }))
    .sort((a, b) => b.users - a.users)
    .slice(0, 10);

  return { activeUsers, pageviews, events, conversions, byCountry, byDevice, byPage, bySource };
}

export async function fetchRealtimeData(
  propertyId: string,
  accessToken: string
): Promise<RealtimeData> {
  const res = await fetch("/api/ga/realtime", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propertyId, accessToken }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("GA Realtime API error:", res.status, errorData);
    throw new Error(errorData.error || "Failed to fetch realtime data");
  }
  const data = await res.json();
  return parseRealtimeReport(data);
}

export async function fetchAccountSummaries(accessToken: string) {
  const res = await fetch("/api/ga/streams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });

  if (!res.ok) throw new Error("Failed to fetch account summaries");
  return res.json();
}
