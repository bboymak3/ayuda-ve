// ============================================================
// functions/api/centros-acopio/[id].js
// GET: detalle público (si está aprobado)
// PUT: actualizar (solo admin)
// DELETE: eliminar (solo admin)
// ============================================================

import { json, error, readJsonBody, sanitize } from '../../../lib/utils.js';
import { isAdmin } from '../../../lib/auth.js';

export async function onRequestGet({ env, params }) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return error('ID inválido', 400);

  const centro = await env.DB.prepare(
    `SELECT * FROM centros_acopio WHERE id = ?`
  ).bind(id).first();

  if (!centro) return error('Centro no encontrado', 404);
  if (centro.estado !== 'aprobado') return error('Centro no disponible', 404);

  return json({ ok: true, centro });
}

export async function onRequestPut({ env, request, params }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return error('ID inválido', 400);

  const body = await readJsonBody(request);
  const allowed = ['nombre_encargado', 'telefono', 'red_social', 'email', 'nombre_centro',
                   'tipo_insumos', 'tipos_ayuda', 'direccion', 'ubicacion_texto',
                   'lat', 'lng', 'horario', 'foto_url', 'descripcion', 'estado'];

  const updates = [];
  const binds = [];
  for (const f of allowed) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      binds.push(sanitize(body[f]));
    }
  }

  if (updates.length === 0) return error('Nada que actualizar', 400);

  // Si se aprueba, marcar fecha
  if (body.estado === 'aprobado') {
    updates.push(`approved_at = datetime('now')`);
    updates.push(`approved_by = 'admin'`);
  }

  updates.push(`updated_at = datetime('now')`);
  binds.push(id);

  await env.DB.prepare(
    `UPDATE centros_acopio SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...binds).run();

  return json({ ok: true, message: `Centro ${id} actualizado` });
}

export async function onRequestDelete({ env, request, params }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return error('ID inválido', 400);

  await env.DB.prepare(`DELETE FROM centros_acopio WHERE id = ?`).bind(id).run();

  return json({ ok: true, message: `Centro ${id} eliminado` });
}
