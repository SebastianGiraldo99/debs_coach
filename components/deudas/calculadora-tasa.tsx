"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Campo } from "@/components/ui/campo"
import { calcularTasaEA } from "@/lib/finanzas/tasa"

/**
 * "¿No sabes tu tasa?" — la deduce de la cuota y las cuotas que faltan.
 *
 * Casi nadie conoce su tasa efectiva anual: está en el extracto, en letra
 * pequeña y con otro nombre en cada banco. La cuota y el plazo, en cambio, se
 * saben de memoria. Y la tasa no es opcional de verdad: es lo que decide qué
 * deuda se ataca primero, tanto en el plan del modelo como en la proyección.
 *
 * Va plegada porque quien sí tiene el dato no debería tropezarse con un
 * formulario extra para escribir un número que ya sabe.
 *
 * El número de cuotas **no se guarda**: lo que la app necesita es la tasa, y
 * persistir un plazo que nadie vuelve a leer sería una columna más que
 * mantener al día. Ver `lib/finanzas/tasa.ts`.
 */
export function CalculadoraTasa({
  saldo,
  cuota,
  onCalcular,
}: {
  saldo: number | null
  cuota: number | null
  onCalcular: (tasaEA: number) => void
}) {
  const [abierta, setAbierta] = useState(false)
  const [cuotas, setCuotas] = useState("")
  const [mensaje, setMensaje] = useState<{ tono: "ok" | "error"; texto: string } | null>(null)

  function calcular() {
    const resultado = calcularTasaEA({
      saldo: saldo ?? 0,
      cuota: cuota ?? 0,
      cuotas: Number.parseInt(cuotas, 10),
    })

    if (!resultado.ok) {
      setMensaje({ tono: "error", texto: resultado.motivo })
      return
    }

    onCalcular(resultado.tasaEA)
    setMensaje({
      tono: "ok",
      texto:
        resultado.tasaEA === 0
          ? "Con esas cuotas no estás pagando intereses. Lo dejamos en 0%."
          : `Tu tasa es de aproximadamente ${resultado.tasaEA}% efectiva anual. La escribimos arriba.`,
    })
  }

  if (!abierta) {
    return (
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className="self-start text-menor text-primary hover:text-primary-hover"
      >
        No sé mi tasa: calcúlala con mi cuota
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-campo border border-line bg-surface-alt p-4">
      <Campo
        etiqueta="¿Cuántas cuotas te faltan?"
        ayuda="Las que te quedan por pagar, no las del crédito completo"
        inputMode="numeric"
        placeholder="Ej: 24"
        value={cuotas}
        onChange={(e) => {
          setCuotas(e.target.value.replace(/[^\d]/g, ""))
          setMensaje(null)
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        {/* type="button": vive dentro del <form> del diálogo y sin esto lo enviaría. */}
        <Button type="button" variant="secondary" size="sm" onClick={calcular}>
          Calcular mi tasa
        </Button>
        <button
          type="button"
          onClick={() => {
            setAbierta(false)
            setMensaje(null)
          }}
          className="text-menor text-ink-soft hover:text-ink"
        >
          Cerrar
        </button>
      </div>

      {mensaje && (
        <p
          role={mensaje.tono === "error" ? "alert" : undefined}
          aria-live={mensaje.tono === "ok" ? "polite" : undefined}
          className={
            mensaje.tono === "error"
              ? "text-menor text-deuda"
              : "text-menor text-ink-soft text-pretty"
          }
        >
          {mensaje.texto}
        </p>
      )}
    </div>
  )
}
