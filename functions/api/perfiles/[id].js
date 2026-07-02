// ============================================================
// functions/api/perfiles/[id].js — GET /api/perfiles/[id]
// Devuelve un perfil con todos sus reportes (seguimiento)
// ============================================================

import { json, error } from '../../../lib/utils.js';
import { isAdmin } from '../../../lib/auth.js';
import { getPerfilWithReportes } from '../../../lib/perfiles.js';

export async function onRequestGet({ env, request, params }) {
  // Es público para que se pueda compartir el seguimiento
  // Pero solo admin puede ver notas_internas
  const admin = isAdmin(request, env);

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return error('ID inválido', 400);

  const perfil = await getPerfilWithReportes(id, env.DB);
  if (!perfil) return error('Perfil no encontrado', 404);

  // Si no es admin, ocultar notas_internas y datos sensibles
  if (!admin) {
    delete perfil.notas_internas;
    // Enmascarar teléfono parcial
    if (perfil.telefono) {
      const t = String(perfil.telefono);
      perfil.telefono = t.length > 4 ? t.slice(0, -2) + '**' : t;
    }
  }

  return json({ ok: true, perfil });
}

// PUT - actualizar perfil (solo admin)
export async function onRequestPut({ env, request, params }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return error('ID inválido', 400);

  const body = await request.json();
  const allowed = ['tipo', 'nombre', 'telefono', 'red_social', 'ubicacion',
                   'categoria_principal', 'verificada', 'notas_internas'];

  const updates = [];
  const binds = [];
  for (const f of allowed) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      binds.push(f === 'verificada' ? (body[f] ? 1 : 0) : body[f]);
    }
  }

  if (updates.length === 0) return error('Nada que actualizar', 400);

  updates.push(`updated_at = datetime('now')`);
  binds.push(id);

  await env.DB.prepare(
    `UPDATE perfiles SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...binds).run();

  return json({ ok: true, message: 'Perfil actualizado' });
}
