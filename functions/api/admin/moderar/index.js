// ============================================================
// functions/api/admin/moderar/index.js — GET /api/admin/moderar
// Lista reportes y chulitos pendientes de moderacion
// ============================================================

import { json, error } from '../../../lib/utils.js';
import { isAdmin } from '../../../lib/auth.js';
import { parseReportes, REPORTE_FIELDS } from '../../../lib/db.js';

// GET /api/admin/moderar?tipo=reportes|chulitos|personas
export async function onRequestGet({ env, request }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const url = new URL(request.url);
  const tipo = url.searchParams.get('tipo') || 'todos';

  let reportes = [];
  let chulitos = [];
  let personas = [];

  if (tipo === 'todos' || tipo === 'reportes') {
    const r = await env.DB.prepare(
      `SELECT ${REPORTE_FIELDS}
       FROM reportes r
       JOIN sectores s ON r.sector_id = s.id
       WHERE r.estado = 'pendiente'
       ORDER BY
         CASE r.urgencia WHEN 'critica' THEN 1 WHEN 'alta' THEN 2 WHEN 'media' THEN 3 ELSE 4 END,
         r.created_at DESC
       LIMIT 100`
    ).all();
    reportes = parseReportes(r.results);
  }

  if (tipo === 'todos' || tipo === 'chulitos') {
    const c = await env.DB.prepare(
      `SELECT * FROM chulitos
       WHERE estado = 'activo'
       ORDER BY created_at DESC
       LIMIT 100`
    ).all();
    chulitos = c.results;
  }

  if (tipo === 'todos' || tipo === 'personas') {
    const p = await env.DB.prepare(
      `SELECT id, tipo, nombre, apellido, cedula, edad, ultima_ubicacion,
              familiar_nombre, familiar_telefono, created_at
       FROM personas
       WHERE approved_at IS NULL
       ORDER BY created_at DESC
       LIMIT 100`
    ).all();
    personas = p.results;
  }

  return json({
    ok: true,
    pendientes: {
      reportes_count: reportes.length,
      chulitos_count: chulitos.length,
      personas_count: personas.length,
    },
    reportes,
    chulitos,
    personas,
  });
}
