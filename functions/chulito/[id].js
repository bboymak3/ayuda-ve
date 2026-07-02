// ============================================================
// functions/chulito/[id].js — Ficha pública de chulito
// ============================================================

export async function onRequestGet({ env, params }) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return new Response('ID inválido', { status: 400 });
  }

  const chulito = await env.DB.prepare(
    `SELECT * FROM chulitos WHERE id = ?`
  ).bind(id).first();

  if (!chulito) {
    return new Response('Chulito no encontrado', { status: 404 });
  }

  const html = renderFichaHTML(chulito);
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function renderFichaHTML(c) {
  const tipoLabel = {
    'solicitud': '🆘 NECESITA AYUDA',
    'oferta': '💚 OFRECE AYUDA',
    'informacion': 'ℹ️ INFORMACIÓN ÚTIL',
  }[c.tipo] || c.tipo;

  const urgenciaClass = `urgencia-${c.urgencia}`;
  const fecha = new Date(c.created_at + 'Z').toLocaleString('es-VE');
  const waLink = c.telefono
    ? `https://wa.me/58${String(c.telefono).replace(/[^0-9]/g,'').replace(/^58/,'').replace(/^0/,'')}`
    : '#';

  const titulo = c.titulo || (c.requerimiento || '').slice(0, 80);
  const descripcion = c.descripcion || '';

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": c.tipo === 'oferta' ? 'Offer' : 'Demand',
    "name": titulo,
    "description": c.requerimiento,
    "category": c.categoria || 'ayuda',
    "agent": {
      "@type": "Person",
      "name": c.nombre,
      "telephone": c.telefono,
    },
    "eligibleLocation": c.ubicacion_texto || 'Venezuela',
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeAttr(titulo)} — Ayuda VE</title>
  <meta name="description" content="${escapeAttr(c.requerimiento || '').slice(0, 200)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeAttr(titulo)}">
  <meta property="og:description" content="${escapeAttr(c.requerimiento || '').slice(0, 200)}">
  <script type="application/ld+json">
  ${JSON.stringify(jsonLd)}
  </script>
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📍</text></svg>">
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
        ${c.estado === 'resuelto'
          ? '<span class="urgencia-pill" style="background:#d1fae5;color:#065f46">✅ RESUELTO</span>'
          : `<span class="urgencia-pill ${urgenciaClass}">${c.urgencia.toUpperCase()}</span>`
        }
        ${c.categoria ? `<span class="card-meta-item">🏷️ ${escapeHtml(c.categoria)}</span>` : ''}
        <span class="card-meta-item">🕒 ${fecha}</span>
      </div>
      <h1 class="ficha-title">${escapeHtml(titulo)}</h1>
    </div>

    <div class="ficha-section">
      <h3>📋 Detalle</h3>
      <p style="font-size:1.05rem;line-height:1.7">${escapeHtml(c.requerimiento)}</p>
      ${descripcion ? `<p style="margin-top:1rem;color:#475569">${escapeHtml(descripcion)}</p>` : ''}
    </div>

    <div class="ficha-section">
      <h3>👤 Contacto</h3>
      <div class="card-contact">
        <div style="font-size:1.1rem"><strong>${escapeHtml(c.nombre)}</strong></div>
        ${c.telefono ? `
          <div style="margin-top:0.5rem;font-size:1.1rem">
            📞 <a href="tel:${escapeHtml(c.telefono)}">${escapeHtml(c.telefono)}</a>
            · <a href="${waLink}" target="_blank" style="font-weight:600">💬 WhatsApp</a>
          </div>
        ` : ''}
        ${c.ubicacion_texto ? `<div style="margin-top:0.5rem">📍 ${escapeHtml(c.ubicacion_texto)}</div>` : ''}
        <div style="margin-top:0.5rem;color:#64748b;font-size:0.85rem">
          📍 Coordenadas: ${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}
        </div>
      </div>
    </div>

    ${c.foto_url ? `
      <div class="ficha-section">
        <h3>📷 Foto</h3>
        <img src="${escapeAttr(c.foto_url)}" alt="Foto" style="width:100%;border-radius:8px;border:1px solid #e2e8f0">
      </div>
    ` : ''}

    <div class="ficha-section">
      <a href="/mapa.html" class="btn btn-outline">🗺️ Ver en mapa</a>
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
