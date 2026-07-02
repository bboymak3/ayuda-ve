// ============================================================
// functions/api/admin/categorias/index.js — GET/POST/PUT/DELETE
// CRUD de sectores (solo admin)
// ============================================================

import { json, error, readJsonBody, sanitize, slugify } from '../../../../lib/utils.js';
import { isAdmin } from '../../../../lib/auth.js';
import { logAction } from '../../../../lib/db.js';

// GET /api/admin/categorias - lista TODOS (incluye inactivos)
export async function onRequestGet({ env, request }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const result = await env.DB.prepare(
    `SELECT * FROM sectores ORDER BY orden ASC, nombre ASC`
  ).all();

  return json({ ok: true, categorias: result.results });
}

// POST - crear categoria nueva
export async function onRequestPost({ env, request }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const body = await readJsonBody(request);
  if (!body.nombre) return error('Nombre requerido', 422);

  const slug = body.slug ? slugify(body.slug) : slugify(body.nombre);

  const result = await env.DB.prepare(
    `INSERT INTO sectores (slug, nombre, descripcion, icono, color, orden, activo)
     VALUES (?, ?, ?, ?, ?, ?, 1)`
  ).bind(
    slug,
    sanitize(body.nombre),
    sanitize(body.descripcion || null),
    body.icono || '📦',
    body.color || '#2563EB',
    body.orden || 0,
  ).run();

  const newId = result.meta.last_row_id;
  await logAction(env.DB, 'create', 'sector', newId, body, request);

  return json({ ok: true, id: newId, slug }, 201);
}

// PUT - actualizar categoria
export async function onRequestPut({ env, request }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const body = await readJsonBody(request);
  if (!body.id) return error('ID requerido', 422);

  const allowedFields = ['slug', 'nombre', 'descripcion', 'icono', 'color', 'orden', 'activo'];
  const updates = [];
  const binds = [];

  for (const f of allowedFields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      binds.push(f === 'activo' ? (body[f] ? 1 : 0) : sanitize(body[f]));
    }
  }

  if (updates.length === 0) return error('Nada que actualizar', 400);

  updates.push(`updated_at = datetime('now')`);
  binds.push(body.id);

  await env.DB.prepare(
    `UPDATE sectores SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...binds).run();

  await logAction(env.DB, 'update', 'sector', body.id, body, request);

  return json({ ok: true, message: 'Categoria actualizada' });
}

// DELETE - eliminar (soft: marcar inactivo)
export async function onRequestDelete({ env, request }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get('id'), 10);
  if (isNaN(id)) return error('ID requerido', 400);

  await env.DB.prepare(
    `UPDATE sectores SET activo = 0, updated_at = datetime('now') WHERE id = ?`
  ).bind(id).run();

  await logAction(env.DB, 'delete', 'sector', id, null, request);

  return json({ ok: true, message: 'Categoria desactivada' });
}
