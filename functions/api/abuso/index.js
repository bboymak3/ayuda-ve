// ============================================================
// functions/api/abuso/index.js — POST /api/abuso (público) + GET (admin)
// Reportar abuso: estafa, suplantación, info falsa, etc.
// ============================================================

import { json, error, readJsonBody, sanitize, getClientIP } from '../../../lib/utils.js';
import { isAdmin } from '../../../lib/auth.js';

// ----------------------------------------------------------
// GET /api/abuso — Lista reportes de abuso (solo admin)
// ----------------------------------------------------------
export async function onRequestGet({ env, request }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const url = new URL(request.url);
  const estado = url.searchParams.get('estado') || '';
  const tipo = url.searchParams.get('tipo') || '';

  let sql = `SELECT * FROM reportes_abuso WHERE 1=1`;
  const binds = [];

  if (estado) { sql += ` AND estado = ?`; binds.push(estado); }
  if (tipo)   { sql += ` AND tipo = ?`;   binds.push(tipo);   }

  sql += ` ORDER BY created_at DESC LIMIT 200`;

  const result = await env.DB.prepare(sql).bind(...binds).all();

  return json({
    ok: true,
    count: result.results.length,
    reportes: result.results,
  });
}

// ----------------------------------------------------------
// POST /api/abuso — Crear reporte de abuso (público)
// Body: {
//   tipo, entidad_tipo?, entidad_id?, url_referencia?,
//   anonimo?, reportante_nombre?, reportante_apellido?,
//   reportante_telefono?, reportante_email?,
//   descripcion, evidencia_urls?
// }
// ----------------------------------------------------------
export async function onRequestPost({ env, request }) {
  const body = await readJsonBody(request);

  // Validaciones
  if (!body.tipo) {
    return error('Tipo de abuso es obligatorio', 422);
  }
  const tiposValidos = ['estafa', 'suplantacion', 'info_falsa', 'contenido_inapropiado', 'acoso', 'otro'];
  if (!tiposValidos.includes(body.tipo)) {
    return error(`Tipo inválido. Debe ser: ${tiposValidos.join(', ')}`, 422);
  }

  if (!body.descripcion || body.descripcion.trim().length < 10) {
    return error('Descripción es obligatoria (mínimo 10 caracteres)', 422);
  }
  if (body.descripcion.length > 5000) {
    return error('Descripción demasiado larga (máx 5000 caracteres)', 422);
  }

  // Si NO es anónimo, validar que tenga al menos un dato de contacto
  const anonimo = body.anonimo ? 1 : 0;
  if (!anonimo) {
    if (!body.reportante_nombre && !body.reportante_telefono && !body.reportante_email) {
      return error('Si no es anónimo, debes proporcionar al menos un dato de contacto', 422);
    }
  }

  // Validar entidad
  const entidadTipo = body.entidad_tipo;
  if (entidadTipo && !['reporte', 'chulito', 'perfil', 'url_externa'].includes(entidadTipo)) {
    return error('entidad_tipo inválido', 422);
  }

  // Insertar
  const result = await env.DB.prepare(
    `INSERT INTO reportes_abuso
      (tipo, entidad_tipo, entidad_id, url_referencia,
       anonimo, reportante_nombre, reportante_apellido, reportante_telefono, reportante_email,
       descripcion, evidencia_urls, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.tipo,
    sanitize(entidadTipo || null),
    body.entidad_id ? parseInt(body.entidad_id, 10) : null,
    sanitize(body.url_referencia || null),
    anonimo,
    anonimo ? null : sanitize(body.reportante_nombre || null),
    anonimo ? null : sanitize(body.reportante_apellido || null),
    anonimo ? null : sanitize(body.reportante_telefono || null),
    anonimo ? null : sanitize(body.reportante_email || null),
    sanitize(body.descripcion),
    body.evidencia_urls ? JSON.stringify(body.evidencia_urls) : null,
    getClientIP(request),
  ).run();

  const newId = result.meta.last_row_id;

  return json({
    ok: true,
    id: newId,
    message: 'Reporte de abuso recibido. Lo revisaremos a la brevedad.',
  }, 201);
}
