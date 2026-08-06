"use client"

import { Campo } from "@/components/ui/campo"
import { CampoMoneda } from "@/components/ui/campo-moneda"
import type { Moneda } from "@/lib/formato"

/**
 * Una fila de ingreso extraordinario dentro del check-in: los mismos tres
 * campos que el diálogo del dashboard (§16), en formato de lista repetible
 * porque aquí se pueden reportar varios de una vez.
 */

export type FilaIngresoExtraValor = {
  monto: number | null
  descripcion: string
  fecha: string
}

/** La fecha de hoy en la zona del navegador. `toISOString` daría la de UTC. */
export function hoyLocal(): string {
  const ahora = new Date()
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10)
}

export function filaIngresoExtraVacia(): FilaIngresoExtraValor {
  return { monto: null, descripcion: "", fecha: hoyLocal() }
}

export function FilaIngresoExtra({
  valor,
  onChange,
  moneda = "COP",
  disabled,
}: {
  valor: FilaIngresoExtraValor
  onChange: (valor: FilaIngresoExtraValor) => void
  moneda?: Moneda
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-4">
      <CampoMoneda
        etiqueta="¿Cuánto recibiste?"
        valor={valor.monto}
        onValorChange={(v) => onChange({ ...valor, monto: v })}
        moneda={moneda}
        disabled={disabled}
      />
      <Campo
        etiqueta="¿De qué fue?"
        placeholder="Ej: Freelance de logotipo"
        value={valor.descripcion}
        onChange={(e) => onChange({ ...valor, descripcion: e.target.value })}
        disabled={disabled}
      />
      <Campo
        etiqueta="¿Cuándo?"
        type="date"
        value={valor.fecha}
        onChange={(e) => onChange({ ...valor, fecha: e.target.value })}
        disabled={disabled}
      />
    </div>
  )
}
