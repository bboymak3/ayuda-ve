// ============================================================
// functions/api/admin/carga-rapida/index.js — POST /api/admin/carga-rapida
// Crear reporte/chulito rapidamente desde el panel admin
// Se publica directamente como aprobado/verificado
// ============================================================

import { json, error, readJsonBody, sanitize } from '../../../../lib/utils.js';
import { isAdmin } from '../../../../lib/auth.js';
import { extractCategories } from '../../../../lib/match.js';
import { logAction } from '../../../../lib/db.js';

// POST /api/admin/carga-rapida
// Body: {
//   tipo_entidad: "reporte" | "chulito",
//   tipo: "solicitud" | "oferta" | "informacion",
//   sector_id?, categoria?,
//   titulo, descripcion, requerimiento,
//   nombre, telefono, red_social?,
//   ubicacion_estado?, ubicacion_ciudad?, ubicacion_direccion?,
//   lat?, lng?,
//   urgencia,
//   fuente_url?, fuente_plataforma?,
//   foto_url?
// }
export async function onRequestPost({ env, request }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const body = await readJsonBody(request);
  const tipoEntidad = body.tipo_entidad || 'reporte';

  // Extraer categorias automaticamente
  const textoCompleto = `${body.titulo || ''} ${body.descripcion || ''} ${body.requerimiento || ''}`;
  const categorias = await extractCategories(textoCompleto, env.DB);
  const categoriaPrincipal = body.categoria || categorias[0] || null;

  if (tipoEntidad === 'chulito') {
    // Crear chulito verificado
    if (!body.lat || !body.lng) {
      return error('Chulitos requieren lat y lng', 422);
    }
    if (!body.nombre || !body.telefono || !body.requerimiento) {
      return error('Faltan campos: nombre, telefono, requerimiento', 422);
    }

    const result = await env.DB.prepare(
      `INSERT INTO chulitos
        (tipo, titulo, descripcion, categoria, nombre, telefono, requerimiento,
         ubicacion_texto, lat, lng, urgencia, foto_url, fuente, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin', 'manual')`
    ).bind(
      body.tipo || 'solicitud',
      sanitize(body.titulo || body.requerimiento.slice(0, 80)),
      sanitize(body.descripcion || null),
      categoriaPrincipal,
      sanitize(body.nombre),
      sanitize(body.telefono),
      sanitize(body.requerimiento),
      sanitize(body.ubicacion_direccion || null),
      parseFloat(body.lat),
      parseFloat(body.lng),
      body.urgencia || 'media',
      body.foto_url || null,
    ).run();

    const newId = result.meta.last_row_id;
    await logAction(env.DB, 'create', 'chulito', newId, { via: 'carga-rapida' }, request);

    return json({ ok: true, id: newId, tipo: 'chulito', message: 'Chulito publicado' }, 201);

  } else {
    // Crear reporte verificado (aprobado directamente)
    if (!body.titulo || !body.descripcion) {
      return error('Faltan campos: titulo, descripcion', 422);
    }

    const sectorId = body.sector_id || 8; // default: informacion

    const result = await env.DB.prepare(
      `INSERT INTO reportes
        (sector_id, tipo, titulo, descripcion, categoria_especifica,
         contacto_nombre, contacto_telefono, contacto_red_social,
         ubicacion_estado, ubicacion_ciudad, ubicacion_direccion,
         urgencia, estado, foto_urls, fuente_url, fuente_plataforma,
         tags, creado_por, approved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aprobado', ?, ?, ?, ?, 'admin', datetime('now'))`
    ).bind(
      parseInt(sectorId, 10),
      body.tipo || 'solicitud',
      sanitize(body.titulo),
      sanitize(body.descripcion),
      sanitize(body.categoria_especifica || categoriaPrincipal),
      sanitize(body.contacto_nombre || body.nombre || null),
      sanitize(body.contacto_telefono || body.telefono || null),
      sanitize(body.contacto_red_social || body.red_social || null),
      sanitize(body.ubicacion_estado || null),
      sanitize(body.ubicacion_ciudad || null),
      sanitize(body.ubicacion_direccion || null),
      body.urgencia || 'media',
      body.foto_url ? JSON.stringify([body.foto_url]) : null,
      body.fuente_url || null,
      body.fuente_plataforma || 'admin',
      categorias.length ? JSON.stringify(categorias) : null,
    ).run();

    const newId = result.meta.last_row_id;
    await logAction(env.DB, 'create', 'reporte', newId, { via: 'carga-rapida' }, request);

    return json({ ok: true, id: newId, tipo: 'reporte', message: 'Reporte publicado' }, 201);
  }
}
