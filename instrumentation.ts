/**
 * Hook de arranque del servidor. Next lo llama una vez por instancia, antes de
 * atender la primera petición.
 *
 * `register()` corre en TODOS los entornos, incluido Edge —donde vive
 * `proxy.ts`—, así que el planificador se importa dinámicamente y solo bajo
 * `NEXT_RUNTIME === "nodejs"`. Un import estático arrastraría `node-cron` y el
 * cliente de Prisma al bundle de Edge, que no tiene ni `fs` ni sockets, y el
 * build fallaría.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  // En `next build` también se instancia un servidor para prerenderizar. No
  // tiene sentido programar correos durante una compilación.
  if (process.env.NEXT_PHASE === "phase-production-build") return

  const { iniciarPlanificador } = await import("@/lib/cron/scheduler")
  iniciarPlanificador()
}
