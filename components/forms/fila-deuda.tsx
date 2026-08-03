"use client"

import { Campo } from "@/components/ui/campo"
import { CampoMoneda } from "@/components/ui/campo-moneda"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { etiquetasTipoDeuda, tiposDeuda, type TipoDeuda } from "@/lib/finanzas/etiquetas"

export type FilaDeudaValor = {
  nombre: string
  tipo: TipoDeuda | ""
  saldo: number | null
  tasaEA: number | null
}

export function filaDeudaVacia(): FilaDeudaValor {
  return { nombre: "", tipo: "", saldo: null, tasaEA: null }
}

export function FilaDeuda({
  valor,
  onChange,
  indice,
}: {
  valor: FilaDeudaValor
  onChange: (valor: FilaDeudaValor) => void
  indice: number
}) {
  return (
    <div className="flex flex-col gap-4">
      <Campo
        etiqueta="Nombre de la deuda"
        ayuda="Como la reconoces tú"
        placeholder="Ej: Tarjeta Visa"
        value={valor.nombre}
        onChange={(e) => onChange({ ...valor, nombre: e.target.value })}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`tipo-deuda-${indice}`}>Tipo de deuda</Label>
        <Select value={valor.tipo} onValueChange={(v) => onChange({ ...valor, tipo: v as TipoDeuda })}>
          <SelectTrigger id={`tipo-deuda-${indice}`}>
            <SelectValue placeholder="Elige un tipo" />
          </SelectTrigger>
          <SelectContent>
            {tiposDeuda.map((clave) => (
              <SelectItem key={clave} value={clave}>
                {etiquetasTipoDeuda[clave]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CampoMoneda
        etiqueta="Monto de la deuda"
        ayuda="Lo que debes hoy, no lo que pediste"
        valor={valor.saldo}
        onValorChange={(v) => onChange({ ...valor, saldo: v })}
      />

      <Campo
        etiqueta="Tasa de interés"
        ayuda="Efectiva anual, si la conoces"
        opcional
        inputMode="decimal"
        placeholder="Ej: 32"
        value={valor.tasaEA ?? ""}
        onChange={(e) => {
          const n = Number.parseFloat(e.target.value.replace(",", "."))
          onChange({ ...valor, tasaEA: Number.isNaN(n) ? null : n })
        }}
      />
    </div>
  )
}
