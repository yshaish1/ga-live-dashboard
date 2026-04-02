import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { accessToken } = await req.json();

  if (!accessToken) {
    return Response.json({ error: "Missing accessToken" }, { status: 400 });
  }

  const url = "https://analyticsadmin.googleapis.com/v1beta/accountSummaries";

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    return Response.json({ error }, { status: res.status });
  }

  const data = await res.json();
  return Response.json(data);
}
