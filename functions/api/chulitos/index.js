// ============================================================
// functions/api/chulitos/index.js — GET/POST /api/chulitos
// GET: lista chulitos (con filtros)
// POST: crea un chulito nuevo (publico)
// ============================================================

import { json, error, readJsonBody, sanitize, getClientIP, allowedImageMimes } from '../../lib/utils.js';
import { extractCategories, findMatches } from '../../lib/match.js';

// ----------------------------------------------------------
// GET /api/chulitos
// Query params:
//   ?tipo=solicitud|oferta|informacion
//   ?estado=activo|resuelto|eliminado  (default: activo)
//   ?urgencia=critica|alta|media|baja
//   ?categoria=salud.medico
//   ?bounds=norte,sur,este,oeste  (bounding box para viewport del mapa)
//   ?limit=100
// ----------------------------------------------------------
export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const params = url.searchParams;

  let sql = `
    SELECT id, tipo, titulo, descripcion, categoria, nombre, telefono, requerimiento,
           ubicacion_texto, lat, lng, urgencia, estado, foto_url, created_at, resolved_at
    FROM chulitos
    WHERE 1=1
  `;
  const binds = [];

  const estado = params.get('estado') || 'activo';
  sql += ` AND estado = ?`;
  binds.push(estado);

  if (params.get('tipo')) {
    sql += ` AND tipo = ?`;
    binds.push(params.get('tipo'));
  }
  if (params.get('urgencia')) {
    sql += ` AND urgencia = ?`;
    binds.push(params.get('urgencia'));
  }
  if (params.get('categoria')) {
    sql += ` AND categoria = ?`;
    binds.push(params.get('categoria'));
  }
  if (params.get('bounds')) {
    const [n, s, e, w] = params.get('bounds').split(',').map(parseFloat);
    if ([n, s, e, w].every(v => !isNaN(v))) {
      sql += ` AND lat <= ? AND lat >= ? AND lng <= ? AND lng >= ?`;
      binds.push(n, s, e, w);
    }
  }

  const limit = Math.min(parseInt(params.get('limit') || '500', 10), 2000);
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  binds.push(limit);

  const result = await env.DB.prepare(sql).bind(...binds).all();

  return json({
    ok: true,
    count: result.results.length,
    chulitos: result.results,
  });
}

// ----------------------------------------------------------
// POST /api/chulitos
// Body:
//   { tipo, titulo, descripcion, nombre, telefono, requerimiento,
//     ubicacion_texto, lat, lng, urgencia, foto_url? }
// ----------------------------------------------------------
export async function onRequestPost({ env, request }) {
  const body = await readJsonBody(request);

  // Validacion de campos obligatorios
  const required = ['nombre', 'telefono', 'requerimiento', 'lat', 'lng'];
  for (const f of required) {
    if (!body[f] && body[f] !== 0) {
      return error(`Falta campo obligatorio: ${f}`, 422);
    }
  }

  // Validar lat/lng
  const lat = parseFloat(body.lat);
  const lng = parseFloat(body.lng);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return error('Latitud o longitud invalida', 422);
  }

  // Validar tipo
  const tipo = body.tipo || 'solicitud';
  if (!['solicitud', 'oferta', 'informacion'].includes(tipo)) {
    return error('Tipo invalido. Debe ser: solicitud, oferta o informacion', 422);
  }

  // Validar urgencia
  const urgencia = body.urgencia || 'media';
  if (!['baja', 'media', 'alta', 'critica'].includes(urgencia)) {
    return error('Urgencia invalida', 422);
  }

  // Extraer categorias automaticamente del titulo + descripcion + requerimiento
  const textoCompleto = `${body.titulo || ''} ${body.descripcion || ''} ${body.requerimiento || ''}`;
  const categorias = await extractCategories(textoCompleto, env.DB);
  const categoriaPrincipal = categorias[0] || null;

  // Insertar
  const stmt = env.DB.prepare(`
    INSERT INTO chulitos
      (tipo, titulo, descripcion, categoria, nombre, telefono, requerimiento,
       ubicacion_texto, lat, lng, urgencia, foto_url, fuente, ip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'web', ?)
  `);

  const result = await stmt.bind(
    tipo,
    sanitize(body.titulo || body.requerimiento.slice(0, 80)),
    sanitize(body.descripcion || null),
    categoriaPrincipal,
    sanitize(body.nombre),
    sanitize(body.telefono),
    sanitize(body.requerimiento),
    sanitize(body.ubicacion_texto || null),
    lat,
    lng,
    urgencia,
    body.foto_url || null,
    getClientIP(request),
  ).run();

  const newId = result.meta.last_row_id;

  // Buscar matches automaticamente
  let matches = [];
  try {
    matches = await findMatches({
      titulo: body.titulo,
      descripcion: body.descripcion,
      requerimiento: body.requerimiento,
      tipo,
    }, env.DB, 5);
  } catch (e) {
    console.error('Error buscando matches:', e);
  }

  return json({
    ok: true,
    id: newId,
    categoria_detectada: categoriaPrincipal,
    matches,
  }, 201);
}
