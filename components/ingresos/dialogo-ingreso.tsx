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
  categoriasIngreso,
  etiquetasCategoriaIngreso,
  type CategoriaIngreso,
} from "@/lib/finanzas/etiquetas"
import type { Moneda } from "@/lib/formato"

/**
 * Alta y edición de un ingreso fijo, en el mismo diálogo. Ver
 * `components/deudas/dialogo-deuda.tsx` para el porqué de no separarlos.
 *
 * Un ingreso fijo es lo que entra todos los meses. El dinero que llega una vez
 * se registra en otro sitio —el diálogo de ingreso extra— porque aquel sí
 * recalcula el plan (RF-020) y este no.
 */

export type IngresoEditable = {
  id: string
  descripcion: string
  categoria: CategoriaIngreso
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
  /** Sin ingreso es un alta. Con ingreso, la edición de ese. */
  ingreso?: IngresoEditable
  moneda: Moneda
}

export function DialogoIngreso({ trigger, ingreso, moneda }: Props) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [descripcion, setDescripcion] = useState(ingreso?.descripcion ?? "")
  const [categoria, setCategoria] = useState<CategoriaIngreso | "">(ingreso?.categoria ?? "")
  const [monto, setMonto] = useState<number | null>(ingreso?.monto ?? null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const idCategoria = useId()

  const editando = ingreso !== undefined

  function restablecer() {
    setDescripcion(ingreso?.descripcion ?? "")
    setCategoria(ingreso?.categoria ?? "")
    setMonto(ingreso?.monto ?? null)
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
      ? await enviar(`/api/ingresos/${ingreso.id}`, "PATCH", cuerpo)
      : await enviar("/api/ingresos", "POST", cuerpo)
    setOcupado(false)

    if (!respuesta.ok) {
      setError(respuesta.mensaje)
      return
    }
    terminar()
  }

  async function eliminar() {
    if (!ingreso) return
    if (!confirmando) {
      setConfirmando(true)
      return
    }
    setError(null)
    setOcupado(true)
    const respuesta = await enviar(`/api/ingresos/${ingreso.id}`, "DELETE")
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
            Agregar ingreso
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editando ? "Editar ingreso" : "Agregar ingreso fijo"}</DialogTitle>
          <DialogDescription>
            Lo que entra todos los meses. Si es un dinero que llegó una sola vez, regístralo como
            ingreso extra.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={guardar} className="flex flex-col gap-5">
          <Campo
            etiqueta="¿Cómo lo llamas?"
            ayuda="Para distinguirlo de otros ingresos parecidos"
            opcional
            placeholder="Ej: Salario en la agencia"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            disabled={ocupado}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={idCategoria}>¿De dónde viene?</Label>
            <Select
              value={categoria}
              onValueChange={(v) => setCategoria(v as CategoriaIngreso)}
              disabled={ocupado}
            >
              <SelectTrigger id={idCategoria}>
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
            {ocupado ? "Guardando…" : editando ? "Guardar cambios" : "Agregar ingreso"}
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
                {confirmando ? "Sí, eliminar. No se puede deshacer" : "Eliminar este ingreso"}
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
