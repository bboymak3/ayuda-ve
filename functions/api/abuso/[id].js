// ============================================================
// functions/api/abuso/[id].js — PUT (admin revisa) + DELETE (admin elimina)
// ============================================================

import { json, error, readJsonBody, sanitize } from '../../../lib/utils.js';
import { isAdmin } from '../../../lib/auth.js';
import { logAction } from '../../../lib/db.js';

// PUT - actualizar estado del reporte de abuso
export async function onRequestPut({ env, request, params }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return error('ID inválido', 400);

  const body = await readJsonBody(request);
  const allowed = ['estado', 'review_notes'];
  const updates = [];
  const binds = [];

  for (const f of allowed) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      binds.push(sanitize(body[f]));
    }
  }

  if (updates.length === 0) return error('Nada que actualizar', 400);

  // Si cambia de estado, marcar reviewed_at
  if (body.estado && body.estado !== 'pendiente') {
    updates.push(`reviewed_at = datetime('now')`);
    updates.push(`reviewed_by = 'admin'`);
  }

  await env.DB.prepare(
    `UPDATE reportes_abuso SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...binds, id).run();

  await logAction(env.DB, 'review_abuso', 'abuso', id, body, request);

  return json({ ok: true, message: 'Reporte de abuso actualizado' });
}

// DELETE - eliminar
export async function onRequestDelete({ env, request, params }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return error('ID inválido', 400);

  await env.DB.prepare(`DELETE FROM reportes_abuso WHERE id = ?`).bind(id).run();
  await logAction(env.DB, 'delete_abuso', 'abuso', id, null, request);

  return json({ ok: true, message: 'Reporte eliminado' });
}
