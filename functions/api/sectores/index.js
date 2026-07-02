// ============================================================
// functions/api/sectores/index.js — GET /api/sectores
// Lista todos los sectores activos
// ============================================================

import { json, error, requireMethod } from '../../lib/utils.js';

export async function onRequestGet({ env }) {
  const result = await env.DB.prepare(
    `SELECT id, slug, nombre, descripcion, icono, color, orden
     FROM sectores
     WHERE activo = 1
     ORDER BY orden ASC, nombre ASC`
  ).all();

  return json({
    ok: true,
    count: result.results.length,
    sectores: result.results,
  });
}
