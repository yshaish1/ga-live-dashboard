import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { propertyId, accessToken } = await req.json();

  if (!propertyId || !accessToken) {
    return Response.json({ error: "Missing propertyId or accessToken" }, { status: 400 });
  }

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`;

  const body = {
    dimensions: [
      { name: "country" },
      { name: "deviceCategory" },
      { name: "unifiedScreenName" },
    ],
    metrics: [
      { name: "activeUsers" },
      { name: "screenPageViews" },
      { name: "conversions" },
      { name: "eventCount" },
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
  return Response.json(data);
}
