// ============================================================
// functions/api/perfiles/index.js — GET /api/perfiles
// Lista perfiles (solo admin)
// ============================================================

import { json, error } from '../../../lib/utils.js';
import { isAdmin } from '../../../lib/auth.js';
import { listPerfiles } from '../../../lib/perfiles.js';

export async function onRequestGet({ env, request }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const result = await listPerfiles(env.DB, { limit, offset, q });

  return json({
    ok: true,
    count: result.results.length,
    perfiles: result.results,
  });
}
