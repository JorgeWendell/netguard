const VPN_INTERFACE_TYPES = new Set([
  "ovpn-out",
  "ovpn-in",
  "pptp-out",
  "pptp-in",
  "pptp-server",
  "l2tp-out",
  "l2tp-in",
  "l2tp-server",
  "sstp-out",
  "sstp-in",
  "sstp-server",
  "wg",
  "ipsec",
  "gre-tunnel",
  "ipip-tunnel",
  "eoip-tunnel",
  "vti",
]);

const VPN_INTERFACE_NAME_PATTERN =
  /^(ovpn-|openvpn|wg-|l2tp-|pptp-|sstp-|ipsec-|gre-|tun|<)/i;

export function isVpnOrTunnelInterface(
  name: string,
  type?: string | null,
): boolean {
  if (name.startsWith("route-")) return true;

  const normalizedType = type?.trim().toLowerCase();
  if (normalizedType && VPN_INTERFACE_TYPES.has(normalizedType)) {
    return true;
  }

  if (VPN_INTERFACE_NAME_PATTERN.test(name)) {
    return true;
  }

  return /openvpn|ovpn/i.test(name);
}
