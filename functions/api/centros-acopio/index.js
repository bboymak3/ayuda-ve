// ============================================================
// functions/api/centros-acopio/index.js
// GET: lista centros aprobados (público)
// POST: crea un centro de acopio (público, queda pendiente)
// ============================================================

import { json, error, readJsonBody, sanitize, getClientIP } from '../../../lib/utils.js';

// GET /api/centros-acopio?estado=aprobado&bounds=n,s,e,w
export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const params = url.searchParams;

  // Público solo ve aprobados, admin puede ver todos con ?estado=todos
  const estado = params.get('estado') || 'aprobado';

  let sql = `SELECT * FROM centros_acopio WHERE 1=1`;
  const binds = [];

  if (estado !== 'todos') {
    sql += ` AND estado = ?`;
    binds.push(estado);
  }

  if (params.get('bounds')) {
    const [n, s, e, w] = params.get('bounds').split(',').map(parseFloat);
    if ([n, s, e, w].every(v => !isNaN(v))) {
      sql += ` AND lat <= ? AND lat >= ? AND lng <= ? AND lng >= ?`;
      binds.push(n, s, e, w);
    }
  }

  sql += ` ORDER BY created_at DESC`;
  const result = await env.DB.prepare(sql).bind(...binds).all();

  return json({
    ok: true,
    count: result.results.length,
    centros: result.results,
  });
}

// POST /api/centros-acopio
// Body: { nombre_encargado, telefono, nombre_centro?, tipo_insumos, tipos_ayuda?,
//         direccion?, ubicacion_texto?, lat, lng, horario?, foto_url?, descripcion? }
export async function onRequestPost({ env, request }) {
  const body = await readJsonBody(request);

  // Validaciones
  const required = ['nombre_encargado', 'telefono', 'tipo_insumos', 'lat', 'lng'];
  for (const f of required) {
    if (!body[f] && body[f] !== 0) {
      return error(`Falta campo obligatorio: ${f}`, 422);
    }
  }

  const lat = parseFloat(body.lat);
  const lng = parseFloat(body.lng);
  if (isNaN(lat) || isNaN(lng)) {
    return error('Latitud o longitud inválida', 422);
  }

  // Normalizar tipos_ayuda como JSON
  let tiposAyuda = null;
  if (body.tipos_ayuda) {
    tiposAyuda = Array.isArray(body.tipos_ayuda) ? JSON.stringify(body.tipos_ayuda) : body.tipos_ayuda;
  }

  const result = await env.DB.prepare(
    `INSERT INTO centros_acopio
      (nombre_encargado, telefono, red_social, email, nombre_centro,
       tipo_insumos, tipos_ayuda, direccion, ubicacion_texto,
       lat, lng, horario, foto_url, descripcion, fuente, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'web', ?)`
  ).bind(
    sanitize(body.nombre_encargado),
    sanitize(body.telefono),
    sanitize(body.red_social || null),
    sanitize(body.email || null),
    sanitize(body.nombre_centro || null),
    sanitize(body.tipo_insumos),
    tiposAyuda,
    sanitize(body.direccion || null),
    sanitize(body.ubicacion_texto || null),
    lat,
    lng,
    sanitize(body.horario || null),
    body.foto_url || null,
    sanitize(body.descripcion || null),
    getClientIP(request),
  ).run();

  const newId = result.meta.last_row_id;

  return json({
    ok: true,
    id: newId,
    estado: 'pendiente',
    message: 'Centro de acopio enviado. Será revisado por el administrador antes de publicarse.',
  }, 201);
}
