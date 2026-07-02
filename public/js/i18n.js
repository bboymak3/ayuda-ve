// ============================================================
// public/js/i18n.js — Sistema bilingüe ES/EN
// ============================================================

const translations = {
  es: {
    // Nav
    'nav.inicio': 'Inicio',
    'nav.mapa': 'Mapa',
    'nav.noticias': 'Noticias',
    'nav.buscar': 'Buscar',
    'nav.reportar': 'Reportar',
    'nav.abuso': '🚩 Abuso',
    'nav.admin': 'Admin',
    // Homepage
    'home.h1': 'Ayuda en Venezuela',
    'home.h2': 'Ayuda para venezolanos tras el terremoto',
    'home.hero.p': 'Conectamos a quienes necesitan ayuda con quienes quieren ayudar. Donaciones, medicinas, alimentos, transporte, maquinaria y más — directamente, sin intermediarios.',
    'home.hero.emergency': '🚨 Emergencia: llama al <strong>911</strong> o a Protección Civil',
    'home.btn.ayudar': 'QUIERO AYUDAR',
    'home.btn.ayudar.sub': 'Tengo algo para donar',
    'home.btn.necesito': 'NECESITO AYUDA',
    'home.btn.necesito.sub': 'Publico mi necesidad',
    'home.btn.noticias': 'ÚLTIMAS NOTICIAS',
    'home.btn.noticias.sub': 'Todas las publicaciones recientes',
    'home.btn.publicar_mapa': 'PUBLICAR EN MAPA',
    'home.btn.publicar_mapa.sub': 'Clic en el mapa, completa el formulario y tu evento aparece al instante',
    'home.btn.buscar': 'BUSCAR DONACIONES',
    'home.btn.buscar.sub': '· por categoría, ubicación o palabra',
    'home.banner': '📢 ¡Cualquier persona puede publicar en esta plataforma!',
    'home.banner.sub': 'No necesitas registro. Solo completa el formulario y tu publicación aparece en el mapa y en la lista.',
    'home.categorias': 'Categorías de donación',
    'home.categorias.sub': 'Explora las necesidades y ofertas por sector. Toca una categoría para ver qué hay disponible.',
    'home.como_funciona': '¿Cómo funciona?',
    'home.como.ayudar.t': '💙 Si quieres ayudar',
    'home.como.ayudar.d': '1. Entra a "Quiero Ayudar" y escoge la categoría que quieres donar. 2. Publica tu oferta con tu nombre y teléfono. 3. Personas que necesitan esa ayuda te contactan directamente. 4. El sistema automáticamente encuentra solicitudes que coinciden con tu oferta.',
    'home.como.necesito.t': '🆘 Si necesitas ayuda',
    'home.como.necesito.d': '1. Entra a "Necesito Ayuda" y completa el formulario. 2. Publica tu solicitud con tu contacto. 3. Apareces en el mapa y donantes te ven. 4. Recibes contacto directo de quienes pueden ayudarte.',
    'home.como.mapa.t': '🗺️ Mapa interactivo',
    'home.como.mapa.d': 'Clic en cualquier punto del mapa para poner un evento con tu necesidad u oferta. Los eventos cambian de color según urgencia.',
    'home.como.buscar.t': '🔍 Búsqueda inteligente',
    'home.como.buscar.d': 'Busca por palabra clave. El sistema conecta automáticamente donaciones con necesidades similares.',
    'home.personas': '👥 ¿Buscas a una persona?',
    'home.personas.d': 'Para reportar o buscar personas, te recomendamos usar Venezuela Te Busca.',
    'home.personas.btn': 'Ir a Venezuela Te Busca →',
    'home.abuso.t': '🚩 ¿Detectaste abuso o estafa?',
    'home.abuso.d': 'Si ves información falsa, alguien pidiendo donaciones falsas, suplantación de identidad o contenido inapropiado en la plataforma, repórtalo.',
    'home.abuso.btn': '🚩 Reportar abuso',
    // Mapa
    'mapa.title': 'Mapa Interactivo',
    'mapa.ayuda': '📌 Ayuda',
    'mapa.ayuda.body': '<strong>Clic en el mapa</strong> para poner un evento.<br>Completa: nombre, teléfono y requerimiento.<br><small>Tu evento es visible al instante.</small>',
    'mapa.actualizar': '🔄 Actualizar',
    'mapa.leyenda': 'Leyenda',
    // Noticias
    'noticias.title': '📰 Últimas Noticias',
    'noticias.sub': 'Todas las publicaciones recientes: necesidades, disponibles e información útil. Actualizado en tiempo real.',
    'noticias.todas': '📋 Todas',
    'noticias.necesitan': '🆘 Necesitan',
    'noticias.disponibles': '💚 Disponibles',
    'noticias.info': 'ℹ️ Info',
    'noticias.cargar_mas': 'Cargar más →',
    // Buscar
    'buscar.title': '🔍 Buscar Donaciones',
    'buscar.sub': 'Busca por palabra clave. Ejemplos: "antibióticos", "agua", "médico", "grúa", "voluntarios".',
    'buscar.placeholder': 'Escribe tu búsqueda...',
    'buscar.btn': '🔍 Buscar',
    // Reportar
    'reportar.title': '🆘 Publicar Necesidad de Ayuda',
    'reportar.sub': 'Completa el formulario. Tu solicitud aparecerá en el mapa y en la lista de necesidades.',
  },
  en: {
    // Nav
    'nav.inicio': 'Home',
    'nav.mapa': 'Map',
    'nav.noticias': 'News',
    'nav.buscar': 'Search',
    'nav.reportar': 'Report',
    'nav.abuso': '🚩 Abuse',
    'nav.admin': 'Admin',
    // Homepage
    'home.h1': 'Help in Venezuela',
    'home.h2': 'Help for Venezuelans after the earthquake',
    'home.hero.p': 'We connect those who need help with those who want to help. Donations, medicines, food, transport, machinery and more — directly, without intermediaries.',
    'home.hero.emergency': '🚨 Emergency: call <strong>911</strong> or Civil Protection',
    'home.btn.ayudar': 'I WANT TO HELP',
    'home.btn.ayudar.sub': 'I have something to donate',
    'home.btn.necesito': 'I NEED HELP',
    'home.btn.necesito.sub': 'I post my need',
    'home.btn.noticias': 'LATEST NEWS',
    'home.btn.noticias.sub': 'All recent posts',
    'home.btn.publicar_mapa': 'POST ON MAP',
    'home.btn.publicar_mapa.sub': 'Click on the map, fill the form and your event appears instantly',
    'home.btn.buscar': 'SEARCH DONATIONS',
    'home.btn.buscar.sub': '· by category, location or keyword',
    'home.banner': '📢 Anyone can post on this platform!',
    'home.banner.sub': 'No registration needed. Just fill the form and your post appears on the map and list.',
    'home.categorias': 'Donation categories',
    'home.categorias.sub': 'Explore needs and offers by sector. Tap a category to see what\'s available.',
    'home.como_funciona': 'How it works',
    'home.como.ayudar.t': '💙 If you want to help',
    'home.como.ayudar.d': '1. Go to "I Want to Help" and choose the category you want to donate. 2. Post your offer with your name and phone. 3. People who need that help contact you directly. 4. The system automatically finds matching requests.',
    'home.como.necesito.t': '🆘 If you need help',
    'home.como.necesito.d': '1. Go to "I Need Help" and fill the form. 2. Post your request with your contact. 3. You appear on the map and donors see you. 4. You receive direct contact from those who can help.',
    'home.como.mapa.t': '🗺️ Interactive map',
    'home.como.mapa.d': 'Click any point on the map to place an event with your need or offer. Events change color by urgency.',
    'home.como.buscar.t': '🔍 Smart search',
    'home.como.buscar.d': 'Search by keyword. The system automatically connects donations with similar needs.',
    'home.personas': '👥 Looking for a person?',
    'home.personas.d': 'To report or search for people, we recommend using Venezuela Te Busca.',
    'home.personas.btn': 'Go to Venezuela Te Busca →',
    'home.abuso.t': '🚩 Detected abuse or scam?',
    'home.abuso.d': 'If you see false info, fake donation requests, identity theft or inappropriate content, report it.',
    'home.abuso.btn': '🚩 Report abuse',
    // Mapa
    'mapa.title': 'Interactive Map',
    'mapa.ayuda': '📌 Help',
    'mapa.ayuda.body': '<strong>Click on the map</strong> to place an event.<br>Fill: name, phone and requirement.<br><small>Your event is visible instantly.</small>',
    'mapa.actualizar': '🔄 Refresh',
    'mapa.leyenda': 'Legend',
    // Noticias
    'noticias.title': '📰 Latest News',
    'noticias.sub': 'All recent posts: needs, available items and useful info. Updated in real time.',
    'noticias.todas': '📋 All',
    'noticias.necesitan': '🆘 Need',
    'noticias.disponibles': '💚 Available',
    'noticias.info': 'ℹ️ Info',
    'noticias.cargar_mas': 'Load more →',
    // Buscar
    'buscar.title': '🔍 Search Donations',
    'buscar.sub': 'Search by keyword. Examples: "antibiotics", "water", "doctor", "crane", "volunteers".',
    'buscar.placeholder': 'Type your search...',
    'buscar.btn': '🔍 Search',
    // Reportar
    'reportar.title': '🆘 Post Help Request',
    'reportar.sub': 'Fill the form. Your request will appear on the map and needs list.',
  },
};

// Idioma actual
let currentLang = localStorage.getItem('ayudave_lang') || 'es';

// Obtener traducción
function t(key) {
  return (translations[currentLang] && translations[currentLang][key]) || translations.es[key] || key;
}

// Cambiar idioma
function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('ayudave_lang', lang);
  applyTranslations();
  // Actualizar botón
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
}

// Aplicar traducciones a todos los elementos con data-i18n
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = t(key);
    // Si el texto contiene HTML (como <strong>), usar innerHTML
    if (text.includes('<')) {
      el.innerHTML = text;
    } else {
      el.textContent = text;
    }
  });
  // Placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  // Actualizar <html lang>
  document.documentElement.lang = currentLang;
}

// Auto-aplicar al cargar
document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
  // Marcar botón activo
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === currentLang);
  });
});

window.t = t;
window.setLang = setLang;
window.currentLang = () => currentLang;
