// ============================================================
// functions/api/admin/centros-acopio/index.js
// GET: lista todos los centros (admin) con filtros
// ============================================================

import { json, error } from '../../../../lib/utils.js';
import { isAdmin } from '../../../../lib/auth.js';

export async function onRequestGet({ env, request }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const url = new URL(request.url);
  const estado = url.searchParams.get('estado') || '';

  let sql = `SELECT * FROM centros_acopio WHERE 1=1`;
  const binds = [];
  if (estado) {
    sql += ` AND estado = ?`;
    binds.push(estado);
  }
  sql += ` ORDER BY
    CASE estado
      WHEN 'pendiente' THEN 1
      WHEN 'aprobado' THEN 2
      WHEN 'suspendido' THEN 3
      WHEN 'rechazado' THEN 4
    END,
    created_at DESC LIMIT 500`;

  const result = await env.DB.prepare(sql).bind(...binds).all();

  return json({
    ok: true,
    count: result.results.length,
    centros: result.results,
  });
}
