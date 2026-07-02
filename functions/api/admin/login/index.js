// ============================================================
// functions/api/admin/login/index.js — POST /api/admin/login
// Verifica que el token sea correcto
// ============================================================

import { json, error, readJsonBody } from '../../../lib/utils.js';

// POST /api/admin/login
// Body: { token: "..." }
// Devuelve: { ok: true, valid: true } si es correcto
export async function onRequestPost({ env, request }) {
  const body = await readJsonBody(request);
  const token = body.token;

  if (!token) return error('Token requerido', 400);
  if (!env.ADMIN_TOKEN) return error('ADMIN_TOKEN no configurado en servidor', 500);

  // Comparacion segura
  const a = token;
  const b = env.ADMIN_TOKEN;
  if (a.length !== b.length) return error('Token invalido', 401);

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  if (result !== 0) return error('Token invalido', 401);

  return json({ ok: true, valid: true, message: 'Autenticado correctamente' });
}
