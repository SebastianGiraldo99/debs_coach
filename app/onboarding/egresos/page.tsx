"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { PasoFormulario } from "@/components/forms/paso-formulario"
import { ListaRepetible } from "@/components/forms/lista-repetible"
import { FilaEgreso, filaEgresoVacia, type FilaEgresoValor } from "@/components/forms/fila-egreso"

export default function OnboardingEgresosPage() {
  const router = useRouter()
  const [filas, setFilas] = useState<FilaEgresoValor[]>([filaEgresoVacia()])

  const total = filas.reduce((suma, f) => suma + (f.monto ?? 0), 0)

  const actualizar = (indice: number, valor: FilaEgresoValor) =>
    setFilas((prev) => prev.map((f, i) => (i === indice ? valor : f)))

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
          <Button onClick={() => router.push("/dashboard")}>Generar mi plan</Button>
        </>
      }
    >
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
