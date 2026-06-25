import "dotenv/config";

import { MIKROTIK_WORKER_TICK_MS } from "@/lib/mikrotik/constants";
import { runMikrotikWorkerTick } from "@/lib/mikrotik/worker-tick";

let isRunning = false;

async function tick() {
  if (isRunning) {
    console.warn("[MikroTik Worker] Tick anterior ainda em execução, pulando...");
    return;
  }

  isRunning = true;

  try {
    const summary = await runMikrotikWorkerTick();

    if (summary.processed > 0) {
      console.log(
        `[MikroTik Worker] ${summary.processed} processado(s) | online: ${summary.online} | offline: ${summary.offline} | métricas: ${summary.metricsUpdates} | status: ${summary.statusUpdates}`,
      );
    }

    if (summary.prunedEvents > 0) {
      console.log(
        `[MikroTik Worker] ${summary.prunedEvents} evento(s) de disponibilidade removido(s) (>7 dias)`,
      );
    }
  } catch (error) {
    console.error("[MikroTik Worker] Erro no tick:", error);
  } finally {
    isRunning = false;
  }
}

async function main() {
  console.log(
    `[MikroTik Worker] Iniciado — tick a cada ${MIKROTIK_WORKER_TICK_MS / 1000}s | eventos de disponibilidade ativos`,
  );

  await tick();
  setInterval(tick, MIKROTIK_WORKER_TICK_MS);
}

main().catch((error) => {
  console.error("[MikroTik Worker] Falha fatal:", error);
  process.exit(1);
});
