"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { enviar } from "@/lib/api-cliente"
import { Button } from "@/components/ui/button"
import { PasoFormulario } from "@/components/forms/paso-formulario"
import { ListaRepetible } from "@/components/forms/lista-repetible"
import { FilaDeuda, filaDeudaVacia, type FilaDeudaValor } from "@/components/forms/fila-deuda"

export default function OnboardingDeudasPage() {
  const router = useRouter()
  const [filas, setFilas] = useState<FilaDeudaValor[]>([filaDeudaVacia()])

  const total = filas.reduce((suma, f) => suma + (f.saldo ?? 0), 0)

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function continuar() {
    setError(null)
    setGuardando(true)
    const r = await enviar("/api/deudas", "PUT", {
      deudas: filas
        .filter((f) => f.nombre.trim() && f.tipo && f.saldo !== null)
        .map((f) => ({
          nombre: f.nombre.trim(),
          tipo: f.tipo,
          saldo: f.saldo!,
          tasaEA: f.tasaEA,
          pagoMinimo: f.pagoMinimo,
        })),
    })
    setGuardando(false)
    if (!r.ok) {
      setError(r.mensaje)
      return
    }
    router.push("/onboarding/ingresos")
  }

  const actualizar = (indice: number, valor: FilaDeudaValor) =>
    setFilas((prev) => prev.map((f, i) => (i === indice ? valor : f)))

  return (
    <PasoFormulario
      paso={2}
      totalPasos={4}
      pregunta="¿A quién le debes hoy?"
      explicacion="Anota cada deuda por separado. No importa si el monto es aproximado: lo importante es tener el panorama completo."
      botonera={
        <>
          <Button variant="ghost" asChild>
            <Link href="/onboarding/intencion">Atrás</Link>
          </Button>
          <Button onClick={continuar} disabled={guardando}>
            {guardando ? "Guardando…" : "Continuar"}
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
          <FilaDeuda
            key={indice}
            valor={valor}
            indice={indice}
            onChange={(v) => actualizar(indice, v)}
          />
        ))}
        onAgregar={() => setFilas((prev) => [...prev, filaDeudaVacia()])}
        onEliminar={(indice) => setFilas((prev) => prev.filter((_, i) => i !== indice))}
        textoAgregar="Agregar otra deuda"
        etiquetaEliminar="Eliminar esta deuda"
        mensajeVacio="Aún no has agregado deudas. Si no tienes, puedes continuar sin agregar ninguna."
        total={total}
      />
    </PasoFormulario>
  )
}
