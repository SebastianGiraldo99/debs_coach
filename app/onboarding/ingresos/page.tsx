"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { PasoFormulario } from "@/components/forms/paso-formulario"
import { ListaRepetible } from "@/components/forms/lista-repetible"
import { FilaIngreso, filaIngresoVacia, type FilaIngresoValor } from "@/components/forms/fila-ingreso"

export default function OnboardingIngresosPage() {
  const router = useRouter()
  const [filas, setFilas] = useState<FilaIngresoValor[]>([filaIngresoVacia()])

  const total = filas.reduce((suma, f) => suma + (f.monto ?? 0), 0)

  const actualizar = (indice: number, valor: FilaIngresoValor) =>
    setFilas((prev) => prev.map((f, i) => (i === indice ? valor : f)))

  return (
    <PasoFormulario
      paso={3}
      totalPasos={4}
      pregunta="¿Cuánto entra cada mes?"
      explicacion="Incluye tu salario y cualquier ingreso recurrente. Con esto sabemos con cuánto cuentas realmente."
      botonera={
        <>
          <Button variant="ghost" asChild>
            <Link href="/onboarding/deudas">Atrás</Link>
          </Button>
          <Button onClick={() => router.push("/onboarding/egresos")}>Continuar</Button>
        </>
      }
    >
      <ListaRepetible
        filas={filas.map((valor, indice) => (
          <FilaIngreso
            key={indice}
            valor={valor}
            indice={indice}
            onChange={(v) => actualizar(indice, v)}
          />
        ))}
        onAgregar={() => setFilas((prev) => [...prev, filaIngresoVacia()])}
        onEliminar={(indice) => setFilas((prev) => prev.filter((_, i) => i !== indice))}
        textoAgregar="Agregar otro ingreso"
        etiquetaEliminar="Eliminar este ingreso"
        mensajeVacio="Aún no has agregado ingresos."
        total={total}
      />
    </PasoFormulario>
  )
}
