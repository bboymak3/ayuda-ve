// ============================================================
// functions/api/fb-metadata/index.js — GET /api/fb-metadata?url=...
// Hace de proxy: lee la página de Facebook desde el servidor
// (sin restricciones CORS) y extrae título, descripción e imagen
// ============================================================

import { json, error } from '../../../lib/utils.js';

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return error('Parámetro url requerido', 400);
  }

  // Validar que sea Facebook
  if (!targetUrl.includes('facebook.com') && !targetUrl.includes('fb.com') && !targetUrl.includes('fb.watch')) {
    return error('Solo se permiten URLs de Facebook', 400);
  }

  try {
    // Hacer fetch desde el servidor (sin CORS)
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FacebookBot/1.0; +https://developers.facebook.com/docs/sharing/webmasters/crawler)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      return error(`Facebook respondió HTTP ${res.status}`, 422);
    }

    const html = await res.text();

    // Extraer metadatos Open Graph
    const metadata = {
      titulo: extractMeta(html, 'og:title') || extractTag(html, 'title'),
      descripcion: extractMeta(html, 'og:description') || extractMeta(html, 'description'),
      imagen: extractMeta(html, 'og:image'),
      url_canonica: extractMeta(html, 'og:url'),
      sitio: extractMeta(html, 'og:site_name'),
      tipo: extractMeta(html, 'og:type'),
    };

    // Si no hay título, usar el <title> de la página
    if (!metadata.titulo) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) metadata.titulo = titleMatch[1].trim();
    }

    // Limpiar entidades HTML comunes
    if (metadata.titulo) metadata.titulo = decodeEntities(metadata.titulo).slice(0, 200);
    if (metadata.descripcion) metadata.descripcion = decodeEntities(metadata.descripcion).slice(0, 1000);

    return json({
      ok: true,
      url: targetUrl,
      metadata,
    });
  } catch (e) {
    console.error('Error en fb-metadata:', e);
    return error(`Error leyendo Facebook: ${e.message}`, 500);
  }
}

// Extraer <meta property="og:X" content="Y">
function extractMeta(html, property) {
  // Probar property y name
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

// Extraer <meta name="X" content="Y">
function extractTag(html, name) {
  const m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'));
  return m ? m[1].trim() : null;
}

// Decodificar entidades HTML
function decodeEntities(str) {
  if (!str) return str;
  return str
    // Entidades hexadecimales: &#xNN; o &#XNN;
    .replace(/&#x([0-9a-fA-F]+);/g, (m, hex) => {
      try { return String.fromCodePoint(parseInt(hex, 16)); }
      catch { return m; }
    })
    // Entidades decimales: &#NN;
    .replace(/&#(\d+);/g, (m, code) => {
      try { return String.fromCodePoint(parseInt(code, 10)); }
      catch { return m; }
    })
    // Entidades nombradas comunes
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&middot;/g, '·')
    .replace(/&hellip;/g, '…')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»');
}
