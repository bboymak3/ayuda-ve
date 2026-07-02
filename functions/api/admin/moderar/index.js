// ============================================================
// functions/api/admin/moderar/index.js — POST /api/admin/moderar
// Endpoint unificado para evitar problemas con múltiples parámetros dinámicos
// Body: { accion, entidad, id }
//   accion: aprobar | rechazar | eliminar | resolver
//   entidad: reporte | chulito | persona
//   id: número
// ============================================================

import { json, error, readJsonBody } from '../../../lib/utils.js';
import { isAdmin } from '../../../lib/auth.js';
import { logAction } from '../../../lib/db.js';

export async function onRequestPost({ env, request }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const body = await readJsonBody(request);
  const { accion, entidad, id } = body;

  if (!accion || !entidad || !id) {
    return error('Faltan parámetros: accion, entidad, id', 400);
  }
  if (!['aprobar', 'rechazar', 'eliminar', 'resolver'].includes(accion)) {
    return error('Acción inválida', 400);
  }
  if (!['reporte', 'chulito', 'persona'].includes(entidad)) {
    return error('Entidad inválida', 400);
  }
  const idNum = parseInt(id, 10);
  if (isNaN(idNum)) return error('ID inválido', 400);

  let sql = '';
  let logMsg = '';

  if (entidad === 'reporte') {
    if (accion === 'aprobar') {
      sql = `UPDATE reportes SET estado = 'aprobado', approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`;
      logMsg = `Reporte ${idNum} aprobado`;
    } else if (accion === 'rechazar') {
      sql = `UPDATE reportes SET estado = 'rechazado', updated_at = datetime('now') WHERE id = ?`;
      logMsg = `Reporte ${idNum} rechazado`;
    } else if (accion === 'eliminar') {
      sql = `DELETE FROM reportes WHERE id = ?`;
      logMsg = `Reporte ${idNum} eliminado`;
    } else {
      return error('Acción no aplica a reportes', 400);
    }
  } else if (entidad === 'chulito') {
    if (accion === 'eliminar') {
      sql = `UPDATE chulitos SET estado = 'eliminado', updated_at = datetime('now') WHERE id = ?`;
      logMsg = `Evento ${idNum} eliminado`;
    } else if (accion === 'resolver') {
      sql = `UPDATE chulitos SET estado = 'resuelto', resolved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`;
      logMsg = `Evento ${idNum} resuelto`;
    } else if (accion === 'aprobar') {
      return json({ ok: true, message: 'Eventos no requieren aprobación' });
    } else {
      return error('Acción no aplica a eventos', 400);
    }
  } else if (entidad === 'persona') {
    if (accion === 'aprobar') {
      sql = `UPDATE personas SET approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`;
      logMsg = `Persona ${idNum} aprobada`;
    } else if (accion === 'rechazar' || accion === 'eliminar') {
      sql = `DELETE FROM personas WHERE id = ?`;
      logMsg = `Persona ${idNum} eliminada`;
    } else {
      return error('Acción no aplica a personas', 400);
    }
  }

  await env.DB.prepare(sql).bind(idNum).run();
  await logAction(env.DB, accion, entidad, idNum, null, request);

  return json({ ok: true, message: logMsg });
}
