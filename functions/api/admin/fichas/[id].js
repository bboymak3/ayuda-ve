// ============================================================
// functions/api/admin/fichas/[id].js — PUT (editar) / DELETE (eliminar)
// ============================================================

import { json, error, readJsonBody, sanitize } from '../../../../lib/utils.js';
import { isAdmin } from '../../../../lib/auth.js';
import { logAction } from '../../../../lib/db.js';

// PUT /api/admin/fichas/[id] — editar ficha
export async function onRequestPut({ env, request, params }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return error('ID inválido', 400);

  const body = await readJsonBody(request);
  const allowed = ['sector_id', 'tipo', 'titulo', 'descripcion',
                   'categoria_especifica', 'contacto_nombre', 'contacto_telefono',
                   'contacto_red_social', 'ubicacion_estado', 'ubicacion_ciudad',
                   'ubicacion_direccion', 'urgencia', 'estado', 'transcripcion',
                   'fuente_url', 'fuente_plataforma'];

  const updates = [];
  const binds = [];

  for (const f of allowed) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      binds.push(sanitize(body[f]));
    }
  }

  if (updates.length === 0) return error('Nada que actualizar', 400);

  updates.push(`updated_at = datetime('now')`);
  binds.push(id);

  await env.DB.prepare(
    `UPDATE reportes SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...binds).run();

  await logAction(env.DB, 'update', 'reporte', id, body, request);

  return json({ ok: true, message: `Ficha ${id} actualizada` });
}

// DELETE /api/admin/fichas/[id] — eliminar ficha (DELETE real)
export async function onRequestDelete({ env, request, params }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return error('ID inválido', 400);

  await env.DB.prepare(`DELETE FROM reportes WHERE id = ?`).bind(id).run();
  await logAction(env.DB, 'delete', 'reporte', id, null, request);

  return json({ ok: true, message: `Ficha ${id} eliminada` });
}
