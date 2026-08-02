// El admin no ve datos financieros de nadie (RNF-006): solo estado y accesos.
export type UsuarioAdmin = {
  id: string
  nombre: string
  email: string
  estado: "activo" | "inactivo" | "invitado"
  ultimoAcceso: string
}

export const usuariosAdmin: UsuarioAdmin[] = [
  {
    id: "usr_01",
    nombre: "Camila Restrepo",
    email: "camila.restrepo@gmail.com",
    estado: "activo",
    ultimoAcceso: "2025-07-26",
  },
  {
    id: "usr_02",
    nombre: "Andrés Gómez",
    email: "andres.gomez@outlook.com",
    estado: "activo",
    ultimoAcceso: "2025-07-24",
  },
  {
    id: "usr_03",
    nombre: "Laura Marín",
    email: "laura.marin@gmail.com",
    estado: "inactivo",
    ultimoAcceso: "2025-06-30",
  },
  {
    id: "usr_04",
    nombre: "Julián Torres",
    email: "julian.torres@yahoo.com",
    estado: "invitado",
    ultimoAcceso: "2025-07-01",
  },
  {
    id: "usr_05",
    nombre: "Valentina Ríos",
    email: "valentina.rios@gmail.com",
    estado: "activo",
    ultimoAcceso: "2025-07-25",
  },
]
