// ============================================================
// functions/api/upload/index.js — POST /api/upload
// Sube archivos a R2 (fotos, audios)
// ============================================================

import { json, error, getClientIP, shortId, allowedImageMimes, allowedAudioMimes } from '../../../lib/utils.js';

// POST /api/upload
// FormData con campo "file" (max 25MB por defecto en Cloudflare)
// Body: multipart/form-data
export async function onRequestPost({ env, request }) {
  if (!env.BUCKET) {
    return error('R2 no configurado', 500);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (e) {
    return error('Body invalido. Se esperaba multipart/form-data', 400);
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return error('Falta el archivo (campo "file")', 422);
  }

  // Validar tipo
  const contentType = file.type || '';
  const isImage = allowedImageMimes().includes(contentType);
  const isAudio  = allowedAudioMimes().includes(contentType);

  if (!isImage && !isAudio) {
    return error(
      `Tipo no permitido: ${contentType}. Solo imagenes (jpeg/png/webp/gif) y audio (mp3/wav/m4a/ogg)`,
      422
    );
  }

  // Validar tamano (max 25MB)
  const arrayBuffer = await file.arrayBuffer();
  const sizeMB = arrayBuffer.byteLength / (1024 * 1024);
  if (sizeMB > 25) {
    return error(`Archivo demasiado grande: ${sizeMB.toFixed(1)}MB. Max 25MB`, 422);
  }

  // Generar key en R2
  const ext = file.name?.split('.').pop()?.toLowerCase() || (isImage ? 'jpg' : 'mp3');
  const folder = isImage ? 'fotos' : 'audios';
  const key = `${folder}/${shortId()}.${ext}`;

  // Subir a R2
  try {
    await env.BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType,
      },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        originalName: file.name || 'unknown',
        ip: getClientIP(request),
      },
    });
  } catch (e) {
    console.error('Error subiendo a R2:', e);
    return error('Error subiendo archivo', 500);
  }

  // URL publica del archivo
  // R2 no es publico por defecto, pero podemos servirlo via un Worker
  // Para esta app, serviremos via /api/media/[key]
  const publicUrl = `/api/media/${key}`;

  return json({
    ok: true,
    key,
    url: publicUrl,
    size: arrayBuffer.byteLength,
    type: isImage ? 'image' : 'audio',
  }, 201);
}
