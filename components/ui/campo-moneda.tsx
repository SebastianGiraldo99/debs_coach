"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { agruparMiles, limpiarMoneda, sanearEntradaMoneda, simboloMoneda, type Moneda } from "@/lib/formato"

export interface CampoMonedaProps {
  etiqueta: string
  ayuda?: string
  error?: string
  opcional?: boolean
  id?: string
  placeholder?: string
  /** Valor numérico controlado (sin formato). null = vacío. */
  valor: number | null
  onValorChange: (valor: number | null) => void
  /** Moneda de denominación del monto. Define prefijo, decimales y separadores. */
  moneda?: Moneda
  /** Alineación del texto: izquierda en formularios, derecha en tablas. */
  alineacion?: "izquierda" | "derecha"
  className?: string
  disabled?: boolean
}

/**
 * Campo de dinero (§15.3): prefijo "$" fijo, teclado numérico en móvil,
 * agrupa miles al salir del campo (blur), acepta pegar "$1.200.000".
 */
const CampoMoneda = React.forwardRef<HTMLInputElement, CampoMonedaProps>(
  (
    {
      etiqueta,
      ayuda,
      error,
      opcional,
      id,
      placeholder,
      valor,
      onValorChange,
      moneda = "COP",
      alineacion = "izquierda",
      className,
      disabled,
    },
    ref,
  ) => {
    const generado = React.useId()
    const campoId = id ?? generado
    const ayudaId = ayuda ? `${campoId}-ayuda` : undefined
    const errorId = error ? `${campoId}-error` : undefined

    // Texto mostrado en el input. Al escribir muestra dígitos; al blur agrupa.
    const [texto, setTexto] = React.useState(valor != null ? agruparMiles(valor, moneda) : "")
    const [enfocado, setEnfocado] = React.useState(false)

    // Sincroniza el texto cuando el valor externo cambia y no está enfocado.
    React.useEffect(() => {
      if (!enfocado) {
        setTexto(valor != null ? agruparMiles(valor, moneda) : "")
      }
    }, [valor, enfocado, moneda])

    // El ejemplo del placeholder tiene que verse como la moneda del campo.
    const placeholderMoneda = placeholder ?? (moneda === "COP" ? "Ej: 8.200.000" : "Ej: 2,000.00")

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
        <div
          className={cn(
            "flex h-11 items-center rounded-campo border border-line-strong bg-surface px-3",
            "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary",
            error && "border-deuda",
            disabled && "bg-surface-alt",
          )}
        >
          <span className="pointer-events-none select-none pr-1 text-ink-mute">{simboloMoneda(moneda)}</span>
          <input
            id={campoId}
            ref={ref}
            type="text"
            inputMode={moneda === "COP" ? "numeric" : "decimal"}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={cn(ayudaId, errorId) || undefined}
            placeholder={placeholderMoneda}
            value={texto}
            onFocus={() => {
              setEnfocado(true)
              setTexto(valor != null ? String(valor) : "")
            }}
            onChange={(e) => {
              // Se muestra el texto saneado, no el número: así un "1800." a
              // medio escribir no pierde el punto decimal en cada pulsación.
              setTexto(sanearEntradaMoneda(e.target.value, moneda))
              onValorChange(limpiarMoneda(e.target.value, moneda))
            }}
            onBlur={() => {
              setEnfocado(false)
              setTexto(valor != null ? agruparMiles(valor, moneda) : "")
            }}
            className={cn(
              "h-full w-full bg-transparent text-cuerpo text-ink outline-none placeholder:text-ink-mute disabled:text-ink-mute",
              alineacion === "derecha" && "text-right tabular-nums",
              alineacion === "izquierda" && "tabular-nums",
            )}
          />
        </div>
        {error && (
          <p id={errorId} className="text-menor text-deuda">
            {error}
          </p>
        )}
      </div>
    )
  },
)
CampoMoneda.displayName = "CampoMoneda"

export { CampoMoneda }
