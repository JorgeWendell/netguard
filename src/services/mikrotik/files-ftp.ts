import "server-only";

import { Readable, Writable } from "stream";

import { Client as FtpClient } from "basic-ftp";

import type { MikrotikDeviceCredentials } from "./types";

export async function uploadViaFtpToDevice(
  credentials: MikrotikDeviceCredentials,
  fileName: string,
  buffer: Buffer,
): Promise<void> {
  const client = new FtpClient(20_000);

  try {
    await client.access({
      host: credentials.host,
      user: credentials.username,
      password: credentials.password,
      secure: false,
    });

    await client.uploadFrom(Readable.from(buffer), fileName);
  } finally {
    client.close();
  }
}

export async function downloadViaFtpFromDevice(
  credentials: MikrotikDeviceCredentials,
  fileName: string,
): Promise<Buffer> {
  const client = new FtpClient(20_000);
  const chunks: Buffer[] = [];

  try {
    await client.access({
      host: credentials.host,
      user: credentials.username,
      password: credentials.password,
      secure: false,
    });

    const collector = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        callback();
      },
    });

    await client.downloadTo(collector, fileName);
    return Buffer.concat(chunks);
  } finally {
    client.close();
  }
}
