// ============================================================
// functions/api/media/[key].js — GET /api/media/[key]
// Sirve archivos desde R2 (fotos y audios)
// ============================================================

import { error } from '../../../lib/utils.js';

export async function onRequestGet({ env, params }) {
  if (!env.BUCKET) {
    return error('R2 no configurado', 500);
  }

  // params.key puede tener subdirectorios (fotos/abc.jpg)
  const key = params.key;
  if (!key || key.includes('..')) {
    return error('Key invalida', 400);
  }

  const object = await env.BUCKET.get(key);
  if (!object) {
    return error('Archivo no encontrado', 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(object.body, { headers });
}
