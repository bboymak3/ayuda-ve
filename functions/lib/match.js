// ============================================================
// lib/match.js — Sistema de Match Inteligente
// Conecta "tengo X" con "necesito X" usando sinonimos y reglas
// ============================================================

import { escapeLike } from './utils.js';

// ----------------------------------------------------------
// Normalizar texto: extraer categorias a partir de texto libre
// ----------------------------------------------------------
export async function extractCategories(text, db) {
  if (!text) return [];
  const normalized = normalizeText(text);
  const words = tokeniz(normalized);

  const categorias = new Set();

  // Buscar coincidencias multi-palabra primero (ej: "mano de obra")
  for (const frase of MULTI_WORD_PHRASES) {
    if (normalized.includes(frase.palabra)) {
      categorias.add(frase.categoria_slug);
    }
  }

  // Buscar palabras individuales en la BD
  if (words.length > 0) {
    const placeholders = words.map(() => '?').join(',');
    const stmt = db.prepare(
      `SELECT DISTINCT categoria_slug FROM sinonimos WHERE palabra IN (${placeholders})`
    );
    try {
      const result = await stmt.bind(...words).all();
      for (const row of result.results) {
        categorias.add(row.categoria_slug);
      }
    } catch (e) {
      console.error('Error buscando sinonimos:', e);
    }
  }

  return Array.from(categorias);
}

// ----------------------------------------------------------
// Encontrar matches para un reporte/chulito nuevo
// ----------------------------------------------------------
export async function findMatches(reporte, db, limit = 10) {
  const categorias = await extractCategories(
    `${reporte.titulo || ''} ${reporte.descripcion || ''} ${reporte.requerimiento || ''}`,
    db
  );

  if (categorias.length === 0) return [];

  // Determinar el tipo opuesto
  const tipoOriginal = reporte.tipo || 'solicitud';
  const tipoOpuesto = tipoOriginal === 'solicitud' ? 'disponible' : 'solicitud';

  // Para cada categoria, encontrar la categoria opuesta via match_rules
  const categoriasOpuestas = await getCategoriasOpuestas(categorias, db);

  if (categoriasOpuestas.length === 0) return [];

  // Buscar reportes/chulitos con esas categorias, ordenados por urgencia + cercania
  const placeholders = categoriasOpuestas.map(() => '?').join(',');

  // Buscar en chulitos (mapa) primero - son los mas visibles
  const chulitosStmt = db.prepare(`
    SELECT id, titulo, requerimiento, nombre, telefono,
           lat, lng, urgencia, tipo, estado,
           'chulito' as fuente,
           created_at
    FROM chulitos
    WHERE estado = 'activo'
      AND tipo = ?
      AND categoria IN (${placeholders})
    ORDER BY
      CASE urgencia
        WHEN 'critica' THEN 1
        WHEN 'alta' THEN 2
        WHEN 'media' THEN 3
        WHEN 'baja' THEN 4
      END,
      created_at DESC
    LIMIT ?
  `);

  // Buscar en reportes tambien
  const reportesStmt = db.prepare(`
    SELECT id, titulo, descripcion, contacto_nombre, contacto_telefono,
           ubicacion_estado, ubicacion_ciudad, urgencia, tipo, estado,
           'reporte' as fuente,
           created_at
    FROM reportes
    WHERE estado = 'aprobado'
      AND tipo = ?
      AND categoria_especifica IN (${placeholders})
    ORDER BY
      CASE urgencia
        WHEN 'critica' THEN 1
        WHEN 'alta' THEN 2
        WHEN 'media' THEN 3
        WHEN 'baja' THEN 4
      END,
      created_at DESC
    LIMIT ?
  `);

  try {
    const [chulitos, reportes] = await Promise.all([
      chulitosStmt.bind(tipoOpuesto, ...categoriasOpuestas, limit).all(),
      reportesStmt.bind(tipoOpuesto, ...categoriasOpuestas, limit).all(),
    ]);

    return [...chulitos.results, ...reportes.results].slice(0, limit);
  } catch (e) {
    console.error('Error buscando matches:', e);
    return [];
  }
}

// ----------------------------------------------------------
// Obtener categorias opuestas usando match_rules
// ----------------------------------------------------------
async function getCategoriasOpuestas(categorias, db) {
  if (categorias.length === 0) return [];

  // Extraer la categoria base (sin sufijo _tengo/_necesito)
  const bases = categorias.map(c => c.replace(/_(tengo|necesito|activa|activo)$/, ''));
  const baseSet = new Set(bases);

  // Caso 1: match directo (tengo <-> necesito)
  // Si la categoria base es "salud.medico", buscar "salud.medico_tengo" o "salud.medico_necesito"
  const opuestas = new Set();
  for (const base of baseSet) {
    // Asumimos que las categorias en chulitos/reportes se guardan con sufijo _tengo/_necesito
    opuestas.add(`${base}_tengo`);
    opuestas.add(`${base}_necesito`);
  }

  // Caso 2: match cruzado via match_rules
  const placeholders = categorias.map(() => '?').join(',');
  try {
    const result = await db.prepare(
      `SELECT categoria_b FROM match_rules
       WHERE activa = 1 AND categoria_a IN (${placeholders})
       UNION
       SELECT categoria_a FROM match_rules
       WHERE activa = 1 AND categoria_b IN (${placeholders})`
    ).bind(...categorias).all();

    for (const row of result.results) {
      opuestas.add(row.categoria_b || row.categoria_a);
    }
  } catch (e) {
    console.error('Error en match_rules:', e);
  }

  return Array.from(opuestas);
}

// ----------------------------------------------------------
// Helpers internos
// ----------------------------------------------------------
function normalizeText(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // quitar acentos
    .replace(/[^\w\s]/g, ' ')         // solo palabras y espacios
    .replace(/\s+/g, ' ')
    .trim();
}

function tokeniz(text) {
  return text.split(' ').filter(w => w.length >= 3);
}

// Frases multi-palabra que el tokenizer no puede capturar
const MULTI_WORD_PHRASES = [
  { palabra: 'mano de obra', categoria_slug: 'cuadrillas.voluntario' },
  { palabra: 'punto de acopio', categoria_slug: 'alimentos.punto_acopio' },
  { palabra: 'cocina comunitaria', categoria_slug: 'alimentos.punto_acopio' },
  { palabra: 'planta electrica', categoria_slug: 'maquinaria.planta_electrica' },
  { palabra: 'pago movil', categoria_slug: 'dinero.donacion_monetaria' },
  { palabra: 'rescate altura', categoria_slug: 'cuadrillas.rapel' },
  { palabra: 'rescate acuatico', categoria_slug: 'cuadrillas.buceo' },
  { palabra: 'alimento para perros', categoria_slug: 'animales.alimento_mascotas' },
  { palabra: 'alimento para gatos', categoria_slug: 'animales.alimento_mascotas' },
  { palabra: 'comida para perros', categoria_slug: 'animales.alimento_mascotas' },
  { palabra: 'comida para gatos', categoria_slug: 'animales.alimento_mascotas' },
  { palabra: 'leche en polvo', categoria_slug: 'alimentos.leche' },
  { palabra: 'formula infantil', categoria_slug: 'alimentos.leche' },
  { palabra: 'centro medico', categoria_slug: 'salud.hospital_activo' },
  { palabra: 'equipo de trabajo', categoria_slug: 'cuadrillas.cuadrilla' },
];
