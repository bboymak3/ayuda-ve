// ============================================================
// functions/api/noticias/index.js — GET /api/noticias
// Devuelve todas las publicaciones recientes (eventos + reportes)
// ordenadas por fecha, combinadas en un solo feed
// ============================================================

import { json } from '../../../lib/utils.js';
import { parseReportes, REPORTE_FIELDS } from '../../../lib/db.js';

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const tipo = url.searchParams.get('tipo'); // 'solicitud' | 'oferta' | 'informacion'

  // Traer eventos del mapa
  let eventosSql = `
    SELECT
      id, tipo, titulo, requerimiento as descripcion, categoria,
      nombre as contacto_nombre, telefono as contacto_telefono,
      ubicacion_texto, lat, lng, urgencia, estado,
      null as sector_id, null as sector_nombre, null as sector_icono,
      foto_url as foto_urls, categoria_especifica,
      'evento' as fuente,
      created_at
    FROM chulitos
    WHERE estado IN ('activo', 'resuelto')
  `;
  const eventosBinds = [];
  if (tipo) {
    eventosSql += ` AND tipo = ?`;
    eventosBinds.push(tipo);
  }

  // Traer reportes
  let reportesSql = `
    SELECT
      r.id, r.tipo, r.titulo, r.descripcion, r.categoria_especifica as categoria,
      r.contacto_nombre, r.contacto_telefono,
      concat(coalesce(r.ubicacion_ciudad,''), ', ', coalesce(r.ubicacion_estado,'')) as ubicacion_texto,
      null as lat, null as lng, r.urgencia, r.estado,
      r.sector_id, s.nombre as sector_nombre, s.icono as sector_icono,
      r.foto_urls, r.categoria_especifica,
      'reporte' as fuente,
      r.created_at
    FROM reportes r
    LEFT JOIN sectores s ON r.sector_id = s.id
    WHERE r.estado = 'aprobado'
  `;
  const reportesBinds = [];
  if (tipo) {
    reportesSql += ` AND r.tipo = ?`;
    reportesBinds.push(tipo);
  }

  // Ejecutar ambas consultas
  const eventosPromise = env.DB.prepare(eventosSql + ` ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .bind(...eventosBinds, limit, offset).all().catch(() => ({ results: [] }));
  const reportesPromise = env.DB.prepare(reportesSql + ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`)
    .bind(...reportesBinds, limit, offset).all().catch(() => ({ results: [] }));

  const [eventos, reportes] = await Promise.all([eventosPromise, reportesPromise]);

  // Combinar y ordenar por fecha
  const todas = [
    ...eventos.results.map(e => ({
      ...e,
      foto_urls: e.foto_urls ? safeJsonParse(e.foto_urls, []) : null,
      url: `/evento/${e.id}`,
    })),
    ...reportes.results.map(r => ({
      ...r,
      foto_urls: r.foto_urls ? safeJsonParse(r.foto_urls, []) : null,
      url: `/reporte/${r.id}`,
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
   .slice(0, limit);

  return json({
    ok: true,
    count: todas.length,
    publicaciones: todas,
  });
}

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); }
  catch { return fallback; }
}
