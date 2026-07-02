// ============================================================
// functions/api/sala-situacional/index.js — GET /api/sala-situacional
// Datos para la sala situacional publica
// ============================================================

import { json } from '../../../lib/utils.js';

export async function onRequestGet({ env }) {
  const criticos = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM chulitos WHERE estado = 'activo' AND urgencia = 'critica'`
  ).first();

  const porEstado = await env.DB.prepare(
    `SELECT estado, COUNT(*) as total FROM chulitos GROUP BY estado`
  ).all();

  const pendientes = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM reportes WHERE estado = 'pendiente'`
  ).first();

  const aprobadosHoy = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM reportes WHERE estado = 'aprobado' AND date(approved_at) = date('now')`
  ).first();

  const porSector = await env.DB.prepare(
    `SELECT s.nombre, s.icono, COUNT(r.id) as total
     FROM sectores s
     LEFT JOIN reportes r ON s.id = r.sector_id AND r.estado = 'aprobado'
     GROUP BY s.id
     ORDER BY total DESC`
  ).all();

  const zonasCriticas = await env.DB.prepare(
    `SELECT ubicacion_texto as zona, COUNT(*) as total
     FROM chulitos
     WHERE estado = 'activo' AND urgencia IN ('critica', 'alta')
     AND ubicacion_texto IS NOT NULL
     GROUP BY ubicacion_texto
     ORDER BY total DESC
     LIMIT 5`
  ).all();

  const ultimosVideos = await env.DB.prepare(
    `SELECT id, url_origen, plataforma, substr(resumen, 1, 200) as resumen_corto, completed_at
     FROM videos_procesados
     WHERE estado = 'completado'
     ORDER BY completed_at DESC
     LIMIT 5`
  ).all();

  return json({
    ok: true,
    sala: {
      actualizado: new Date().toISOString(),
      chulitos_criticos: criticos?.total || 0,
      chulitos_por_estado: porEstado.results,
      reportes_pendientes: pendientes?.total || 0,
      aprobados_hoy: aprobadosHoy?.total || 0,
      por_sector: porSector.results,
      zonas_criticas: zonasCriticas.results,
      ultimos_videos: ultimosVideos.results,
    },
  });
}
