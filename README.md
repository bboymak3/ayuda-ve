# 🤝 Ayuda VE — Plataforma de Donaciones

Plataforma ciudadana para conectar donaciones con necesidades reales en Venezuela. Mapa interactivo, match inteligente, transcripción de videos con IA, y panel de administración completo.

## 🚀 Demo en vivo

- **Sitio:** https://ayuda-ve.pages.dev
- **Mapa:** https://ayuda-ve.pages.dev/mapa.html
- **Panel admin:** https://ayuda-ve.pages.dev/admin/

## 🛠️ Stack Tecnológico

- **Hosting:** Cloudflare Pages
- **Backend:** Cloudflare Pages Functions (JavaScript)
- **Base de datos:** Cloudflare D1 (SQLite)
- **Almacenamiento:** Cloudflare R2 (fotos y audios)
- **IA:** Cloudflare Workers AI (Whisper para transcripción, Llama 3.1 para resúmenes)
- **Frontend:** HTML + CSS + JavaScript vanilla (sin frameworks)
- **Mapa:** Leaflet + OpenStreetMap (gratis, sin API key)
- **Control de versiones:** GitHub

## ✨ Funcionalidades

### Públicas
- 🏠 Homepage con 4 botones principales: Quiero Ayudar / Necesito Ayuda / Ver Mapa / Buscar
- 🗺️ Mapa interactivo con chulitos de colores (rojo/amarillo/azul/verde)
- 📝 Formulario de reporte detallado
- 📍 Chulitos en mapa (cualquiera puede poner, sin restricción)
- 🔍 Búsqueda inteligente por palabra clave
- 📊 Sala situacional con estadísticas en tiempo real
- 🔗 Ficha pública por chulito/reporte (URL accesible mundialmente)

### Panel Admin
- 🔐 Login con token
- 📊 Dashboard con métricas
- ⏳ Moderación de reportes pendientes
- 📍 Gestión de chulitos (eliminar/resolver)
- ⚡ Carga rápida desde Facebook/WhatsApp
- 🎥 Procesamiento de videos con IA (Whisper + Llama)
- 📦 CRUD de categorías
- ⚙️ Configuración global (comentarios on/off, etc.)

### Sistema de Match Inteligente
- Diccionario de 229 sinónimos
- 33 reglas de match (directo y cruzado)
- Detecta automáticamente: médico → hospital, antibióticos → farmacia, etc.

### SEO para IA (Gemini, Google)
- sitemap.xml dinámico
- robots.txt
- Schema.org JSON-LD en cada ficha
- URLs limpias: /chulito/123, /reporte/456
- Open Graph para WhatsApp

## 📂 Estructura del proyecto

```
ayuda-ve/
├── public/                  # Archivos estáticos servidos directamente
│   ├── index.html           # Homepage
│   ├── mapa.html            # Mapa interactivo
│   ├── buscar.html          # Buscador
│   ├── reportar.html        # Formulario de reporte
│   ├── quiero-ayudar.html   # Categorías para donantes
│   ├── sector.html          # Listado por categoría
│   ├── sala-situacional.html
│   ├── admin/
│   │   └── index.html       # Panel admin
│   ├── css/styles.css
│   ├── js/
│   │   ├── main.js          # Utils compartidos
│   │   ├── mapa.js          # Lógica del mapa
│   │   └── admin.js         # Lógica del panel admin
│   └── robots.txt
│
├── functions/               # Pages Functions (API + rutas dinámicas)
│   ├── api/
│   │   ├── _middleware.js   # CORS + manejo errores
│   │   ├── sectores/
│   │   ├── reportes/
│   │   ├── chulitos/
│   │   ├── buscar/
│   │   ├── upload/          # Subida a R2
│   │   ├── media/           # Servir archivos de R2
│   │   ├── transcribe/      # Whisper IA
│   │   ├── settings/
│   │   ├── sala-situacional/
│   │   ├── sitemap/
│   │   └── admin/           # Endpoints protegidos
│   ├── chulito/[id].js      # Ficha pública chulito
│   └── reporte/[id].js      # Ficha pública reporte
│
├── lib/                     # Librerías compartidas
│   ├── utils.js             # Helpers (json, error, sanitize)
│   ├── auth.js              # Autenticación por token
│   ├── db.js                # Helpers D1
│   ├── match.js             # Match inteligente
│   └── ai.js                # Whisper + LLM
│
├── schema.sql               # Esquema inicial D1
├── schema_ext.sql           # Tablas extendidas
├── seed.sql                 # Sectores por defecto
├── seed_match.sql           # Sinónimos + reglas de match
├── wrangler.toml            # Configuración Cloudflare
└── package.json
```

## 🔧 Desarrollo local

```bash
# Instalar wrangler
npm install

# Desarrollo local con D1 + R2 + AI simulados
npm run dev

# Abrir http://localhost:8788
```

## 🚀 Deploy

El deploy es automático: cada push a `main` en GitHub despliega a Cloudflare Pages.

Para deploy manual:
```bash
npm run deploy
```

## ⚙️ Configuración inicial

Ver `SETUP.md` para instrucciones detalladas.

## 🔐 Seguridad

- Token de admin como secret en Cloudflare (no en el código)
- Cédulas y datos sensibles no se guardan (no hay sistema de personas)
- Sanitización de HTML en todos los inputs
- CORS configurado correctamente
- Rate limiting implícito por Cloudflare

## 📞 Contacto

Plataforma ciudadana, sin fines de lucro.
