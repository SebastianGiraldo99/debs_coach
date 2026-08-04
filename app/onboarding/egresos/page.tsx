"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { enviar } from "@/lib/api-cliente"
import { Button } from "@/components/ui/button"
import { PasoFormulario } from "@/components/forms/paso-formulario"
import { ListaRepetible } from "@/components/forms/lista-repetible"
import { FilaEgreso, filaEgresoVacia, type FilaEgresoValor } from "@/components/forms/fila-egreso"

/** En qué punto del cierre estamos. `null` es "todavía editando". */
type Fase = "guardando" | "generando" | null

export default function OnboardingEgresosPage() {
  const router = useRouter()
  const [filas, setFilas] = useState<FilaEgresoValor[]>([filaEgresoVacia()])
  const [fase, setFase] = useState<Fase>(null)
  const [error, setError] = useState<string | null>(null)

  const guardando = fase !== null

  const total = filas.reduce((suma, f) => suma + (f.monto ?? 0), 0)

  const actualizar = (indice: number, valor: FilaEgresoValor) =>
    setFilas((prev) => prev.map((f, i) => (i === indice ? valor : f)))

  /**
   * Último paso: guarda los egresos, cierra el onboarding y pide el primer
   * plan.
   *
   * Son tres llamadas y no una porque hacen cosas distintas: la primera
   * persiste datos, la segunda marca `onboardingCompletadoEn` y valida que
   * haya lo mínimo, la tercera dispara el Motor IA. Si una falla, las
   * anteriores ya quedaron hechas y el usuario puede reintentar sin volver a
   * escribir nada.
   */
  async function terminar() {
    setError(null)
    setFase("guardando")

    const guardado = await enviar("/api/egresos", "PUT", {
      egresos: filas
        .filter((f) => f.categoria && f.monto !== null)
        .map((f) => ({
          descripcion: f.descripcion.trim() || undefined,
          categoria: f.categoria,
          monto: f.monto!,
        })),
    })
    if (!guardado.ok) {
      setFase(null)
      setError(guardado.mensaje)
      return
    }

    const cierre = await enviar("/api/onboarding/completar", "POST")
    if (!cierre.ok) {
      setFase(null)
      setError(cierre.mensaje)
      return
    }

    // Primer disparo del Motor IA (RF-034). Tarda: el modelo puede irse hasta
    // los 45 s, y por eso el botón cambia de texto en vez de quedarse mudo.
    setFase("generando")
    await enviar("/api/ia/generar-plan", "POST", { trigger: "onboarding" })
    setFase(null)

    // Si el plan falló igual se entra al dashboard. La cuenta ya está
    // completa: dejar a la persona atrapada en un formulario cerrado sería
    // peor que un dashboard sin plan, y el plan se puede reintentar desde
    // dentro. El motor además cae a un plan local antes de fallar.

    // refresh() antes de push(): el layout del dashboard vuelve a leer al
    // usuario y sin esto vería el `onboardingCompletadoEn` viejo, todavía
    // nulo, y devolvería al onboarding.
    router.refresh()
    router.push("/dashboard")
  }

  return (
    <PasoFormulario
      paso={4}
      totalPasos={4}
      pregunta="¿En qué se te va el mes?"
      explicacion="Anota tus gastos fijos mensuales. Al terminar generaremos tu plan con toda esta información."
      botonera={
        <>
          <Button variant="ghost" asChild>
            <Link href="/onboarding/ingresos">Atrás</Link>
          </Button>
          <Button onClick={terminar} disabled={guardando}>
            {fase === "generando"
              ? "Armando tu plan…"
              : fase === "guardando"
                ? "Guardando…"
                : "Generar mi plan"}
          </Button>
        </>
      }
    >
      {error && (
        <p role="alert" className="mb-4 text-menor text-deuda">
          {error}
        </p>
      )}
      {fase === "generando" && (
        <p aria-live="polite" className="mb-4 text-menor text-ink-soft">
          Estamos leyendo tus números para armar tu plan. Puede tardar unos segundos.
        </p>
      )}
      <ListaRepetible
        filas={filas.map((valor, indice) => (
          <FilaEgreso
            key={indice}
            valor={valor}
            indice={indice}
            onChange={(v) => actualizar(indice, v)}
          />
        ))}
        onAgregar={() => setFilas((prev) => [...prev, filaEgresoVacia()])}
        onEliminar={(indice) => setFilas((prev) => prev.filter((_, i) => i !== indice))}
        textoAgregar="Agregar otro gasto"
        etiquetaEliminar="Eliminar este gasto"
        mensajeVacio="Aún no has agregado gastos."
        total={total}
      />
    </PasoFormulario>
  )
}
