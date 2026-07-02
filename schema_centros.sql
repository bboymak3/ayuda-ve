-- ============================================================
-- Tabla: centros_acopio
-- Centros de acopio requieren aprobación del admin
-- ============================================================
CREATE TABLE IF NOT EXISTS centros_acopio (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_encargado    TEXT NOT NULL,
  telefono            TEXT NOT NULL,
  red_social          TEXT,
  email               TEXT,
  nombre_centro       TEXT,
  tipo_insumos        TEXT NOT NULL,    -- texto libre: qué tipos de insumos aceptan
  tipos_ayuda         TEXT,             -- JSON array: ['alimentos','medicinas','ropa']
  direccion           TEXT,
  ubicacion_texto     TEXT,
  lat                 REAL NOT NULL,
  lng                 REAL NOT NULL,
  horario             TEXT,
  foto_url            TEXT,             -- URL en R2
  descripcion         TEXT,
  estado              TEXT DEFAULT 'pendiente',
                        -- 'pendiente' (esperando aprobación)
                        -- 'aprobado' (visible)
                        -- 'rechazado' (oculto)
                        -- 'suspendido' (temporalmente oculto)
  fuente              TEXT DEFAULT 'web',
  ip                  TEXT,
  created_at          TEXT DEFAULT (datetime('now')),
  updated_at          TEXT DEFAULT (datetime('now')),
  approved_at         TEXT,
  approved_by         TEXT
);

CREATE INDEX IF NOT EXISTS idx_centros_estado ON centros_acopio(estado);
CREATE INDEX IF NOT EXISTS idx_centros_latlng ON centros_acopio(lat, lng);
CREATE INDEX IF NOT EXISTS idx_centros_created ON centros_acopio(created_at DESC);
