"use client"

import { cn } from "@/lib/utils"

/**
 * Interruptor de encendido y apagado.
 *
 * Un `<button role="switch">` nativo y no una dependencia más: con
 * `aria-checked` el lector de pantalla ya dice "activado" o "desactivado", y
 * Espacio y Enter funcionan de fábrica por ser un botón. El foco lo pinta la
 * regla global de `:focus-visible`.
 *
 * El botón mide 44 px de alto aunque la pista se vea de 24: es el objetivo
 * táctil mínimo de §15.1, y en una fila de tabla es fácil fallar el dedo.
 */
type Props = {
  activado: boolean
  onCambiar: (activado: boolean) => void
  /** Obligatoria: el interruptor no tiene texto propio que lo nombre. */
  etiqueta: string
  disabled?: boolean
  className?: string
}

export function Interruptor({ activado, onCambiar, etiqueta, disabled, className }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activado}
      aria-label={etiqueta}
      disabled={disabled}
      onClick={() => onCambiar(!activado)}
      className={cn(
        "group inline-flex h-11 items-center rounded-full disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors motion-reduce:transition-none",
          activado ? "bg-primary" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "inline-block size-5 rounded-full bg-surface shadow-sm transition-transform motion-reduce:transition-none",
            activado ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  )
}
