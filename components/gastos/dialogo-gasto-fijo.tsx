"use client"

import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { Campo } from "@/components/ui/campo"
import { CampoMoneda } from "@/components/ui/campo-moneda"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { enviar } from "@/lib/api-cliente"
import {
  categoriasEgreso,
  etiquetasCategoriaEgreso,
  type CategoriaEgreso,
} from "@/lib/finanzas/etiquetas"
import type { Moneda } from "@/lib/formato"

/**
 * Alta y edición de un gasto fijo, en el mismo diálogo. Ver
 * `components/ingresos/dialogo-ingreso.tsx`, del que es el espejo.
 *
 * Un gasto fijo es un compromiso mensual y entra en la capacidad real. El
 * gasto grande que ocurre una vez se registra en otro sitio y no toca esa
 * cuenta: solo descuenta del mes en el que pasó.
 */

export type GastoEditable = {
  id: string
  descripcion: string
  categoria: CategoriaEgreso
  monto: number
}

type Props = {
  /**
   * Opcional: sin él se usa el botón de alta con su icono.
   *
   * El icono TIENE que nacer aquí dentro. Un `<Plus/>` creado en un Server
   * Component es una referencia de cliente —lucide-react v1 lleva "use
   * client"— y el `Slot` de Radix no la sabe clonar en el render del
   * servidor: el botón desaparece del HTML y aparece solo al hidratar. Los
   * triggers de solo texto sí se pueden pasar desde el servidor. Ver "El
   * icono dentro de un DialogTrigger" en CLAUDE.md.
   */
  trigger?: React.ReactNode
  /** Sin gasto es un alta. Con gasto, la edición de ese. */
  gasto?: GastoEditable
  moneda: Moneda
}

export function DialogoGastoFijo({ trigger, gasto, moneda }: Props) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [descripcion, setDescripcion] = useState(gasto?.descripcion ?? "")
  const [categoria, setCategoria] = useState<CategoriaEgreso | "">(gasto?.categoria ?? "")
  const [monto, setMonto] = useState<number | null>(gasto?.monto ?? null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const idCategoria = useId()

  const editando = gasto !== undefined

  function restablecer() {
    setDescripcion(gasto?.descripcion ?? "")
    setCategoria(gasto?.categoria ?? "")
    setMonto(gasto?.monto ?? null)
    setError(null)
    setConfirmando(false)
  }

  function terminar() {
    setAbierto(false)
    setError(null)
    setConfirmando(false)
    router.refresh()
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOcupado(true)

    const cuerpo = { descripcion, categoria, monto }
    const respuesta = editando
      ? await enviar(`/api/egresos/${gasto.id}`, "PATCH", cuerpo)
      : await enviar("/api/egresos", "POST", cuerpo)
    setOcupado(false)

    if (!respuesta.ok) {
      setError(respuesta.mensaje)
      return
    }
    terminar()
  }

  async function eliminar() {
    if (!gasto) return
    if (!confirmando) {
      setConfirmando(true)
      return
    }
    setError(null)
    setOcupado(true)
    const respuesta = await enviar(`/api/egresos/${gasto.id}`, "DELETE")
    setOcupado(false)
    if (!respuesta.ok) {
      setError(respuesta.mensaje)
      return
    }
    terminar()
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (ocupado) return
        setAbierto(v)
        if (!v) restablecer()
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="secondary">
            <Plus className="size-5" />
            Agregar gasto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editando ? "Editar gasto" : "Agregar gasto fijo"}</DialogTitle>
          <DialogDescription>
            Lo que pagas todos los meses. Un gasto grande que ocurrió una sola vez se anota más
            abajo, en gastos grandes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={guardar} className="flex flex-col gap-5">
          <Campo
            etiqueta="¿Cómo lo llamas?"
            ayuda="Para distinguirlo de otros gastos parecidos"
            opcional
            placeholder="Ej: Arriendo del apartamento"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            disabled={ocupado}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={idCategoria}>¿De qué es?</Label>
            <Select
              value={categoria}
              onValueChange={(v) => setCategoria(v as CategoriaEgreso)}
              disabled={ocupado}
            >
              <SelectTrigger id={idCategoria}>
                <SelectValue placeholder="Elige una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categoriasEgreso.map((clave) => (
                  <SelectItem key={clave} value={clave}>
                    {etiquetasCategoriaEgreso[clave]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <CampoMoneda
            etiqueta="¿Cuánto al mes?"
            valor={monto}
            onValorChange={setMonto}
            moneda={moneda}
            disabled={ocupado}
          />

          {error && (
            <p role="alert" className="text-menor text-deuda">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={ocupado}>
            {ocupado ? "Guardando…" : editando ? "Guardar cambios" : "Agregar gasto"}
          </Button>

          {editando && (
            <div className="border-t border-line pt-4">
              <Button
                type="button"
                variant="peligro"
                className="w-full"
                onClick={eliminar}
                disabled={ocupado}
              >
                {confirmando ? "Sí, eliminar. No se puede deshacer" : "Eliminar este gasto"}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
