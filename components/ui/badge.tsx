import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-campo px-2 py-0.5 text-micro font-medium",
  {
    variants: {
      tono: {
        neutro: "bg-surface-alt text-ink-soft",
        primario: "bg-primary-soft text-primary",
        deuda: "bg-deuda-soft text-deuda",
        avance: "bg-avance-soft text-avance",
        atencion: "bg-atencion-soft text-atencion",
      },
    },
    defaultVariants: {
      tono: "neutro",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, tono, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tono }), className)} {...props} />
}

export { Badge, badgeVariants }
