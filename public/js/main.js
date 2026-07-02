// ============================================================
// public/js/main.js — Utilidades compartidas del frontend
// ============================================================

// ----------------------------------------------------------
// API helpers
// ----------------------------------------------------------
async function api(path, options = {}) {
  const opts = {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  };
  if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
    opts.body = JSON.stringify(opts.body);
  }
  if (opts.body instanceof FormData) {
    delete opts.headers['Content-Type'];
  }
  const res = await fetch(path, opts);
  let data;
  try { data = await res.json(); }
  catch { data = { ok: false, error: 'Respuesta inválida del servidor' }; }

  if (!res.ok) {
    throw new Error(data.error || `Error HTTP ${res.status}`);
  }
  return data;
}

// ----------------------------------------------------------
// Toast (notificaciones)
// ----------------------------------------------------------
function showToast(message, type = 'info', duration = 4000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'success') toast.style.background = '#10b981';
  else if (type === 'error') toast.style.background = '#dc2626';
  else if (type === 'warning') toast.style.background = '#f59e0b';
  else toast.style.background = '#1e293b';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ----------------------------------------------------------
// Escapar HTML (anti-XSS)
// ----------------------------------------------------------
function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ----------------------------------------------------------
// Formatear fecha relativa en español
// ----------------------------------------------------------
function timeAgo(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate.endsWith('Z') ? isoDate : isoDate + 'Z');
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'hace un momento';
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `hace ${Math.floor(seconds / 86400)} día(s)`;
  if (seconds < 2592000) return `hace ${Math.floor(seconds / 604800)} semana(s)`;
  return date.toLocaleDateString('es-VE');
}

// ----------------------------------------------------------
// Formatear fecha completa
// ----------------------------------------------------------
function formatDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate.endsWith('Z') ? isoDate : isoDate + 'Z');
  return d.toLocaleString('es-VE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ----------------------------------------------------------
// Construir enlace de WhatsApp
// ----------------------------------------------------------
function whatsappLink(phone) {
  if (!phone) return '#';
  let cleaned = String(phone).replace(/[\s\-\(\)]/g, '');
  // Si empieza con 0, convertir a +58
  if (cleaned.startsWith('0')) cleaned = '+58' + cleaned.substring(1);
  else if (cleaned.startsWith('58')) cleaned = '+' + cleaned;
  else if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
  return `https://wa.me/${cleaned.replace('+', '')}`;
}

// ----------------------------------------------------------
// Crear tarjeta de reporte/evento (para listas)
// ----------------------------------------------------------
function renderCard(item, type = 'reporte') {
  const titulo = escapeHtml(item.titulo || (item.requerimiento || '').slice(0, 80) || 'Sin título');
  const desc = escapeHtml(item.descripcion || item.requerimiento || '');
  const nombre = escapeHtml(item.contacto_nombre || item.nombre || 'Anónimo');
  const telefono = item.contacto_telefono || item.telefono || '';
  const urgencia = item.urgencia || 'media';
  const tipo = item.tipo || 'solicitud';

  const tipoLabel = {
    'solicitud': '🆘 NECESITA',
    'oferta': '💚 OFRECE',
    'informacion': 'ℹ️ INFO',
  }[tipo] || tipo;

  const link = type === 'reporte'
    ? `/reporte/${item.id}`
    : `/chulito/${item.id}`;

  const ubicacion = item.ubicacion_texto ||
    [item.ubicacion_ciudad, item.ubicacion_estado].filter(Boolean).join(', ') ||
    '';

  return `
    <div class="card">
      <div class="card-meta">
        <span class="card-meta-item"><strong>${tipoLabel}</strong></span>
        <span class="urgencia-pill urgencia-${urgencia}">${urgencia.toUpperCase()}</span>
        ${item.categoria ? `<span class="card-meta-item">🏷️ ${escapeHtml(item.categoria)}</span>` : ''}
        <span class="card-meta-item">🕒 ${timeAgo(item.created_at)}</span>
      </div>
      <h3 class="card-title">${titulo}</h3>
      ${desc ? `<p class="card-description">${desc}</p>` : ''}
      <div class="card-contact">
        <div>👤 <strong>${nombre}</strong></div>
        ${telefono ? `<div style="margin-top:4px">📞 <a href="tel:${escapeHtml(telefono)}">${escapeHtml(telefono)}</a> · <a href="${whatsappLink(telefono)}" target="_blank">💬 WhatsApp</a></div>` : ''}
        ${ubicacion ? `<div style="margin-top:4px;color:#64748b">📍 ${escapeHtml(ubicacion)}</div>` : ''}
      </div>
      <div class="card-actions">
        <a href="${link}" class="btn btn-sm btn-outline">Ver ficha →</a>
      </div>
    </div>
  `;
}

// ----------------------------------------------------------
// URL params helper
// ----------------------------------------------------------
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ----------------------------------------------------------
// Cargar configuracion del sitio
// ----------------------------------------------------------
let siteSettings = null;
async function loadSettings() {
  if (siteSettings) return siteSettings;
  try {
    const data = await api('/api/settings');
    siteSettings = data.settings;
    return siteSettings;
  } catch {
    return {};
  }
}

// ----------------------------------------------------------
// Cargar al inicio
// ----------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  const settings = await loadSettings();
  // Si hay mensaje de emergencia custom, usarlo
  if (settings.mensaje_emergencia) {
    const banner = document.getElementById('emergency-banner');
    if (banner) banner.innerHTML = `🚨 ${escapeHtml(settings.mensaje_emergencia)}`;
  }
});

// Exponer globalmente
window.api = api;
window.showToast = showToast;
window.escapeHtml = escapeHtml;
window.timeAgo = timeAgo;
window.formatDate = formatDate;
window.whatsappLink = whatsappLink;
window.renderCard = renderCard;
window.getParam = getParam;
window.loadSettings = loadSettings;
