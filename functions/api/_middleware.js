// ============================================================
// functions/api/_middleware.js — CORS + manejo de errores global
// ============================================================

import { corsHeaders, error, handleOptions } from '../../lib/utils.js';

export async function onRequest(context) {
  const { request } = context;

  // Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Pasar al siguiente handler
    const response = await context.next();
    return response;
  } catch (e) {
    console.error('API error:', e);
    const status = e.status || 500;
    return error(e.message || 'Error interno del servidor', status, {
      stack: e.stack?.split('\n').slice(0, 3),
    });
  }
}
