-- ============================================================
-- Schema D1 para AyudaVE
-- Base de datos SQLite (Cloudflare D1)
-- ============================================================

-- ----------------------------------------------------------
-- Tabla: sectores
-- Categorías principales de ayuda (Salud, Alimentos, etc.)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS sectores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT UNIQUE NOT NULL,                    -- ej: "salud", "alimentos"
  nombre      TEXT NOT NULL,                           -- ej: "Salud"
  descripcion TEXT,
  icono       TEXT DEFAULT '📦',                       -- emoji o nombre de icono
  color       TEXT DEFAULT '#2563EB',                  -- color hex para UI
  orden       INTEGER DEFAULT 0,                       -- orden de visualización
  activo      INTEGER DEFAULT 1,                       -- 1=visible, 0=oculto
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------
-- Tabla: reportes
-- Cada petición de ayuda, disponible de donación, o información
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS reportes (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  sector_id           INTEGER NOT NULL,
  tipo                TEXT NOT NULL DEFAULT 'solicitud',
                        -- 'solicitud' (necesitan ayuda)
                        -- 'disponible' (tienen para donar)
                        -- 'informacion' (info útil: cuadrilla, hospital activo, etc.)

  titulo              TEXT NOT NULL,
  descripcion         TEXT NOT NULL,

  -- Categoría específica dentro del sector (ej: "antibióticos", "alimento para perros")
  categoria_especifica TEXT,

  -- Datos de contacto
  contacto_nombre     TEXT,
  contacto_telefono   TEXT,
  contacto_red_social TEXT,                  -- URL de Facebook, Instagram, etc.

  -- Ubicación
  ubicacion_estado    TEXT,                  -- ej: "Miranda", "Carabobo"
  ubicacion_ciudad    TEXT,                  -- ej: "Caracas", "Valencia"
  ubicacion_direccion TEXT,                  -- dirección detallada (opcional)

  -- Urgencia y estado
  urgencia            TEXT DEFAULT 'media',  -- 'baja', 'media', 'alta', 'critica'
  estado              TEXT DEFAULT 'pendiente',
                        -- 'pendiente' (esperando moderación)
                        -- 'aprobado' (visible públicamente)
                        -- 'rechazado' (oculto)
                        -- 'resuelto' (ya atendido, archivado)

  -- Media
  foto_urls           TEXT,                  -- JSON array de URLs en R2
  video_url           TEXT,                  -- URL YouTube/Facebook/etc
  transcripcion       TEXT,                  -- texto transcrito del video (Whisper)

  -- Fuente original (de dónde sacaste la info)
  fuente_url          TEXT,                  -- ej: URL del post de Facebook
  fuente_plataforma   TEXT DEFAULT 'facebook', -- 'facebook','whatsapp','instagram','twitter','otro'

  -- Tags / etiquetas para búsqueda
  tags                TEXT,                  -- JSON array: ["antibioticos","miranda","urgente"]

  -- Metadata
  creado_por          TEXT DEFAULT 'anonimo', -- 'anonimo','admin','api'
  views               INTEGER DEFAULT 0,
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now')),
  approved_at         TEXT,

  FOREIGN KEY (sector_id) REFERENCES sectores(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------
-- Tabla: logs
-- Registro de acciones (para auditoría)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  accion      TEXT NOT NULL,                  -- 'create','update','delete','approve','reject'
  entidad     TEXT NOT NULL,                  -- 'reporte','sector'
  entidad_id  INTEGER,
  detalle     TEXT,                           -- JSON con info adicional
  ip          TEXT,
  user_agent  TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------
-- Índices para búsqueda rápida
-- ----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_reportes_sector    ON reportes(sector_id);
CREATE INDEX IF NOT EXISTS idx_reportes_estado    ON reportes(estado);
CREATE INDEX IF NOT EXISTS idx_reportes_urgencia  ON reportes(urgencia);
CREATE INDEX IF NOT EXISTS idx_reportes_tipo      ON reportes(tipo);
CREATE INDEX IF NOT EXISTS idx_reportes_created   ON reportes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reportes_tags      ON reportes(tags);

-- Búsqueda full-text (SQLite FTS5) - permite buscar en título + descripción
CREATE VIRTUAL TABLE IF NOT EXISTS reportes_fts USING fts5(
  titulo,
  descripcion,
  categoria_especifica,
  transcripcion,
  tags,
  content='reportes',
  content_rowid='id'
);

-- Triggers para mantener el FTS sincronizado
CREATE TRIGGER IF NOT EXISTS reportes_ai AFTER INSERT ON reportes BEGIN
  INSERT INTO reportes_fts(rowid, titulo, descripcion, categoria_especifica, transcripcion, tags)
  VALUES (new.id, new.titulo, new.descripcion, new.categoria_especifica, new.transcripcion, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS reportes_ad AFTER DELETE ON reportes BEGIN
  INSERT INTO reportes_fts(reportes_fts, rowid, titulo, descripcion, categoria_especifica, transcripcion, tags)
  VALUES ('delete', old.id, old.titulo, old.descripcion, old.categoria_especifica, old.transcripcion, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS reportes_au AFTER UPDATE ON reportes BEGIN
  INSERT INTO reportes_fts(reportes_fts, rowid, titulo, descripcion, categoria_especifica, transcripcion, tags)
  VALUES ('delete', old.id, old.titulo, old.descripcion, old.categoria_especifica, old.transcripcion, old.tags);
  INSERT INTO reportes_fts(rowid, titulo, descripcion, categoria_especifica, transcripcion, tags)
  VALUES (new.id, new.titulo, new.descripcion, new.categoria_especifica, new.transcripcion, new.tags);
END;
