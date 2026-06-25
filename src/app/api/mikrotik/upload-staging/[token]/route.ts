import { NextResponse } from "next/server";

import { getStagedUpload } from "@/lib/mikrotik/upload-staging";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const staged = getStagedUpload(token);

  if (!staged) {
    return new NextResponse("Arquivo não encontrado ou expirado", {
      status: 404,
    });
  }

  return new NextResponse(new Uint8Array(staged.buffer), {
    headers: {
      "Content-Type": staged.mimeType || "application/octet-stream",
      "Content-Length": String(staged.buffer.length),
      "Content-Disposition": `inline; filename="${staged.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
