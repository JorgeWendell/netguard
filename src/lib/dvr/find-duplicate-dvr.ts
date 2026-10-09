import { and, eq, ne, or } from "drizzle-orm";

import { db } from "@/db/index";
import { dvrsTable } from "@/db/schema";

type DuplicateCheckInput = {
  serialNumber: string;
  ddns?: string;
  ip?: string;
  httpPort: number;
  excludeId?: string;
};

export async function findDuplicateDvrError({
  serialNumber,
  ddns,
  ip,
  httpPort,
  excludeId,
}: DuplicateCheckInput) {
  const hostConditions = [
    ddns ? eq(dvrsTable.ddns, ddns) : undefined,
    ip ? eq(dvrsTable.ip, ip) : undefined,
  ].filter((condition) => condition !== undefined);

  const matchCondition = or(
    eq(dvrsTable.serialNumber, serialNumber),
    hostConditions.length > 0
      ? and(eq(dvrsTable.httpPort, httpPort), or(...hostConditions))
      : undefined,
  );

  const [duplicate] = await db
    .select({
      serialNumber: dvrsTable.serialNumber,
      name: dvrsTable.name,
    })
    .from(dvrsTable)
    .where(
      excludeId
        ? and(matchCondition, ne(dvrsTable.id, excludeId))
        : matchCondition,
    )
    .limit(1);

  if (!duplicate) {
    return null;
  }

  return duplicate.serialNumber === serialNumber
    ? `Já existe um DVR com este número de série (${duplicate.name})`
    : `Já existe um DVR com este endereço e porta (${duplicate.name})`;
}
