-- ============================================================
-- Schema v3: agregar campos para embed y fuente
-- ============================================================

-- Agregar campos a reportes
ALTER TABLE reportes ADD COLUMN embed_html TEXT;
ALTER TABLE reportes ADD COLUMN tipo_fuente TEXT DEFAULT 'manual';
  -- 'manual': creado a mano
  -- 'imagen_url': desde URL de imagen
  -- 'facebook_embed': embed de Facebook
  -- 'video_url': URL de video
  -- 'audio_file': archivo subido
  -- 'instagram_embed', 'twitter_embed', etc.

-- Agregar campos a chulitos (eventos del mapa)
ALTER TABLE chulitos ADD COLUMN embed_html TEXT;
ALTER TABLE chulitos ADD COLUMN tipo_fuente TEXT DEFAULT 'manual';
ALTER TABLE chulitos ADD COLUMN fuente_url TEXT;
