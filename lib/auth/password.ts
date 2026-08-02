import argon2 from "argon2"

/**
 * Hashing de contraseñas con argon2id, la variante recomendada por OWASP:
 * combina la resistencia a GPU de argon2d con la resistencia a ataques de
 * canal lateral de argon2i. Es el default de la librería.
 */

export function hashearPassword(password: string): Promise<string> {
  return argon2.hash(password)
}

/**
 * Devuelve false en vez de propagar si el hash está corrupto o tiene un
 * formato que argon2 no reconoce. Un registro dañado en la base debe negar
 * el acceso, no tumbar el endpoint de login.
 */
export async function verificarPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}
