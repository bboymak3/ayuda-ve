// ============================================================
// functions/perfil/[id].js — Página pública de seguimiento de perfil
// ============================================================

import { getPerfilWithReportes } from '../lib/perfiles.js';
import { isAdmin } from '../lib/auth.js';

export async function onRequestGet({ env, params, request }) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return new Response('ID inválido', { status: 400 });
  }

  const admin = isAdmin(request, env);
  const perfil = await getPerfilWithReportes(id, env.DB);

  if (!perfil) {
    return new Response('Perfil no encontrado', { status: 404 });
  }

  const html = renderHTML(perfil, admin);
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function renderHTML(p, isAdmin) {
  const fechaCreacion = new Date(p.created_at + 'Z').toLocaleDateString('es-VE');
  const ultimaActividad = new Date(p.last_activity + 'Z').toLocaleString('es-VE');
  const tipoLabel = {
    'persona': '👤 Persona',
    'organizacion': '🏢 Organización',
    'lugar': '📍 Lugar',
  }[p.tipo] || p.tipo;

  const totalReportes = (p.reportes?.length || 0) + (p.eventos?.length || 0);
  const esReiterativo = totalReportes > 1;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": p.tipo === 'organizacion' ? 'Organization' : 'Person',
    "name": p.nombre,
    "telephone": p.telefono,
    "address": p.ubicacion,
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Perfil: ${escapeAttr(p.nombre)} — Ayuda VE</title>
  <meta name="description" content="Seguimiento de reportes de ${escapeAttr(p.nombre)} en Ayuda VE. ${totalReportes} reportes registrados.">
  <script type="application/ld+json">
  ${JSON.stringify(jsonLd)}
  </script>
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>👤</text></svg>">
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

  <div class="container">
    <div class="ficha-header">
      <div class="card-meta">
        <span class="card-meta-item"><strong>${tipoLabel}</strong></span>
        ${p.verificada ? '<span class="urgencia-pill" style="background:#d1fae5;color:#065f46">✅ VERIFICADA</span>' : ''}
        ${esReiterativo ? `<span class="urgencia-pill urgencia-alta">📊 SEGUIMIENTO (${totalReportes} reportes)</span>` : '<span class="urgencia-pill urgencia-media">NUEVO</span>'}
        <span class="card-meta-item">🕒 Creado: ${fechaCreacion}</span>
        <span class="card-meta-item">⏱️ Última actividad: ${ultimaActividad}</span>
      </div>
      <h1 class="ficha-title">${escapeHtml(p.nombre)}</h1>
      ${p.categoria_principal ? `<p class="text-muted">🏷️ Categoría principal: <code>${escapeHtml(p.categoria_principal)}</code></p>` : ''}
    </div>

    <div class="grid-2">
      <div class="card">
        <h3 class="card-title">📞 Contacto</h3>
        ${p.telefono ? `<div>📞 ${escapeHtml(isAdmin ? p.telefono : maskPhone(p.telefono))}</div>` : '<div class="text-muted">Sin teléfono</div>'}
        ${p.red_social ? `<div>🔗 <a href="${escapeAttr(p.red_social)}" target="_blank">${escapeHtml(p.red_social)}</a></div>` : ''}
        ${p.ubicacion ? `<div>📍 ${escapeHtml(p.ubicacion)}</div>` : ''}
      </div>
      <div class="card">
        <h3 class="card-title">📊 Estadísticas</h3>
        <div>Total de reportes: <strong>${totalReportes}</strong></div>
        <div>Reportes detallados: <strong>${p.reportes?.length || 0}</strong></div>
        <div>Eventos en mapa: <strong>${p.eventos?.length || 0}</strong></div>
        <div>Videos analizados: <strong>${p.videos?.length || 0}</strong></div>
      </div>
    </div>

    ${esReiterativo ? `
      <div class="alert alert-info mt-3">
        📊 <strong>Perfil con seguimiento:</strong> Esta persona/organización tiene ${totalReportes} reportes registrados. Esto puede indicar una necesidad continua o una organización activa.
      </div>
    ` : ''}

    ${isAdmin && p.notas_internas ? `
      <div class="card mt-3" style="border-left:4px solid var(--color-warning)">
        <h3 class="card-title">📝 Notas internas (solo admin)</h3>
        <p>${escapeHtml(p.notas_internas)}</p>
      </div>
    ` : ''}

    <h2 class="section-title mt-3">📝 Reportes (${p.reportes?.length || 0})</h2>
    ${p.reportes?.length ? p.reportes.map(r => `
      <div class="card">
        <div class="card-meta">
          <span class="urgencia-pill urgencia-${r.urgencia}">${r.urgencia}</span>
          <span class="card-meta-item">${r.sector_icono || ''} ${escapeHtml(r.sector_nombre || '')}</span>
          <span class="card-meta-item">${r.link_fuente === 'auto_video' ? '🎥 Generado por IA' : '📝 Manual'}</span>
          <span class="card-meta-item">🕒 ${new Date(r.created_at + 'Z').toLocaleDateString('es-VE')}</span>
        </div>
        <h3 class="card-title">${escapeHtml(r.titulo)}</h3>
        <p class="card-description">${escapeHtml((r.descripcion || '').slice(0, 300))}${(r.descripcion || '').length > 300 ? '...' : ''}</p>
        <div class="card-actions">
          <a href="/reporte/${r.id}" class="btn btn-sm btn-primary">Ver ficha completa →</a>
        </div>
      </div>
    `).join('') : '<p class="text-muted">Sin reportes detallados.</p>'}

    <h2 class="section-title mt-3">📍 Eventos en mapa (${p.eventos?.length || 0})</h2>
    ${p.eventos?.length ? p.eventos.map(c => `
      <div class="card">
        <div class="card-meta">
          <span class="urgencia-pill urgencia-${c.urgencia}">${c.urgencia}</span>
          <span class="card-meta-item">🕒 ${new Date(c.created_at + 'Z').toLocaleDateString('es-VE')}</span>
        </div>
        <h3 class="card-title">${escapeHtml(c.titulo)}</h3>
        <p class="card-description">${escapeHtml((c.requerimiento || '').slice(0, 200))}</p>
        <div class="card-actions">
          <a href="/evento/${c.id}" class="btn btn-sm btn-primary">Ver evento →</a>
          <a href="/mapa.html" class="btn btn-sm btn-outline">Ver en mapa</a>
        </div>
      </div>
    `).join('') : '<p class="text-muted">Sin eventos.</p>'}

    ${p.videos?.length ? `
      <h2 class="section-title mt-3">🎥 Videos analizados (${p.videos.length})</h2>
      ${p.videos.map(v => `
        <div class="card">
          <div class="card-meta">
            <span class="card-meta-item">📺 ${escapeHtml(v.plataforma || 'video')}</span>
            <span class="card-meta-item">🕒 ${v.completed_at ? new Date(v.completed_at + 'Z').toLocaleString('es-VE') : ''}</span>
          </div>
          ${v.resumen_corto ? `<p class="card-description">${escapeHtml(v.resumen_corto)}...</p>` : ''}
          ${v.url_origen ? `<a href="${escapeAttr(v.url_origen)}" target="_blank" class="btn btn-sm btn-outline">Ver video original →</a>` : ''}
        </div>
      `).join('')}
    ` : ''}

    <div class="card mt-3" style="background:#fef3c7;border:1px solid #fcd34d">
      <h3 class="card-title">⚠️ ¿Algo incorrecto en este perfil?</h3>
      <p class="card-description">Si este perfil tiene información incorrecta, es una suplantación, o quieres reportar abuso:</p>
      <a href="/reportar-abuso.html?entidad_tipo=perfil&entidad_id=${p.id}" class="btn btn-warning">🚩 Reportar abuso</a>
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
function maskPhone(phone) {
  if (!phone) return '';
  const s = String(phone);
  return s.length > 4 ? s.slice(0, -2) + '**' : s;
}
