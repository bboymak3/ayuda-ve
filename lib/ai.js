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

  try {
    // @cf/openai/whisper — modelo de transcripcion de OpenAI en CF Workers AI
    const response = await env.AI.run('@cf/openai/whisper', {
      audio: [...new Uint8Array(audioBuffer)],
    });

    if (response && response.text) {
      return response.text;
    }
    throw new Error('Respuesta vacia de Whisper');
  } catch (e) {
    console.error('Error en transcripcion Whisper:', e);
    throw new Error(`Error transcribiendo audio: ${e.message}`);
  }
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

  const prompt = `Eres un asistente que ayuda a organizar informacion de ayuda humanitaria en Venezuela despues de un terremoto.

A partir del siguiente texto (transcripcion de un video o mensaje), extrae:
1. Que se necesita o se ofrece (1-2 frases concretas)
2. Ubicacion mencionada (si hay)
3. Contacto mencionado (si hay)
4. Nivel de urgencia (baja/media/alta/critica)
5. Categoria principal (salud, alimentos, vivienda, maquinaria, transporte, cuadrillas, animales, dinero)

TEXTO A ANALIZAR:
"""
${texto.slice(0, 4000)}
"""

Responde SOLO en este formato JSON:
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
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get('Content-Type') || '';
    const buffer = await response.arrayBuffer();

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
