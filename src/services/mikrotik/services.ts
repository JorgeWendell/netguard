import type { MikrotikServiceData, MikrotikSession } from "./types";

import { fetchDhcpServers } from "./dhcp";
import { fetchDnsServices } from "./dns";
import { fetchNtpServices } from "./ntp";
import { fetchOpenVpnClients } from "./openvpn";
import { fetchPppoeClients } from "./pppoe-client";

export async function fetchServiceList(
  session: MikrotikSession,
): Promise<MikrotikServiceData[]> {
  const [dhcpServers, openVpnClients, pppoeClients, dnsServices, ntpServices] =
    await Promise.all([
      fetchDhcpServers(session),
      fetchOpenVpnClients(session),
      fetchPppoeClients(session),
      fetchDnsServices(session),
      fetchNtpServices(session),
    ]);

  return [
    ...dhcpServers,
    ...openVpnClients,
    ...pppoeClients,
    ...dnsServices,
    ...ntpServices,
  ];
}
