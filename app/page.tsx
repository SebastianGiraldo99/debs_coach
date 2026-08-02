import Link from "next/link"

import { Button } from "@/components/ui/button"

// Landing mínima (§4.4): nombre, una frase, botón "Entrar".
export default function LandingPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <p className="text-micro font-medium uppercase tracking-wide text-ink-mute">
          Coach Financiero
        </p>
        <h1 className="mt-3 text-titulo font-semibold text-balance text-ink">
          Sabe qué hacer con tu dinero hoy, no solo cómo vas.
        </h1>
        <p className="mx-auto mt-3 max-w-[45ch] text-cuerpo text-ink-soft text-pretty">
          Cuéntale tu intención y tus números. Te devolvemos un solo paso concreto para esta
          semana.
        </p>
        <div className="mt-8 flex justify-center">
          <Button asChild>
            <Link href="/login">Entrar</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
