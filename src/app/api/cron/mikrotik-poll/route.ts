import { NextResponse } from "next/server";

import { pollEligibleDevices } from "@/lib/mikrotik/poll-device";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const summary = await pollEligibleDevices();

  return NextResponse.json({
    success: true,
    ...summary,
  });
}
