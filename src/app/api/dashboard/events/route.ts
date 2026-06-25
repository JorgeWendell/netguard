import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getDashboardStats } from "@/lib/dashboard/get-stats";
import { DASHBOARD_REFRESH_INTERVAL_MS } from "@/lib/mikrotik/constants";
import { subscribeDashboardUpdates } from "@/lib/events/dashboard-listener";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new Response("Não autorizado", { status: 401 });
  }

  let stopStream: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      let unsubscribe: (() => void) | null = null;
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      let refreshInterval: ReturnType<typeof setInterval> | null = null;

      const stop = () => {
        if (closed) return;
        closed = true;

        if (heartbeat !== null) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        if (refreshInterval !== null) {
          clearInterval(refreshInterval);
          refreshInterval = null;
        }
        if (unsubscribe !== null) {
          try {
            unsubscribe();
          } catch {
            // ignore listener teardown errors
          }
          unsubscribe = null;
        }

        try {
          controller.close();
        } catch {
          // stream may already be closed by the runtime
        }
      };

      stopStream = stop;
      request.signal.addEventListener("abort", stop, { once: true });

      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;

        try {
          if (controller.desiredSize === null) {
            stop();
            return;
          }
          controller.enqueue(chunk);
        } catch {
          stop();
        }
      };

      const sendStats = async () => {
        if (closed) return;

        try {
          const stats = await getDashboardStats();
          if (closed) return;
          safeEnqueue(
            encoder.encode(`data: ${JSON.stringify(stats)}\n\n`),
          );
        } catch (error) {
          if (!closed) {
            console.error("[Dashboard SSE] Erro ao enviar stats:", error);
          }
        }
      };

      void sendStats();

      unsubscribe = subscribeDashboardUpdates(() => {
        void sendStats();
      });

      refreshInterval = setInterval(() => {
        void sendStats();
      }, DASHBOARD_REFRESH_INTERVAL_MS);

      heartbeat = setInterval(() => {
        safeEnqueue(encoder.encode(": heartbeat\n\n"));
      }, 25_000);
    },
    cancel() {
      stopStream?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
