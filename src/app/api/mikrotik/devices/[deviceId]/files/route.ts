import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDeviceCredentials } from "@/lib/mikrotik/get-device-credentials";
import {
  releaseStagedUpload,
  stageUploadForFetch,
} from "@/lib/mikrotik/upload-staging";
import { connect, disconnect } from "@/services/mikrotik/connect";
import {
  MAX_UPLOAD_BYTES,
} from "@/services/mikrotik/file-limits";
import {
  readDeviceFile,
  uploadDeviceFile,
} from "@/services/mikrotik/files";

export const dynamic = "force-dynamic";

async function requireDeviceAccess(deviceId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: new NextResponse("Não autorizado", { status: 401 }) };
  }

  const device = await getDeviceCredentials(deviceId);
  if (!device) {
    return { error: new NextResponse("Equipamento não encontrado", { status: 404 }) };
  }

  return { device };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await context.params;
  const access = await requireDeviceAccess(deviceId);
  if ("error" in access && access.error) return access.error;

  const { device } = access;
  const fileName = new URL(request.url).searchParams.get("name");
  if (!fileName) {
    return new NextResponse("Informe o parâmetro name", { status: 400 });
  }

  const apiSession = await connect({
    host: device.host,
    apiPort: device.apiPort,
    apiSsl: device.apiSsl,
    username: device.username,
    password: device.password,
  });

  try {
    const buffer = await readDeviceFile(apiSession, fileName);
    const safeName = fileName.split(/[/\\]/).pop() ?? "arquivo";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName}"`,
      },
    });
  } finally {
    disconnect(apiSession);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ deviceId: string }> },
) {
  const { deviceId } = await context.params;
  const access = await requireDeviceAccess(deviceId);
  if ("error" in access && access.error) return access.error;

  const { device } = access;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `Arquivo excede o limite de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB`,
      },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const stagingToken = stageUploadForFetch(
    buffer,
    file.name,
    file.type || "application/octet-stream",
  );

  const apiSession = await connect({
    host: device.host,
    apiPort: device.apiPort,
    apiSsl: device.apiSsl,
    username: device.username,
    password: device.password,
  }, 120);

  try {
    const result = await uploadDeviceFile(
      apiSession,
      device,
      file.name,
      buffer,
      stagingToken,
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao enviar arquivo para o equipamento",
      },
      { status: 500 },
    );
  } finally {
    releaseStagedUpload(stagingToken);
    disconnect(apiSession);
  }
}
