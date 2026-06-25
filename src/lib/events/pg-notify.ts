import pg from "pg";

export const DASHBOARD_NOTIFY_CHANNEL = "dashboard_update";

export async function emitDashboardUpdate(
  payload: Record<string, unknown> = { type: "stats_updated" },
): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;

  const client = new pg.Client({ connectionString });

  try {
    await client.connect();
    await client.query(`SELECT pg_notify($1, $2)`, [
      DASHBOARD_NOTIFY_CHANNEL,
      JSON.stringify(payload),
    ]);
  } catch (error) {
    console.error("[Dashboard Events] Falha ao emitir NOTIFY:", error);
  } finally {
    await client.end().catch(() => undefined);
  }
}
