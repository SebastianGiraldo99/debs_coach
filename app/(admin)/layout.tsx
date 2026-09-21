import type { ReactNode } from "react"

import { NavPrincipal } from "@/components/layout/nav-principal"

// Grupo (admin): su propia barra, sin enlaces de usuario (RNF-006).
//
// `max-w-6xl` y no el `max-w-3xl` del área de usuario (§13 de las
// directrices): la tabla de usuarios tiene siete columnas y dos acciones por
// fila. A 768 px el botón de la derecha quedaba cortado tras un scroll
// horizontal; con la columna del permiso de recalcular (RF-070) volvió a
// pasar a 1024. Aquí no hay texto corrido que leer —es una tabla— así que el
// límite de ~70 caracteres por línea que justifica el 3xl no aplica.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <NavPrincipal variante="admin" />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">{children}</main>
    </div>
  )
}
