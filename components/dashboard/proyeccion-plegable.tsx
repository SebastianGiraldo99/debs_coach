"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { GraficaDeudaTiempo } from "@/components/graficas/grafica-deuda-tiempo"
import { GraficaProgreso } from "@/components/graficas/grafica-progreso"
import type { PuntoCheckin } from "@/lib/checkins/historial"
import type { Proyeccion } from "@/lib/finanzas/proyeccion"
import type { Moneda } from "@/lib/formato"

// Ver la proyección (§6.5): disclosure cerrado por defecto. Al abrirlo aparecen
// las dos gráficas. Cerrado es el estado normal.
export function ProyeccionPlegable({
  proyeccion,
  checkins,
  moneda,
}: {
  proyeccion: Proyeccion
  checkins: PuntoCheckin[]
  moneda: Moneda
}) {
  const [abierto, setAbierto] = useState(false)

  return (
    <section aria-label="Proyección de tu deuda" className="border-t border-line pt-6">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex items-center gap-1.5 text-menor font-medium text-ink-soft hover:text-ink"
      >
        Ver proyección de tu deuda
        <ChevronDown className={cn("size-5 transition-transform", abierto && "rotate-180")} />
      </button>

      {abierto && (
        <div className="mt-6 flex flex-col gap-8">
          <GraficaDeudaTiempo
            puntos={proyeccion.puntos}
            frase={proyeccion.frase}
            moneda={moneda}
          />
          {/* Devuelve null sin check-ins: una gráfica de una sola barra, o de
              ninguna, no es información. */}
          <GraficaProgreso checkins={checkins} moneda={moneda} />
        </div>
      )}
    </section>
  )
}
