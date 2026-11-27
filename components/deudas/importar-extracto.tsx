"use client"

import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Campo } from "@/components/ui/campo"
import { MAXIMA_CONTRASENA_EXTRACTO, MAXIMO_EXTRACTO_BYTES, TIPO_FLUJO_EXTRACTO, type DatosExtracto } from "@/lib/finanzas/extractos"
import { leerResultadoExtracto } from "@/lib/finanzas/leer-extracto"
import { etiquetasTipoDeuda } from "@/lib/finanzas/etiquetas"

export function ImportarExtracto({
  disabled,
  onAplicar,
}: {
  disabled: boolean
  onAplicar: (datos: DatosExtracto) => void
}) {
  const campo = useRef<HTMLInputElement>(null)
  const campoContrasena = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [fase, setFase] = useState<"enviando" | "analizando" | null>(null)
  const peticion = useRef<AbortController | null>(null)
  const leyendo = fase !== null

  useEffect(() => () => peticion.current?.abort(), [])
  const [datos, setDatos] = useState<DatosExtracto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aplicado, setAplicado] = useState(false)

  async function leer() {
    if (!archivo || peticion.current) return
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

    const contrasena = campoContrasena.current?.value ?? ""
    const formulario = new FormData()
    formulario.set("archivo", archivo, "extracto.pdf")
    formulario.set("contrasena", contrasena)

    const cancelacion = new AbortController()
    const plazo = AbortSignal.timeout(180_000)
    peticion.current = cancelacion
    setFase("enviando")
    try {
      const respuesta = await fetch("/api/deudas/extracto", {
        method: "POST",
        headers: { Accept: TIPO_FLUJO_EXTRACTO },
        body: formulario,
        signal: AbortSignal.any([cancelacion.signal, plazo]),
      })
      const resultado = await leerResultadoExtracto(respuesta, () => setFase("analizando"))
      if (cancelacion.signal.aborted) return
      if (resultado.ok) {
        setDatos(resultado.datos)
        if (campoContrasena.current) campoContrasena.current.value = ""
      } else {
        setError(resultado.mensaje)
      }
    } catch {
      if (cancelacion.signal.aborted) return
      setError(plazo.aborted
        ? "Se agotó el tiempo de espera del envío. Prueba con un extracto más corto o ingresa los datos a mano."
        : "No pudimos leer el extracto. Puedes volver a intentarlo o ingresar los datos a mano.")
    } finally {
      peticion.current = null
      if (!cancelacion.signal.aborted) setFase(null)
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
          if (campoContrasena.current) campoContrasena.current.value = ""
          setAplicado(false)
          setArchivo(evento.target.files?.[0] ?? null)
          setDatos(null)
          setError(null)
        }}
      />
      {archivo && (
        <Campo
          ref={campoContrasena}
          etiqueta="Contraseña del PDF"
          opcional
          ayuda="Escríbela si el PDF está protegido. Solo se usa para abrir el archivo."
          type="password"
          autoComplete="off"
          maxLength={MAXIMA_CONTRASENA_EXTRACTO}
          disabled={disabled || leyendo}
        />
      )}
      <Button type="button" variant="secondary" onClick={leer} disabled={disabled || leyendo || !archivo}>
        Leer extracto
      </Button>

      {fase && (
        <p role="status" className="text-menor">
          {fase === "enviando" ? "Enviando y abriendo el PDF…" : "Analizando el extracto… Puede tardar hasta 2 minutos."}
        </p>
      )}
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
