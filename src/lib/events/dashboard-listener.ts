import { EventEmitter } from "events";

import pg from "pg";

import { DASHBOARD_NOTIFY_CHANNEL } from "./pg-notify";

type DashboardEvent = {
  type: string;
  [key: string]: unknown;
};

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

let listenerClient: pg.Client | null = null;
let listenerStarting = false;

async function ensureDashboardListener() {
  if (listenerClient || listenerStarting) return;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;

  listenerStarting = true;

  const client = new pg.Client({ connectionString });

  client.on("notification", (message: pg.Notification) => {
    if (message.channel !== DASHBOARD_NOTIFY_CHANNEL) return;

    let payload: DashboardEvent = { type: "stats_updated" };

    if (message.payload) {
      try {
        payload = JSON.parse(message.payload) as DashboardEvent;
      } catch {
        // keep default payload
      }
    }

    emitter.emit("update", payload);
  });

  client.on("error", (error: Error) => {
    console.error("[Dashboard Listener] Erro na conexão:", error);
    listenerClient = null;
    listenerStarting = false;
    setTimeout(() => {
      void ensureDashboardListener();
    }, 3000);
  });

  client.on("end", () => {
    listenerClient = null;
    listenerStarting = false;
    setTimeout(() => {
      void ensureDashboardListener();
    }, 3000);
  });

  try {
    await client.connect();
    await client.query(`LISTEN ${DASHBOARD_NOTIFY_CHANNEL}`);
    listenerClient = client;
  } catch (error) {
    console.error("[Dashboard Listener] Falha ao iniciar LISTEN:", error);
    listenerStarting = false;
    await client.end().catch(() => undefined);
  }
}

export function subscribeDashboardUpdates(
  callback: (event: DashboardEvent) => void,
) {
  void ensureDashboardListener();
  emitter.on("update", callback);

  return () => {
    emitter.off("update", callback);
  };
}
