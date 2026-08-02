import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-campo border border-line-strong bg-surface px-3 py-2 text-cuerpo text-ink",
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
Textarea.displayName = "Textarea"

export { Textarea }
