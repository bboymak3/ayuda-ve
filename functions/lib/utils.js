// ============================================================
// lib/utils.js — Funciones utilitarias compartidas
// ============================================================

// CORS headers para todas las respuestas API
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Respuesta JSON estándar
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders,
    },
  });
}

// Respuesta de error estándar
export function error(message, status = 400, details = null) {
  return json({ ok: false, error: message, details }, status);
}

// Manejar preflight OPTIONS
export function handleOptions(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  return null;
}

// Validar que sea un método permitido
export function requireMethod(request, methods) {
  const allowed = Array.isArray(methods) ? methods : [methods];
  if (!allowed.includes(request.method)) {
    throw new MethodError(`Método ${request.method} no permitido. Use: ${allowed.join(', ')}`, 405);
  }
}

// Leer body JSON con validación
export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch (e) {
    throw new ValidationError('Body inválido. Se esperaba JSON válido.');
  }
}

// Generar slug a partir de un texto
export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // quitar acentos
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// Validar teléfono venezolano (formatos comunes)
export function isValidPhoneVE(phone) {
  if (!phone) return true; // opcional
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  return /^(0?4(1|2|4|6)\d{7}|0?2\d{9})$/.test(cleaned) || cleaned.length >= 7;
}

// Sanitizar texto para prevenir XSS básico
export function sanitize(str) {
  if (str == null) return null;
  return String(str)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Formatear fecha relativa en español
export function timeAgo(isoDate) {
  const date = new Date(isoDate + 'Z');
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'hace un momento';
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `hace ${Math.floor(seconds / 86400)} día(s)`;
  if (seconds < 2592000) return `hace ${Math.floor(seconds / 604800)} semana(s)`;
  return date.toLocaleDateString('es-VE');
}

// Generar ID corto único para uploads
export function shortId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Determinar tipo MIME permitido para fotos
export function allowedImageMimes() {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
}

// Determinar tipo MIME permitido para audio (transcripción)
export function allowedAudioMimes() {
  return ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/mp4', 'audio/ogg', 'audio/webm'];
}

// Extraer IP del cliente ( Cloudflare la pone en CF-Connecting-IP)
export function getClientIP(request) {
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
         'unknown';
}

// Escapar string para SQL LIKE
export function escapeLike(str) {
  return String(str).replace(/[%_\\]/g, c => '\\' + c);
}

// Errores personalizados
export class MethodError extends Error {
  constructor(msg, status) { super(msg); this.status = status; }
}
export class ValidationError extends Error {
  constructor(msg) { super(msg); this.status = 400; }
}
export class AuthError extends Error {
  constructor(msg = 'No autorizado') { super(msg); this.status = 401; }
}
