// ============================================================
// functions/api/admin/videos/[id].js — DELETE /api/admin/videos/[id]
// Elimina un registro de video procesado
// ============================================================

import { json, error } from '../../../../lib/utils.js';
import { isAdmin } from '../../../../lib/auth.js';
import { logAction } from '../../../../lib/db.js';

export async function onRequestDelete({ env, request, params }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return error('ID inválido', 400);

  await env.DB.prepare(`DELETE FROM videos_procesados WHERE id = ?`).bind(id).run();
  await logAction(env.DB, 'delete', 'video', id, null, request);

  return json({ ok: true, message: `Video ${id} eliminado` });
}
