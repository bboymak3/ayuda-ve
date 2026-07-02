-- ============================================================
-- Diccionario de sinonimos y reglas de match inteligente
-- Permite que "medico", "doctor", "médico" se mapeen a la misma categoria
-- ============================================================

-- ----------------------------------------------------------
-- REGLAS DE MATCH (que categoria conecta con cual)
-- ----------------------------------------------------------
INSERT OR IGNORE INTO match_rules (categoria_a, categoria_b, tipo_match, prioridad) VALUES
  -- Salud
  ('salud.medico_tengo',         'salud.medico_necesito',         'directo', 1),
  ('salud.medicina_tengo',       'salud.medicina_necesito',       'directo', 1),
  ('salud.antibioticos_tengo',   'salud.antibioticos_necesito',   'directo', 1),
  ('salud.equipos_tengo',        'salud.equipos_necesito',        'directo', 1),
  ('salud.antibioticos_tengo',   'salud.farmacia_activa',         'cruzado', 2),
  ('salud.medicina_tengo',       'salud.farmacia_activa',         'cruzado', 2),
  ('salud.medico_tengo',         'salud.hospital_activo',         'cruzado', 2),

  -- Alimentos
  ('alimentos.agua_tengo',       'alimentos.agua_necesito',       'directo', 1),
  ('alimentos.comida_tengo',     'alimentos.comida_necesito',     'directo', 1),
  ('alimentos.leche_tengo',      'alimentos.leche_necesito',      'directo', 1),
  ('alimentos.comida_tengo',     'alimentos.punto_acopio',        'cruzado', 2),
  ('alimentos.agua_tengo',       'alimentos.punto_acopio',        'cruzado', 2),

  -- Vivienda
  ('vivienda.materiales_tengo',  'vivienda.materiales_necesito',  'directo', 1),
  ('vivienda.ropa_tengo',        'vivienda.ropa_necesito',        'directo', 1),
  ('vivienda.toallas_tengo',     'vivienda.toallas_necesito',     'directo', 1),
  ('vivienda.carpas_tengo',      'vivienda.carpas_necesito',      'directo', 1),
  ('vivienda.colchones_tengo',   'vivienda.colchones_necesito',   'directo', 1),

  -- Maquinaria
  ('maquinaria.grua_tengo',      'maquinaria.grua_necesito',      'directo', 1),
  ('maquinaria.montacargas_tengo','maquinaria.montacargas_necesito','directo', 1),
  ('maquinaria.retroexcavadora_tengo','maquinaria.retroexcavadora_necesito','directo', 1),
  ('maquinaria.planta_electrica_tengo','maquinaria.planta_electrica_necesito','directo', 1),

  -- Transporte
  ('transporte.vehiculo_tengo',  'transporte.vehiculo_necesito',  'directo', 1),
  ('transporte.camion_tengo',    'transporte.camion_necesito',    'directo', 1),
  ('transporte.combustible_tengo','transporte.combustible_necesito','directo', 1),
  ('transporte.moto_tengo',      'transporte.moto_necesito',      'directo', 1),

  -- Cuadrillas
  ('cuadrillas.voluntario_tengo','cuadrillas.voluntario_necesito','directo', 1),
  ('cuadrillas.cuadrilla_tengo', 'cuadrillas.cuadrilla_necesito', 'directo', 1),
  ('cuadrillas.rapel_tengo',     'cuadrillas.rapel_necesito',     'directo', 1),
  ('cuadrillas.buceo_tengo',     'cuadrillas.buceo_necesito',     'directo', 1),

  -- Animales
  ('animales.alimento_mascotas_tengo','animales.alimento_mascotas_necesito','directo', 1),
  ('animales.veterinario_tengo', 'animales.veterinario_necesito', 'directo', 1),
  ('animales.refugio_tengo',     'animales.refugio_necesito',     'directo', 1),

  -- Dinero
  ('dinero.fundacion',           'dinero.donacion_monetaria',     'directo', 1);

-- ----------------------------------------------------------
-- DICCIONARIO DE SINONIMOS
-- Formato: (palabra_usuario, categoria_slug)
-- El sistema normaliza texto del usuario a estas categorias
-- ----------------------------------------------------------
INSERT OR IGNORE INTO sinonimos (palabra, categoria_slug) VALUES
  -- SALUD: medicos
  ('medico', 'salud.medico'),
  ('médico', 'salud.medico'),
  ('medica', 'salud.medico'),
  ('médica', 'salud.medico'),
  ('medicos', 'salud.medico'),
  ('médicos', 'salud.medico'),
  ('doctor', 'salud.medico'),
  ('doctora', 'salud.medico'),
  ('doctores', 'salud.medico'),
  ('enfermero', 'salud.medico'),
  ('enfermera', 'salud.medico'),
  ('enfermeros', 'salud.medico'),
  ('enfermeras', 'salud.medico'),
  ('paramedico', 'salud.medico'),
  ('paramédico', 'salud.medico'),

  -- SALUD: medicinas (general)
  ('medicina', 'salud.medicina'),
  ('medicinas', 'salud.medicina'),
  ('medicamento', 'salud.medicina'),
  ('medicamentos', 'salud.medicina'),
  ('pastillas', 'salud.medicina'),
  ('farmacos', 'salud.medicina'),
  ('fármacos', 'salud.medicina'),

  -- SALUD: antibioticos
  ('antibiotico', 'salud.antibioticos'),
  ('antibiótico', 'salud.antibioticos'),
  ('antibioticos', 'salud.antibioticos'),
  ('antibióticos', 'salud.antibioticos'),
  ('amoxicilina', 'salud.antibioticos'),
  ('penicilina', 'salud.antibioticos'),
  ('azitromicina', 'salud.antibioticos'),
  ('ciprofloxacino', 'salud.antibioticos'),
  ('cefalexina', 'salud.antibioticos'),
  ('doxiciclina', 'salud.antibioticos'),

  -- SALUD: equipos
  ('equipo', 'salud.equipos'),
  ('equipos', 'salud.equipos'),
  ('respirador', 'salud.equipos'),
  ('ventilador', 'salud.equipos'),
  ('oxigeno', 'salud.equipos'),
  ('oxígeno', 'salud.equipos'),
  ('jeringas', 'salud.equipos'),
  ('gasas', 'salud.equipos'),
  ('alcohol', 'salud.equipos'),
  ('suero', 'salud.equipos'),
  ('sangre', 'salud.equipos'),

  -- SALUD: farmacia/hospital (cruzado)
  ('farmacia', 'salud.farmacia_activa'),
  ('farmacias', 'salud.farmacia_activa'),
  ('hospital', 'salud.hospital_activo'),
  ('hospitales', 'salud.hospital_activo'),
  ('clinica', 'salud.hospital_activo'),
  ('clínica', 'salud.hospital_activo'),
  ('ambulatorio', 'salud.hospital_activo'),
  ('cdi', 'salud.hospital_activo'),
  ('centro medico', 'salud.hospital_activo'),
  ('centro médico', 'salud.hospital_activo'),

  -- ALIMENTOS: agua
  ('agua', 'alimentos.agua'),
  ('aguas', 'alimentos.agua'),
  ('liquido', 'alimentos.agua'),
  ('líquido', 'alimentos.agua'),
  ('potable', 'alimentos.agua'),
  ('botellon', 'alimentos.agua'),
  ('botellón', 'alimentos.agua'),
  ('bidon', 'alimentos.agua'),
  ('bidón', 'alimentos.agua'),

  -- ALIMENTOS: comida
  ('comida', 'alimentos.comida'),
  ('alimento', 'alimentos.comida'),
  ('alimentos', 'alimentos.comida'),
  ('viveres', 'alimentos.comida'),
  ('víveres', 'alimentos.comida'),
  ('cereal', 'alimentos.comida'),
  ('cereales', 'alimentos.comida'),
  ('harina', 'alimentos.comida'),
  ('arroz', 'alimentos.comida'),
  ('pasta', 'alimentos.comida'),
  ('espaguetti', 'alimentos.comida'),
  ('caraotas', 'alimentos.comida'),
  ('frijoles', 'alimentos.comida'),
  ('lentejas', 'alimentos.comida'),
  ('atun', 'alimentos.comida'),
  ('atún', 'alimentos.comida'),
  ('sardina', 'alimentos.comida'),
  ('aceite', 'alimentos.comida'),
  ('azucar', 'alimentos.comida'),
  ('azúcar', 'alimentos.comida'),
  ('sal', 'alimentos.comida'),
  ('cafe', 'alimentos.comida'),
  ('café', 'alimentos.comida'),
  ('leche', 'alimentos.leche'),
  ('leche en polvo', 'alimentos.leche'),
  ('formula', 'alimentos.leche'),
  ('fórmula', 'alimentos.leche'),
  ('formula infantil', 'alimentos.leche'),
  ('papel lacteo', 'alimentos.leche'),

  -- ALIMENTOS: punto de acopio (cruzado)
  ('punto de acopio', 'alimentos.punto_acopio'),
  ('acopio', 'alimentos.punto_acopio'),
  ('cocina comunitaria', 'alimentos.punto_acopio'),
  ('comedor', 'alimentos.punto_acopio'),

  -- VIVIENDA: materiales
  ('materiales', 'vivienda.materiales'),
  ('material', 'vivienda.materiales'),
  ('construccion', 'vivienda.materiales'),
  ('construcción', 'vivienda.materiales'),
  ('cemento', 'vivienda.materiales'),
  ('arena', 'vivienda.materiales'),
  ('bloques', 'vivienda.materiales'),
  ('ladrillos', 'vivienda.materiales'),
  ('cabillas', 'vivienda.materiales'),
  ('techo', 'vivienda.materiales'),
  ('techos', 'vivienda.materiales'),
  ('lamina', 'vivienda.materiales'),
  ('lámina', 'vivienda.materiales'),
  ('clavos', 'vivienda.materiales'),
  ('herramientas', 'vivienda.materiales'),

  -- VIVIENDA: ropa
  ('ropa', 'vivienda.ropa'),
  ('vestimenta', 'vivienda.ropa'),
  ('franela', 'vivienda.ropa'),
  ('franelas', 'vivienda.ropa'),
  ('pantalon', 'vivienda.ropa'),
  ('pantalón', 'vivienda.ropa'),
  ('zapatos', 'vivienda.ropa'),
  ('calzado', 'vivienda.ropa'),
  ('chaqueta', 'vivienda.ropa'),
  ('abrigo', 'vivienda.ropa'),
  ('cobijas', 'vivienda.ropa'),
  ('mantas', 'vivienda.ropa'),

  -- VIVIENDA: toallas
  ('toalla', 'vivienda.toallas'),
  ('toallas', 'vivienda.toallas'),
  ('panos', 'vivienda.toallas'),
  ('paños', 'vivienda.toallas'),
  ('sabanas', 'vivienda.toallas'),
  ('sábanas', 'vivienda.toallas'),

  -- VIVIENDA: carpas
  ('carpa', 'vivienda.carpas'),
  ('carpas', 'vivienda.carpas'),
  ('tienda', 'vivienda.carpas'),
  ('tiendas de campaña', 'vivienda.carpas'),
  (' toldo', 'vivienda.carpas'),
  ('toldos', 'vivienda.carpas'),

  -- VIVIENDA: colchones
  ('colchon', 'vivienda.colchones'),
  ('colchón', 'vivienda.colchones'),
  ('colchones', 'vivienda.colchones'),
  ('matrimonial', 'vivienda.colchones'),
  ('cama', 'vivienda.colchones'),
  ('camas', 'vivienda.colchones'),
  ('hamaca', 'vivienda.colchones'),
  ('hamacas', 'vivienda.colchones'),

  -- MAQUINARIA
  ('grua', 'maquinaria.grua'),
  ('grúa', 'maquinaria.grua'),
  ('gruas', 'maquinaria.grua'),
  ('grúas', 'maquinaria.grua'),
  ('montacargas', 'maquinaria.montacargas'),
  ('retroexcavadora', 'maquinaria.retroexcavadora'),
  ('excavadora', 'maquinaria.retroexcavadora'),
  ('bulldozer', 'maquinaria.retroexcavadora'),
  ('planta electrica', 'maquinaria.planta_electrica'),
  ('planta eléctrica', 'maquinaria.planta_electrica'),
  ('generador', 'maquinaria.planta_electrica'),
  ('generadores', 'maquinaria.planta_electrica'),
  ('maquinaria', 'maquinaria.grua'),
  ('maquinarias', 'maquinaria.grua'),

  -- TRANSPORTE
  ('carro', 'transporte.vehiculo'),
  ('carros', 'transporte.vehiculo'),
  ('vehiculo', 'transporte.vehiculo'),
  ('vehículo', 'transporte.vehiculo'),
  ('vehiculos', 'transporte.vehiculo'),
  ('vehículos', 'transporte.vehiculo'),
  ('camion', 'transporte.camion'),
  ('camión', 'transporte.camion'),
  ('camiones', 'transporte.camion'),
  ('furgoneta', 'transporte.camion'),
  ('furgonetas', 'transporte.camion'),
  ('combustible', 'transporte.combustible'),
  ('gasolina', 'transporte.combustible'),
  ('diesel', 'transporte.combustible'),
  ('gas', 'transporte.combustible'),
  ('moto', 'transporte.moto'),
  ('motos', 'transporte.moto'),
  ('motocicleta', 'transporte.moto'),

  -- CUADRILLAS
  ('voluntario', 'cuadrillas.voluntario'),
  ('voluntarios', 'cuadrillas.voluntario'),
  ('voluntaria', 'cuadrillas.voluntario'),
  ('voluntarias', 'cuadrillas.voluntario'),
  ('mano de obra', 'cuadrillas.voluntario'),
  ('manodeobra', 'cuadrillas.voluntario'),
  ('ayudante', 'cuadrillas.voluntario'),
  ('ayudantes', 'cuadrillas.voluntario'),
  ('cuadrilla', 'cuadrillas.cuadrilla'),
  ('cuadrillas', 'cuadrillas.cuadrilla'),
  ('equipo de trabajo', 'cuadrillas.cuadrilla'),
  ('rapel', 'cuadrillas.rapel'),
  ('cuerdas', 'cuadrillas.rapel'),
  ('escalada', 'cuadrillas.rapel'),
  ('rescate altura', 'cuadrillas.rapel'),
  ('buceo', 'cuadrillas.buceo'),
  ('buzo', 'cuadrillas.buceo'),
  ('buzos', 'cuadrillas.buceo'),
  ('buceador', 'cuadrillas.buceo'),
  ('rescate acuatico', 'cuadrillas.buceo'),
  ('rescate acuático', 'cuadrillas.buceo'),

  -- ANIMALES
  ('perro', 'animales.refugio'),
  ('perros', 'animales.refugio'),
  ('gato', 'animales.refugio'),
  ('gatos', 'animales.refugio'),
  ('mascota', 'animales.refugio'),
  ('mascotas', 'animales.refugio'),
  ('alimento para perros', 'animales.alimento_mascotas'),
  ('alimento para gatos', 'animales.alimento_mascotas'),
  ('comida para perros', 'animales.alimento_mascotas'),
  ('comida para gatos', 'animales.alimento_mascotas'),
  ('concentrado', 'animales.alimento_mascotas'),
  ('veterinario', 'animales.veterinario'),
  ('veterinarios', 'animales.veterinario'),
  ('veterinaria', 'animales.veterinario'),
  ('vet', 'animales.veterinario'),
  ('refugio animal', 'animales.refugio'),
  ('refugio para perros', 'animales.refugio'),

  -- DINERO
  ('dinero', 'dinero.donacion_monetaria'),
  ('efectivo', 'dinero.donacion_monetaria'),
  ('fondos', 'dinero.donacion_monetaria'),
  ('donacion monetaria', 'dinero.donacion_monetaria'),
  ('donación monetaria', 'dinero.donacion_monetaria'),
  ('transferencia', 'dinero.donacion_monetaria'),
  ('pago movil', 'dinero.donacion_monetaria'),
  ('pago móvil', 'dinero.donacion_monetaria'),
  ('zelle', 'dinero.donacion_monetaria'),
  ('usdt', 'dinero.donacion_monetaria'),
  ('cripto', 'dinero.donacion_monetaria'),
  ('fundacion', 'dinero.fundacion'),
  ('fundación', 'dinero.fundacion'),
  ('fundaciones', 'dinero.fundacion'),
  ('ong', 'dinero.fundacion'),
  ('ong', 'dinero.fundacion'),
  ('organizacion sin fines de lucro', 'dinero.fundacion'),
  ('organización sin fines de lucro', 'dinero.fundacion');
