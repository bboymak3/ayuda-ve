-- ============================================================
-- Seed inicial - Sectores por defecto
-- Ejecutar después de schema.sql
-- ============================================================

INSERT INTO sectores (slug, nombre, descripcion, icono, color, orden) VALUES
  ('salud',         'Salud',
   'Medicinas, antibióticos, insumos médicos, hospitales y médicos que necesitan equipo. Reporta aquí si necesitas medicinas o si tienes para donar.',
   '💊', '#DC2626', 1),

  ('alimentos',     'Alimentos y Agua',
   'Comida, agua potable, leche, fórmula para bebés, cocina comunitaria. Tanto solicitudes como ofertas de donación.',
   '🍲', '#F59E0B', 2),

  ('vivienda',      'Vivienda y Materiales',
   'Materiales de construcción, reparación de techos, carpas, colchones, herramientas para remover escombros.',
   '🏠', '#7C3AED', 3),

  ('animales',      'Animales',
   'Rescate de perros y gatos, alimento para mascotas, veterinarios voluntarios, refugios temporales.',
   '🐾', '#10B981', 4),

  ('cuadrillas',    'Cuadrillas y Mano de Obra',
   'Grupos que se organizan para remover escombros, limpieza, reparaciones. Tanto quienes buscan cuadrilla como quienes la ofrecen.',
   '🛠️', '#0891B2', 5),

  ('transporte',    'Transporte y Logística',
   'Vehículos, combustible, logística para llevar donaciones de un punto a otro. Coordinación de rutas.',
   '🚚', '#6366F1', 6),

  ('psicologico',   'Apoyo Psicológico',
   'Apoyo emocional, líneas de ayuda telefónica, psicólogos voluntarios, acompañamiento post-trauma.',
   '💬', '#EC4899', 7),

  ('informacion',   'Información Útil',
   'Datos generales: hospitales activos, vías cerradas, números de emergencia, albergues, servicios públicos.',
   'ℹ️', '#475569', 8);
