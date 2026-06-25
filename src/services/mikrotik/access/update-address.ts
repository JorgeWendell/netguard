import type { MikrotikSession } from "../types";

export async function updateDeviceAddress(
  session: MikrotikSession,
  addressId: string,
  address: string,
): Promise<void> {
  await session.write("/ip/address/set", [
    `=.id=${addressId}`,
    `=address=${address}`,
  ]);
}
