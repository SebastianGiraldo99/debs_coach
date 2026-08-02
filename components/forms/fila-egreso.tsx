"use client"

import { Campo } from "@/components/ui/campo"
import { CampoMoneda } from "@/components/ui/campo-moneda"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { etiquetasCategoriaEgreso, type CategoriaEgreso } from "@/lib/mock/egresos"

export type FilaEgresoValor = {
  descripcion: string
  categoria: CategoriaEgreso | ""
  monto: number | null
}

export function filaEgresoVacia(): FilaEgresoValor {
  return { descripcion: "", categoria: "", monto: null }
}

export function FilaEgreso({
  valor,
  onChange,
  indice,
}: {
  valor: FilaEgresoValor
  onChange: (valor: FilaEgresoValor) => void
  indice: number
}) {
  return (
    <div className="flex flex-col gap-4">
      <Campo
        etiqueta="¿En qué gastas?"
        placeholder="Ej: Arriendo del apartamento"
        value={valor.descripcion}
        onChange={(e) => onChange({ ...valor, descripcion: e.target.value })}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`categoria-egreso-${indice}`}>Categoría</Label>
        <Select
          value={valor.categoria}
          onValueChange={(v) => onChange({ ...valor, categoria: v as CategoriaEgreso })}
        >
          <SelectTrigger id={`categoria-egreso-${indice}`}>
            <SelectValue placeholder="Elige una categoría" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(etiquetasCategoriaEgreso) as CategoriaEgreso[]).map((clave) => (
              <SelectItem key={clave} value={clave}>
                {etiquetasCategoriaEgreso[clave]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CampoMoneda
        etiqueta="¿Cuánto es al mes?"
        ayuda="El valor fijo que pagas cada mes"
        valor={valor.monto}
        onValorChange={(v) => onChange({ ...valor, monto: v })}
      />
    </div>
  )
}
