// ============================================================
// lib/db.js — Helpers de base de datos D1
// ============================================================

// Mapa de columnas de reporte para SELECT consistente
export const REPORTE_FIELDS = `
  r.id,
  r.sector_id,
  s.slug        AS sector_slug,
  s.nombre      AS sector_nombre,
  s.icono       AS sector_icono,
  s.color       AS sector_color,
  r.tipo,
  r.titulo,
  r.descripcion,
  r.categoria_especifica,
  r.contacto_nombre,
  r.contacto_telefono,
  r.contacto_red_social,
  r.ubicacion_estado,
  r.ubicacion_ciudad,
  r.ubicacion_direccion,
  r.urgencia,
  r.estado,
  r.foto_urls,
  r.video_url,
  r.transcripcion,
  r.fuente_url,
  r.fuente_plataforma,
  r.tags,
  r.creado_por,
  r.views,
  r.created_at,
  r.updated_at,
  r.approved_at
`;

// Parsear un row de reporte (convertir JSON strings a objetos)
export function parseReporte(row) {
  if (!row) return null;
  return {
    ...row,
    foto_urls: row.foto_urls ? safeJsonParse(row.foto_urls, []) : [],
    tags:      row.tags ? safeJsonParse(row.tags, []) : [],
  };
}

// Parsear lista de reportes
export function parseReportes(rows) {
  return (rows || []).map(parseReporte);
}

// Búsqueda full-text en reportes (FTS5)
// Devuelve IDs ordenados por relevancia
export async function ftsSearch(db, query, limit = 50) {
  if (!query || query.trim().length < 2) return [];
  // Sanitizar para FTS5: escapar comillas
  const safeQuery = query.replace(/["']/g, ' ').trim();
  const ftsQuery = `"${safeQuery}"`; // búsqueda exacta de frase + palabras
  const stmt = db.prepare(`
    SELECT rowid AS id, bm25(reportes_fts) AS score
    FROM reportes_fts
    WHERE reportes_fts MATCH ?
    ORDER BY score
    LIMIT ?
  `);
  try {
    const result = await stmt.bind(ftsQuery, limit).all();
    return result.results.map(r => r.id);
  } catch (e) {
    console.error('FTS error:', e);
    return [];
  }
}

// Incrementar contador de vistas (fire-and-forget)
export async function incView(db, id) {
  try {
    await db.prepare('UPDATE reportes SET views = views + 1 WHERE id = ?').bind(id).run();
  } catch (e) {
    // fallar silenciosamente
  }
}

// Log de acción (fire-and-forget)
export async function logAction(db, accion, entidad, entidadId, detalle, request) {
  try {
    const ip = request?.headers?.get?.('CF-Connecting-IP') || 'unknown';
    const ua = request?.headers?.get?.('User-Agent') || 'unknown';
    await db.prepare(
      `INSERT INTO logs (accion, entidad, entidad_id, detalle, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(accion, entidad, entidadId || null, detalle ? JSON.stringify(detalle) : null, ip, ua).run();
  } catch (e) {
    // fallar silenciosamente
  }
}

// Helpers internos
function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); }
  catch { return fallback; }
}
