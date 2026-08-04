"use client"

import type { TooltipContentProps } from "recharts"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { formatearMoneda, formatearMonedaCorta, type Moneda } from "@/lib/formato"
import type { PuntoProyeccion } from "@/lib/finanzas/proyeccion"

function TooltipDeuda({
  active,
  payload,
  label,
  moneda,
}: Partial<TooltipContentProps<number, string>> & { moneda: Moneda }) {
  const valor = payload?.[0]?.value
  if (!active || typeof valor !== "number") return null
  return (
    <div className="rounded-campo border border-line bg-surface px-3 py-2 text-menor tabular-nums text-ink shadow-card">
      {`${label} · ${formatearMoneda(valor, moneda)}`}
    </div>
  )
}

export function GraficaDeudaTiempo({
  puntos,
  frase,
  moneda,
}: {
  puntos: PuntoProyeccion[]
  frase: string
  moneda: Moneda
}) {
  // Sin puntos queda la frase sola, que es la que explica por qué no hay curva.
  if (puntos.length === 0) {
    return <p className="max-w-[65ch] text-menor text-ink-soft text-pretty">{frase}</p>
  }

  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-menor font-medium text-ink-soft">Deuda vs. tiempo</figcaption>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={puntos} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--color-line)" strokeDasharray="3 3" />
          <XAxis
            dataKey="mes"
            tickLine={false}
            axisLine={{ stroke: "var(--color-line)" }}
            tick={{ fill: "var(--color-ink-mute)", fontSize: 12 }}
          />
          <YAxis
            width={56}
            tickCount={4}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-ink-mute)", fontSize: 12 }}
            tickFormatter={(v) => formatearMonedaCorta(v, moneda)}
          />
          <Tooltip
            content={<TooltipDeuda moneda={moneda} />}
            cursor={{ stroke: "var(--color-line-strong)" }}
          />
          <Line
            type="monotone"
            dataKey="deuda"
            stroke="var(--color-deuda)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 max-w-[65ch] text-menor text-ink-soft text-pretty">{frase}</p>
    </figure>
  )
}
