import type { ReactNode } from "react"

import { EncabezadoPagina } from "@/components/layout/encabezado-pagina"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Campo } from "@/components/ui/campo"
import { EstadoVacio } from "@/components/estados/estado-vacio"
import { EstadoError } from "@/components/estados/estado-error"
import { EstadoCargando, EstadoCargandoIA } from "@/components/estados/estado-cargando"
import { formatearFecha, formatearMeses, formatearMoneda, formatearMonedaCorta } from "@/lib/formato"

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-seccion font-semibold text-ink">{titulo}</h2>
      {children}
    </section>
  )
}

const colores: { nombre: string; clase: string }[] = [
  { nombre: "paper", clase: "bg-paper border border-line" },
  { nombre: "surface", clase: "bg-surface border border-line" },
  { nombre: "surface-alt", clase: "bg-surface-alt" },
  { nombre: "primary", clase: "bg-primary" },
  { nombre: "deuda", clase: "bg-deuda" },
  { nombre: "avance", clase: "bg-avance" },
  { nombre: "atencion", clase: "bg-atencion" },
  { nombre: "ink", clase: "bg-ink" },
]

export default function EstiloPage() {
  return (
    <div className="flex flex-col gap-12">
      <EncabezadoPagina
        titulo="Guía de estilo"
        descripcion="Los tokens y componentes del sistema, en un solo lugar. Útil para revisar consistencia."
      />

      <Bloque titulo="Color">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {colores.map((c) => (
            <div key={c.nombre} className="flex flex-col gap-2">
              <div className={`h-16 rounded-card ${c.clase}`} />
              <span className="text-menor text-ink-soft">{c.nombre}</span>
            </div>
          ))}
        </div>
      </Bloque>

      <Bloque titulo="Tipografía">
        <div className="flex flex-col gap-2">
          <p className="text-titulo font-semibold text-ink">Título · text-titulo</p>
          <p className="text-seccion font-semibold text-ink">Sección · text-seccion</p>
          <p className="text-cifra font-semibold tabular-nums text-ink">$ 1.700.000 · text-cifra</p>
          <p className="text-cuerpo text-ink">Cuerpo · text-cuerpo</p>
          <p className="text-menor text-ink-soft">Menor · text-menor</p>
          <p className="text-micro font-medium uppercase tracking-wide text-ink-mute">
            Micro · text-micro
          </p>
        </div>
      </Bloque>

      <Bloque titulo="Formato de datos">
        <ul className="flex flex-col gap-1 text-cuerpo text-ink-soft">
          <li>{`formatearMoneda(1700000) → ${formatearMoneda(1700000)}`}</li>
          <li>{`formatearMoneda(1800.5, "USD") → ${formatearMoneda(1800.5, "USD")}`}</li>
          <li>{`formatearMonedaCorta(14600000) → ${formatearMonedaCorta(14600000)}`}</li>
          <li>{`formatearMonedaCorta(14600, "USD") → ${formatearMonedaCorta(14600, "USD")}`}</li>
          <li>{`formatearMeses(11) → ${formatearMeses(11)}`}</li>
          <li>{`formatearMeses(27) → ${formatearMeses(27)}`}</li>
          <li>{`formatearFecha("2025-08-15") → ${formatearFecha("2025-08-15")}`}</li>
        </ul>
      </Bloque>

      <Bloque titulo="Botones">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primario</Button>
          <Button variant="secondary">Contorno</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="peligro">Destructivo</Button>
          <Button disabled>Deshabilitado</Button>
        </div>
      </Bloque>

      <Bloque titulo="Insignias">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tono="neutro">Neutro</Badge>
          <Badge tono="primario">Primario</Badge>
          <Badge tono="deuda">Deuda</Badge>
          <Badge tono="avance">Avance</Badge>
          <Badge tono="atencion">Atención</Badge>
        </div>
      </Bloque>

      <Bloque titulo="Campos">
        <div className="flex max-w-xl flex-col gap-5">
          <Campo etiqueta="Nombre de la deuda" ayuda="Como la reconoces tú" placeholder="Ej: Tarjeta Visa" />
          <Campo etiqueta="Apodo" opcional placeholder="Ej: La del banco" />
          <Campo
            etiqueta="Correo"
            type="email"
            placeholder="Ej: camila@correo.com"
            error="Ese correo no parece válido"
          />
          <Campo etiqueta="Documento" placeholder="Ej: 1020304050" disabled />
        </div>
      </Bloque>

      <Bloque titulo="Estados">
        <EstadoVacio
          mensaje="Aún no tienes deudas registradas."
          accion={<Button variant="secondary">Agregar deuda</Button>}
        />
        <EstadoError accion={<Button variant="secondary">Reintentar</Button>} />
        <EstadoCargandoIA />
        <EstadoCargando />
      </Bloque>
    </div>
  )
}
