-- ============================================================
-- Schema Extendido - AyudaVE
-- Tablas adicionales: chulitos, personas, matches, comentarios, settings
-- ============================================================

-- ----------------------------------------------------------
-- Tabla: chulitos (marcadores del mapa interactivo)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS chulitos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo            TEXT NOT NULL DEFAULT 'solicitud',
                    -- 'solicitud' (necesita)
                    -- 'oferta' (tiene para dar)
                    -- 'informacion' (punto util)
  titulo          TEXT NOT NULL,
  descripcion     TEXT,
  categoria       TEXT,                  -- categoria_slug normalizado
  nombre          TEXT NOT NULL,
  telefono        TEXT NOT NULL,
  requerimiento   TEXT NOT NULL,         -- texto libre: que necesita/ofrece
  ubicacion_texto TEXT,                  -- direccion legible
  lat             REAL NOT NULL,
  lng             REAL NOT NULL,
  urgencia        TEXT DEFAULT 'media',  -- baja/media/alta/critica
  estado          TEXT DEFAULT 'activo',
                    -- 'activo' (visible, pendiente)
                    -- 'resuelto' (atendido, verde)
                    -- 'eliminado' (oculto por admin)
  foto_url        TEXT,                  -- URL en R2
  fuente          TEXT DEFAULT 'web',    -- web/admin/api
  ip              TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  resolved_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_chulitos_estado    ON chulitos(estado);
CREATE INDEX IF NOT EXISTS idx_chulitos_urgencia  ON chulitos(urgencia);
CREATE INDEX IF NOT EXISTS idx_chulitos_tipo      ON chulitos(tipo);
CREATE INDEX IF NOT EXISTS idx_chulitos_categoria ON chulitos(categoria);
CREATE INDEX IF NOT EXISTS idx_chulitos_latlng    ON chulitos(lat, lng);
CREATE INDEX IF NOT EXISTS idx_chulitos_created   ON chulitos(created_at DESC);

-- FTS para chulitos
CREATE VIRTUAL TABLE IF NOT EXISTS chulitos_fts USING fts5(
  titulo, descripcion, requerimiento, nombre,
  content='chulitos',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS chulitos_ai AFTER INSERT ON chulitos BEGIN
  INSERT INTO chulitos_fts(rowid, titulo, descripcion, requerimiento, nombre)
  VALUES (new.id, new.titulo, new.descripcion, new.requerimiento, new.nombre);
END;
CREATE TRIGGER IF NOT EXISTS chulitos_ad AFTER DELETE ON chulitos BEGIN
  INSERT INTO chulitos_fts(chulitos_fts, rowid, titulo, descripcion, requerimiento, nombre)
  VALUES ('delete', old.id, old.titulo, old.descripcion, old.requerimiento, old.nombre);
END;
CREATE TRIGGER IF NOT EXISTS chulitos_au AFTER UPDATE ON chulitos BEGIN
  INSERT INTO chulitos_fts(chulitos_fts, rowid, titulo, descripcion, requerimiento, nombre)
  VALUES ('delete', old.id, old.titulo, old.descripcion, old.requerimiento, old.nombre);
  INSERT INTO chulitos_fts(rowid, titulo, descripcion, requerimiento, nombre)
  VALUES (new.id, new.titulo, new.descripcion, new.requerimiento, new.nombre);
END;

-- ----------------------------------------------------------
-- Tabla: personas (buscadas/encontradas - SIN fallecidos)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS personas (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo                TEXT NOT NULL DEFAULT 'buscado',
                        -- 'buscado' (alguien la busca)
                        -- 'encontrado' (aparecio, esta bien)
                        -- 'albergue' (ubicado en refugio)
                        -- 'trasladado' (llevado a hospital/otra ciudad)
  nombre              TEXT NOT NULL,
  apellido            TEXT,
  cedula              TEXT,                  -- se guarda parcial/enmascarada
  cedula_hash         TEXT,                  -- hash para match sin exponer
  edad                INTEGER,
  descripcion_fisica  TEXT,
  ultima_ubicacion    TEXT,
  lat                 REAL,
  lng                 REAL,
  estado_salud        TEXT,                  -- 'sano','herido_leve','herido_grave','no_especifica'
  familiar_nombre     TEXT,
  familiar_telefono   TEXT,
  familiar_red_social TEXT,
  foto_url            TEXT,
  notas               TEXT,
  verificado          INTEGER DEFAULT 0,
  fuente_url          TEXT,
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now')),
  approved_at         TEXT
);

CREATE INDEX IF NOT EXISTS idx_personas_tipo     ON personas(tipo);
CREATE INDEX IF NOT EXISTS idx_personas_cedulah  ON personas(cedula_hash);
CREATE INDEX IF NOT EXISTS idx_personas_nombre   ON personas(nombre);
CREATE INDEX IF NOT EXISTS idx_personas_apellido ON personas(apellido);
CREATE INDEX IF NOT EXISTS idx_personas_telefono ON personas(familiar_telefono);

-- ----------------------------------------------------------
-- Tabla: comentarios_chulitos
-- Comentarios en chulitos (activables globalmente)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS comentarios_chulitos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  chulito_id  INTEGER NOT NULL,
  autor       TEXT,
  texto       TEXT NOT NULL,
  ip          TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (chulito_id) REFERENCES chulitos(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comentarios_chulito ON comentarios_chulitos(chulito_id);

-- ----------------------------------------------------------
-- Tabla: settings (configuracion global)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TEXT DEFAULT (datetime('now'))
);

-- Configuracion inicial
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('comentarios_habilitados', 'true'),
  ('mapa_habilitado', 'true'),
  ('sitio_activo', 'true'),
  ('mensaje_emergencia', 'Si necesitas ayuda urgente llama al 911 o a Proteccion Civil'),
  ('titulo_sitio', 'Ayuda VE - Plataforma de Ayuda Mutua'),
  ('descripcion_sitio', 'Conecta a quienes necesitan ayuda con quienes quieren ayudar. Reportes de medicinas, alimentos, vivienda, transporte y mas en Venezuela.');

-- ----------------------------------------------------------
-- Tabla: match_rules (reglas de match inteligente)
-- Define que categorias se conectan entre si
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS match_rules (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria_a     TEXT NOT NULL,   -- ej: 'salud.medico_tengo'
  categoria_b     TEXT NOT NULL,   -- ej: 'salud.medico_necesito'
  tipo_match      TEXT DEFAULT 'directo',
                    -- 'directo' (tengo X -> necesito X)
                    -- 'cruzado' (antibioticos -> farmacias)
                    -- 'inverso' (mismo tipo, ubicacion opuesta)
  prioridad       INTEGER DEFAULT 1,
  activa          INTEGER DEFAULT 1,
  UNIQUE(categoria_a, categoria_b)
);

-- ----------------------------------------------------------
-- Tabla: sinonimos (diccionario para normalizar texto)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS sinonimos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  palabra         TEXT NOT NULL UNIQUE,
  categoria_slug  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sinonimos_palabra ON sinonimos(palabra);

-- ----------------------------------------------------------
-- Tabla: videos_procesados
-- Registro de videos subidos para transcripcion/resumen IA
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS videos_procesados (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  reporte_id      INTEGER,
  chulito_id      INTEGER,
  url_origen      TEXT NOT NULL,         -- URL de Facebook/Instagram/WhatsApp
  plataforma      TEXT,                  -- facebook/instagram/whatsapp/youtube
  audio_r2_key    TEXT,                  -- key en R2 del audio descargado
  transcripcion   TEXT,                  -- texto transcrito por Whisper
  resumen         TEXT,                  -- resumen generado por LLM
  estado          TEXT DEFAULT 'pendiente',
                    -- 'pendiente','descargando','transcribiendo','resumiendo','completado','error'
  error_msg       TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  completed_at    TEXT,
  FOREIGN KEY (reporte_id)  REFERENCES reportes(id)  ON DELETE SET NULL,
  FOREIGN KEY (chulito_id)  REFERENCES chulitos(id)  ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_videos_estado ON videos_procesados(estado);
