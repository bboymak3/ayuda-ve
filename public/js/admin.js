// ============================================================
// public/js/admin.js — Lógica del panel administrativo
// ============================================================

let ADMIN_TOKEN = null;

// ----------------------------------------------------------
// Login / Logout
// ----------------------------------------------------------
function getToken() {
  if (ADMIN_TOKEN) return ADMIN_TOKEN;
  return localStorage.getItem('ayudave_admin_token') || '';
}

function setToken(token) {
  ADMIN_TOKEN = token;
  if (token) localStorage.setItem('ayudave_admin_token', token);
  else localStorage.removeItem('ayudave_admin_token');
}

async function doLogin(event) {
  event.preventDefault();
  const token = document.getElementById('login-token').value.trim();
  if (!token) return;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Token inválido');

    setToken(token);
    showPanel();
    showToast('✅ Sesión iniciada', 'success');
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  }
}

function doLogout() {
  setToken(null);
  document.getElementById('panel-view').classList.add('hidden');
  document.getElementById('login-view').classList.remove('hidden');
  document.getElementById('login-token').value = '';
}

function authHeaders() {
  return { 'Authorization': `Bearer ${getToken()}` };
}

async function adminApi(path, options = {}) {
  const opts = {
    ...options,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) },
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
  catch { data = { ok: false, error: 'Respuesta inválida' }; }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function showPanel() {
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('panel-view').classList.remove('hidden');
  loadDashboard();
  loadSectoresAdmin();
}

// ----------------------------------------------------------
// Tabs
// ----------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Sidebar navigation
  document.querySelectorAll('.admin-sidebar a[data-tab]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(a.dataset.tab);
    });
  });

  // Auto-login si hay token guardado
  if (getToken()) {
    // Verificar token
    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: getToken() }),
    }).then(res => {
      if (res.ok) showPanel();
      else setToken(null);
    }).catch(() => setToken(null));
  }
});

function switchTab(tab) {
  document.querySelectorAll('.admin-sidebar a[data-tab]').forEach(a => {
    a.classList.toggle('active', a.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');

  // Cargar datos según tab
  if (tab === 'dashboard') loadDashboard();
  if (tab === 'moderar') loadModerar();
  if (tab === 'chulitos') loadChulitosAdmin();
  if (tab === 'categorias') loadCategoriasAdmin();
  if (tab === 'settings') loadSettingsAdmin();
  if (tab === 'logs') loadLogs();
}

// ----------------------------------------------------------
// Dashboard
// ----------------------------------------------------------
async function loadDashboard() {
  try {
    const data = await adminApi('/api/admin/stats');
    const s = data.stats;
    const grid = document.getElementById('stats-grid');

    grid.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${s.hoy?.chulitos_hoy || 0}</div>
        <div class="stat-label">Chulitos hoy</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${s.hoy?.reportes_hoy || 0}</div>
        <div class="stat-label">Reportes hoy</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#dc2626">${s.hoy?.reportes_pendientes || 0}</div>
        <div class="stat-label">Pendientes moderar</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#10b981">${s.hoy?.chulitos_activos || 0}</div>
        <div class="stat-label">Chulitos activos</div>
      </div>
    `;

    // Top categorias
    const topCat = document.getElementById('top-categorias');
    if (s.top_categorias && s.top_categorias.length > 0) {
      topCat.innerHTML = `
        <table class="admin-table">
          <thead><tr><th>Categoría</th><th>Total</th></tr></thead>
          <tbody>
            ${s.top_categorias.map(c => `
              <tr><td><code>${escapeHtml(c.categoria)}</code></td><td><strong>${c.total}</strong></td></tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      topCat.innerHTML = '<p class="text-muted">Sin datos todavía.</p>';
    }

    // Por sector
    const porSector = document.getElementById('por-sector');
    if (s.reportes_por_sector && s.reportes_por_sector.length > 0) {
      porSector.innerHTML = `
        <table class="admin-table">
          <thead><tr><th>Sector</th><th>Total reportes</th></tr></thead>
          <tbody>
            ${s.reportes_por_sector.map(s => `
              <tr><td>${s.icono} ${escapeHtml(s.nombre)}</td><td><strong>${s.total}</strong></td></tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      porSector.innerHTML = '<p class="text-muted">Sin datos.</p>';
    }
  } catch (e) {
    document.getElementById('stats-grid').innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
  }
}

// ----------------------------------------------------------
// Moderar
// ----------------------------------------------------------
async function loadModerar() {
  const list = document.getElementById('moderar-list');
  list.innerHTML = '<div class="loading-state"><div class="spinner spinner-dark"></div></div>';
  try {
    const data = await adminApi('/api/admin/moderar');
    let html = '';

    if (data.reportes.length > 0) {
      html += `<h3>📝 Reportes pendientes (${data.reportes.length})</h3>`;
      html += data.reportes.map(r => `
        <div class="card">
          <div class="card-meta">
            <span class="urgencia-pill urgencia-${r.urgencia}">${r.urgencia}</span>
            <span>${r.sector_icono} ${escapeHtml(r.sector_nombre)}</span>
            <span>🕒 ${timeAgo(r.created_at)}</span>
          </div>
          <h3 class="card-title">${escapeHtml(r.titulo)}</h3>
          <p class="card-description">${escapeHtml(r.descripcion)}</p>
          ${r.contacto_nombre ? `<div class="text-sm">👤 ${escapeHtml(r.contacto_nombre)} · 📞 ${escapeHtml(r.contacto_telefono || '')}</div>` : ''}
          <div class="card-actions">
            <button onclick="moderar('aprobar','reporte',${r.id})" class="btn btn-sm btn-success">✓ Aprobar</button>
            <button onclick="moderar('rechazar','reporte',${r.id})" class="btn btn-sm btn-warning">✗ Rechazar</button>
            <button onclick="moderar('eliminar','reporte',${r.id})" class="btn btn-sm btn-danger">🗑 Eliminar</button>
            <a href="/reporte/${r.id}" target="_blank" class="btn btn-sm btn-outline">Ver ficha →</a>
          </div>
        </div>
      `).join('');
    }

    if (data.chulitos.length > 0) {
      html += `<h3 class="mt-3">📍 Chulitos recientes (${data.chulitos.length})</h3>`;
      html += data.chulitos.slice(0, 20).map(c => `
        <div class="card">
          <div class="card-meta">
            <span class="urgencia-pill urgencia-${c.urgencia}">${c.urgencia}</span>
            <span>${c.tipo}</span>
            <span>🕒 ${timeAgo(c.created_at)}</span>
          </div>
          <h3 class="card-title">${escapeHtml(c.titulo)}</h3>
          <p class="card-description">${escapeHtml(c.requerimiento)}</p>
          <div class="text-sm">👤 ${escapeHtml(c.nombre)} · 📞 ${escapeHtml(c.telefono)}</div>
          <div class="card-actions">
            <button onclick="moderar('resolver','chulito',${c.id})" class="btn btn-sm btn-success">✓ Resolver</button>
            <button onclick="moderar('eliminar','chulito',${c.id})" class="btn btn-sm btn-danger">🗑 Eliminar</button>
            <a href="/chulito/${c.id}" target="_blank" class="btn btn-sm btn-outline">Ver ficha →</a>
          </div>
        </div>
      `).join('');
    }

    if (data.reportes.length === 0 && data.chulitos.length === 0) {
      html = '<div class="alert alert-success">✅ No hay nada pendiente. ¡Todo al día!</div>';
    }

    list.innerHTML = html;
  } catch (e) {
    list.innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
  }
}

async function moderar(accion, entidad, id) {
  if (!confirm(`¿${accion} ${entidad} ${id}?`)) return;
  try {
    await adminApi(`/api/admin/moderar/${accion}/${entidad}/${id}`, { method: 'POST' });
    showToast(`✅ ${entidad} ${id}: ${accion}`, 'success');
    loadModerar();
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  }
}

// ----------------------------------------------------------
// Chulitos (gestión)
// ----------------------------------------------------------
let chulitosCache = [];

async function loadChulitosAdmin() {
  const list = document.getElementById('chulitos-list');
  list.innerHTML = '<div class="loading-state"><div class="spinner spinner-dark"></div></div>';
  try {
    const data = await adminApi('/api/chulitos?limit=500&estado=activo');
    chulitosCache = data.chulitos;
    renderChulitosAdmin(chulitosCache);
  } catch (e) {
    list.innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
  }
}

function searchChulitos() {
  const q = document.getElementById('chulito-search').value.toLowerCase();
  const filtered = chulitosCache.filter(c =>
    c.titulo?.toLowerCase().includes(q) ||
    c.requerimiento?.toLowerCase().includes(q) ||
    c.nombre?.toLowerCase().includes(q) ||
    c.telefono?.includes(q)
  );
  renderChulitosAdmin(filtered);
}

function renderChulitosAdmin(chulitos) {
  const list = document.getElementById('chulitos-list');
  if (chulitos.length === 0) {
    list.innerHTML = '<p class="text-muted">No hay chulitos.</p>';
    return;
  }
  list.innerHTML = `
    <table class="admin-table">
      <thead><tr><th>ID</th><th>Tipo</th><th>Detalle</th><th>Contacto</th><th>Urgencia</th><th>Acciones</th></tr></thead>
      <tbody>
        ${chulitos.map(c => `
          <tr>
            <td>${c.id}</td>
            <td>${c.tipo}</td>
            <td>
              <strong>${escapeHtml(c.titulo)}</strong><br>
              <small>${escapeHtml((c.requerimiento || '').slice(0, 100))}</small>
            </td>
            <td>${escapeHtml(c.nombre)}<br><small>${escapeHtml(c.telefono)}</small></td>
            <td><span class="urgencia-pill urgencia-${c.urgencia}">${c.urgencia}</span></td>
            <td>
              <button onclick="moderar('resolver','chulito',${c.id})" class="btn btn-sm btn-success">✓</button>
              <button onclick="moderar('eliminar','chulito',${c.id})" class="btn btn-sm btn-danger">🗑</button>
              <a href="/chulito/${c.id}" target="_blank" class="btn btn-sm btn-outline">→</a>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ----------------------------------------------------------
// Carga rápida
// ----------------------------------------------------------
async function loadSectoresAdmin() {
  try {
    const data = await api('/api/sectores');
    const sel = document.getElementById('cr-sector');
    if (sel) {
      sel.innerHTML = '<option value="">Selecciona...</option>' +
        data.sectores.map(s => `<option value="${s.id}">${s.icono} ${s.nombre}</option>`).join('');
    }
  } catch (e) { console.error(e); }
}

async function cargaRapida(event) {
  event.preventDefault();
  const form = event.target;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Publicando...';

  const formData = new FormData(form);
  const body = Object.fromEntries(formData.entries());

  // Convertir tipos
  if (body.sector_id) body.sector_id = parseInt(body.sector_id, 10);
  if (body.lat) body.lat = parseFloat(body.lat);
  if (body.lng) body.lng = parseFloat(body.lng);

  try {
    const data = await adminApi('/api/admin/carga-rapida', { method: 'POST', body });
    showToast(`✅ ${data.message}`, 'success');
    form.reset();
    if (data.tipo === 'reporte') {
      window.open(`/reporte/${data.id}`, '_blank');
    } else {
      window.open(`/chulito/${data.id}`, '_blank');
    }
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📤 Publicar verificado';
  }
}

// ----------------------------------------------------------
// Procesar video
// ----------------------------------------------------------
async function procesarVideo(event) {
  event.preventDefault();
  const form = event.target;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Procesando (puede tardar 1-2 min)...';

  const formData = new FormData(form);
  const result = document.getElementById('video-result');
  result.innerHTML = '<div class="alert alert-info">⏳ Transcribiendo audio con Whisper... Esto puede tardar 1-2 minutos.</div>';

  try {
    const res = await fetch('/api/transcribe', {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error');

    result.innerHTML = `
      <div class="alert alert-success">✅ Procesado correctamente</div>
      <div class="card">
        <h3>📝 Transcripción</h3>
        <div style="padding:1rem;background:#f8fafc;border-radius:8px;white-space:pre-wrap;font-size:0.95rem">${escapeHtml(data.transcripcion)}</div>
      </div>
      <div class="card mt-2">
        <h3>🤖 Resumen IA</h3>
        <div style="padding:1rem;background:#f8fafc;border-radius:8px">
          <p><strong>Resumen:</strong> ${escapeHtml(data.resumen.resumen || '')}</p>
          ${data.resumen.ubicacion ? `<p><strong>Ubicación:</strong> ${escapeHtml(data.resumen.ubicacion)}</p>` : ''}
          ${data.resumen.contacto ? `<p><strong>Contacto:</strong> ${escapeHtml(data.resumen.contacto)}</p>` : ''}
          ${data.resumen.urgencia ? `<p><strong>Urgencia:</strong> ${escapeHtml(data.resumen.urgencia)}</p>` : ''}
          ${data.resumen.categoria ? `<p><strong>Categoría:</strong> ${escapeHtml(data.resumen.categoria)}</p>` : ''}
        </div>
      </div>
    `;
  } catch (e) {
    result.innerHTML = `<div class="alert alert-error">❌ ${escapeHtml(e.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '🎯 Transcribir y resumir';
  }
}

// ----------------------------------------------------------
// Categorías (CRUD)
// ----------------------------------------------------------
async function loadCategoriasAdmin() {
  const list = document.getElementById('categorias-list');
  list.innerHTML = '<div class="loading-state"><div class="spinner spinner-dark"></div></div>';
  try {
    const data = await adminApi('/api/admin/categorias');
    list.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Icono</th><th>Nombre</th><th>Slug</th><th>Orden</th><th>Activo</th><th>Acciones</th></tr></thead>
        <tbody>
          ${data.categorias.map(c => `
            <tr>
              <td style="font-size:1.5rem">${c.icono}</td>
              <td>${escapeHtml(c.nombre)}</td>
              <td><code>${escapeHtml(c.slug)}</code></td>
              <td>${c.orden}</td>
              <td>${c.activo ? '✅' : '⛔'}</td>
              <td>
                <button onclick="editCategoria(${c.id})" class="btn btn-sm btn-outline">✏️</button>
                <button onclick="deleteCategoria(${c.id})" class="btn btn-sm btn-danger">🗑</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (e) {
    list.innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
  }
}

function showCategoriaForm(cat = null) {
  const form = document.getElementById('categoria-form');
  form.classList.remove('hidden');
  document.getElementById('cat-form-title').textContent = cat ? 'Editar categoría' : 'Nueva categoría';
  document.getElementById('cat-id').value = cat?.id || '';
  document.getElementById('cat-nombre').value = cat?.nombre || '';
  document.getElementById('cat-slug').value = cat?.slug || '';
  document.getElementById('cat-icono').value = cat?.icono || '📦';
  document.getElementById('cat-color').value = cat?.color || '#2563EB';
  document.getElementById('cat-descripcion').value = cat?.descripcion || '';
  document.getElementById('cat-orden').value = cat?.orden || 0;
}

async function editCategoria(id) {
  try {
    const data = await adminApi('/api/admin/categorias');
    const cat = data.categorias.find(c => c.id === id);
    if (cat) showCategoriaForm(cat);
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

async function saveCategoria(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const body = Object.fromEntries(formData.entries());
  if (body.id) body.id = parseInt(body.id, 10);
  if (body.orden) body.orden = parseInt(body.orden, 10);

  try {
    await adminApi('/api/admin/categorias', { method: body.id ? 'PUT' : 'POST', body });
    showToast('✅ Categoría guardada', 'success');
    document.getElementById('categoria-form').classList.add('hidden');
    loadCategoriasAdmin();
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  }
}

async function deleteCategoria(id) {
  if (!confirm('¿Desactivar esta categoría? (no se elimina permanentemente)')) return;
  try {
    await adminApi(`/api/admin/categorias?id=${id}`, { method: 'DELETE' });
    showToast('✅ Categoría desactivada', 'success');
    loadCategoriasAdmin();
  } catch (e) { showToast('❌ ' + e.message, 'error'); }
}

// ----------------------------------------------------------
// Settings
// ----------------------------------------------------------
async function loadSettingsAdmin() {
  try {
    const data = await api('/api/settings');
    const s = data.settings;
    document.getElementById('set-titulo').value = s.titulo_sitio || '';
    document.getElementById('set-descripcion').value = s.descripcion_sitio || '';
    document.getElementById('set-emergencia').value = s.mensaje_emergencia || '';
    document.getElementById('set-comentarios').value = s.comentarios_habilitados || 'true';
    document.getElementById('set-mapa').value = s.mapa_habilitado || 'true';
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  }
}

async function saveSettings(event) {
  event.preventDefault();
  const body = {
    titulo_sitio: document.getElementById('set-titulo').value,
    descripcion_sitio: document.getElementById('set-descripcion').value,
    mensaje_emergencia: document.getElementById('set-emergencia').value,
    comentarios_habilitados: document.getElementById('set-comentarios').value,
    mapa_habilitado: document.getElementById('set-mapa').value,
  };
  try {
    await adminApi('/api/settings', { method: 'PUT', body });
    showToast('✅ Configuración guardada', 'success');
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  }
}

// ----------------------------------------------------------
// Logs
// ----------------------------------------------------------
async function loadLogs() {
  const list = document.getElementById('logs-list');
  list.innerHTML = '<div class="loading-state"><div class="spinner spinner-dark"></div></div>';
  try {
    // No hay endpoint específico, usamos stats generales
    const data = await adminApi('/api/admin/stats');
    list.innerHTML = '<p class="text-muted">Logs detallados próximamente. Por ahora revisa el dashboard.</p>';
  } catch (e) {
    list.innerHTML = `<div class="alert alert-error">${escapeHtml(e.message)}</div>`;
  }
}
