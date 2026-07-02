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
  const tipo = url.searchParams.get('tipo'); // 'solicitud' | 'disponible' | 'informacion'

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
      r.embed_html, r.tipo_fuente, r.video_url, r.fuente_url, r.fuente_plataforma,
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

  // Conteos totales (sin LIMIT/OFFSET) para paginación
  let eventosCountSql = `SELECT COUNT(*) as total FROM chulitos WHERE estado IN ('activo','resuelto')`;
  const evCountBinds = [];
  if (tipo) { eventosCountSql += ` AND tipo = ?`; evCountBinds.push(tipo); }

  let reportesCountSql = `SELECT COUNT(*) as total FROM reportes WHERE estado = 'aprobado'`;
  const repCountBinds = [];
  if (tipo) { reportesCountSql += ` AND tipo = ?`; repCountBinds.push(tipo); }

  const [eventos, reportes, evCount, repCount] = await Promise.all([
    eventosPromise,
    reportesPromise,
    env.DB.prepare(eventosCountSql).bind(...evCountBinds).first().catch(() => ({ total: 0 })),
    env.DB.prepare(reportesCountSql).bind(...repCountBinds).first().catch(() => ({ total: 0 })),
  ]);

  const totalEventos = evCount?.total || 0;
  const totalReportes = repCount?.total || 0;
  const totalGlobal = totalEventos + totalReportes;

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
    total: totalGlobal,
    total_eventos: totalEventos,
    total_reportes: totalReportes,
    pagina_actual: Math.floor(offset / limit) + 1,
    total_paginas: Math.ceil(totalGlobal / limit),
    publicaciones: todas,
  });
}

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); }
  catch { return fallback; }
}
