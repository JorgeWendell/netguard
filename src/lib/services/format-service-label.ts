export function formatServiceLabel(service: string): string {
  const [type, name] = service.split(":", 2);
  const labels: Record<string, string> = {
    "dhcp-server": "DHCP Server",
    "openvpn-client": "OpenVPN Client",
    "pppoe-client": "PPPoE Client",
    dns: "DNS",
    "ntp-client": "NTP Client",
    "ntp-server": "NTP Server",
  };

  const label = labels[type] ?? type.replace(/-/g, " ");
  if (!name || name === "settings") return label;
  return `${label} (${name})`;
}
