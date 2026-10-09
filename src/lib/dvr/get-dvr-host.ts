export function getDvrHost(dvr: { ddns: string | null; ip: string | null }) {
  return dvr.ddns || dvr.ip || "";
}
