// ============================================================
// functions/centro-acopio/[id].js — Ficha pública de centro de acopio
// ============================================================

export async function onRequestGet({ env, params }) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return new Response('ID inválido', { status: 400 });
  }

  const centro = await env.DB.prepare(
    `SELECT * FROM centros_acopio WHERE id = ? AND estado = 'aprobado'`
  ).bind(id).first();

  if (!centro) {
    return new Response('Centro de acopio no encontrado o no aprobado', { status: 404 });
  }

  const html = renderHTML(centro);
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function renderHTML(c) {
  const fecha = new Date(c.created_at + 'Z').toLocaleDateString('es-VE');
  const waLink = c.telefono
    ? `https://wa.me/58${String(c.telefono).replace(/[^0-9]/g,'').replace(/^58/,'').replace(/^0/,'')}`
    : '#';

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    "name": c.nombre_centro || 'Centro de Acopio',
    "description": c.tipo_insumos,
    "telephone": c.telefono,
    "address": c.direccion || c.ubicacion_texto || 'Venezuela',
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeAttr(c.nombre_centro || 'Centro de Acopio')} — Ayuda VE</title>
  <meta name="description" content="Centro de acopio: ${escapeAttr(c.tipo_insumos || '').slice(0, 200)}">
  <script type="application/ld+json">
  ${JSON.stringify(jsonLd)}
  </script>
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏪</text></svg>">
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
        <span class="card-meta-item"><strong>🏪 CENTRO DE ACopIO</strong></span>
        <span class="urgencia-pill" style="background:#dbeafe;color:#1e40af">✅ APROBADO</span>
        <span class="card-meta-item">🕒 ${fecha}</span>
      </div>
      <h1 class="ficha-title">${escapeHtml(c.nombre_centro || 'Centro de Acopio')}</h1>
    </div>

    <div class="ficha-section">
      <h3>📦 Insumos y ayuda que manejan</h3>
      <p style="font-size:1.05rem;line-height:1.7">${escapeHtml(c.tipo_insumos)}</p>
      ${c.descripcion ? `<p style="margin-top:1rem;color:#475569">${escapeHtml(c.descripcion)}</p>` : ''}
    </div>

    <div class="ficha-section">
      <h3>👤 Encargado</h3>
      <div class="card-contact">
        <div style="font-size:1.1rem"><strong>${escapeHtml(c.nombre_encargado)}</strong></div>
        ${c.telefono ? `
          <div style="margin-top:0.5rem;font-size:1.1rem">
            📞 <a href="tel:${escapeHtml(c.telefono)}">${escapeHtml(c.telefono)}</a>
            · <a href="${waLink}" target="_blank" style="font-weight:600">💬 WhatsApp</a>
          </div>
        ` : ''}
        ${c.email ? `<div style="margin-top:0.5rem">📧 ${escapeHtml(c.email)}</div>` : ''}
        ${c.red_social ? `<div style="margin-top:0.5rem">🔗 <a href="${escapeAttr(c.red_social)}" target="_blank">${escapeHtml(c.red_social)}</a></div>` : ''}
      </div>
    </div>

    <div class="ficha-section">
      <h3>📍 Ubicación</h3>
      <div class="card-contact">
        ${c.direccion ? `<div>📍 ${escapeHtml(c.direccion)}</div>` : ''}
        ${c.ubicacion_texto ? `<div>${escapeHtml(c.ubicacion_texto)}</div>` : ''}
        ${c.horario ? `<div style="margin-top:0.5rem">🕒 Horario: ${escapeHtml(c.horario)}</div>` : ''}
        <div style="margin-top:0.5rem;color:#64748b;font-size:0.85rem">Coordenadas: ${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}</div>
      </div>
    </div>

    ${c.foto_url ? `
      <div class="ficha-section">
        <h3>📷 Foto</h3>
        <img src="${escapeAttr(c.foto_url)}" alt="Foto del centro" style="width:100%;border-radius:8px;border:1px solid #e2e8f0">
      </div>
    ` : ''}

    <div class="ficha-section">
      <a href="/mapa.html" class="btn btn-outline">🗺️ Ver en mapa</a>
      <a href="/reportar.html" class="btn btn-primary">➕ Publicar disponible de donación</a>
    </div>

    <div class="card mt-3" style="background:#fef3c7;border:1px solid #fcd34d">
      <h3 class="card-title">⚠️ ¿Información incorrecta?</h3>
      <p class="card-description">Si este centro cerró, cambió de ubicación, o quieres reportar un problema:</p>
      <a href="/reportar-abuso.html?entidad_tipo=url_externa&url_referencia=/centro-acopio/${c.id}" class="btn btn-warning">🚩 Reportar</a>
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
