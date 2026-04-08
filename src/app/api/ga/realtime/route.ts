import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { propertyId, accessToken } = await req.json();

  if (!propertyId || !accessToken) {
    return Response.json({ error: "Missing propertyId or accessToken" }, { status: 400 });
  }

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`;

  const mainBody = {
    dimensions: [
      { name: "country" },
      { name: "deviceCategory" },
      { name: "unifiedScreenName" },
    ],
    metrics: [
      { name: "activeUsers" },
      { name: "screenPageViews" },
      { name: "eventCount" },
    ],
  };

  const sourceBody = {
    dimensions: [{ name: "sessionSource" }],
    metrics: [{ name: "activeUsers" }],
  };

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const [mainRes, sourceRes] = await Promise.all([
    fetch(url, { method: "POST", headers, body: JSON.stringify(mainBody) }),
    fetch(url, { method: "POST", headers, body: JSON.stringify(sourceBody) }),
  ]);

  if (!mainRes.ok) {
    const error = await mainRes.text();
    return Response.json({ error }, { status: mainRes.status });
  }

  const mainData = await mainRes.json();
  const sourceData = sourceRes.ok ? await sourceRes.json() : { rows: [] };

  return Response.json({ ...mainData, sourceRows: sourceData.rows || [] });
}
