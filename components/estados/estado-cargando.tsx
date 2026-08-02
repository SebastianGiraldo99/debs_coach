// Cargando (§18): dos formas y solo dos.

// 1. Navegación entre páginas: bloques con animate-pulse que respetan la forma
//    real del contenido. Sin spinners.
export function EstadoCargando() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div className="flex flex-col gap-3">
        <div className="h-4 w-40 animate-pulse rounded-campo bg-surface-alt" />
        <div className="h-24 w-full animate-pulse rounded-card bg-surface-alt" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-24 animate-pulse rounded-card bg-surface-alt" />
        <div className="h-24 animate-pulse rounded-card bg-surface-alt" />
        <div className="h-24 animate-pulse rounded-card bg-surface-alt" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-full animate-pulse rounded-campo bg-surface-alt" />
        <div className="h-4 w-11/12 animate-pulse rounded-campo bg-surface-alt" />
        <div className="h-4 w-4/5 animate-pulse rounded-campo bg-surface-alt" />
      </div>
    </div>
  )
}

// 2. Espera de la IA (hasta 30s): mensaje explícito + barra indeterminada.
export function EstadoCargandoIA() {
  return (
    <div className="rounded-card border border-line bg-surface p-6" aria-busy="true" aria-live="polite">
      <h2 className="text-seccion font-semibold text-ink">Estamos armando tu plan.</h2>
      <p className="mt-1 max-w-[65ch] text-cuerpo text-ink-soft text-pretty">
        Puede tomar hasta medio minuto — estamos revisando tus deudas, tus ingresos y tu intención
        para darte pasos concretos.
      </p>
      <div className="mt-4 h-0.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/3 animate-[barra_1.4s_ease-in-out_infinite] bg-primary" />
      </div>
      <style>{`
        @keyframes barra {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  )
}
