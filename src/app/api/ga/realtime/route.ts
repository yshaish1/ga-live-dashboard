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

  const minuteBody = {
    dimensions: [{ name: "minutesAgo" }],
    metrics: [{ name: "activeUsers" }],
  };

  const eventBody = {
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "eventCount" }],
  };

  const platformBody = {
    dimensions: [{ name: "platform" }],
    metrics: [{ name: "activeUsers" }],
  };

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const fetchGA = (body: object) =>
    fetch(url, { method: "POST", headers, body: JSON.stringify(body) });

  const [mainRes, sourceRes, minuteRes, eventRes, platformRes] = await Promise.all([
    fetchGA(mainBody),
    fetchGA(sourceBody),
    fetchGA(minuteBody),
    fetchGA(eventBody),
    fetchGA(platformBody),
  ]);

  if (!mainRes.ok) {
    const error = await mainRes.text();
    return Response.json({ error }, { status: mainRes.status });
  }

  const mainData = await mainRes.json();
  const safeRows = async (res: Response) =>
    res.ok ? (await res.json()).rows || [] : [];

  const [sourceRows, minuteRows, eventRows, platformRows] = await Promise.all([
    safeRows(sourceRes),
    safeRows(minuteRes),
    safeRows(eventRes),
    safeRows(platformRes),
  ]);

  return Response.json({
    ...mainData,
    sourceRows,
    minuteRows,
    eventRows,
    platformRows,
  });
}
