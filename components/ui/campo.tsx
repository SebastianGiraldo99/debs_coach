"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export interface CampoProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Etiqueta visible del campo. Siempre presente. */
  etiqueta: string
  /** Texto de ayuda que va ENTRE la etiqueta y el campo (§15.2). */
  ayuda?: string
  /** Mensaje de error en lenguaje humano. Muestra el estado de error. */
  error?: string
  /** Marca el campo como opcional en la etiqueta. */
  opcional?: boolean
}

/**
 * Anatomía de un campo (§15.2):
 * Label → Ayuda → Input → Error. El placeholder nunca hace de etiqueta.
 */
const Campo = React.forwardRef<HTMLInputElement, CampoProps>(
  ({ etiqueta, ayuda, error, opcional, id, className, ...props }, ref) => {
    const generado = React.useId()
    const campoId = id ?? generado
    const ayudaId = ayuda ? `${campoId}-ayuda` : undefined
    const errorId = error ? `${campoId}-error` : undefined

    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <Label htmlFor={campoId}>
          {etiqueta}
          {opcional && <span className="ml-1 font-normal text-ink-mute">(opcional)</span>}
        </Label>
        {ayuda && (
          <p id={ayudaId} className="text-menor text-ink-mute">
            {ayuda}
          </p>
        )}
        <Input
          id={campoId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(ayudaId, errorId) || undefined}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-menor text-deuda">
            {error}
          </p>
        )}
      </div>
    )
  },
)
Campo.displayName = "Campo"

export { Campo }
