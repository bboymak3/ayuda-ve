// ============================================================
// functions/api/admin/moderar/[accion]/[id].js
// Acciones: aprobar, rechazar, eliminar, resolver
// Funciona para reportes, chulitos y personas
// ============================================================

import { json, error } from '../../../../lib/utils.js';
import { isAdmin } from '../../../../lib/auth.js';
import { logAction } from '../../../../lib/db.js';

// POST /api/admin/moderar/aprobar/reporte/123
// POST /api/admin/moderar/rechazar/chulito/456
// POST /api/admin/moderar/eliminar/persona/789
// POST /api/admin/moderar/resolver/chulito/123
export async function onRequestPost({ env, request, params }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const accion = params.accion;

  // Necesitamos entidad e id del path completo
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // /api/admin/moderar/{accion}/{entidad}/{id}
  const entidadReal = pathParts[4];
  const idReal = parseInt(pathParts[5], 10);

  if (!['aprobar', 'rechazar', 'eliminar', 'resolver'].includes(accion)) {
    return error('Accion invalida', 400);
  }
  if (!['reporte', 'chulito', 'persona'].includes(entidadReal)) {
    return error('Entidad invalida', 400);
  }
  if (isNaN(idReal)) return error('ID invalido', 400);

  let sql = '';

  if (entidadReal === 'reporte') {
    if (accion === 'aprobar') {
      sql = `UPDATE reportes SET estado = 'aprobado', approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`;
    } else if (accion === 'rechazar') {
      sql = `UPDATE reportes SET estado = 'rechazado', updated_at = datetime('now') WHERE id = ?`;
    } else if (accion === 'eliminar') {
      sql = `DELETE FROM reportes WHERE id = ?`;
    } else {
      return error('Accion no aplica a reportes', 400);
    }
  } else if (entidadReal === 'chulito') {
    if (accion === 'eliminar') {
      sql = `UPDATE chulitos SET estado = 'eliminado', updated_at = datetime('now') WHERE id = ?`;
    } else if (accion === 'resolver') {
      sql = `UPDATE chulitos SET estado = 'resuelto', resolved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`;
    } else if (accion === 'aprobar') {
      return json({ ok: true, message: 'Chulitos no requieren aprobacion' });
    } else {
      return error('Accion no aplica a chulitos', 400);
    }
  } else if (entidadReal === 'persona') {
    if (accion === 'aprobar') {
      sql = `UPDATE personas SET approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`;
    } else if (accion === 'rechazar' || accion === 'eliminar') {
      sql = `DELETE FROM personas WHERE id = ?`;
    } else {
      return error('Accion no aplica a personas', 400);
    }
  }

  await env.DB.prepare(sql).bind(idReal).run();
  await logAction(env.DB, accion, entidadReal, idReal, null, request);

  return json({ ok: true, message: `${entidadReal} ${idReal}: ${accion}` });
}
