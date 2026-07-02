// ============================================================
// functions/api/sitemap/index.js — GET /sitemap.xml
// Sitemap dinámico con todas las noticias, eventos, centros de acopio
// Incluye geolocalización (lat/lng) para SEO local
// ============================================================

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const baseUrl = env.SITE_URL || `${url.protocol}//${url.host}`;

  // Consultas en paralelo
  const [chulitos, reportes, centros, perfiles] = await Promise.all([
    // Eventos del mapa (con lat/lng)
    env.DB.prepare(
      `SELECT id, titulo, updated_at, created_at, lat, lng, ubicacion_texto
       FROM chulitos
       WHERE estado IN ('activo','resuelto')
       ORDER BY id`
    ).all().catch(() => ({ results: [] })),

    // Reportes / Noticias (incluye los reposts de Facebook)
    env.DB.prepare(
      `SELECT id, titulo, descripcion, updated_at, created_at,
              ubicacion_estado, ubicacion_ciudad,
              embed_html, tipo_fuente, fuente_url
       FROM reportes
       WHERE estado = 'aprobado'
       ORDER BY id`
    ).all().catch(() => ({ results: [] })),

    // Centros de acopio (con lat/lng)
    env.DB.prepare(
      `SELECT id, nombre_centro, nombre_encargado, updated_at, created_at, lat, lng, direccion
       FROM centros_acopio
       WHERE estado = 'aprobado'
       ORDER BY id`
    ).all().catch(() => ({ results: [] })),

    // Perfiles (personas/organizaciones)
    env.DB.prepare(
      `SELECT id, nombre, updated_at, created_at, lat, lng, ubicacion
       FROM perfiles
       ORDER BY id`
    ).all().catch(() => ({ results: [] })),
  ]);

  // Construir XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:geo="http://www.google.com/geo/schemas/sitemap/1.0"\n`;
  xml += `        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n`;

  // ============================================================
  // PÁGINAS ESTÁTICAS
  // ============================================================
  const staticPages = [
    { path: '/', priority: '1.0', changefreq: 'hourly' },
    { path: '/noticias.html', priority: '1.0', changefreq: 'hourly' },
    { path: '/mapa.html', priority: '0.9', changefreq: 'hourly' },
    { path: '/buscar.html', priority: '0.9', changefreq: 'hourly' },
    { path: '/reportar.html', priority: '0.9', changefreq: 'daily' },
    { path: '/quiero-ayudar.html', priority: '0.9', changefreq: 'daily' },
    { path: '/repostear.html', priority: '0.7', changefreq: 'weekly' },
    { path: '/sala-situacional.html', priority: '0.8', changefreq: 'hourly' },
    { path: '/sector.html?slug=salud', priority: '0.8', changefreq: 'hourly' },
    { path: '/sector.html?slug=alimentos', priority: '0.8', changefreq: 'hourly' },
    { path: '/sector.html?slug=vivienda', priority: '0.8', changefreq: 'hourly' },
    { path: '/sector.html?slug=animales', priority: '0.7', changefreq: 'hourly' },
    { path: '/sector.html?slug=cuadrillas', priority: '0.7', changefreq: 'hourly' },
    { path: '/sector.html?slug=transporte', priority: '0.7', changefreq: 'hourly' },
    { path: '/sector.html?slug=psicologico', priority: '0.7', changefreq: 'hourly' },
    { path: '/sector.html?slug=informacion', priority: '0.8', changefreq: 'hourly' },
  ];

  for (const page of staticPages) {
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}${page.path}</loc>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  // ============================================================
  // REPORTES / NOTICIAS (con metadatos de noticias)
  // ============================================================
  for (const r of reportes.results) {
    const fecha = (r.updated_at || r.created_at || '').replace(' ', 'T') + 'Z';
    const tituloEscapado = escapeXml(r.titulo || 'Sin título');

    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/reporte/${r.id}</loc>\n`;
    xml += `    <lastmod>${fecha}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;

    // News sitemap (para Google News)
    xml += `    <news:news>\n`;
    xml += `      <news:publication>\n`;
    xml += `        <news:name>Ayuda VE</news:name>\n`;
    xml += `        <news:language>es</news:language>\n`;
    xml += `      </news:publication>\n`;
    xml += `      <news:publication_date>${fecha}</news:publication_date>\n`;
    xml += `      <news:title>${tituloEscapado}</news:title>\n`;
    xml += `    </news:news>\n`;

    xml += `  </url>\n`;
  }

  // ============================================================
  // EVENTOS DEL MAPA (con geolocalización)
  // ============================================================
  for (const c of chulitos.results) {
    const fecha = (c.updated_at || c.created_at || '').replace(' ', 'T') + 'Z';
    const tituloEscapado = escapeXml(c.titulo || 'Evento');

    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/evento/${c.id}</loc>\n`;
    xml += `    <lastmod>${fecha}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;

    // Geolocalización
    if (c.lat && c.lng) {
      xml += `    <geo:geo>\n`;
      xml += `      <geo:lat>${c.lat}</geo:lat>\n`;
      xml += `      <geo:long>${c.lng}</geo:long>\n`;
      xml += `    </geo:geo>\n`;
    }

    xml += `  </url>\n`;
  }

  // ============================================================
  // CENTROS DE ACopIO (con geolocalización)
  // ============================================================
  for (const c of centros.results) {
    const fecha = (c.updated_at || c.created_at || '').replace(' ', 'T') + 'Z';
    const nombreEscapado = escapeXml(c.nombre_centro || c.nombre_encargado || 'Centro de Acopio');

    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/centro-acopio/${c.id}</loc>\n`;
    xml += `    <lastmod>${fecha}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;

    // Geolocalización
    if (c.lat && c.lng) {
      xml += `    <geo:geo>\n`;
      xml += `      <geo:lat>${c.lat}</geo:lat>\n`;
      xml += `      <geo:long>${c.lng}</geo:long>\n`;
      xml += `    </geo:geo>\n`;
    }

    xml += `  </url>\n`;
  }

  // ============================================================
  // PERFILES (con geolocalización si tienen)
  // ============================================================
  for (const p of perfiles.results) {
    const fecha = (p.updated_at || p.created_at || '').replace(' ', 'T') + 'Z';

    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/perfil/${p.id}</loc>\n`;
    xml += `    <lastmod>${fecha}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.6</priority>\n`;

    if (p.lat && p.lng) {
      xml += `    <geo:geo>\n`;
      xml += `      <geo:lat>${p.lat}</geo:lat>\n`;
      xml += `      <geo:long>${p.lng}</geo:long>\n`;
      xml += `    </geo:geo>\n`;
    }

    xml += `  </url>\n`;
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300', // 5 minutos
    },
  });
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
