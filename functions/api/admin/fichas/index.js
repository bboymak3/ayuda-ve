// ============================================================
// functions/api/admin/fichas/index.js — GET /api/admin/fichas
// Lista TODOS los reportes (incluye los creados por IA) para gestión admin
// ============================================================

import { json, error } from '../../../../lib/utils.js';
import { isAdmin } from '../../../../lib/auth.js';
import { parseReportes, REPORTE_FIELDS } from '../../../../lib/db.js';

export async function onRequestGet({ env, request }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10), 500);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const tipo = url.searchParams.get('tipo');
  const creador = url.searchParams.get('creador');
  const q = url.searchParams.get('q');

  let sql = `
    SELECT ${REPORTE_FIELDS}, r.creado_por
    FROM reportes r
    JOIN sectores s ON r.sector_id = s.id
    WHERE 1=1
  `;
  const binds = [];

  if (tipo) {
    sql += ` AND r.tipo = ?`;
    binds.push(tipo);
  }
  if (creador) {
    sql += ` AND r.creado_por = ?`;
    binds.push(creador);
  }
  if (q) {
    sql += ` AND (r.titulo LIKE ? OR r.descripcion LIKE ? OR r.transcripcion LIKE ?)`;
    const like = `%${q}%`;
    binds.push(like, like, like);
  }

  sql += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
  binds.push(limit, offset);

  const result = await env.DB.prepare(sql).bind(...binds).all();

  return json({
    ok: true,
    count: result.results.length,
    fichas: parseReportes(result.results),
  });
}
