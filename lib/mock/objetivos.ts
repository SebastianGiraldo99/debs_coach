export type EstadoObjetivo = "activo" | "pausado" | "logrado"

export type Objetivo = {
  id: string
  intencion: string
  estado: EstadoObjetivo
  creadoEn: string
  // Días restantes para poder editar la intención (RF-022).
  diasParaEditar: number
}

// El primero (más antiguo) es la intención dominante del dashboard.
export const objetivos: Objetivo[] = [
  {
    id: "obj_01",
    intencion: "Quiero saldar mis deudas lo más rápido posible",
    estado: "activo",
    creadoEn: "2025-05-18",
    diasParaEditar: 0,
  },
  {
    id: "obj_02",
    intencion: "Quiero ahorrar para la cuota inicial de un apartamento",
    estado: "activo",
    creadoEn: "2025-06-20",
    diasParaEditar: 4,
  },
  {
    id: "obj_03",
    intencion: "Quiero dejar de vivir al día y tener un colchón de emergencia",
    estado: "activo",
    creadoEn: "2025-07-10",
    diasParaEditar: 11,
  },
]

export const intencionActiva = objetivos[0].intencion
