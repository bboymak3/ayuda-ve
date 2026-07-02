// ============================================================
// functions/api/admin/videos/index.js — GET /api/admin/videos
// Lista todos los videos procesados
// ============================================================

import { json, error } from '../../../../lib/utils.js';
import { isAdmin } from '../../../../lib/auth.js';

export async function onRequestGet({ env, request }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);

  const result = await env.DB.prepare(
    `SELECT v.id, v.url_origen, v.plataforma, v.estado, v.error_msg,
            substr(v.transcripcion, 1, 200) as transcripcion_corta,
            v.resumen, v.reporte_id, v.chulito_id,
            v.created_at, v.completed_at,
            r.titulo as reporte_titulo
     FROM videos_procesados v
     LEFT JOIN reportes r ON v.reporte_id = r.id
     ORDER BY v.created_at DESC
     LIMIT ?`
  ).bind(limit).all();

  return json({
    ok: true,
    count: result.results.length,
    videos: result.results,
  });
}
