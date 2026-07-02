// ============================================================
// functions/api/admin/repostear/index.js — POST /api/admin/repostear
// Herramienta integral para repostear contenido desde otras redes
// Acepta: URL imagen, embed Facebook, URL video, archivo audio
// ============================================================

import { json, error, readJsonBody, sanitize } from '../../../../lib/utils.js';
import { isAdmin } from '../../../../lib/auth.js';
import { logAction } from '../../../../lib/db.js';
import { extractCategories } from '../../../../lib/match.js';

// POST /api/admin/repostear
// Body: {
//   tipo_contenido: 'imagen_url' | 'facebook_embed' | 'video_url' | 'audio_file' | 'manual',
//   url_origen,        // link al post original (Facebook, Instagram, etc.)
//   embed_html,        // iframe de FB (si aplica)
//   imagen_url,        // URL directa de imagen
//   titulo, descripcion,
//   contacto_nombre, contacto_telefono,
//   ubicacion_estado, ubicacion_ciudad, ubicacion_direccion,
//   lat, lng,          // si quieres que también aparezca en el mapa
//   urgencia, sector_id,
//   tipo: 'solicitud' | 'disponible' | 'informacion',
//   crear_chulito: bool  // si true, también crea un evento en el mapa
// }
export async function onRequestPost({ env, request }) {
  if (!isAdmin(request, env)) return error('No autorizado', 401);

  const body = await readJsonBody(request);

  // Si el frontend mandó fb_url pero no embed_html, construirlo en el backend
  if (body.fb_url && (!body.embed_html || !body.embed_html.startsWith('<iframe'))) {
    const fbUrl = String(body.fb_url).trim();
    if (fbUrl.includes('facebook.com') || fbUrl.includes('fb.com') || fbUrl.includes('fb.watch')) {
      const encoded = encodeURIComponent(fbUrl);
      body.embed_html = `<iframe src="https://www.facebook.com/plugins/post.php?href=${encoded}&show_text=true&width=500" width="500" height="712" style="border:none;overflow:hidden;max-width:100%" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`;
      if (!body.url_origen) body.url_origen = fbUrl;
    }
  }

  // Si hay embed_html pero no url_origen, extraer URL del iframe
  if (body.embed_html && !body.url_origen) {
    const embedStr = String(body.embed_html);
    const srcMatch = embedStr.match(/src=["']([^"']+)["']/i);
    if (srcMatch) {
      const srcUrl = srcMatch[1];
      const hrefMatch = srcUrl.match(/[?&]href=([^&]+)/);
      if (hrefMatch) {
        try {
          body.url_origen = decodeURIComponent(hrefMatch[1]);
        } catch {
          body.url_origen = srcUrl;
        }
      } else {
        body.url_origen = srcUrl;
      }
    }
  }

  // Validaciones básicas - solo título es obligatorio (la descripción se auto-genera)
  let titulo = (body.titulo || '').trim();
  let descripcion = (body.descripcion || '').trim();

  // Si es FB embed y no hay título, auto-generar de la URL
  if (!titulo && body.tipo_contenido === 'facebook_embed' && body.url_origen) {
    const urlStr = String(body.url_origen);
    let m = urlStr.match(/facebook\.com\/reel\/([^\/\?]+)/i);
    if (m) {
      const id = m[1].length > 12 ? m[1].slice(0, 12) + '...' : m[1];
      titulo = `Video Reel de Facebook (${id})`;
    } else {
      m = urlStr.match(/facebook\.com\/share\/(?:p|v|post)\/([^\/\?]+)/i);
      if (m) {
        titulo = `Post de Facebook (${m[1]})`;
      } else {
        m = urlStr.match(/facebook\.com\/([^\/]+)\/posts\/([^\/\?]+)/i);
        if (m) {
          const usuario = m[1].replace(/[._-]/g, ' ');
          titulo = `Post de ${usuario} (Facebook)`;
        } else {
          m = urlStr.match(/facebook\.com\/([^\/]+)\/videos\/([^\/\?]+)/i);
          if (m) {
            const usuario = m[1].replace(/[._-]/g, ' ');
            titulo = `Video de ${usuario} (Facebook)`;
          } else {
            titulo = 'Post de Facebook';
          }
        }
      }
    }
  }

  // Si es FB embed y no hay descripción, usar placeholder
  if (!descripcion && body.tipo_contenido === 'facebook_embed') {
    descripcion = 'Ver publicación original de Facebook (mostrada abajo como embed).';
  }

  if (!titulo) {
    return error('El título es obligatorio (o proporciona URL de Facebook para auto-generarlo)', 422);
  }

  if (!descripcion) {
    descripcion = 'Sin descripción';
  }

  const tipo = body.tipo || 'informacion';
  if (!['solicitud', 'disponible', 'informacion'].includes(tipo)) {
    return error('Tipo inválido', 422);
  }

  const tipoFuente = body.tipo_contenido || 'manual';
  const urlOrigen = body.url_origen || null;
  const embedHtml = body.embed_html || null;
  const imagenUrl = body.imagen_url || null;

  // Si es imagen_url pero no proporcionaron imagen_url, usar url_origen
  const fotoUrlFinal = imagenUrl || (tipoFuente === 'imagen_url' ? urlOrigen : null);

  // Si es facebook_embed, exigir al menos URL de origen (el embed se genera arriba)
  if (tipoFuente === 'facebook_embed' && !embedHtml && !urlOrigen) {
    return error('Para Facebook embed debes proporcionar la URL del post', 422);
  }

  // Si es facebook_embed con URL pero sin embedHtml, generar embed de la URL
  let embedHtmlFinal = embedHtml;
  if (tipoFuente === 'facebook_embed' && !embedHtmlFinal && urlOrigen) {
    const encoded = encodeURIComponent(String(urlOrigen));
    embedHtmlFinal = `<iframe src="https://www.facebook.com/plugins/post.php?href=${encoded}&show_text=true&width=500" width="500" height="712" style="border:none;overflow:hidden;max-width:100%" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`;
  }

  // Extraer categorías automáticamente (usar titulo/descripcion ya procesados)
  const textoCompleto = `${titulo} ${descripcion}`;
  const categorias = await extractCategories(textoCompleto, env.DB);

  const sectorId = body.sector_id || 8; // default: Información útil
  const urgencia = body.urgencia || 'media';

  // Determinar si crear reporte, chulito o ambos
  const crearChulito = body.crear_chulito && body.lat && body.lng;

  let reporteId = null;
  let chulitoId = null;

  // 1. Crear reporte
  const result = await env.DB.prepare(
    `INSERT INTO reportes
      (sector_id, tipo, titulo, descripcion, categoria_especifica,
       contacto_nombre, contacto_telefono,
       ubicacion_estado, ubicacion_ciudad, ubicacion_direccion,
       urgencia, estado, foto_urls, video_url, fuente_url, fuente_plataforma,
       tags, creado_por, approved_at,
       embed_html, tipo_fuente)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aprobado', ?, ?, ?, ?, ?, 'admin', datetime('now'), ?, ?)`
  ).bind(
    parseInt(sectorId, 10),
    tipo,
    sanitize(titulo),
    sanitize(descripcion),
    sanitize(categorias[0] || null),
    sanitize(body.contacto_nombre || null),
    sanitize(body.contacto_telefono || null),
    sanitize(body.ubicacion_estado || null),
    sanitize(body.ubicacion_ciudad || null),
    sanitize(body.ubicacion_direccion || null),
    urgencia,
    fotoUrlFinal ? JSON.stringify([fotoUrlFinal]) : null,
    urlOrigen,  // video_url
    urlOrigen,  // fuente_url
    detectarPlataforma(urlOrigen),
    categorias.length ? JSON.stringify(categorias) : null,
    embedHtmlFinal,
    tipoFuente,
  ).run();

  reporteId = result.meta.last_row_id;

  // 2. Crear chulito (evento en mapa) si se solicitó
  if (crearChulito) {
    const chResult = await env.DB.prepare(
      `INSERT INTO chulitos
        (tipo, titulo, descripcion, categoria, nombre, telefono, requerimiento,
         ubicacion_texto, lat, lng, urgencia, foto_url, fuente, ip,
         embed_html, tipo_fuente, fuente_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin', 'manual', ?, ?, ?)`
    ).bind(
      tipo,
      sanitize(titulo),
      sanitize(descripcion),
      categorias[0] || null,
      sanitize(body.contacto_nombre || 'Repost'),
      sanitize(body.contacto_telefono || ''),
      sanitize(descripcion),
      sanitize(body.ubicacion_direccion || body.ubicacion_ciudad || ''),
      parseFloat(body.lat),
      parseFloat(body.lng),
      urgencia,
      fotoUrlFinal,
      embedHtmlFinal,
      tipoFuente,
      urlOrigen,
    ).run();
    chulitoId = chResult.meta.last_row_id;
  }

  await logAction(env.DB, 'repost', 'reporte', reporteId, {
    tipo_fuente: tipoFuente, url: urlOrigen, chulito: chulitoId
  }, request);

  return json({
    ok: true,
    reporte_id: reporteId,
    chulito_id: chulitoId,
    reporte_url: `/reporte/${reporteId}`,
    reporte_url_completa: `${env.SITE_URL || 'https://ayuda-ve.pages.dev'}/reporte/${reporteId}`,
    categorias_detectadas: categorias,
    message: crearChulito
      ? 'Repost creado como reporte + evento en mapa'
      : 'Repost creado como reporte',
  }, 201);
}

function detectarPlataforma(url) {
  if (!url) return 'admin';
  const u = url.toLowerCase();
  if (u.includes('facebook') || u.includes('fb.')) return 'facebook';
  if (u.includes('instagram')) return 'instagram';
  if (u.includes('whatsapp')) return 'whatsapp';
  if (u.includes('youtube') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('tiktok')) return 'tiktok';
  if (u.includes('twitter') || u.includes('x.com')) return 'twitter';
  return 'otro';
}
