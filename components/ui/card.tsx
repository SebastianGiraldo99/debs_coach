import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-card border border-line bg-surface p-5 shadow-card", className)}
      {...props}
    />
  ),
)
Card.displayName = "Card"

const CardTitulo = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("text-seccion font-semibold text-ink", className)} {...props} />
  ),
)
CardTitulo.displayName = "CardTitulo"

export { Card, CardTitulo }
