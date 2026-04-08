import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { propertyId, accessToken } = await req.json();

  if (!propertyId || !accessToken) {
    return Response.json({ error: "Missing propertyId or accessToken" }, { status: 400 });
  }

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  const body = {
    dateRanges: [
      { startDate: "today", endDate: "today" },
      { startDate: "yesterday", endDate: "yesterday" },
    ],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "screenPageViews" },
      { name: "keyEvents" },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    return Response.json({ error }, { status: res.status });
  }

  const data = await res.json();
  const rows = data.rows || [];

  const empty = { sessions: 0, users: 0, pageviews: 0, keyEvents: 0 };
  const today = { ...empty };
  const yesterday = { ...empty };

  for (const row of rows) {
    const dateRangeIndex = parseInt(row.dimensionValues?.[0]?.value || "0");
    const target = dateRangeIndex === 0 ? today : yesterday;
    target.sessions += parseInt(row.metricValues?.[0]?.value || "0");
    target.users += parseInt(row.metricValues?.[1]?.value || "0");
    target.pageviews += parseInt(row.metricValues?.[2]?.value || "0");
    target.keyEvents += parseInt(row.metricValues?.[3]?.value || "0");
  }

  return Response.json({ today, yesterday });
}
