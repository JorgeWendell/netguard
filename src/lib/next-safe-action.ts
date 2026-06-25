import { createSafeActionClient } from "next-safe-action";

export const actionClient = createSafeActionClient({
  handleServerError(e) {
    console.error("Action error:", e.message);
    if (e instanceof Error && e.message) {
      return e.message;
    }
    return "Erro ao executar a operação.";
  },
});
