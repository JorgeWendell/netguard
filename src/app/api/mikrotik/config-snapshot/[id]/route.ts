import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/db/index";
import {
  mikrotikConfigSnapshotsTable,
  mikrotikDevicesTable,
} from "@/db/schema";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const { id } = await context.params;

  const [snapshot] = await db
    .select({
      config: mikrotikConfigSnapshotsTable.config,
      createdAt: mikrotikConfigSnapshotsTable.createdAt,
      deviceName: mikrotikDevicesTable.name,
    })
    .from(mikrotikConfigSnapshotsTable)
    .innerJoin(
      mikrotikDevicesTable,
      eq(mikrotikConfigSnapshotsTable.deviceId, mikrotikDevicesTable.id),
    )
    .where(eq(mikrotikConfigSnapshotsTable.id, id))
    .limit(1);

  if (!snapshot) {
    return new NextResponse("Backup não encontrado", { status: 404 });
  }

  const date = snapshot.createdAt.toISOString().slice(0, 10);
  const filename = `${snapshot.deviceName}-${date}.rsc`;

  return new NextResponse(snapshot.config, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
