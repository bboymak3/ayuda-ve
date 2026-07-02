// ============================================================
// functions/api/chulitos/[id].js — Operaciones sobre 1 chulito
// GET:    obtener detalle + comentarios
// POST:   agregar comentario (si estan habilitados)
// PUT:    actualizar (admin)
// DELETE: eliminar (admin)
// ============================================================

import { json, error, readJsonBody, sanitize, getClientIP } from '../../../lib/utils.js';
import { isAdmin } from '../../../lib/auth.js';

// ----------------------------------------------------------
// GET /api/chulitos/[id]
// ----------------------------------------------------------
export async function onRequestGet({ env, params }) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return error('ID invalido', 400);

  // Obtener el chulito
  const chulito = await env.DB.prepare(
    `SELECT * FROM chulitos WHERE id = ?`
  ).bind(id).first();

  if (!chulito) return error('Chulito no encontrado', 404);

  // Obtener comentarios (solo si estan habilitados o si es admin)
  const comentariosHabilitados = await env.DB.prepare(
    `SELECT value FROM settings WHERE key = 'comentarios_habilitados'`
  ).first();

  let comentarios = [];
  if (comentariosHabilitados?.value === 'true') {
    const result = await env.DB.prepare(
      `SELECT id, autor, texto, created_at
       FROM comentarios_chulitos
       WHERE chulito_id = ?
       ORDER BY created_at DESC
       LIMIT 100`
    ).bind(id).all();
    comentarios = result.results;
  }

  // Incrementar views (fire-and-forget)
  // No tenemos columna views en chulitos, omitir

  return json({
    ok: true,
    chulito,
    comentarios,
    comentarios_habilitados: comentariosHabilitados?.value === 'true',
  });
}

// ----------------------------------------------------------
// POST /api/chulitos/[id] — Agregar comentario
// Body: { autor, texto }
// ----------------------------------------------------------
export async function onRequestPost({ env, request, params }) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) return error('ID invalido', 400);

  // Verificar que comentarios esten habilitados
  const setting = await env.DB.prepare(
    `SELECT value FROM settings WHERE key = 'comentarios_habilitados'`
  ).first();

  if (setting?.value !== 'true') {
    return error('Los comentarios estan deshabilitados', 403);
  }

  // Verificar que el chulito exista y este activo
  const chulito = await env.DB.prepare(
    `SELECT id FROM chulitos WHERE id = ? AND estado != 'eliminado'`
  ).bind(id).first();

  if (!chulito) return error('Chulito no encontrado', 404);

  const body = await readJsonBody(request);
  if (!body.texto || body.texto.trim().length < 2) {
    return error('Comentario vacio', 422);
  }
  if (body.texto.length > 1000) {
    return error('Comentario demasiado largo (max 1000 caracteres)', 422);
  }

  const result = await env.DB.prepare(
    `INSERT INTO comentarios_chulitos (chulito_id, autor, texto, ip)
     VALUES (?, ?, ?, ?)`
  ).bind(
    id,
    sanitize(body.autor || 'Anonimo'),
    sanitize(body.texto),
    getClientIP(request),
  ).run();

  return json({
    ok: true,
    id: result.meta.last_row_id,
    message: 'Comentario agregado',
  }, 201);
}

// ----------------------------------------------------------
// PUT /api/chulitos/[id] — Actualizar (admin)
// Body: { estado?, urgencia?, titulo?, requerimiento?, ... }
// ----------------------------------------------------------
export async function onRequestPut({ env, request, params }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return error('ID invalido', 400);

  const body = await readJsonBody(request);

  const allowedFields = ['estado', 'urgencia', 'titulo', 'requerimiento', 'descripcion',
                         'nombre', 'telefono', 'ubicacion_texto', 'categoria', 'tipo'];
  const updates = [];
  const binds = [];

  for (const f of allowedFields) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      binds.push(sanitize(body[f]));
    }
  }

  if (updates.length === 0) {
    return error('Nada que actualizar', 400);
  }

  // Si esta marcando como resuelto, agregar resolved_at
  if (body.estado === 'resuelto') {
    updates.push(`resolved_at = datetime('now')`);
  }

  updates.push(`updated_at = datetime('now')`);
  binds.push(id);

  await env.DB.prepare(
    `UPDATE chulitos SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...binds).run();

  return json({ ok: true, message: 'Chulito actualizado' });
}

// ----------------------------------------------------------
// DELETE /api/chulitos/[id] — Eliminar (admin) - soft delete
// ----------------------------------------------------------
export async function onRequestDelete({ env, request, params }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return error('ID invalido', 400);

  await env.DB.prepare(
    `UPDATE chulitos SET estado = 'eliminado', updated_at = datetime('now') WHERE id = ?`
  ).bind(id).run();

  return json({ ok: true, message: 'Chulito eliminado' });
}
