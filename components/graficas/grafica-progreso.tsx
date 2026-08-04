"use client"

import type { TooltipContentProps } from "recharts"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import type { PuntoCheckin } from "@/lib/checkins/historial"
import {
  formatearFecha,
  formatearMoneda,
  formatearMonedaCorta,
  type Moneda,
} from "@/lib/formato"

function TooltipProgreso({
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

/**
 * La frase bajo la gráfica sale de los datos, no de una plantilla optimista:
 * si los abonos vienen bajando, lo dice. El tono es de coach, no de porrista
 * (§19).
 */
function describir(pagos: number[]): string {
  if (pagos.length < 2) return "Con el próximo check-in podrás comparar contra este."
  const ultimo = pagos[pagos.length - 1]
  const anterior = pagos[pagos.length - 2]
  if (ultimo > anterior) return "Tu último abono fue mayor que el anterior. Ese es el ritmo."
  if (ultimo < anterior) {
    return "Tu último abono fue menor que el anterior. Un mes flojo no rompe el plan, dos seguidos sí lo alargan."
  }
  return "Vienes sosteniendo el mismo abono, que es lo que hace que el plazo se cumpla."
}

export function GraficaProgreso({
  checkins,
  moneda,
}: {
  checkins: PuntoCheckin[]
  moneda: Moneda
}) {
  // Del más antiguo al más reciente para leer izquierda→derecha.
  const datos = [...checkins]
    .reverse()
    .map((c) => ({ etiqueta: formatearFecha(c.fecha, "corto"), pago: c.pago }))

  if (datos.length === 0) return null

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
            tickFormatter={(v) => formatearMonedaCorta(v, moneda)}
          />
          <Tooltip
            content={<TooltipProgreso moneda={moneda} />}
            cursor={{ fill: "var(--color-surface-alt)" }}
          />
          <Bar dataKey="pago" fill="var(--color-avance)" isAnimationActive={false} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 max-w-[65ch] text-menor text-ink-soft text-pretty">
        {describir(datos.map((d) => d.pago))}
      </p>
    </figure>
  )
}
