"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import {
  agruparMiles,
  agruparMilesEnEdicion,
  limpiarMoneda,
  simboloMoneda,
  type Moneda,
} from "@/lib/formato"

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
 * `useLayoutEffect` en el servidor no corre y React avisa por consola. Se elige
 * la versión que toca según dónde estemos: el efecto solo reposiciona el
 * cursor, que en el servidor no existe.
 */
const useEfectoDeLayout =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect

/**
 * Los caracteres que el usuario "escribió" de verdad, frente a los que pone el
 * formato. Los separadores de miles no cuentan; el punto decimal sí, y solo en
 * las monedas que lo usan —en pesos ese punto es separador de miles—.
 */
function esSignificativo(caracter: string, conDecimales: boolean): boolean {
  return /\d/.test(caracter) || (conDecimales && caracter === ".")
}

function contarSignificativos(texto: string, hasta: number, conDecimales: boolean): number {
  let cuenta = 0
  for (let i = 0; i < hasta; i++) {
    if (esSignificativo(texto[i], conDecimales)) cuenta++
  }
  return cuenta
}

/** Dónde cae el cursor tras `cantidad` caracteres significativos del texto ya formateado. */
function posicionTrasSignificativos(
  texto: string,
  cantidad: number,
  conDecimales: boolean,
): number {
  if (cantidad === 0) return 0
  let cuenta = 0
  for (let i = 0; i < texto.length; i++) {
    if (esSignificativo(texto[i], conDecimales)) {
      cuenta++
      if (cuenta === cantidad) return i + 1
    }
  }
  return texto.length
}

/**
 * Campo de dinero (§15.3): prefijo "$" fijo, teclado numérico en móvil,
 * agrupa miles **mientras se escribe**, acepta pegar "$1.200.000".
 *
 * Agrupar en cada pulsación obliga a reponer el cursor a mano: al insertar un
 * separador el navegador lo deja donde estaba y el caret se corre una posición
 * por cada punto que aparece. Se cuentan los caracteres que la persona
 * realmente tecleó antes del cursor y se busca esa misma posición en el texto
 * ya formateado, así que editar en medio del número no manda el cursor al
 * final.
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

    const conDecimales = moneda !== "COP"

    // Texto mostrado en el input, siempre agrupado.
    const [texto, setTexto] = React.useState(valor != null ? agruparMiles(valor, moneda) : "")
    const [enfocado, setEnfocado] = React.useState(false)

    const nodo = React.useRef<HTMLInputElement | null>(null)
    const cursorPendiente = React.useRef<number | null>(null)

    // Sincroniza el texto cuando el valor externo cambia y no está enfocado.
    React.useEffect(() => {
      if (!enfocado) {
        setTexto(valor != null ? agruparMiles(valor, moneda) : "")
      }
    }, [valor, enfocado, moneda])

    useEfectoDeLayout(() => {
      if (cursorPendiente.current !== null && nodo.current) {
        nodo.current.setSelectionRange(cursorPendiente.current, cursorPendiente.current)
        cursorPendiente.current = null
      }
    })

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
            ref={(elemento) => {
              nodo.current = elemento
              if (typeof ref === "function") ref(elemento)
              else if (ref) ref.current = elemento
            }}
            type="text"
            inputMode={moneda === "COP" ? "numeric" : "decimal"}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={cn(ayudaId, errorId) || undefined}
            placeholder={placeholderMoneda}
            value={texto}
            onFocus={() => setEnfocado(true)}
            onChange={(e) => {
              const bruto = e.target.value
              const cursor = e.target.selectionStart ?? bruto.length
              const tecleados = contarSignificativos(bruto, cursor, conDecimales)

              const formateado = agruparMilesEnEdicion(bruto, moneda)
              setTexto(formateado)
              onValorChange(limpiarMoneda(bruto, moneda))

              cursorPendiente.current = posicionTrasSignificativos(
                formateado,
                tecleados,
                conDecimales,
              )
            }}
            onBlur={() => {
              setEnfocado(false)
              // Al salir sí se aplica el formato definitivo, con los decimales
              // completos que la moneda pida.
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
