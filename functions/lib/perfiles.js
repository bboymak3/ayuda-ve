// ============================================================
// lib/perfiles.js — Detección y gestión de perfiles reiterativos
// ============================================================

import { sanitize } from './utils.js';

// ----------------------------------------------------------
// Buscar o crear perfil basado en info de contacto
// Estrategias de matching:
//   1. Teléfono exacto
//   2. Nombre + ubicación similares
//   3. Red social
// ----------------------------------------------------------
export async function findOrCreatePerfil(info, db, source = 'auto') {
  const { nombre, telefono, red_social, ubicacion, lat, lng } = info;

  if (!nombre && !telefono) return null;

  let perfil = null;
  let matchStrategy = null;

  // Estrategia 1: teléfono exacto
  if (telefono) {
    const cleanPhone = String(telefono).replace(/[\s\-\(\)]/g, '');
    perfil = await db.prepare(
      `SELECT * FROM perfiles WHERE telefono LIKE ?`
    ).bind(`%${cleanPhone.slice(-7)}`).first();
    if (perfil) matchStrategy = 'auto_telefono';
  }

  // Estrategia 2: nombre + ubicación
  if (!perfil && nombre) {
    const nombreNormalizado = normalizeName(nombre);
    if (ubicacion) {
      perfil = await db.prepare(
        `SELECT * FROM perfiles
         WHERE LOWER(nombre) LIKE ?
         AND ubicacion LIKE ?
         LIMIT 1`
      ).bind(
        `%${nombreNormalizado}%`,
        `%${ubicacion}%`
      ).first();
    } else {
      perfil = await db.prepare(
        `SELECT * FROM perfiles
         WHERE LOWER(nombre) LIKE ?
         LIMIT 1`
      ).bind(`%${nombreNormalizado}%`).first();
    }
    if (perfil) matchStrategy = 'auto_nombre_ubicacion';
  }

  // Estrategia 3: red social
  if (!perfil && red_social) {
    perfil = await db.prepare(
      `SELECT * FROM perfiles WHERE red_social = ?`
    ).bind(red_social).first();
    if (perfil) matchStrategy = 'auto_red_social';
  }

  // Crear perfil si no existe
  if (!perfil) {
    const result = await db.prepare(
      `INSERT INTO perfiles (nombre, telefono, red_social, ubicacion, lat, lng)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      sanitize(nombre),
      sanitize(telefono || null),
      sanitize(red_social || null),
      sanitize(ubicacion || null),
      lat || null,
      lng || null,
    ).run();
    const newId = result.meta.last_row_id;
    perfil = { id: newId, nombre, telefono, red_social, ubicacion };
    matchStrategy = 'nuevo_perfil';
  }

  // Actualizar last_activity y total_reportes
  await db.prepare(
    `UPDATE perfiles
     SET last_activity = datetime('now'),
         updated_at = datetime('now'),
         total_reportes = (SELECT COUNT(*) FROM perfil_reporte_link WHERE perfil_id = ?)
     WHERE id = ?`
  ).bind(perfil.id, perfil.id).run();

  return { perfil, matchStrategy };
}

// ----------------------------------------------------------
// Asociar un reporte/chulito/video a un perfil
// ----------------------------------------------------------
export async function linkToPerfil(perfilId, db, { reporteId, chulitoId, videoId, fuente = 'manual' }) {
  if (!perfilId) return;
  await db.prepare(
    `INSERT INTO perfil_reporte_link (perfil_id, reporte_id, chulito_id, video_id, fuente)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(perfilId, reporteId || null, chulitoId || null, videoId || null, fuente).run();
}

// ----------------------------------------------------------
// Obtener perfil completo con todos sus reportes
// ----------------------------------------------------------
export async function getPerfilWithReportes(perfilId, db) {
  const perfil = await db.prepare(
    `SELECT * FROM perfiles WHERE id = ?`
  ).bind(perfilId).first();

  if (!perfil) return null;

  // Reportes asociados
  const reportesResult = await db.prepare(
    `SELECT r.id, r.titulo, r.descripcion, r.tipo, r.urgencia, r.estado,
            r.categoria_especifica, r.created_at,
            s.nombre as sector_nombre, s.icono as sector_icono,
            l.fuente as link_fuente
     FROM perfil_reporte_link l
     LEFT JOIN reportes r ON l.reporte_id = r.id
     LEFT JOIN sectores s ON r.sector_id = s.id
     WHERE l.perfil_id = ? AND l.reporte_id IS NOT NULL
     ORDER BY r.created_at DESC`
  ).bind(perfilId).all();

  // Chulitos asociados
  const chulitosResult = await db.prepare(
    `SELECT c.id, c.titulo, c.requerimiento, c.tipo, c.urgencia, c.estado,
            c.lat, c.lng, c.created_at,
            l.fuente as link_fuente
     FROM perfil_reporte_link l
     LEFT JOIN chulitos c ON l.chulito_id = c.id
     WHERE l.perfil_id = ? AND l.chulito_id IS NOT NULL
     ORDER BY c.created_at DESC`
  ).bind(perfilId).all();

  // Videos asociados
  const videosResult = await db.prepare(
    `SELECT v.id, v.url_origen, v.plataforma, v.transcripcion,
            substr(v.resumen, 1, 300) as resumen_corto,
            v.completed_at,
            l.fuente as link_fuente
     FROM perfil_reporte_link l
     LEFT JOIN videos_procesados v ON l.video_id = v.id
     WHERE l.perfil_id = ? AND l.video_id IS NOT NULL
     ORDER BY v.completed_at DESC`
  ).bind(perfilId).all();

  return {
    ...perfil,
    reportes: reportesResult.results,
    chulitos: chulitosResult.results,
    videos: videosResult.results,
  };
}

// ----------------------------------------------------------
// Listar todos los perfiles (para admin)
// ----------------------------------------------------------
export async function listPerfiles(db, { limit = 50, offset = 0, q } = {}) {
  let sql = `SELECT * FROM perfiles WHERE 1=1`;
  const binds = [];

  if (q) {
    sql += ` AND (nombre LIKE ? OR telefono LIKE ? OR ubicacion LIKE ?)`;
    const like = `%${q}%`;
    binds.push(like, like, like);
  }

  sql += ` ORDER BY last_activity DESC LIMIT ? OFFSET ?`;
  binds.push(limit, offset);

  return await db.prepare(sql).bind(...binds).all();
}

// ----------------------------------------------------------
// Helper: normalizar nombre para matching
// ----------------------------------------------------------
function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}
