"use client"

import type { TooltipContentProps } from "recharts"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { formatearFecha, formatearMoneda } from "@/lib/formato"
import { checkins, fraseProgreso } from "@/lib/mock/checkins"
import { usuario } from "@/lib/mock/usuario"

// Del más antiguo al más reciente para leer izquierda→derecha.
const datos = [...checkins]
  .reverse()
  .map((c) => ({ etiqueta: formatearFecha(c.fecha, "corto"), pago: c.pago }))

function TooltipProgreso({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  const valor = payload?.[0]?.value
  if (!active || typeof valor !== "number") return null
  return (
    <div className="rounded-campo border border-line bg-surface px-3 py-2 text-menor tabular-nums text-ink shadow-card">
      {`${label} · ${formatearMoneda(valor, usuario.monedaBase)}`}
    </div>
  )
}

export function GraficaProgreso() {
  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-menor font-medium text-ink-soft">
        Progreso acumulado por check-in
      </figcaption>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--color-line)" strokeDasharray="3 3" />
          <XAxis
            dataKey="etiqueta"
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
            tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
          />
          <Tooltip content={<TooltipProgreso />} cursor={{ fill: "var(--color-surface-alt)" }} />
          <Bar dataKey="pago" fill="var(--color-avance)" isAnimationActive={false} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 max-w-[65ch] text-menor text-ink-soft text-pretty">{fraseProgreso}</p>
    </figure>
  )
}
