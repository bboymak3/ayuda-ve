-- ============================================================
-- Schema v2 — Perfiles + Abusos
-- ============================================================

-- ----------------------------------------------------------
-- Tabla: perfiles
-- Agrupa reportes reiterativos de la misma persona/organización
-- Se crea automaticamente cuando se detecta coincidencia
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS perfiles (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo            TEXT NOT NULL DEFAULT 'persona',
                    -- 'persona' (individuo)
                    -- 'organizacion' (fundación, ONG, grupo)
                    -- 'lugar' (hospital, albergue, punto fijo)
  nombre          TEXT NOT NULL,
  telefono        TEXT,
  red_social      TEXT,
  ubicacion       TEXT,
  lat             REAL,
  lng             REAL,
  categoria_principal TEXT,         -- categoria mas frecuente
  total_reportes  INTEGER DEFAULT 0,
  verificada      INTEGER DEFAULT 0, -- 1 si admin la marco como verificada
  notas_internas  TEXT,              -- notas privadas del admin
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  last_activity   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_perfiles_telefono ON perfiles(telefono);
CREATE INDEX IF NOT EXISTS idx_perfiles_nombre   ON perfiles(nombre);
CREATE INDEX IF NOT EXISTS idx_perfiles_tipo     ON perfiles(tipo);

-- ----------------------------------------------------------
-- Tabla: perfil_reporte_link
-- Relaciona perfiles con reportes/chulitos
-- Un perfil puede tener muchos reportes asociados
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS perfil_reporte_link (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  perfil_id       INTEGER NOT NULL,
  reporte_id      INTEGER,
  chulito_id      INTEGER,
  video_id        INTEGER,
  fuente          TEXT DEFAULT 'manual',
                    -- 'manual' (admin lo asocio)
                    -- 'auto_telefono' (mismo telefono detectado)
                    -- 'auto_nombre_ubicacion' (nombre + ubicacion similares)
                    -- 'auto_video' (generado desde video IA)
  created_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (perfil_id) REFERENCES perfiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_prl_perfil  ON perfil_reporte_link(perfil_id);
CREATE INDEX IF NOT EXISTS idx_prl_reporte ON perfil_reporte_link(reporte_id);
CREATE INDEX IF NOT EXISTS idx_prl_chulito ON perfil_reporte_link(chulito_id);

-- ----------------------------------------------------------
-- Tabla: reportes_abuso
-- Reportes de abuso, estafa, suplantacion, contenido inapropiado
-- Cualquiera puede reportar, anonimo o con nombre
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS reportes_abuso (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo            TEXT NOT NULL,
                    -- 'estafa' (piden dinero falso)
                    -- 'suplantacion' (se hacen pasar por otra persona)
                    -- 'info_falsa' (informacion falsa)
                    -- 'contenido_inapropiado'
                    -- 'acoso'
                    -- 'otro'

  -- Sobre qué se reporta
  entidad_tipo    TEXT,
                    -- 'reporte', 'chulito', 'perfil', 'url_externa'
  entidad_id      INTEGER,
  url_referencia  TEXT,               -- URL del contenido reportado

  -- Quién reporta (opcional, puede ser anónimo)
  anonimo         INTEGER DEFAULT 0,
  reportante_nombre    TEXT,
  reportante_apellido  TEXT,
  reportante_telefono  TEXT,
  reportante_email     TEXT,

  -- Detalle
  descripcion     TEXT NOT NULL,
  evidencia_urls  TEXT,               -- JSON array de URLs en R2

  -- Estado
  estado          TEXT DEFAULT 'pendiente',
                    -- 'pendiente', 'revisado', 'accionado', 'descartado'
  ip              TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  reviewed_at     TEXT,
  reviewed_by     TEXT,
  review_notes    TEXT
);

CREATE INDEX IF NOT EXISTS idx_abuso_estado ON reportes_abuso(estado);
CREATE INDEX IF NOT EXISTS idx_abuso_tipo   ON reportes_abuso(tipo);
CREATE INDEX IF NOT EXISTS idx_abuso_entidad ON reportes_abuso(entidad_tipo, entidad_id);
CREATE INDEX IF NOT EXISTS idx_abuso_created ON reportes_abuso(created_at DESC);
