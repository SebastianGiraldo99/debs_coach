"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"

import type { Moneda } from "@/lib/formato"
import { enviar } from "@/lib/api-cliente"
import { Button } from "@/components/ui/button"
import { PasoFormulario } from "@/components/forms/paso-formulario"
import { ListaRepetible } from "@/components/forms/lista-repetible"
import { FilaDeuda, filaDeudaVacia, type FilaDeudaValor } from "@/components/forms/fila-deuda"

export function FormularioDeudas({ moneda }: { moneda: Moneda }) {
  const router = useRouter()
  const siguienteId = useRef(1)
  const [filas, setFilas] = useState([{ id: 0, valor: filaDeudaVacia() }])

  const total = filas.reduce((suma, { valor }) => suma + (valor.saldo ?? 0), 0)

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function continuar() {
    setError(null)
    const deudas = filas.map(({ valor }) => valor).filter((fila) =>
      fila.nombre.trim() || fila.tipo || fila.saldo !== null ||
      fila.pagoMinimo !== null || fila.tasaEA !== null,
    )
    if (deudas.some((fila) => !fila.nombre.trim() || !fila.tipo || fila.saldo === null)) {
      setError("Completa el nombre, tipo y saldo de cada deuda o elimina la fila que no quieras guardar.")
      return
    }

    setGuardando(true)
    const r = await enviar("/api/deudas", "PUT", {
      deudas,
    })
    setGuardando(false)
    if (!r.ok) {
      setError(r.mensaje)
      return
    }
    router.push("/onboarding/ingresos")
  }

  const actualizar = (id: number, valor: FilaDeudaValor) =>
    setFilas((prev) => prev.map((fila) => (fila.id === id ? { id, valor } : fila)))

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
        filas={filas.map(({ id, valor }, indice) => (
          <FilaDeuda
            key={id}
            valor={valor}
            indice={indice}
            moneda={moneda}
            guardando={guardando}
            onChange={(v) => actualizar(id, v)}
          />
        ))}
        onAgregar={() => {
          const id = siguienteId.current++
          setFilas((prev) => [...prev, { id, valor: filaDeudaVacia() }])
        }}
        onEliminar={(indice) => setFilas((prev) => prev.filter((_, i) => i !== indice))}
        textoAgregar="Agregar otra deuda"
        etiquetaEliminar="Eliminar esta deuda"
        mensajeVacio="Aún no has agregado deudas. Si no tienes, puedes continuar sin agregar ninguna."
        total={total}
        moneda={moneda}
      />
    </PasoFormulario>
  )
}
