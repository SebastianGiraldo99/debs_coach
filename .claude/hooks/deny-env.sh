#!/usr/bin/env bash
# PreToolUse / Bash — bloquea cualquier comando que lea o escriba archivos .env.
# .env.example queda permitido a propósito: es la plantilla sin secretos.
#
# Complementa las reglas permissions.deny de .claude/settings.json, que solo
# cubren las herramientas Read/Edit/Write. Esto cierra la vía de shell.
set -uo pipefail

RE='(^|[^a-zA-Z0-9_\\])\.env($|[^.a-zA-Z0-9_\\])|(^|[^a-zA-Z0-9_\\])\.env\.(local|production|development|test)'

cmd=$(jq -r '.tool_input.command // empty')

if printf '%s' "$cmd" | grep -qE "$RE"; then
  printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Bloqueado por politica del proyecto: los archivos .env contienen secretos y Claude no debe leerlos. Edita .env tu mismo; la plantilla es .env.example."}}'
fi

exit 0
