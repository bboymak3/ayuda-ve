// ============================================================
// functions/api/buscar/index.js — GET /api/buscar
// Busqueda global: reportes + chulitos (SIN personas)
// ============================================================

import { json } from '../../../lib/utils.js';
import { parseReportes, REPORTE_FIELDS } from '../../../lib/db.js';

// GET /api/buscar?q=antibioticos+caracas&limit=20
export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

  if (q.length < 2) {
    return json({ ok: true, reportes: [], chulitos: [], total: 0 });
  }

  // Buscar en reportes (FTS5)
  const ftsQuery = `"${q.replace(/["']/g, ' ')}"`;
  const reportesPromise = env.DB.prepare(
    `SELECT ${REPORTE_FIELDS}
     FROM reportes_fts
     JOIN reportes r ON r.id = reportes_fts.rowid
     JOIN sectores s ON r.sector_id = s.id
     WHERE reportes_fts MATCH ?
       AND r.estado = 'aprobado'
     ORDER BY bm25(reportes_fts)
     LIMIT ?`
  ).bind(ftsQuery, limit).all().catch(() => ({ results: [] }));

  // Buscar en chulitos (FTS5)
  const chulitosPromise = env.DB.prepare(
    `SELECT c.*
     FROM chulitos_fts
     JOIN chulitos c ON c.id = chulitos_fts.rowid
     WHERE chulitos_fts MATCH ?
       AND c.estado IN ('activo', 'resuelto')
     ORDER BY bm25(chulitos_fts)
     LIMIT ?`
  ).bind(ftsQuery, limit).all().catch(() => ({ results: [] }));

  const [reportes, chulitos] = await Promise.all([
    reportesPromise,
    chulitosPromise,
  ]);

  return json({
    ok: true,
    query: q,
    resultados: {
      reportes: parseReportes(reportes.results),
      chulitos: chulitos.results,
    },
    total: reportes.results.length + chulitos.results.length,
  });
}
