import type { RealtimeData } from "./ga-api";

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const csv = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCountries(data: RealtimeData) {
  downloadCSV(
    "countries.csv",
    ["Country", "Users"],
    data.byCountry.map((c) => [c.country, c.users])
  );
}

export function exportPages(data: RealtimeData) {
  downloadCSV(
    "top-pages.csv",
    ["Page", "Users", "Pageviews"],
    data.byPage.map((p) => [p.page, p.users, p.pageviews])
  );
}

export function exportEvents(data: RealtimeData) {
  downloadCSV(
    "top-events.csv",
    ["Event Name", "Count"],
    data.byEvent.map((e) => [e.eventName, e.count])
  );
}

export function exportSources(data: RealtimeData) {
  downloadCSV(
    "traffic-sources.csv",
    ["Source", "Users"],
    data.bySource.map((s) => [s.source, s.users])
  );
}
