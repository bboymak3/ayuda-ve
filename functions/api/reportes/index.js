// ============================================================
// functions/api/reportes/index.js — GET/POST /api/reportes
// ============================================================

import { json, error, readJsonBody, sanitize, getClientIP } from '../../../lib/utils.js';
import { parseReportes, REPORTE_FIELDS, incView, logAction } from '../../../lib/db.js';
import { extractCategories, findMatches } from '../../../lib/match.js';

// ----------------------------------------------------------
// GET /api/reportes
// Query:
//   ?sector=salud
//   ?tipo=solicitud|oferta|informacion
//   ?estado=aprobado (default)
//   ?urgencia=critica
//   ?estado_loc=Miranda
//   ?limit=50
//   ?offset=0
// ----------------------------------------------------------
export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const p = url.searchParams;

  let sql = `
    SELECT ${REPORTE_FIELDS}
    FROM reportes r
    JOIN sectores s ON r.sector_id = s.id
    WHERE r.estado = ?
  `;
  const binds = [p.get('estado') || 'aprobado'];

  if (p.get('sector')) {
    sql += ` AND s.slug = ?`;
    binds.push(p.get('sector'));
  }
  if (p.get('tipo')) {
    sql += ` AND r.tipo = ?`;
    binds.push(p.get('tipo'));
  }
  if (p.get('urgencia')) {
    sql += ` AND r.urgencia = ?`;
    binds.push(p.get('urgencia'));
  }
  if (p.get('estado_loc')) {
    sql += ` AND r.ubicacion_estado LIKE ?`;
    binds.push(`%${p.get('estado_loc')}%`);
  }

  const limit = Math.min(parseInt(p.get('limit') || '50', 10), 200);
  const offset = parseInt(p.get('offset') || '0', 10);
  sql += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
  binds.push(limit, offset);

  const result = await env.DB.prepare(sql).bind(...binds).all();

  return json({
    ok: true,
    count: result.results.length,
    reportes: parseReportes(result.results),
  });
}

// ----------------------------------------------------------
// POST /api/reportes
// Crea un reporte (publico). Queda pendiente hasta moderacion.
// ----------------------------------------------------------
export async function onRequestPost({ env, request }) {
  const body = await readJsonBody(request);

  // Validacion
  if (!body.titulo || !body.descripcion || !body.sector_id) {
    return error('Faltan campos obligatorios: titulo, descripcion, sector_id', 422);
  }

  const tipo = body.tipo || 'solicitud';
  if (!['solicitud', 'oferta', 'informacion'].includes(tipo)) {
    return error('Tipo invalido', 422);
  }

  const urgencia = body.urgencia || 'media';
  if (!['baja', 'media', 'alta', 'critica'].includes(urgencia)) {
    return error('Urgencia invalida', 422);
  }

  // Extraer categorias para tags automaticos
  const textoCompleto = `${body.titulo} ${body.descripcion} ${body.categoria_especifica || ''}`;
  const categorias = await extractCategories(textoCompleto, env.DB);

  const tags = body.tags || categorias;

  const result = await env.DB.prepare(
    `INSERT INTO reportes
      (sector_id, tipo, titulo, descripcion, categoria_especifica,
       contacto_nombre, contacto_telefono, contacto_red_social,
       ubicacion_estado, ubicacion_ciudad, ubicacion_direccion,
       urgencia, foto_urls, video_url, fuente_url, fuente_plataforma,
       tags, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'anonimo')`
  ).bind(
    parseInt(body.sector_id, 10),
    tipo,
    sanitize(body.titulo),
    sanitize(body.descripcion),
    sanitize(body.categoria_especifica || null),
    sanitize(body.contacto_nombre || null),
    sanitize(body.contacto_telefono || null),
    sanitize(body.contacto_red_social || null),
    sanitize(body.ubicacion_estado || null),
    sanitize(body.ubicacion_ciudad || null),
    sanitize(body.ubicacion_direccion || null),
    urgencia,
    body.foto_urls ? JSON.stringify(body.foto_urls) : null,
    body.video_url || null,
    body.fuente_url || null,
    body.fuente_plataforma || 'web',
    tags ? JSON.stringify(tags) : null,
  ).run();

  const newId = result.meta.last_row_id;

  // Buscar matches automaticamente
  let matches = [];
  try {
    matches = await findMatches({
      titulo: body.titulo,
      descripcion: body.descripcion,
      tipo,
    }, env.DB, 5);
  } catch (e) {
    console.error('Error buscando matches:', e);
  }

  await logAction(env.DB, 'create', 'reporte', newId, { tipo, sector_id: body.sector_id }, request);

  return json({
    ok: true,
    id: newId,
    estado: 'pendiente',
    message: 'Reporte creado. Pendiente de moderacion.',
    matches,
  }, 201);
}
