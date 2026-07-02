// ============================================================
// functions/api/settings/index.js — GET/PUT /api/settings
// Configuracion global del sitio (publico GET, admin PUT)
// ============================================================

import { json, error, readJsonBody } from '../../lib/utils.js';
import { isAdmin } from '../../lib/auth.js';

// GET /api/settings — publico (solo claves publicas)
export async function onRequestGet({ env }) {
  const publicKeys = [
    'comentarios_habilitados',
    'mapa_habilitado',
    'sitio_activo',
    'mensaje_emergencia',
    'titulo_sitio',
    'descripcion_sitio',
  ];

  const placeholders = publicKeys.map(() => '?').join(',');
  const result = await env.DB.prepare(
    `SELECT key, value FROM settings WHERE key IN (${placeholders})`
  ).bind(...publicKeys).all();

  const settings = {};
  for (const row of result.results) {
    settings[row.key] = row.value;
  }

  return json({ ok: true, settings });
}

// PUT /api/settings — admin only
// Body: { key1: value1, key2: value2, ... }
export async function onRequestPut({ env, request }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const body = await readJsonBody(request);

  for (const [key, value] of Object.entries(body)) {
    await env.DB.prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = datetime('now')`
    ).bind(key, String(value)).run();
  }

  return json({ ok: true, message: 'Configuracion actualizada' });
}
