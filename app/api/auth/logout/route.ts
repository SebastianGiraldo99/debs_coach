import { NextResponse } from "next/server"

import { eliminarSession } from "@/lib/auth/session"

/**
 * POST /api/auth/logout — RF-002.
 *
 * Solo POST: si fuera GET, cualquier <img src="/api/auth/logout"> en una
 * página ajena cerraría la sesión del usuario sin que él lo pidiera.
 */
export async function POST() {
  await eliminarSession()
  return NextResponse.json({ ok: true })
}
