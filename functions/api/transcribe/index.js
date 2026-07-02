// ============================================================
// functions/api/transcribe/index.js — POST /api/transcribe
// Recibe URL o archivo de audio/video, lo transcribe y resume
// ============================================================

import { json, error, readJsonBody } from '../../lib/utils.js';
import { isAdmin } from '../../lib/auth.js';
import { transcribeAudio, generateSummary, downloadMedia } from '../../lib/ai.js';
import { logAction } from '../../lib/db.js';

// POST /api/transcribe
// Opcion 1: Body JSON { url: "https://...", reporte_id?: 123 }
// Opcion 2: FormData con "file" (audio directo)
export async function onRequestPost({ env, request }) {
  // Solo admin puede usar esto (consume AI credits)
  if (!isAdmin(request, env)) {
    return error('No autorizado. Necesitas token de admin.', 401);
  }

  let audioBuffer = null;
  let urlOrigen = null;
  let reporteId = null;
  let chulitoId = null;

  const contentType = request.headers.get('Content-Type') || '';

  if (contentType.includes('multipart/form-data')) {
    // Opcion 2: archivo directo
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return error('Falta archivo o URL', 422);

    audioBuffer = await file.arrayBuffer();
    reporteId = formData.get('reporte_id') ? parseInt(formData.get('reporte_id'), 10) : null;
    chulitoId = formData.get('chulito_id') ? parseInt(formData.get('chulito_id'), 10) : null;
  } else {
    // Opcion 1: JSON con URL
    const body = await readJsonBody(request);
    if (!body.url) return error('Falta URL o archivo', 422);

    urlOrigen = body.url;
    reporteId = body.reporte_id || null;
    chulitoId = body.chulito_id || null;

    // Guardar registro en BD
    const plataforma = detectarPlataforma(body.url);
    const insertResult = await env.DB.prepare(
      `INSERT INTO videos_procesados
        (reporte_id, chulito_id, url_origen, plataforma, estado)
       VALUES (?, ?, ?, ?, 'descargando')`
    ).bind(reporteId, chulitoId, urlOrigen, plataforma).run();
    const videoId = insertResult.meta.last_row_id;

    try {
      // Descargar el archivo
      const downloaded = await downloadMedia(body.url, env);
      audioBuffer = downloaded.buffer;

      // Actualizar estado
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

  if (!audioBuffer) {
    return error('No se pudo obtener audio', 422);
  }

  // Validar tamano (max 25MB para Whisper)
  const sizeMB = audioBuffer.byteLength / (1024 * 1024);
  if (sizeMB > 25) {
    return error(`Audio demasiado grande: ${sizeMB.toFixed(1)}MB. Max 25MB`, 422);
  }

  // Transcribir con Whisper
  let transcripcion = '';
  try {
    transcripcion = await transcribeAudio(audioBuffer, env);
  } catch (e) {
    return error(`Error transcribiendo: ${e.message}`, 500);
  }

  // Generar resumen con LLM
  let resumen = null;
  try {
    resumen = await generateSummary(transcripcion, env);
  } catch (e) {
    console.error('Error en resumen:', e);
    resumen = { resumen: transcripcion.slice(0, 300) };
  }

  // Si tenemos reporte_id o chulito_id, actualizar el registro
  if (reporteId) {
    await env.DB.prepare(
      `UPDATE reportes
       SET transcripcion = ?,
           descripcion = COALESCE(NULLIF(descripcion, ''), ?),
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(transcripcion, resumen.resumen || null, reporteId).run();
  }

  if (chulitoId) {
    await env.DB.prepare(
      `UPDATE chulitos
       SET descripcion = COALESCE(NULLIF(descripcion, ''), ?),
           updated_at = datetime('now')
       WHERE id = ?`
    ).bind(resumen.resumen || null, chulitoId).run();
  }

  // Actualizar videos_procesados si existe
  if (urlOrigen) {
    await env.DB.prepare(
      `UPDATE videos_procesados
       SET estado = 'completado',
           transcripcion = ?,
           resumen = ?,
           completed_at = datetime('now')
       WHERE url_origen = ?`
    ).bind(transcripcion, JSON.stringify(resumen), urlOrigen).run();
  }

  await logAction(env.DB, 'transcribe', 'audio', null, {
    url: urlOrigen, reporte_id: reporteId, chulito_id: chulitoId,
  }, request);

  return json({
    ok: true,
    transcripcion,
    resumen,
    longitud: transcripcion.length,
  });
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
