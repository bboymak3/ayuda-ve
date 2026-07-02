// ============================================================
// functions/api/admin/stats/index.js — GET /api/admin/stats
// Estadisticas para el dashboard del admin
// ============================================================

import { json, error } from '../../../../lib/utils.js';
import { isAdmin } from '../../../../lib/auth.js';

export async function onRequestGet({ env, request }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  // Stats de chulitos por estado
  const chulitosPorEstado = await env.DB.prepare(
    `SELECT estado, COUNT(*) as total FROM chulitos GROUP BY estado`
  ).all();

  // Stats de chulitos por urgencia (solo activos)
  const chulitosPorUrgencia = await env.DB.prepare(
    `SELECT urgencia, COUNT(*) as total FROM chulitos WHERE estado = 'activo' GROUP BY urgencia`
  ).all();

  // Stats de reportes por estado
  const reportesPorEstado = await env.DB.prepare(
    `SELECT estado, COUNT(*) as total FROM reportes GROUP BY estado`
  ).all();

  // Reportes por sector
  const reportesPorSector = await env.DB.prepare(
    `SELECT s.nombre, s.icono, COUNT(r.id) as total
     FROM sectores s
     LEFT JOIN reportes r ON s.id = r.sector_id AND r.estado = 'aprobado'
     GROUP BY s.id
     ORDER BY total DESC`
  ).all();

  // Stats de personas
  const personasPorTipo = await env.DB.prepare(
    `SELECT tipo, COUNT(*) as total FROM personas GROUP BY tipo`
  ).all();

  // Totales de hoy
  const hoy = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM chulitos WHERE date(created_at) = date('now')) as chulitos_hoy,
       (SELECT COUNT(*) FROM reportes WHERE date(created_at) = date('now')) as reportes_hoy,
       (SELECT COUNT(*) FROM personas WHERE date(created_at) = date('now')) as personas_hoy,
       (SELECT COUNT(*) FROM chulitos WHERE estado = 'activo') as chulitos_activos,
       (SELECT COUNT(*) FROM reportes WHERE estado = 'pendiente') as reportes_pendientes,
       (SELECT COUNT(*) FROM personas WHERE approved_at IS NULL) as personas_pendientes`
  ).first();

  // Top categorias (mas frecuentes)
  const topCategorias = await env.DB.prepare(
    `SELECT categoria, COUNT(*) as total
     FROM chulitos
     WHERE estado = 'activo' AND categoria IS NOT NULL
     GROUP BY categoria
     ORDER BY total DESC
     LIMIT 10`
  ).all();

  return json({
    ok: true,
    stats: {
      hoy,
      chulitos_por_estado: chulitosPorEstado.results,
      chulitos_por_urgencia: chulitosPorUrgencia.results,
      reportes_por_estado: reportesPorEstado.results,
      reportes_por_sector: reportesPorSector.results,
      personas_por_tipo: personasPorTipo.results,
      top_categorias: topCategorias.results,
    },
  });
}
