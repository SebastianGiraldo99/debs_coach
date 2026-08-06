"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CampoMoneda } from "@/components/ui/campo-moneda"
import { EstadoCargandoIA } from "@/components/estados/estado-cargando"
import { ListaRepetible } from "@/components/forms/lista-repetible"
import { FilaDeuda, filaDeudaVacia, type FilaDeudaValor } from "@/components/forms/fila-deuda"
import { PasoCheckin } from "@/components/checkin/paso-checkin"
import {
  FilaIngresoExtra,
  filaIngresoExtraVacia,
  type FilaIngresoExtraValor,
} from "@/components/checkin/fila-ingreso-extra"
import { enviar } from "@/lib/api-cliente"
import { formatearMoneda, formatearPorcentaje, type Moneda } from "@/lib/formato"
import type { PlanGuardado } from "@/lib/ia/schema"

/**
 * El flujo del check-in (RF-029 a RF-031): las tres preguntas y la pantalla de
 * resultado.
 *
 * Tres pasos y no cuatro: RF-029 fija tres preguntas —qué pagaste, abriste
 * deudas nuevas, tuviste ingresos extra— y lo que `docs/plan.md` llama "paso 4"
 * es el resultado, que no se pregunta. Los aportes a las metas con monto viven
 * dentro del tercero porque son el detalle de la misma pregunta: el dinero que
 * entró de más va a algún sitio.
 *
 * Todo se manda en una sola petición al final. Guardar paso a paso dejaría
 * check-ins a medias en la base si alguien cierra la pestaña en el paso 2, y no
 * hay forma de saber si eso fue un abandono o una pausa.
 */

export type DeudaCheckin = { id: string; nombre: string; saldo: number }
export type MetaCheckin = {
  id: string
  intencion: string
  montoObjetivo: number
  montoAcumulado: number
}

type Resultado = {
  progresoPct: number | null
  plan: PlanGuardado | null
  /** Motivo cuando el motor no pudo recalibrar. El check-in sí quedó guardado. */
  aviso?: string
}

const TOTAL_PASOS = 3

export function FlujoCheckin({
  deudas,
  metas,
  moneda,
}: {
  deudas: DeudaCheckin[]
  metas: MetaCheckin[]
  moneda: Moneda
}) {
  const router = useRouter()
  const [paso, setPaso] = useState(1)

  const [pagos, setPagos] = useState<Record<string, number | null>>({})
  const [abrioDeudas, setAbrioDeudas] = useState<boolean | null>(null)
  const [nuevasDeudas, setNuevasDeudas] = useState<FilaDeudaValor[]>([])
  const [tuvoIngresos, setTuvoIngresos] = useState<boolean | null>(null)
  const [ingresos, setIngresos] = useState<FilaIngresoExtraValor[]>([])
  const [aportes, setAportes] = useState<Record<string, number | null>>({})

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const totalPagado = Object.values(pagos).reduce<number>((suma, v) => suma + (v ?? 0), 0)

  async function terminar() {
    setError(null)
    setEnviando(true)

    const respuesta = await enviar<{
      progresoPct: number | null
      plan: PlanGuardado | null
      planActualizado: boolean
      mensaje?: string
    }>("/api/checkin", "POST", {
      pagos: Object.entries(pagos)
        .filter(([, monto]) => monto !== null && monto > 0)
        .map(([deudaId, monto]) => ({ deudaId, monto })),
      nuevasDeudas: (abrioDeudas ? nuevasDeudas : [])
        .filter((d) => d.nombre.trim() && d.tipo && d.saldo !== null)
        .map((d) => ({
          nombre: d.nombre.trim(),
          tipo: d.tipo,
          saldo: d.saldo!,
          tasaEA: d.tasaEA,
          pagoMinimo: d.pagoMinimo,
        })),
      ingresosExtra: (tuvoIngresos ? ingresos : [])
        .filter((i) => i.monto !== null && i.monto > 0 && i.descripcion.trim())
        .map((i) => ({ monto: i.monto!, descripcion: i.descripcion.trim(), fecha: i.fecha })),
      aportes: Object.entries(aportes)
        .filter(([, monto]) => monto !== null && monto > 0)
        .map(([objetivoId, monto]) => ({ objetivoId, monto })),
    })

    setEnviando(false)

    if (!respuesta.ok) {
      setError(respuesta.mensaje)
      return
    }

    setResultado({
      progresoPct: respuesta.progresoPct,
      plan: respuesta.plan,
      aviso: respuesta.planActualizado ? undefined : respuesta.mensaje,
    })

    // El dashboard tiene que repintarse: sus cifras, su plan y su historial
    // acaban de cambiar todos.
    router.refresh()
  }

  // ─── Resultado (RF-031) ──────────────────────────────────────────────────
  if (enviando) return <EstadoCargandoIA />

  if (resultado) {
    return (
      <section
        aria-live="polite"
        className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6 shadow-card"
      >
        <div className="flex items-center gap-2 text-avance">
          <Check className="size-5" aria-hidden="true" />
          <p className="text-micro font-medium uppercase tracking-wide">Check-in registrado</p>
        </div>

        {resultado.plan ? (
          <>
            <h2 className="text-seccion font-semibold text-balance text-ink">
              {resultado.plan.mensaje.titulo}
            </h2>
            <p className="max-w-[65ch] text-cuerpo text-ink-soft text-pretty">
              {resultado.plan.mensaje.cuerpo}
            </p>

            <div className="border-t border-line pt-4">
              <p className="text-micro font-medium uppercase tracking-wide text-ink-mute">
                Tu siguiente paso
              </p>
              <p className="mt-1 font-semibold text-ink">{resultado.plan.siguientePaso.accion}</p>
              <p className="mt-0.5 max-w-[65ch] text-menor text-ink-soft text-pretty">
                {resultado.plan.siguientePaso.porque}
              </p>
            </div>
          </>
        ) : (
          // El check-in se guardó; lo que falló fue recalibrar. Se dice sin
          // dramatizar, porque el dato de la persona está a salvo.
          <p className="max-w-[65ch] text-cuerpo text-ink-soft text-pretty">
            {resultado.aviso ??
              "Guardamos tu check-in, pero no pudimos recalibrar el plan ahora mismo. Lo verás actualizado en tu próxima visita."}
          </p>
        )}

        {/* El porcentaje va aquí abajo y en gris: es un dato, no el titular.
            Lo que la persona necesita leer primero es qué hacer ahora. */}
        {resultado.progresoPct !== null && (
          <p className="text-menor text-ink-mute">
            {`Tu avance hacia tu intención principal va en ${formatearPorcentaje(resultado.progresoPct)}.`}
          </p>
        )}

        <div className="pt-2">
          <Button asChild>
            <Link href="/dashboard">Ver mi plan</Link>
          </Button>
        </div>
      </section>
    )
  }

  const botonAtras = (
    <Button variant="ghost" onClick={() => setPaso((p) => p - 1)} disabled={paso === 1}>
      Atrás
    </Button>
  )

  // ─── Paso 1: ¿qué pagos hiciste? ─────────────────────────────────────────
  if (paso === 1) {
    return (
      <PasoCheckin
        paso={1}
        totalPasos={TOTAL_PASOS}
        pregunta="¿Qué pagos hiciste desde tu último check-in?"
        explicacion="Anota lo que abonaste a cada deuda. Si a alguna no le pagaste, déjala vacía."
        botonera={
          <>
            {botonAtras}
            <Button onClick={() => setPaso(2)}>Continuar</Button>
          </>
        }
      >
        {deudas.length === 0 ? (
          <p className="text-cuerpo text-ink-mute">
            No tienes deudas activas, así que no hay nada que abonar. Sigue al paso siguiente.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {deudas.map((d) => (
              <div key={d.id} className="rounded-card border border-line bg-surface p-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-ink">{d.nombre}</p>
                  <p className="text-menor tabular-nums text-ink-mute">
                    {`Debes ${formatearMoneda(d.saldo, moneda)}`}
                  </p>
                </div>
                <CampoMoneda
                  etiqueta="¿Cuánto le abonaste?"
                  opcional
                  valor={pagos[d.id] ?? null}
                  onValorChange={(v) => setPagos((prev) => ({ ...prev, [d.id]: v }))}
                  moneda={moneda}
                />
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-line pt-3">
              <p className="text-menor text-ink-mute">Total abonado</p>
              <p className="text-seccion font-semibold tabular-nums text-ink">
                {formatearMoneda(totalPagado, moneda)}
              </p>
            </div>
          </div>
        )}
      </PasoCheckin>
    )
  }

  // ─── Paso 2: ¿abriste nuevas deudas? (RF-030) ────────────────────────────
  if (paso === 2) {
    return (
      <PasoCheckin
        paso={2}
        totalPasos={TOTAL_PASOS}
        pregunta="¿Abriste alguna deuda nueva?"
        explicacion="Un crédito, una compra a cuotas, un préstamo de alguien. Si no, sigue adelante."
        botonera={
          <>
            {botonAtras}
            <Button onClick={() => setPaso(3)} disabled={abrioDeudas === null}>
              Continuar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <SiONo
            valor={abrioDeudas}
            onCambio={(v) => {
              setAbrioDeudas(v)
              // La primera fila aparece con el "sí": pedir un clic más para
              // empezar a escribir lo que ya dijiste que existe es de más.
              if (v && nuevasDeudas.length === 0) setNuevasDeudas([filaDeudaVacia()])
            }}
            etiquetaSi="Sí, abrí una o más"
            etiquetaNo="No, ninguna"
          />

          {abrioDeudas && (
            <ListaRepetible
              filas={nuevasDeudas.map((valor, indice) => (
                <FilaDeuda
                  key={indice}
                  valor={valor}
                  indice={indice}
                  moneda={moneda}
                  onChange={(v) =>
                    setNuevasDeudas((prev) => prev.map((f, i) => (i === indice ? v : f)))
                  }
                />
              ))}
              onAgregar={() => setNuevasDeudas((prev) => [...prev, filaDeudaVacia()])}
              onEliminar={(indice) =>
                setNuevasDeudas((prev) => prev.filter((_, i) => i !== indice))
              }
              textoAgregar="Agregar otra deuda"
              etiquetaEliminar="Eliminar esta deuda"
              mensajeVacio="Aún no has agregado ninguna."
            />
          )}
        </div>
      </PasoCheckin>
    )
  }

  // ─── Paso 3: ¿ingresos extra? y aportes a las metas ──────────────────────
  return (
    <PasoCheckin
      paso={3}
      totalPasos={TOTAL_PASOS}
      pregunta="¿Te entró algún dinero extra?"
      explicacion="Un freelance, una prima, una venta. Lo que no entra todos los meses."
      botonera={
        <>
          {botonAtras}
          <Button onClick={terminar} disabled={tuvoIngresos === null || enviando}>
            Terminar mi check-in
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {error && (
          <p role="alert" className="text-menor text-deuda">
            {error}
          </p>
        )}

        <SiONo
          valor={tuvoIngresos}
          onCambio={(v) => {
            setTuvoIngresos(v)
            if (v && ingresos.length === 0) setIngresos([filaIngresoExtraVacia()])
          }}
          etiquetaSi="Sí, me entró algo"
          etiquetaNo="No, nada extra"
        />

        {tuvoIngresos && (
          <ListaRepetible
            filas={ingresos.map((valor, indice) => (
              <FilaIngresoExtra
                key={indice}
                valor={valor}
                moneda={moneda}
                onChange={(v) => setIngresos((prev) => prev.map((f, i) => (i === indice ? v : f)))}
              />
            ))}
            onAgregar={() => setIngresos((prev) => [...prev, filaIngresoExtraVacia()])}
            onEliminar={(indice) => setIngresos((prev) => prev.filter((_, i) => i !== indice))}
            textoAgregar="Agregar otro ingreso"
            etiquetaEliminar="Eliminar este ingreso"
            mensajeVacio="Aún no has agregado ninguno."
          />
        )}

        {/* Los aportes a las metas con monto. No es una cuarta pregunta: es
            dónde acabó el dinero, y sin esto el avance de una meta de ahorro
            se quedaría en cero para siempre (RF-032). */}
        {metas.length > 0 && (
          <div className="flex flex-col gap-4 border-t border-line pt-6">
            <div>
              <h3 className="font-semibold text-ink">¿Apartaste algo para tus metas?</h3>
              <p className="mt-1 max-w-[65ch] text-menor text-ink-soft text-pretty">
                Solo lo de este periodo. Es lo que nos permite medir cuánto te falta.
              </p>
            </div>
            {metas.map((m) => (
              <div key={m.id} className="rounded-card border border-line bg-surface p-4">
                <div className="mb-3">
                  <p className="font-medium text-balance text-ink">{`"${m.intencion}"`}</p>
                  <p className="mt-0.5 text-menor tabular-nums text-ink-mute">
                    {`Llevas ${formatearMoneda(m.montoAcumulado, moneda)} de ${formatearMoneda(m.montoObjetivo, moneda)}`}
                  </p>
                </div>
                <CampoMoneda
                  etiqueta="¿Cuánto apartaste?"
                  opcional
                  valor={aportes[m.id] ?? null}
                  onValorChange={(v) => setAportes((prev) => ({ ...prev, [m.id]: v }))}
                  moneda={moneda}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </PasoCheckin>
  )
}

/**
 * Sí / no explícito, sin preseleccionar. Un radio con "no" marcado por defecto
 * haría que quien no lee la pregunta reporte que no abrió deudas, y eso
 * envenena el plan sin que nadie se dé cuenta.
 */
function SiONo({
  valor,
  onCambio,
  etiquetaSi,
  etiquetaNo,
}: {
  valor: boolean | null
  onCambio: (valor: boolean) => void
  etiquetaSi: string
  etiquetaNo: string
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {[
        { texto: etiquetaNo, esSi: false },
        { texto: etiquetaSi, esSi: true },
      ].map(({ texto, esSi }) => (
        <Button
          key={texto}
          type="button"
          variant={valor === esSi ? "primary" : "secondary"}
          onClick={() => onCambio(esSi)}
          aria-pressed={valor === esSi}
        >
          {texto}
        </Button>
      ))}
    </div>
  )
}
