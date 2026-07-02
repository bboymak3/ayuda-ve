// ============================================================
// lib/auth.js — Autenticación admin por token
// ============================================================

import { AuthError } from './utils.js';

// Verificar que el request tiene un token admin válido
// Lee el header Authorization: Bearer <token>
export function requireAdmin(request, env) {
  const authHeader = request.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new AuthError('Falta token de autorización');
  }

  const token = match[1].trim();

  // Comparación segura (constante-time) para evitar timing attacks
  const adminToken = env.ADMIN_TOKEN;
  if (!adminToken || !safeEqual(token, adminToken)) {
    throw new AuthError('Token inválido');
  }

  return { role: 'admin' };
}

// ¿Es admin? (no lanza error, solo true/false)
export function isAdmin(request, env) {
  try {
    requireAdmin(request, env);
    return true;
  } catch {
    return false;
  }
}

// Comparación constante-time para evitar timing attacks
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Generar un token aleatorio seguro (para setup inicial)
export function generateToken(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
