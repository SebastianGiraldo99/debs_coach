"use client"

import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Campo } from "@/components/ui/campo"
import type { Respuesta } from "@/lib/api-cliente"
import { MAXIMO_EXTRACTO_BYTES, type DatosExtracto } from "@/lib/finanzas/extractos"
import { etiquetasTipoDeuda } from "@/lib/finanzas/etiquetas"

export function ImportarExtracto({
  disabled,
  onAplicar,
}: {
  disabled: boolean
  onAplicar: (datos: DatosExtracto) => void
}) {
  const campo = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [leyendo, setLeyendo] = useState(false)
  const [datos, setDatos] = useState<DatosExtracto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aplicado, setAplicado] = useState(false)

  async function leer() {
    if (!archivo || leyendo) return
    setError(null)
    setDatos(null)
    setAplicado(false)

    if (!archivo.name.toLowerCase().endsWith(".pdf") || archivo.size === 0) {
      setError("Selecciona un archivo PDF válido.")
      return
    }
    if (archivo.size > MAXIMO_EXTRACTO_BYTES) {
      setError("El PDF debe pesar máximo 1 MB.")
      return
    }

    setLeyendo(true)
    try {
      const respuesta = await fetch("/api/deudas/extracto", {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: archivo,
        signal: AbortSignal.timeout(60_000),
      })
      const resultado: Respuesta<{ datos: DatosExtracto }> = await respuesta.json()
      if (resultado.ok) setDatos(resultado.datos)
      else setError(resultado.mensaje)
    } catch {
      setError("No pudimos leer el extracto. Puedes volver a intentarlo o ingresar los datos a mano.")
    } finally {
      setLeyendo(false)
    }
  }

  const formato = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: datos?.moneda === "USD" ? "USD" : "COP",
    currencyDisplay: "code",
  })

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line p-4">
      <Campo
        ref={campo}
        etiqueta="Extracto de la deuda"
        opcional
        ayuda="Un PDF por deuda, de hasta 1 MB. Al leerlo, se envía a OpenAI para extraer las cifras."
        type="file"
        accept=".pdf,application/pdf"
        disabled={disabled || leyendo}
        onChange={(evento) => {
          setAplicado(false)
          setArchivo(evento.target.files?.[0] ?? null)
          setDatos(null)
          setError(null)
        }}
      />
      <Button type="button" variant="secondary" onClick={leer} disabled={disabled || leyendo || !archivo}>
        {leyendo ? "Leyendo extracto…" : "Leer extracto"}
      </Button>

      {error && <p role="alert" className="text-menor text-deuda">{error}</p>}
      {datos && (
        <div className="flex flex-col gap-2 text-menor" aria-live="polite">
          <p className="font-medium">Datos sugeridos</p>
          <dl className="grid grid-cols-2 gap-1">
            {datos.nombre && <><dt>Nombre</dt><dd>{datos.nombre}</dd></>}
            {datos.tipo && <><dt>Tipo</dt><dd>{etiquetasTipoDeuda[datos.tipo]}</dd></>}
            {datos.saldo !== null && <><dt>Saldo al corte</dt><dd>{formato.format(datos.saldo)}</dd></>}
            {datos.pagoMinimo !== null && <><dt>Pago mínimo</dt><dd>{formato.format(datos.pagoMinimo)}</dd></>}
            {datos.tasaEA !== null && <><dt>Tasa efectiva anual</dt><dd>{datos.tasaEA} %</dd></>}
          </dl>
          <Button type="button" variant="secondary" disabled={disabled} onClick={() => {
            onAplicar(datos)
            setDatos(null)
            setArchivo(null)
            if (campo.current) campo.current.value = ""
            setAplicado(true)
          }}>
            Usar estos datos
          </Button>
        </div>
      )}
      {aplicado && !datos && <p role="status" className="text-menor">Revisa las cifras en el formulario antes de guardar.</p>}
    </section>
  )
}
