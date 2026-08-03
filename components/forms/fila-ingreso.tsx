"use client"

import { Campo } from "@/components/ui/campo"
import { CampoMoneda } from "@/components/ui/campo-moneda"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { categoriasIngreso, etiquetasCategoriaIngreso, type CategoriaIngreso } from "@/lib/finanzas/etiquetas"

export type FilaIngresoValor = {
  descripcion: string
  categoria: CategoriaIngreso | ""
  monto: number | null
}

export function filaIngresoVacia(): FilaIngresoValor {
  return { descripcion: "", categoria: "", monto: null }
}

export function FilaIngreso({
  valor,
  onChange,
  indice,
}: {
  valor: FilaIngresoValor
  onChange: (valor: FilaIngresoValor) => void
  indice: number
}) {
  return (
    <div className="flex flex-col gap-4">
      <Campo
        etiqueta="¿De dónde viene?"
        placeholder="Ej: Salario en la agencia"
        value={valor.descripcion}
        onChange={(e) => onChange({ ...valor, descripcion: e.target.value })}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`categoria-ingreso-${indice}`}>Categoría</Label>
        <Select
          value={valor.categoria}
          onValueChange={(v) => onChange({ ...valor, categoria: v as CategoriaIngreso })}
        >
          <SelectTrigger id={`categoria-ingreso-${indice}`}>
            <SelectValue placeholder="Elige una categoría" />
          </SelectTrigger>
          <SelectContent>
            {categoriasIngreso.map((clave) => (
              <SelectItem key={clave} value={clave}>
                {etiquetasCategoriaIngreso[clave]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CampoMoneda
        etiqueta="¿Cuánto recibes al mes?"
        ayuda="Un promedio está bien"
        valor={valor.monto}
        onValorChange={(v) => onChange({ ...valor, monto: v })}
      />
    </div>
  )
}
