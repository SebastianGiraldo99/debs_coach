import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, "aria-invalid": ariaInvalid, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        aria-invalid={ariaInvalid}
        // Inputs siempre a 16px (text-cuerpo) para que iOS no haga zoom al enfocar.
        className={cn(
          "h-11 w-full rounded-campo border border-line-strong bg-surface px-3 text-cuerpo text-ink",
          "placeholder:text-ink-mute",
          "disabled:bg-surface-alt disabled:text-ink-mute",
          "aria-[invalid=true]:border-deuda",
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"

export { Input }
