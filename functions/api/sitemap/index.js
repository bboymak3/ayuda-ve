// ============================================================
// functions/api/sitemap/index.js — GET /sitemap.xml
// Genera sitemap dinamico para SEO (Gemini, Google)
// ============================================================

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const baseUrl = env.SITE_URL || `${url.protocol}//${url.host}`;

  // Obtener todos los chulitos
  const chulitos = await env.DB.prepare(
    `SELECT id, updated_at FROM chulitos WHERE estado IN ('activo','resuelto') ORDER BY id`
  ).all();

  // Obtener todos los reportes aprobados
  const reportes = await env.DB.prepare(
    `SELECT id, updated_at FROM reportes WHERE estado = 'aprobado' ORDER BY id`
  ).all();

  // Construir XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Paginas estaticas
  const staticPages = [
    { path: '/', priority: '1.0', changefreq: 'hourly' },
    { path: '/mapa.html', priority: '0.9', changefreq: 'hourly' },
    { path: '/buscar.html', priority: '0.9', changefreq: 'hourly' },
    { path: '/reportar.html', priority: '0.9', changefreq: 'daily' },
    { path: '/quiero-ayudar.html', priority: '0.9', changefreq: 'daily' },
    { path: '/sala-situacional.html', priority: '0.8', changefreq: 'hourly' },
  ];
  for (const page of staticPages) {
    xml += `  <url>\n    <loc>${baseUrl}${page.path}</loc>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;
  }

  // Chulitos
  for (const c of chulitos.results) {
    xml += `  <url>\n    <loc>${baseUrl}/chulito/${c.id}</loc>\n    <lastmod>${c.updated_at}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  }

  // Reportes
  for (const r of reportes.results) {
    xml += `  <url>\n    <loc>${baseUrl}/reporte/${r.id}</loc>\n    <lastmod>${r.updated_at}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
