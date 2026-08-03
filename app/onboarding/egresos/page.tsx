"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { enviar } from "@/lib/api-cliente"
import { Button } from "@/components/ui/button"
import { PasoFormulario } from "@/components/forms/paso-formulario"
import { ListaRepetible } from "@/components/forms/lista-repetible"
import { FilaEgreso, filaEgresoVacia, type FilaEgresoValor } from "@/components/forms/fila-egreso"

export default function OnboardingEgresosPage() {
  const router = useRouter()
  const [filas, setFilas] = useState<FilaEgresoValor[]>([filaEgresoVacia()])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = filas.reduce((suma, f) => suma + (f.monto ?? 0), 0)

  const actualizar = (indice: number, valor: FilaEgresoValor) =>
    setFilas((prev) => prev.map((f, i) => (i === indice ? valor : f)))

  /**
   * Último paso: guarda los egresos y cierra el onboarding.
   *
   * Son dos llamadas y no una porque hacen cosas distintas: la primera
   * persiste datos, la segunda marca `onboardingCompletadoEn` y valida que
   * haya lo mínimo. Si la segunda falla, los egresos ya quedaron guardados y
   * el usuario puede reintentar sin volver a escribirlos.
   */
  async function terminar() {
    setError(null)
    setGuardando(true)

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
      setGuardando(false)
      setError(guardado.mensaje)
      return
    }

    const cierre = await enviar("/api/onboarding/completar", "POST")
    setGuardando(false)
    if (!cierre.ok) {
      setError(cierre.mensaje)
      return
    }

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
            {guardando ? "Guardando…" : "Generar mi plan"}
          </Button>
        </>
      }
    >
      {error && (
        <p role="alert" className="mb-4 text-menor text-deuda">
          {error}
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
