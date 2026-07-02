// ============================================================
// lib/ai.js — Integracion con Cloudflare Workers AI
// 1. Whisper para transcripcion de audio/video
// 2. LLM para resumen automatico
// ============================================================

// ----------------------------------------------------------
// Transcribir audio usando Whisper
// Recibe: ArrayBuffer del audio (mp3, wav, m4a, etc.)
// Devuelve: texto transcrito
// ----------------------------------------------------------
export async function transcribeAudio(audioBuffer, env) {
  if (!env.AI) {
    throw new Error('Workers AI no configurado. Falta binding AI.');
  }

  // Validar que el buffer no esté vacío
  if (!audioBuffer || audioBuffer.byteLength === 0) {
    throw new Error('El buffer de audio está vacío. El archivo descargado no contiene audio válido.');
  }

  // Validar tamaño mínimo
  if (audioBuffer.byteLength < 1000) {
    throw new Error('El archivo es demasiado pequeño para ser audio válido (< 1KB).');
  }

  // Detectar si el contenido es HTML
  const headerBytes = new Uint8Array(audioBuffer.slice(0, 50));
  const headerStr = String.fromCharCode(...headerBytes).toLowerCase();
  if (headerStr.includes('<!doctype') || headerStr.includes('<html') || headerStr.includes('<?xml')) {
    throw new Error('El contenido descargado es una página HTML, no un archivo de audio. Las plataformas como Facebook/Instagram/YouTube bloquean la descarga directa. Descarga el audio manualmente y súbelo como archivo.');
  }

  try {
    // Modelo mejorado: whisper-large-v3-turbo (mejor precisión con español que el básico)
    // Fallback al whisper básico si el turbo falla
    let response;
    try {
      response = await env.AI.run('@cf/openai/whisper-large-v3-turbo', {
        audio: [...new Uint8Array(audioBuffer)],
      });
    } catch (turboErr) {
      console.log('Whisper turbo falló, intentando con whisper básico:', turboErr.message);
      response = await env.AI.run('@cf/openai/whisper', {
        audio: [...new Uint8Array(audioBuffer)],
      });
    }

    if (response && response.text) {
      // Limpiar loops y repeticiones que Whisper a veces genera
      const cleanedText = cleanWhisperLoops(response.text);
      // Limitar longitud máxima
      const finalText = cleanedText.slice(0, 5000);
      return finalText;
    }
    throw new Error('Respuesta vacía de Whisper. El audio podría estar corrupto o en un formato no soportado.');
  } catch (e) {
    console.error('Error en transcripcion Whisper:', e);
    throw new Error(`Error transcribiendo audio: ${e.message}`);
  }
}

// ----------------------------------------------------------
// Limpiar loops y repeticiones infinitas de Whisper
// Whisper a veces entra en un loop y repite la misma frase
// cientos de veces. Esta función lo detecta y corta.
// ----------------------------------------------------------
function cleanWhisperLoops(text) {
  if (!text || text.length < 50) return text;

  // Dividir en frases (por punto, coma, punto y coma, etc.)
  const sentences = text.split(/(?<=[.,;!?])\s+/).filter(s => s.trim().length > 0);

  if (sentences.length < 5) return text;

  const cleaned = [];
  let consecutiveRepeats = 0;

  for (let i = 0; i < sentences.length; i++) {
    const current = sentences[i].trim().toLowerCase();
    const prev = cleaned.length > 0 ? cleaned[cleaned.length - 1].trim().toLowerCase() : '';

    // Si la frase actual es muy similar a la anterior (igual o contenida)
    if (prev && (current === prev ||
                 current.includes(prev) && prev.length > 10 ||
                 prev.includes(current) && current.length > 10)) {
      consecutiveRepeats++;
      // Si ya se repitió 2 veces, cortar TODO el resto (Whisper entró en loop)
      if (consecutiveRepeats >= 2) {
        console.log(`Loop detectado en posición ${i}, cortando transcripción`);
        break;
      }
      // Si es la primera repetición, la dejamos pasar
      cleaned.push(sentences[i]);
    } else {
      // Detectar patrón de repetición exacta de frase corta (ej: "de la orden, de la orden, ...")
      const lastFew = cleaned.slice(-3).map(s => s.trim().toLowerCase());
      if (lastFew.length >= 2 && lastFew.every(s => s === current) && current.length < 30) {
        console.log(`Patrón de repetición corta detectado, cortando`);
        // Quitar las últimas 2 frases repetidas
        cleaned.splice(-2);
        break;
      }
      consecutiveRepeats = 0;
      cleaned.push(sentences[i]);
    }
  }

  let result = cleaned.join(' ');

  // Detectar repeticiones de palabras sueltas (ej: "gente, gente, gente, gente...")
  result = result.replace(/(\b\w+\b)(,\s*\1){3,}/gi, '$1');

  // Limitar a 5000 caracteres máximos
  if (result.length > 5000) {
    result = result.slice(0, 5000) + '... [transcripción truncada por longitud]';
  }

  return result;
}

// ----------------------------------------------------------
// Generar resumen con LLM
// Recibe: texto largo (transcripcion o texto libre)
// Devuelve: resumen estructurado en español
// ----------------------------------------------------------
export async function generateSummary(texto, env, contexto = 'reporte de ayuda') {
  if (!env.AI) {
    return texto.slice(0, 300); // fallback: cortar a 300 chars
  }

  const prompt = `Eres un asistente experto que ayuda a organizar información de ayuda humanitaria en Venezuela después de un terremoto.

Recibirás la transcripción de un video o audio (puede tener errores de transcripción, palabras mal interpretadas, o fragmentos repetidos). Tu trabajo es:

1. Si la transcripción es INCOMPRENSIBLE (solo ruido, repeticiones sin sentido, o no se entiende nada), responde con resumen="Transcripción no comprensible", y los demás campos vacíos.
2. Si se entiende algo, extrae lo que se necesita o se ofrece (1-2 frases claras, redactadas correctamente en español).
3. Ubicación mencionada (si hay, solo el nombre del lugar).
4. Contacto mencionado (nombre y/o teléfono, si hay).
5. Nivel de urgencia (baja/media/alta/critica) según el tono del mensaje.
6. Categoría principal (salud, alimentos, vivienda, maquinaria, transporte, cuadrillas, animales, dinero, informacion).

IMPORTANTE:
- Corrige errores obvios de transcripción (ej: "caravol" → "Carabobo", "antiguiódicos" → "antibióticos").
- Si la persona habla de "policía", "permiso para pasar", "patrulla", "escolta", "bloqueo en la vía", es categoría "informacion" (no salud ni alimentos).
- NO inventes información que no esté en el texto.
- Si hay repeticiones en la transcripción, solo considera el contenido único.

TEXTO A ANALIZAR:
"""
${texto.slice(0, 4000)}
"""

Responde SOLO en este formato JSON válido (sin texto adicional antes o después):
{
  "resumen": "...",
  "ubicacion": "...",
  "contacto": "...",
  "urgencia": "...",
  "categoria": "..."
}`;

  try {
    // Usamos un modelo de texto de Cloudflare Workers AI
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'Eres un asistente util que responde en español venezolano.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const content = response?.response || response?.message || '';

    // Intentar parsear JSON
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {}

    // Si no se pudo parsear, devolver como resumen simple
    return { resumen: content.slice(0, 300), ubicacion: '', contacto: '', urgencia: 'media', categoria: '' };
  } catch (e) {
    console.error('Error generando resumen LLM:', e);
    return { resumen: texto.slice(0, 300), ubicacion: '', contacto: '', urgencia: 'media', categoria: '' };
  }
}

// ----------------------------------------------------------
// Descargar audio/video desde una URL (Facebook, Instagram, etc.)
// Cloudflare Workers tienen fetch nativo
// ----------------------------------------------------------
export async function downloadMedia(url, env) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AyudaVE/1.0)',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }

    const contentType = response.headers.get('Content-Type') || '';
    const buffer = await response.arrayBuffer();

    // Detectar si la respuesta es HTML (página de login/redirección de Facebook, etc.)
    const ctLower = contentType.toLowerCase();
    if (ctLower.includes('text/html') || ctLower.includes('application/json')) {
      throw new Error(
        `La URL devolvió ${ctLower.split(';')[0]} (no es audio/video). ` +
        `Las plataformas como Facebook, Instagram y YouTube NO permiten descarga directa de videos. ` +
        `Solución: descarga el audio del video (con y2mate.com u otra herramienta) y súbelo como archivo.`
      );
    }

    return {
      buffer,
      contentType,
      size: buffer.byteLength,
    };
  } catch (e) {
    console.error('Error descargando media:', e);
    throw new Error(`No se pudo descargar el video/audio: ${e.message}`);
  }
}

// ----------------------------------------------------------
// Extraer audio de un video (simplificado)
// En Cloudflare Workers no podemos correr ffmpeg, asi que
// dependemos de que el usuario suba el audio directamente,
// o usamos el video tal cual si el modelo lo acepta.
// ----------------------------------------------------------
export async function processVideoUrl(url, env) {
  // Por ahora, intentamos descargar y procesar como audio
  // En una version futura podemos integrar yt-dlp o similar via API externa

  const { buffer, contentType } = await downloadMedia(url, env);

  // Si es video, no podemos extraer audio en Workers
  // pero si es audio directo, lo transcribimos
  if (contentType.startsWith('audio/')) {
    const transcription = await transcribeAudio(buffer, env);
    const summary = await generateSummary(transcription, env);
    return { transcription, summary, audioBuffer: buffer };
  }

  // Si es video o HTML (pagina de FB/IG), no podemos procesar directamente
  // Devolvemos error con instruccion
  throw new Error(
    'No se pudo extraer audio del enlace. ' +
    'Para videos de Facebook/Instagram, descarga el audio (mp3) y subelo directamente.'
  );
}
