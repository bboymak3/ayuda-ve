// ============================================================
// public/js/mapa.js — Mapa interactivo con Leaflet
// ============================================================

let map = null;
let markers = [];
let currentFilter = 'all';
let tempMarker = null;

// ----------------------------------------------------------
// Control del panel de ayuda (plegable)
// ----------------------------------------------------------
function closeHelp() {
  document.getElementById('map-help-panel').style.display = 'none';
  document.getElementById('map-help-toggle').classList.add('visible');
}
function openHelp() {
  document.getElementById('map-help-panel').style.display = '';
  document.getElementById('map-help-toggle').classList.remove('visible');
}

// Centro inicial: Venezuela (aprox)
const VENEZUELA_CENTER = [8.0, -66.0];
const VENEZUELA_ZOOM = 6;

// ----------------------------------------------------------
// Inicializar mapa
// ----------------------------------------------------------
function initMap() {
  map = L.map('map').setView(VENEZUELA_CENTER, VENEZUELA_ZOOM);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  }).addTo(map);

  // Click en mapa -> abrir formulario de evento
  map.on('click', function(e) {
    openEventoForm(e.latlng.lat, e.latlng.lng);
  });

  // Cargar eventos existentes
  loadEventos();
}

// ----------------------------------------------------------
// Cargar eventos desde la API
// ----------------------------------------------------------
async function loadEventos() {
  try {
    const url = `/api/eventos?limit=2000${currentFilter === 'resuelto' ? '&estado=resuelto' : '&estado=activo'}`;
    const res = await fetch(url);
    const data = await res.json();

    // Limpiar markers existentes
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    // Agregar nuevos
    for (const c of data.eventos) {
      // Filtrar por tipo si aplica
      if (currentFilter !== 'all' && currentFilter !== 'resuelto') {
        if (c.tipo !== currentFilter) continue;
      }

      const color = getMarkerColor(c);
      const marker = L.circleMarker([c.lat, c.lng], {
        radius: 10,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      }).addTo(map);

      marker.bindPopup(buildPopup(c), { maxWidth: 320 });
      markers.push(marker);
    }

    console.log(`Cargados ${markers.length} eventos`);
  } catch (e) {
    console.error('Error cargando eventos:', e);
    showToast('Error cargando eventos del mapa', 'error');
  }
}

// ----------------------------------------------------------
// Determinar color del marker
// ----------------------------------------------------------
function getMarkerColor(c) {
  if (c.estado === 'resuelto') return '#10b981';
  if (c.urgencia === 'critica') return '#dc2626';
  if (c.urgencia === 'alta') return '#f59e0b';
  if (c.tipo === 'oferta') return '#3b82f6';
  if (c.tipo === 'informacion') return '#3b82f6';
  return '#3b82f6';
}

// ----------------------------------------------------------
// Construir popup HTML para un evento
// ----------------------------------------------------------
function buildPopup(c) {
  const urgenciaPill = c.estado === 'resuelto'
    ? '<span class="urgencia-pill" style="background:#d1fae5;color:#065f46">✅ RESUELTO</span>'
    : `<span class="urgencia-pill urgencia-${c.urgencia}">${c.urgencia.toUpperCase()}</span>`;

  const tipoLabel = {
    'solicitud': '🆘 NECESITA',
    'oferta': '💚 OFRECE',
    'informacion': 'ℹ️ INFO',
  }[c.tipo] || c.tipo;

  const fecha = new Date(c.created_at + 'Z').toLocaleString('es-VE');

  let html = `
    <div style="min-width:240px">
      <div style="font-size:0.75rem;color:#64748b;margin-bottom:4px">${tipoLabel} · ${urgenciaPill}</div>
      <div style="font-weight:700;font-size:1rem;margin-bottom:6px">${escapeHtml(c.titulo || c.requerimiento.slice(0, 60))}</div>
      <div style="font-size:0.9rem;margin-bottom:8px">${escapeHtml(c.requerimiento)}</div>
      ${c.descripcion ? `<div style="font-size:0.85rem;color:#475569;margin-bottom:8px">${escapeHtml(c.descripcion)}</div>` : ''}
      <div style="padding:8px;background:#f8fafc;border-radius:6px;font-size:0.85rem;margin-bottom:8px">
        <div><strong>👤 ${escapeHtml(c.nombre)}</strong></div>
        <div style="margin-top:4px">
          <a href="tel:${escapeHtml(c.telefono)}" style="font-weight:600">📞 ${escapeHtml(c.telefono)}</a>
          ${c.telefono.startsWith('0') ? `<a href="https://wa.me/58${c.telefono.substring(1).replace(/\s/g,'')}" target="_blank" style="margin-left:8px;font-weight:600">💬 WhatsApp</a>` : ''}
        </div>
        ${c.ubicacion_texto ? `<div style="margin-top:4px;color:#64748b">📍 ${escapeHtml(c.ubicacion_texto)}</div>` : ''}
      </div>
      <div style="font-size:0.75rem;color:#94a3b8;margin-bottom:8px">🕒 ${fecha}</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        ${c.estado !== 'resuelto' ? `<button onclick="markResolved(${c.id})" class="btn btn-sm btn-success">✓ Marcar resuelto</button>` : ''}
        <a href="/evento/${c.id}" class="btn btn-sm btn-outline">Ver ficha →</a>
      </div>
    </div>
  `;
  return html;
}

// ----------------------------------------------------------
// Abrir formulario para crear evento
// ----------------------------------------------------------
function openEventoForm(lat, lng) {
  if (tempMarker) map.removeLayer(tempMarker);

  tempMarker = L.marker([lat, lng], { draggable: false }).addTo(map);

  const formHtml = `
    <div class="map-popup-form">
      <div style="font-weight:700;margin-bottom:8px">📌 Nuevo evento en el mapa</div>
      <div style="font-size:0.85rem;color:#64748b;margin-bottom:10px">
        Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}
      </div>
      <form onsubmit="submitEvento(event, ${lat}, ${lng}); return false;" style="display:flex;flex-direction:column;gap:8px">
        <div>
          <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px">Tipo *</label>
          <select id="ch-tipo" required style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:4px">
            <option value="solicitud">🆘 Solicitud (necesito)</option>
            <option value="oferta">💚 Oferta (tengo para dar)</option>
            <option value="informacion">ℹ️ Información útil</option>
          </select>
        </div>
        <div>
          <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px">Nombre *</label>
          <input id="ch-nombre" type="text" required placeholder="Tu nombre" style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:4px">
        </div>
        <div>
          <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px">Teléfono *</label>
          <input id="ch-telefono" type="tel" required placeholder="0414-XXX-XXXX" style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:4px">
        </div>
        <div>
          <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px">¿Qué necesitas/ofreces? *</label>
          <textarea id="ch-req" required placeholder="Ej: necesito antibióticos para mi hijo, tengo 50kg de comida para donar, etc." style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:4px;min-height:60px"></textarea>
        </div>
        <div>
          <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px">Urgencia</label>
          <select id="ch-urgencia" style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:4px">
            <option value="baja">🟢 Baja</option>
            <option value="media" selected>🔵 Media</option>
            <option value="alta">🟡 Alta</option>
            <option value="critica">🔴 Crítica (vidas en riesgo)</option>
          </select>
        </div>
        <div>
          <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px">Ubicación (texto)</label>
          <input id="ch-ubic" type="text" placeholder="Ej: Caracas, Miranda" style="width:100%;padding:6px;border:1px solid #e2e8f0;border-radius:4px">
        </div>
        <div style="display:flex;gap:4px;margin-top:4px">
          <button type="submit" class="btn btn-sm btn-primary" style="flex:1">Publicar</button>
          <button type="button" onclick="cancelEvento()" class="btn btn-sm btn-outline">Cancelar</button>
        </div>
      </form>
    </div>
  `;

  tempMarker.bindPopup(formHtml, { maxWidth: 320, minWidth: 280 }).openPopup();
}

// ----------------------------------------------------------
// Enviar evento a la API
// ----------------------------------------------------------
async function submitEvento(event, lat, lng) {
  event.preventDefault();

  const btn = event.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  const body = {
    tipo: document.getElementById('ch-tipo').value,
    nombre: document.getElementById('ch-nombre').value,
    telefono: document.getElementById('ch-telefono').value,
    requerimiento: document.getElementById('ch-req').value,
    urgencia: document.getElementById('ch-urgencia').value,
    ubicacion_texto: document.getElementById('ch-ubic').value,
    lat,
    lng,
  };

  try {
    const res = await fetch('/api/eventos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error desconocido');
    }

    const data = await res.json();
    showToast('✅ Evento publicado en el mapa', 'success');

    // Cerrar popup y remover marker temporal
    map.closePopup();
    if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }

    // Recargar eventos
    loadEventos();

    // Mostrar matches si los hay
    if (data.matches && data.matches.length > 0) {
      setTimeout(() => {
        showMatchesModal(data.matches, body.tipo === 'solicitud' ? 'ofertas' : 'solicitudes');
      }, 800);
    }
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Publicar';
  }
}

// ----------------------------------------------------------
// Cancelar evento temporal
// ----------------------------------------------------------
function cancelEvento() {
  if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
}

// ----------------------------------------------------------
// Marcar evento como resuelto
// ----------------------------------------------------------
async function markResolved(id) {
  if (!confirm('¿Marcar este evento como resuelto? Cambiará a color verde.')) return;

  try {
    // Necesitamos token admin o el mismo usuario?
    // Por ahora permitimos a cualquiera marcar como resuelto
    const res = await fetch(`/api/eventos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: 'resuelto' }),
    });

    if (!res.ok) {
      // Probablemente requiere admin
      showToast('Solo el admin puede marcar como resuelto. Pídele que lo haga.', 'info');
      return;
    }

    showToast('✅ Marcado como resuelto', 'success');
    loadEventos();
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  }
}

// ----------------------------------------------------------
// Modal de matches
// ----------------------------------------------------------
function showMatchesModal(matches, tipoLabel) {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem';
  modal.innerHTML = `
    <div style="background:white;border-radius:12px;padding:1.5rem;max-width:500px;width:100%;max-height:80vh;overflow:auto">
      <h3 style="margin-bottom:0.5rem">🎯 ¡Encontramos coincidencias!</h3>
      <p style="color:#64748b;margin-bottom:1rem;font-size:0.9rem">
        Hay <strong>${matches.length} ${tipoLabel}</strong> que coinciden con lo que publicaste.
      </p>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${matches.map(m => `
          <div style="padding:10px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0">
            <div style="font-weight:600">${escapeHtml(m.titulo || m.requerimiento?.slice(0, 60) || 'Sin título')}</div>
            <div style="font-size:0.85rem;color:#64748b;margin-top:4px">${escapeHtml(m.requerimiento || m.descripcion || '')}</div>
            <div style="font-size:0.85rem;margin-top:4px">
              👤 ${escapeHtml(m.nombre || m.contacto_nombre || 'Anónimo')} · 
              📞 ${escapeHtml(m.telefono || m.contacto_telefono || 'N/A')}
            </div>
          </div>
        `).join('')}
      </div>
      <button onclick="this.closest('div[style*=fixed]').remove()" class="btn btn-primary mt-2" style="width:100%;margin-top:1rem">Entendido</button>
    </div>
  `;
  document.body.appendChild(modal);
}

// ----------------------------------------------------------
// Helpers
// ----------------------------------------------------------
function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ----------------------------------------------------------
// Filtros
// ----------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.map-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.map-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      loadEventos();
    });
  });

  initMap();
});
