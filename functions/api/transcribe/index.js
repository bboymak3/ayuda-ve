// ============================================================
// functions/api/transcribe/index.js — POST /api/transcribe
// Recibe audio, lo transcribe con Whisper, genera resumen con LLM,
// CREA FICHA AUTOMÁTICAMENTE y asocia a perfil reiterativo
// ============================================================

import { json, error, readJsonBody, sanitize } from '../../../lib/utils.js';
import { isAdmin } from '../../../lib/auth.js';
import { transcribeAudio, generateSummary, downloadMedia } from '../../../lib/ai.js';
import { logAction } from '../../../lib/db.js';
import { extractCategories } from '../../../lib/match.js';
import { findOrCreatePerfil, linkToPerfil } from '../../../lib/perfiles.js';

// POST /api/transcribe
// Body JSON: { url, reporte_id?, chulito_id?, crear_ficha?: true, sector_id? }
// FormData: file=audio.mp3, crear_ficha=true, sector_id=...
export async function onRequestPost({ env, request }) {
  if (!isAdmin(request, env)) {
    return error('No autorizado. Necesitas token de admin.', 401);
  }

  let audioBuffer = null;
  let urlOrigen = null;
  let reporteId = null;
  let chulitoId = null;
  let crearFicha = true;  // por defecto crea ficha
  let sectorId = null;
  let plataformaInfo = null;

  const contentType = request.headers.get('Content-Type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return error('Falta archivo o URL', 422);

    audioBuffer = await file.arrayBuffer();
    reporteId = formData.get('reporte_id') ? parseInt(formData.get('reporte_id'), 10) : null;
    chulitoId = formData.get('chulito_id') ? parseInt(formData.get('chulito_id'), 10) : null;
    crearFicha = formData.get('crear_ficha') !== 'false';
    sectorId = formData.get('sector_id') ? parseInt(formData.get('sector_id'), 10) : null;
  } else {
    const body = await readJsonBody(request);
    if (!body.url) return error('Falta URL o archivo', 422);

    urlOrigen = body.url;
    reporteId = body.reporte_id || null;
    chulitoId = body.chulito_id || null;
    crearFicha = body.crear_ficha !== false;
    sectorId = body.sector_id || null;
    plataformaInfo = detectarPlataforma(body.url);

    // Validar que reporte_id y chulito_id existan antes de insertar (evitar FK constraint)
    const validatedIds = await validateForeignKeys(env.DB, reporteId, chulitoId);
    reporteId = validatedIds.reporteId;
    chulitoId = validatedIds.chulitoId;

    // Guardar registro en BD
    const insertResult = await env.DB.prepare(
      `INSERT INTO videos_procesados
        (reporte_id, chulito_id, url_origen, plataforma, estado)
       VALUES (?, ?, ?, ?, 'descargando')`
    ).bind(reporteId, chulitoId, urlOrigen, plataformaInfo).run();
    var videoId = insertResult.meta.last_row_id;

    try {
      const downloaded = await downloadMedia(body.url, env);
      audioBuffer = downloaded.buffer;
      await env.DB.prepare(
        `UPDATE videos_procesados SET estado = 'transcribiendo' WHERE id = ?`
      ).bind(videoId).run();
    } catch (e) {
      await env.DB.prepare(
        `UPDATE videos_procesados SET estado = 'error', error_msg = ? WHERE id = ?`
      ).bind(e.message, videoId).run();
      return error(`Error descargando: ${e.message}`, 422);
    }
  }

  if (!audioBuffer) return error('No se pudo obtener audio', 422);

  const sizeMB = audioBuffer.byteLength / (1024 * 1024);
  if (sizeMB > 25) return error(`Audio demasiado grande: ${sizeMB.toFixed(1)}MB. Max 25MB`, 422);

  // === PASO 1: Transcribir con Whisper ===
  let transcripcion = '';
  try {
    transcripcion = await transcribeAudio(audioBuffer, env);
  } catch (e) {
    return error(`Error transcribiendo: ${e.message}`, 500);
  }

  // === PASO 2: Generar resumen con LLM ===
  let resumen = null;
  try {
    resumen = await generateSummary(transcripcion, env);
  } catch (e) {
    resumen = { resumen: transcripcion.slice(0, 500), ubicacion: '', contacto: '', urgencia: 'media', categoria: '' };
  }

  // === PASO 3: Extraer categorías automáticamente ===
  const textoCompleto = `${resumen.resumen || ''} ${transcripcion.slice(0, 500)}`;
  const categorias = await extractCategories(textoCompleto, env.DB);
  const categoriaPrincipal = categorias[0] || null;

  // === PASO 4: Detectar información de contacto en el texto ===
  const contactoDetectado = detectarContacto(transcripcion);

  // Combinar info detectada por LLM + regex
  const contactoNombre = resumen.contacto || contactoDetectado.nombre || 'Persona del video';
  const contactoTelefono = contactoDetectado.telefono || '';
  const ubicacionDetectada = resumen.ubicacion || contactoDetectado.ubicacion || '';

  // === PASO 5: CREAR FICHA AUTOMÁTICAMENTE ===
  let fichaCreada = null;
  let perfilInfo = null;

  if (crearFicha) {
    // Determinar sector según categoría detectada
    let sectorFinal = sectorId;
    if (!sectorFinal && categoriaPrincipal) {
      const sectorSlug = categoriaPrincipal.split('.')[0];
      const sectorRow = await env.DB.prepare(
        `SELECT id FROM sectores WHERE slug = ?`
      ).bind(sectorSlug).first();
      if (sectorRow) sectorFinal = sectorRow.id;
      else sectorFinal = 8; // Información útil por defecto
    }
    if (!sectorFinal) sectorFinal = 8;

    // Mapear urgencia del LLM a valores válidos
    const urgenciaMap = {
      'critica': 'critica', 'crítica': 'critica',
      'alta': 'alta', 'urgente': 'alta',
      'media': 'media', 'moderada': 'media',
      'baja': 'baja',
    };
    const urgenciaFinal = urgenciaMap[(resumen.urgencia || '').toLowerCase()] || 'media';

    // Crear el reporte
    const titulo = (resumen.resumen || transcripcion.slice(0, 80)).slice(0, 120);
    const descripcionCompleta = `${resumen.resumen || ''}\n\n--- Transcripción completa ---\n${transcripcion}`;

    const result = await env.DB.prepare(
      `INSERT INTO reportes
        (sector_id, tipo, titulo, descripcion, categoria_especifica,
         contacto_nombre, contacto_telefono, contacto_red_social,
         ubicacion_estado, ubicacion_ciudad, ubicacion_direccion,
         urgencia, estado, transcripcion, video_url, fuente_url, fuente_plataforma,
         tags, creado_por, approved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aprobado', ?, ?, ?, ?, ?, 'admin', datetime('now'))`
    ).bind(
      parseInt(sectorFinal, 10),
      'solicitud',
      sanitize(titulo),
      sanitize(descripcionCompleta),
      sanitize(categoriaPrincipal),
      sanitize(contactoNombre),
      sanitize(contactoTelefono || null),
      null,
      sanitize(ubicacionDetectada || null),
      null, null,
      urgenciaFinal,
      transcripcion,
      urlOrigen,
      urlOrigen,
      plataformaInfo || 'admin',
      categorias.length ? JSON.stringify(categorias) : null,
    ).run();

    reporteId = result.meta.last_row_id;
    fichaCreada = {
      id: reporteId,
      titulo,
      url: `/reporte/${reporteId}`,
      url_completa: `${env.SITE_URL || 'https://ayuda-ve.pages.dev'}/reporte/${reporteId}`,
      sector_id: sectorFinal,
      urgencia: urgenciaFinal,
      categoria: categoriaPrincipal,
    };

    // === PASO 6: Detectar / crear perfil reiterativo ===
    if (contactoNombre || contactoTelefono) {
      const perfilResult = await findOrCreatePerfil({
        nombre: contactoNombre,
        telefono: contactoTelefono,
        ubicacion: ubicacionDetectada,
      }, env.DB, 'auto_video');

      if (perfilResult?.perfil) {
        perfilInfo = {
          id: perfilResult.perfil.id,
          nombre: perfilResult.perfil.nombre,
          telefono: perfilResult.perfil.telefono,
          match_strategy: perfilResult.matchStrategy,
          total_reportes: (perfilResult.perfil.total_reportes || 0) + 1,
          es_reiterativo: perfilResult.matchStrategy !== 'nuevo_perfil',
          url: `${env.SITE_URL || 'https://ayuda-ve.pages.dev'}/perfil/${perfilResult.perfil.id}`,
        };

        // Asociar reporte + video al perfil
        await linkToPerfil(perfilResult.perfil.id, env.DB, {
          reporteId,
          videoId: videoId || null,
          fuente: perfilResult.matchStrategy,
        });

        // Actualizar categoria principal del perfil si no tiene
        if (categoriaPrincipal && !perfilResult.perfil.categoria_principal) {
          await env.DB.prepare(
            `UPDATE perfiles SET categoria_principal = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(categoriaPrincipal, perfilResult.perfil.id).run();
        }
      }
    }
  }

  // Actualizar videos_procesados
  if (urlOrigen) {
    await env.DB.prepare(
      `UPDATE videos_procesados
       SET estado = 'completado',
           transcripcion = ?,
           resumen = ?,
           reporte_id = ?,
           completed_at = datetime('now')
       WHERE url_origen = ?`
    ).bind(
      transcripcion,
      JSON.stringify(resumen),
      reporteId,
      urlOrigen
    ).run();
  }

  await logAction(env.DB, 'transcribe', 'video', videoId, {
    reporte_creado: reporteId, perfil: perfilInfo?.id,
  }, request);

  return json({
    ok: true,
    transcripcion,
    resumen,
    categoria_detectada: categoriaPrincipal,
    categorias_todas: categorias,
    contacto_detectado: {
      nombre: contactoNombre,
      telefono: contactoTelefono,
      ubicacion: ubicacionDetectada,
    },
    ficha_creada: fichaCreada,
    perfil: perfilInfo,
    longitud: transcripcion.length,
  });
}

// ----------------------------------------------------------
// Detectar información de contacto en texto (regex)
// ----------------------------------------------------------
function detectarContacto(texto) {
  const info = { nombre: '', telefono: '', ubicacion: '' };

  // Teléfonos venezolanos: 0414-XXX-XXXX, 0424-XXX-XXXX, 0412-XXX-XXXX, +58 XXX...
  const phoneMatch = texto.match(/(?:\+?58\s?)?(?:0)?(4(?:1[24]|2[46])[\s\-]?\d{3}[\s\-]?\d{4})/i);
  if (phoneMatch) info.telefono = phoneMatch[0];

  // Teléfonos fijos: 02XX-XXXXXXX
  const fixedMatch = texto.match(/\b0(2\d{2})[\s\-]?(\d{7})\b/);
  if (!info.telefono && fixedMatch) info.telefono = fixedMatch[0];

  // Buscar nombres: "mi nombre es X", "me llamo X", "soy X"
  const nombrePatterns = [
    /(?:mi nombre es|me llamo|soy)\s+([A-Za-zÀ-ÿ]+\s+[A-Za-zÀ-ÿ]+)/i,
    /(?:habla|aquí|le escribe)\s+([A-Za-zÀ-ÿ]+\s+[A-Za-zÀ-ÿ]+)/i,
  ];
  for (const p of nombrePatterns) {
    const m = texto.match(p);
    if (m && m[1]) {
      info.nombre = m[1].trim();
      break;
    }
  }

  // Buscar ubicación: "estoy en X", "en X Venezuela", estados VE conocidos
  const estadosVE = ['Caracas','Miranda','Vargas','Carabobo','Aragua','Lara','Zulia','Merida','Mérida','Tachira','Táchira','Barinas','Portuguesa','Cojedes','Yaracuy','Falcon','Falcón','Nueva Esparta','Anzoategui','Anzoátegui','Sucre','Monagas','Bolivar','Bolívar','Amazonas','Delta Amacuro','Apure','Guarico','Guárico','Trujillo','Valencia','Maracaibo','Maracay','Barquisimeto','Ciudad Bolivar','Puerto La Cruz','Merida','San Cristobal','La Guaira'];
  const ubicPattern = new RegExp(`(?:estoy en|estamos en|en|de|desde)\\s+([A-Za-zÁ-ÿ\\s,]{3,40}(?:${estadosVE.join('|')}))`, 'i');
  const ubicMatch = texto.match(ubicPattern);
  if (ubicMatch && ubicMatch[1]) {
    info.ubicacion = ubicMatch[1].trim();
  } else {
    // Buscar directamente menciones de estados
    for (const est of estadosVE) {
      if (texto.includes(est)) {
        info.ubicacion = est;
        break;
      }
    }
  }

  return info;
}

function detectarPlataforma(url) {
  const u = url.toLowerCase();
  if (u.includes('facebook') || u.includes('fb.')) return 'facebook';
  if (u.includes('instagram')) return 'instagram';
  if (u.includes('whatsapp')) return 'whatsapp';
  if (u.includes('youtube') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('tiktok')) return 'tiktok';
  if (u.includes('twitter') || u.includes('x.com')) return 'twitter';
  return 'otro';
}

// ----------------------------------------------------------
// Validar que reporte_id y chulito_id existan antes de usarlos
// como foreign keys. Si no existen o son inválidos, devolver null.
// Esto evita el error: FOREIGN KEY constraint failed
// ----------------------------------------------------------
async function validateForeignKeys(db, reporteId, chulitoId) {
  const result = { reporteId: null, chulitoId: null };

  // Validar reporte_id
  if (reporteId && !isNaN(parseInt(reporteId, 10)) && parseInt(reporteId, 10) > 0) {
    const id = parseInt(reporteId, 10);
    try {
      const r = await db.prepare(`SELECT id FROM reportes WHERE id = ?`).bind(id).first();
      if (r) result.reporteId = id;
    } catch (e) {
      console.error('Error validando reporte_id:', e);
    }
  }

  // Validar chulito_id
  if (chulitoId && !isNaN(parseInt(chulitoId, 10)) && parseInt(chulitoId, 10) > 0) {
    const id = parseInt(chulitoId, 10);
    try {
      const c = await db.prepare(`SELECT id FROM chulitos WHERE id = ?`).bind(id).first();
      if (c) result.chulitoId = id;
    } catch (e) {
      console.error('Error validando chulito_id:', e);
    }
  }

  return result;
}
