// ============================================================
// functions/sitemap.xml/index.js — GET /sitemap.xml
// Redirige al endpoint dinámico /api/sitemap
// ============================================================

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const baseUrl = env.SITE_URL || `${url.protocol}//${url.host}`;

  // Consultas en paralelo
  const [chulitos, reportes, centros, perfiles] = await Promise.all([
    env.DB.prepare(
      `SELECT id, titulo, updated_at, created_at, lat, lng, ubicacion_texto
       FROM chulitos WHERE estado IN ('activo','resuelto') ORDER BY id`
    ).all().catch(() => ({ results: [] })),

    env.DB.prepare(
      `SELECT id, titulo, descripcion, updated_at, created_at,
              ubicacion_estado, ubicacion_ciudad, embed_html, tipo_fuente, fuente_url
       FROM reportes WHERE estado = 'aprobado' ORDER BY id`
    ).all().catch(() => ({ results: [] })),

    env.DB.prepare(
      `SELECT id, nombre_centro, nombre_encargado, updated_at, created_at, lat, lng, direccion
       FROM centros_acopio WHERE estado = 'aprobado' ORDER BY id`
    ).all().catch(() => ({ results: [] })),

    env.DB.prepare(
      `SELECT id, nombre, updated_at, created_at, lat, lng, ubicacion
       FROM perfiles ORDER BY id`
    ).all().catch(() => ({ results: [] })),
  ]);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:geo="http://www.google.com/geo/schemas/sitemap/1.0"\n`;
  xml += `        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n`;

  // Páginas estáticas
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
    xml += `  <url>\n    <loc>${baseUrl}${page.path}</loc>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;
  }

  // Reportes / Noticias
  for (const r of reportes.results) {
    const fecha = (r.updated_at || r.created_at || '').replace(' ', 'T') + 'Z';
    xml += `  <url>\n    <loc>${baseUrl}/reporte/${r.id}</loc>\n    <lastmod>${fecha}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n`;
    xml += `    <news:news>\n      <news:publication>\n        <news:name>Ayuda VE</news:name>\n        <news:language>es</news:language>\n      </news:publication>\n      <news:publication_date>${fecha}</news:publication_date>\n      <news:title>${escapeXml(r.titulo || 'Sin título')}</news:title>\n    </news:news>\n`;
    xml += `  </url>\n`;
  }

  // Eventos del mapa (con geo)
  for (const c of chulitos.results) {
    const fecha = (c.updated_at || c.created_at || '').replace(' ', 'T') + 'Z';
    xml += `  <url>\n    <loc>${baseUrl}/evento/${c.id}</loc>\n    <lastmod>${fecha}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n`;
    if (c.lat && c.lng) {
      xml += `    <geo:geo>\n      <geo:lat>${c.lat}</geo:lat>\n      <geo:long>${c.lng}</geo:long>\n    </geo:geo>\n`;
    }
    xml += `  </url>\n`;
  }

  // Centros de acopio (con geo)
  for (const c of centros.results) {
    const fecha = (c.updated_at || c.created_at || '').replace(' ', 'T') + 'Z';
    xml += `  <url>\n    <loc>${baseUrl}/centro-acopio/${c.id}</loc>\n    <lastmod>${fecha}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n`;
    if (c.lat && c.lng) {
      xml += `    <geo:geo>\n      <geo:lat>${c.lat}</geo:lat>\n      <geo:long>${c.lng}</geo:long>\n    </geo:geo>\n`;
    }
    xml += `  </url>\n`;
  }

  // Perfiles (con geo si tienen)
  for (const p of perfiles.results) {
    const fecha = (p.updated_at || p.created_at || '').replace(' ', 'T') + 'Z';
    xml += `  <url>\n    <loc>${baseUrl}/perfil/${p.id}</loc>\n    <lastmod>${fecha}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n`;
    if (p.lat && p.lng) {
      xml += `    <geo:geo>\n      <geo:lat>${p.lat}</geo:lat>\n      <geo:long>${p.lng}</geo:long>\n    </geo:geo>\n`;
    }
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

function escapeXml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
