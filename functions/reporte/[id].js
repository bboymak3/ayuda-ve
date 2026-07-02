// ============================================================
// functions/reporte/[id].js — Ficha pública de reporte
// ============================================================

import { parseReporte, REPORTE_FIELDS } from '../lib/db.js';

export async function onRequestGet({ env, params }) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return new Response('ID inválido', { status: 400 });
  }

  const row = await env.DB.prepare(
    `SELECT ${REPORTE_FIELDS}
     FROM reportes r
     JOIN sectores s ON r.sector_id = s.id
     WHERE r.id = ?`
  ).bind(id).first();

  if (!row) {
    return new Response('Reporte no encontrado', { status: 404 });
  }

  const r = parseReporte(row);
  const html = renderFichaHTML(r);
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function renderFichaHTML(r) {
  const tipoLabel = {
    'solicitud': '🆘 NECESITA AYUDA',
    'disponible': '💚 DISPONIBLE PARA DONAR',
    'informacion': 'ℹ️ INFORMACIÓN ÚTIL',
  }[r.tipo] || r.tipo;

  const fecha = new Date(r.created_at + 'Z').toLocaleString('es-VE');
  const waLink = r.contacto_telefono
    ? `https://wa.me/58${String(r.contacto_telefono).replace(/[^0-9]/g,'').replace(/^58/,'').replace(/^0/,'')}`
    : '#';

  const ubicacion = [r.ubicacion_ciudad, r.ubicacion_estado, r.ubicacion_direccion]
    .filter(Boolean).join(', ');

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": r.tipo === 'disponible' ? 'Offer' : 'Demand',
    "name": r.titulo,
    "description": r.descripcion,
    "category": r.sector_nombre,
    "agent": {
      "@type": "Person",
      "name": r.contacto_nombre,
      "telephone": r.contacto_telefono,
    },
    "eligibleLocation": ubicacion || 'Venezuela',
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeAttr(r.titulo)} — Ayuda VE</title>
  <meta name="description" content="${escapeAttr(r.descripcion || '').slice(0, 200)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeAttr(r.titulo)}">
  <meta property="og:description" content="${escapeAttr(r.descripcion || '').slice(0, 200)}">
  <script type="application/ld+json">
  ${JSON.stringify(jsonLd)}
  </script>
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📄</text></svg>">
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <a href="/" class="logo"><span class="logo-icon">🤝</span><span>Ayuda VE</span></a>
      <nav class="nav" id="nav">
        <a href="/" class="nav-link">Inicio</a>
        <a href="/mapa.html" class="nav-link">Mapa</a>
        <a href="/buscar.html" class="nav-link">Buscar</a>
        <a href="/reportar.html" class="nav-link">Reportar</a>
        <a href="/admin/" class="nav-link">Admin</a>
      </nav>
      <button class="menu-toggle" onclick="document.getElementById('nav').classList.toggle('mobile-open')">☰</button>
    </div>
  </header>

  <div class="container-narrow">
    <div class="ficha-header">
      <div class="card-meta">
        <span class="card-meta-item"><strong>${tipoLabel}</strong></span>
        <span class="urgencia-pill urgencia-${r.urgencia}">${r.urgencia.toUpperCase()}</span>
        <span class="card-meta-item">${r.sector_icono} ${escapeHtml(r.sector_nombre)}</span>
        <span class="card-meta-item">🕒 ${fecha}</span>
      </div>
      <h1 class="ficha-title">${escapeHtml(r.titulo)}</h1>
    </div>

    <div class="ficha-section">
      <h3>📋 Detalle</h3>
      <p style="font-size:1.05rem;line-height:1.7;white-space:pre-wrap">${escapeHtml(r.descripcion)}</p>
      ${r.categoria_especifica ? `<p style="margin-top:0.5rem;color:#475569">🏷️ Categoría: <code>${escapeHtml(r.categoria_especifica)}</code></p>` : ''}
      ${r.tags && r.tags.length ? `<p style="margin-top:0.5rem">Tags: ${r.tags.map(t => `<span class="urgencia-pill urgencia-baja">${escapeHtml(t)}</span>`).join(' ')}</p>` : ''}
    </div>

    <div class="ficha-section">
      <h3>👤 Contacto</h3>
      <div class="card-contact">
        ${r.contacto_nombre ? `<div style="font-size:1.1rem"><strong>${escapeHtml(r.contacto_nombre)}</strong></div>` : ''}
        ${r.contacto_telefono ? `
          <div style="margin-top:0.5rem;font-size:1.1rem">
            📞 <a href="tel:${escapeHtml(r.contacto_telefono)}">${escapeHtml(r.contacto_telefono)}</a>
            · <a href="${waLink}" target="_blank" style="font-weight:600">💬 WhatsApp</a>
          </div>
        ` : ''}
        ${r.contacto_red_social ? `<div style="margin-top:0.5rem">🔗 <a href="${escapeAttr(r.contacto_red_social)}" target="_blank">${escapeHtml(r.contacto_red_social)}</a></div>` : ''}
        ${ubicacion ? `<div style="margin-top:0.5rem">📍 ${escapeHtml(ubicacion)}</div>` : ''}
      </div>
    </div>

    ${r.foto_urls && r.foto_urls.length > 0 ? `
      <div class="ficha-section">
        <h3>📷 Fotos</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
          ${r.foto_urls.map(url => `<img src="${escapeAttr(url)}" alt="Foto" style="width:100%;border-radius:8px;border:1px solid #e2e8f0">`).join('')}
        </div>
      </div>
    ` : ''}

    ${r.video_url ? `
      <div class="ficha-section">
        <h3>🎥 Video</h3>
        <a href="${escapeAttr(r.video_url)}" target="_blank" class="btn btn-outline">Ver video original →</a>
      </div>
    ` : ''}

    ${r.transcripcion ? `
      <div class="ficha-section">
        <h3>📝 Transcripción del video</h3>
        <div style="padding:1rem;background:#f8fafc;border-radius:8px;white-space:pre-wrap;font-size:0.95rem">${escapeHtml(r.transcripcion)}</div>
      </div>
    ` : ''}

    ${r.embed_html ? `
      <div class="ficha-section">
        <h3>📘 Publicación original (embed)</h3>
        <div class="embed-wrap" style="padding-bottom:120%;min-height:300px">
          ${r.embed_html}
        </div>
      </div>
    ` : ''}

    ${(r.fuente_url || r.video_url) ? `
      <div class="ficha-section">
        <h3>🔗 Fuente original</h3>
        <a href="${escapeAttr(r.fuente_url || r.video_url)}" target="_blank" rel="noopener" class="btn btn-primary">Ver publicación original →</a>
      </div>
    ` : ''}

    <div class="ficha-section">
      <a href="/sector.html?slug=${escapeAttr(r.sector_slug)}" class="btn btn-outline">Ver más en ${escapeHtml(r.sector_nombre)}</a>
      <a href="/reportar.html" class="btn btn-primary">➕ Publicar respuesta</a>
    </div>
  </div>

  <script src="/js/main.js"></script>
</body>
</html>`;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
}
function escapeAttr(s) { return escapeHtml(s); }
