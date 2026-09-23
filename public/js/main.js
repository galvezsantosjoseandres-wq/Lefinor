(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    initCookieBanner();
    initHeroCarousel();
    initGallery();
    initGaleriaLightbox();
    initWhatsappMensajes();
    initContactForms();
    initPropiedades();
    initPublicaciones();
    initAcademy();
    initWhatsappFloat();
    initGoogleForms();
    initWorkerForms();
    initInscripcionModal();
    initSedesModal();
  });

  function initMobileMenu() {
    var toggle = document.getElementById('menu-toggle');
    var menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;
    var iconOpen = document.getElementById('menu-icon-open');
    var iconClose = document.getElementById('menu-icon-close');
    toggle.addEventListener('click', function () {
      var isOpen = !menu.classList.contains('hidden');
      menu.classList.toggle('hidden');
      toggle.setAttribute('aria-expanded', String(!isOpen));
      if (iconOpen) iconOpen.classList.toggle('hidden');
      if (iconClose) iconClose.classList.toggle('hidden');
    });
  }

  // El botón flotante de WhatsApp permanece oculto hasta que el usuario baja un poco la
  // página: en pantallas angostas, el encabezado/hero de algunas páginas ya ocupa casi
  // todo el viewport inicial, y el botón (fijo en la esquina) puede tapar texto en la
  // primera pantalla si aparece desde la carga. Mostrarlo recién tras el scroll evita el
  // solapamiento en cualquier página, sin depender de cuánto contenido tenga cada una.
  function initWhatsappFloat() {
    var boton = document.getElementById('whatsapp-float');
    if (!boton) return;
    var UMBRAL_SCROLL = 200;

    function actualizarVisibilidad() {
      var visible = window.scrollY > UMBRAL_SCROLL;
      boton.classList.toggle('opacity-0', !visible);
      boton.classList.toggle('opacity-100', visible);
      boton.classList.toggle('pointer-events-none', !visible);
    }

    window.addEventListener('scroll', actualizarVisibilidad, { passive: true });
    actualizarVisibilidad();
  }

  var COOKIE_CONSENT_KEY = 'lefinor_cookie_consent';
  var COOKIE_CONSENT_FECHA_KEY = 'lefinor_cookie_consent_fecha';

  // Antes estos dos bloques se inyectaban sin condición en templates/partials/head.html,
  // así que corrían en cada carga de página antes de que la persona pudiera decidir nada.
  // Ahora viven como funciones y solo se ejecutan desde initCookieBanner: al pulsar
  // "Aceptar" (consentimiento nuevo), o al cargar la página si ya había una preferencia
  // "accepted" guardada de una visita anterior.
  function cargarGA4() {
    if (window.__lefinorGA4Cargado) return;
    window.__lefinorGA4Cargado = true;
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-0KJQ2HK3J2';
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', 'G-0KJQ2HK3J2');
  }

  function cargarClarity() {
    if (window.__lefinorClarityCargado) return;
    window.__lefinorClarityCargado = true;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', 'ym28n6vqgr');
  }

  function activarAnalitica() {
    cargarGA4();
    cargarClarity();
  }

  function initCookieBanner() {
    var banner = document.getElementById('cookie-banner');
    if (!banner) return;
    var vistaInicial = document.getElementById('cookie-vista-inicial');
    var vistaDetalle = document.getElementById('cookie-vista-detalle');
    var btnAceptar = document.getElementById('cookie-aceptar');
    var btnConfigurar = document.getElementById('cookie-configurar');
    var btnCerrarDetalle = document.getElementById('cookie-cerrar-detalle');
    var btnAceptarDetalle = document.getElementById('cookie-aceptar-detalle');
    var btnRechazarDetalle = document.getElementById('cookie-rechazar-detalle');
    var toggle = document.getElementById('cookie-toggle-analitica');
    var togglePunto = toggle && toggle.querySelector('.toggle-dot');
    var linksPreferencias = document.querySelectorAll('[data-cookie-preferencias]');

    function guardarPreferencia(valor) {
      try {
        localStorage.setItem(COOKIE_CONSENT_KEY, valor);
        localStorage.setItem(COOKIE_CONSENT_FECHA_KEY, new Date().toISOString());
      } catch (e) {
        /* almacenamiento no disponible: se ignora */
      }
    }

    function leerPreferencia() {
      try {
        return localStorage.getItem(COOKIE_CONSENT_KEY);
      } catch (e) {
        return null;
      }
    }

    function actualizarToggle(activo) {
      if (!toggle) return;
      toggle.setAttribute('aria-checked', String(activo));
      toggle.classList.toggle('bg-lefinor-dorado', activo);
      toggle.classList.toggle('bg-white/20', !activo);
      if (togglePunto) {
        togglePunto.classList.toggle('translate-x-6', activo);
        togglePunto.classList.toggle('translate-x-1', !activo);
      }
    }

    function mostrarVista(detalle) {
      banner.classList.remove('hidden');
      banner.classList.add('flex');
      if (detalle) {
        vistaInicial.classList.add('hidden');
        vistaDetalle.classList.remove('hidden');
        actualizarToggle(leerPreferencia() !== 'rejected');
      } else {
        vistaInicial.classList.remove('hidden');
        vistaDetalle.classList.add('hidden');
      }
    }

    function ocultarBanner() {
      banner.classList.add('hidden');
      banner.classList.remove('flex');
    }

    function aceptar() {
      guardarPreferencia('accepted');
      activarAnalitica();
      ocultarBanner();
    }

    // Nota: si la persona ya había aceptado antes (scripts ya inyectados en esta misma
    // carga de página) y ahora rechaza desde "Preferencias de cookies", esta preferencia
    // queda guardada para la próxima carga -- pero los scripts ya inyectados en la página
    // actual no se pueden "desinyectar" sin recargar. Es una limitación conocida de este
    // enfoque, no un error: la próxima carga de página ya respeta el rechazo.
    function rechazar() {
      guardarPreferencia('rejected');
      ocultarBanner();
    }

    if (btnAceptar) btnAceptar.addEventListener('click', aceptar);
    if (btnAceptarDetalle) btnAceptarDetalle.addEventListener('click', aceptar);
    if (btnRechazarDetalle) btnRechazarDetalle.addEventListener('click', rechazar);
    if (btnConfigurar) btnConfigurar.addEventListener('click', function () { mostrarVista(true); });
    if (btnCerrarDetalle) btnCerrarDetalle.addEventListener('click', function () { mostrarVista(false); });
    if (toggle) {
      toggle.addEventListener('click', function () {
        actualizarToggle(toggle.getAttribute('aria-checked') !== 'true');
      });
    }
    linksPreferencias.forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        mostrarVista(true);
      });
    });

    var preferencia = leerPreferencia();
    if (preferencia === 'accepted') {
      activarAnalitica();
    } else if (preferencia !== 'rejected') {
      mostrarVista(false);
    }
  }

  function initHeroCarousel() {
    var root = document.getElementById('hero-carousel');
    if (!root) return;
    var track = document.getElementById('hero-track');
    var slides = root.querySelectorAll('.hero-slide');
    var dotsWrap = document.getElementById('hero-dots');
    var prevBtn = document.getElementById('hero-prev');
    var nextBtn = document.getElementById('hero-next');
    if (!track || slides.length === 0) return;

    var current = 0;
    var dots = [];

    slides.forEach(function (_, index) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Ir a la diapositiva ' + (index + 1));
      dot.className = 'w-2.5 h-2.5 rounded-full bg-white/50 hover:bg-white transition-colors';
      dot.addEventListener('click', function () {
        goTo(index);
        resetAutoplay();
      });
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });

    function updateDots() {
      dots.forEach(function (dot, index) {
        dot.className =
          'w-2.5 h-2.5 rounded-full transition-colors ' + (index === current ? 'bg-lefinor-dorado' : 'bg-white/50 hover:bg-white');
      });
    }

    function goTo(index) {
      current = (index + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + current * 100 + '%)';
      updateDots();
    }

    var autoplayId;
    function resetAutoplay() {
      clearInterval(autoplayId);
      autoplayId = setInterval(function () {
        goTo(current + 1);
      }, 6000);
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        goTo(current - 1);
        resetAutoplay();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        goTo(current + 1);
        resetAutoplay();
      });
    }

    goTo(0);
    resetAutoplay();
  }

  function initGallery() {
    var galleries = document.querySelectorAll('[data-gallery]');
    galleries.forEach(function (gallery) {
      var track = gallery.querySelector('[data-gallery-track]');
      var slides = track ? track.children : [];
      var dotsWrap = gallery.querySelector('[data-gallery-dots]');
      var prevBtn = gallery.querySelector('[data-gallery-prev]');
      var nextBtn = gallery.querySelector('[data-gallery-next]');
      if (!track || slides.length === 0) return;

      var current = 0;
      var dots = [];

      if (slides.length > 1 && dotsWrap) {
        Array.prototype.forEach.call(slides, function (_, index) {
          var dot = document.createElement('button');
          dot.type = 'button';
          dot.setAttribute('aria-label', 'Ver foto ' + (index + 1));
          dot.className = 'w-2 h-2 rounded-full bg-white/70';
          dot.addEventListener('click', function () {
            goTo(index);
          });
          dotsWrap.appendChild(dot);
          dots.push(dot);
        });
      } else {
        if (prevBtn) prevBtn.classList.add('hidden');
        if (nextBtn) nextBtn.classList.add('hidden');
      }

      function updateDots() {
        dots.forEach(function (dot, index) {
          dot.className = 'w-2 h-2 rounded-full ' + (index === current ? 'bg-lefinor-dorado' : 'bg-white/70');
        });
      }

      function goTo(index) {
        current = (index + slides.length) % slides.length;
        track.style.transform = 'translateX(-' + current * 100 + '%)';
        updateDots();
      }

      if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); });
      if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); });

      goTo(0);
    });
  }

  // Lightbox de la galería de propiedad: reutiliza el mismo patrón de índice con
  // wraparound (prev/next module) que initHeroCarousel/initGallery, pero renderiza un
  // slide a la vez a partir del JSON completo en vez de precargar todos los nodos —
  // la galería puede traer una cantidad variable de fotos/video, potencialmente grande.
  function initGaleriaLightbox() {
    var modal = document.getElementById('propiedad-lightbox');
    if (!modal) return;
    var dataEl = document.querySelector('[data-lightbox-json]');
    var items = [];
    try {
      items = JSON.parse((dataEl && dataEl.textContent) || '[]');
    } catch (e) {
      items = [];
    }
    if (!items.length) return;

    var stage = modal.querySelector('[data-lightbox-stage]');
    var counter = modal.querySelector('[data-lightbox-counter]');
    var thumbsTrack = modal.querySelector('[data-lightbox-thumbs]');
    var galeriaGrid = document.getElementById('propiedad-galeria');
    var current = 0;
    var thumbButtons = [];

    // Cada elemento viene de la galería detectada por carpeta en el build (generator/build.js):
    // siempre trae un src real, así que ya no existe el caso "video/foto sin archivo todavía".
    function renderSlide(index) {
      var item = items[index];
      stage.innerHTML = '';
      if (!item) return;
      if (item.tipo === 'video') {
        var video = document.createElement('video');
        video.src = item.src;
        video.controls = true;
        // Sin autoplay: debe requerir que la persona le dé play manualmente, en cualquier
        // dispositivo (reportado específicamente en móvil, donde el video arrancaba solo).
        // h-full/w-full (no w-auto/h-auto): max-h-full/max-w-full por sí solos NUNCA agrandan
        // un elemento más chico que el escenario disponible -- solo achican uno más grande.
        // Con una foto real de resolución modesta (ej. 719x536), eso la deja renderizando a su
        // tamaño intrínseco, mucho más chica que el espacio real disponible. Con h-full/w-full
        // el elemento ocupa el 100% de la caja que ya calcula el layout flex del lightbox
        // (flex-1 min-h-0, dejando espacio para la tira de miniaturas debajo), y object-contain
        // ajusta el contenido dentro de esa caja sin deformarlo -- crece o se achica según haga
        // falta. max-h-[85vh]/max-w-[90vw] quedan como techo absoluto, el mismo límite ya
        // validado con el video, por si el espacio que deja el layout flex fuera mayor a eso.
        video.className = 'h-full max-h-[85vh] w-full max-w-[90vw] object-contain rounded';
        stage.appendChild(video);
      } else {
        var img = document.createElement('img');
        img.src = item.src;
        img.alt = '';
        img.className = 'h-full max-h-[85vh] w-full max-w-[90vw] object-contain rounded';
        stage.appendChild(img);
      }
      if (counter) counter.textContent = index + 1 + ' / ' + items.length;
      thumbButtons.forEach(function (btn, i) {
        if (i === index) {
          btn.classList.remove('opacity-60');
          btn.classList.add('opacity-100', 'ring-2', 'ring-lefinor-dorado');
        } else {
          btn.classList.add('opacity-60');
          btn.classList.remove('opacity-100', 'ring-2', 'ring-lefinor-dorado');
        }
      });
    }

    // Tira de miniaturas debajo del elemento principal: se construye una sola vez (los
    // elementos de la galería no cambian mientras la página está abierta) y clic en
    // cualquiera salta directo a ese índice, sin pasar una por una con las flechas.
    function buildThumbs() {
      if (!thumbsTrack || thumbsTrack.childElementCount) return;
      items.forEach(function (item, index) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Ver elemento ' + (index + 1) + ' de ' + items.length);
        btn.className =
          'relative shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden opacity-60 hover:opacity-100 transition-opacity';
        if (item.tipo === 'video') {
          var video = document.createElement('video');
          video.src = item.src;
          video.muted = true;
          video.setAttribute('playsinline', '');
          video.preload = 'metadata';
          video.className = 'w-full h-full object-cover';
          btn.appendChild(video);
          var overlay = document.createElement('span');
          overlay.className = 'absolute inset-0 flex items-center justify-center';
          overlay.innerHTML =
            '<span class="w-6 h-6 rounded-full bg-lefinor-azul/70 flex items-center justify-center">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-3 h-3 text-white" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
            '</span>';
          btn.appendChild(overlay);
        } else {
          var img = document.createElement('img');
          img.src = item.src;
          img.alt = '';
          img.className = 'w-full h-full object-cover';
          btn.appendChild(img);
        }
        btn.addEventListener('click', function () {
          goTo(index);
        });
        thumbsTrack.appendChild(btn);
        thumbButtons.push(btn);
      });
    }

    function goTo(index) {
      current = (index + items.length) % items.length;
      renderSlide(current);
    }

    function open(index) {
      buildThumbs();
      goTo(index);
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      document.body.classList.add('overflow-hidden');
      if (galeriaGrid) galeriaGrid.classList.add('hidden');
    }

    function close() {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
      stage.innerHTML = '';
      if (galeriaGrid) galeriaGrid.classList.remove('hidden');
    }

    document.querySelectorAll('[data-lightbox-open]').forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        open(parseInt(trigger.getAttribute('data-lightbox-index'), 10) || 0);
      });
    });

    var closeBtn = modal.querySelector('[data-lightbox-close]');
    var prevBtn = modal.querySelector('[data-lightbox-prev]');
    var nextBtn = modal.querySelector('[data-lightbox-next]');
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); });
    modal.addEventListener('click', function (event) {
      if (event.target === modal) close();
    });
    document.addEventListener('keydown', function (event) {
      if (modal.classList.contains('hidden')) return;
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') goTo(current - 1);
      if (event.key === 'ArrowRight') goTo(current + 1);
    });
  }

  function initWhatsappMensajes() {
    var links = document.querySelectorAll('[data-whatsapp-mensaje]');
    links.forEach(function (link) {
      var mensaje = link.dataset.whatsappMensaje || '';
      var numero = (window.LEFINOR && window.LEFINOR.whatsappNumber) || '';
      link.href = 'https://wa.me/' + numero + '?text=' + encodeURIComponent(mensaje);
    });
  }

  function initContactForms() {
    var forms = document.querySelectorAll('[data-contact-form]');
    forms.forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var status = form.querySelector('[data-form-status]');
        var subject = form.dataset.subject || 'Contacto desde el sitio web';
        var formData = new FormData(form);
        var lines = [];
        formData.forEach(function (value, key) {
          lines.push(key + ': ' + value);
        });
        var email = (window.LEFINOR && window.LEFINOR.contactEmail) || '';
        var mailto =
          'mailto:' + email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
        window.location.href = mailto;
        if (status) {
          status.textContent = 'Se abrirá tu aplicación de correo para enviar el mensaje.';
        }
      });
    });
  }

  // URL del Web App de Google Apps Script que recibe los formularios de Lefinor Academy
  // (formulario general + inscripción por curso) y los agrega a una hoja de Google Sheets.
  var GOOGLE_FORM_URL =
    'https://script.google.com/macros/s/AKfycbw4UIBRM1WXirfJ7aHAkLv8mD4Ol5K2FxXmcvlDzQmd8nBiMpcxIQoPpUtNjmHLZF98/exec';

  // Apps Script no permite leer la respuesta por CORS desde un dominio distinto, así que
  // se envía en modo "no-cors" (con Content-Type: text/plain para evitar el preflight
  // OPTIONS que Apps Script no maneja) y se asume éxito si el fetch no lanzó una excepción.
  function enviarFormularioGoogle(datos) {
    return fetch(GOOGLE_FORM_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(datos),
    });
  }

  function initGoogleForms() {
    var forms = document.querySelectorAll('[data-google-form]');
    forms.forEach(function (form) {
      var camposEl = form.querySelector('[data-form-campos]');
      var exitoEl = form.querySelector('[data-form-exito]');
      var autoOcultarId;

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var status = form.querySelector('[data-form-status]');
        var submitBtn = form.querySelector('button[type="submit"]');
        var formData = new FormData(form);
        var datos = {
          curso: form.dataset.curso || 'Formulario general',
          nombre: (formData.get('nombre') || '').toString().trim(),
          telefono: (formData.get('telefono') || '').toString().trim(),
          correo: (formData.get('correo') || '').toString().trim(),
          ciudad: (formData.get('ciudad') || '').toString().trim(),
          area: (formData.get('area') || '').toString().trim(),
          mensaje: (formData.get('mensaje') || '').toString().trim(),
          // Honeypot anti-spam, mismo patrón que los formularios del Worker. Se envía para
          // que el Apps Script pueda descartar el registro cuando venga con contenido: este
          // archivo solo lo transporta, quien decide es el lado servidor en Google.
          pagina_web: (formData.get('pagina_web') || '').toString(),
        };

        if (submitBtn) submitBtn.disabled = true;
        if (status) {
          status.textContent = 'Enviando...';
          status.className = 'text-xs text-center text-lefinor-gris';
        }

        enviarFormularioGoogle(datos)
          .then(function () {
            form.reset();
            clearTimeout(autoOcultarId);
            // Mismo patrón visual que initWorkerForms (banner verde con ícono, no texto plano):
            // oculta los campos y muestra [data-form-exito] unos segundos antes de restaurarlos.
            if (exitoEl) {
              if (status) {
                status.textContent = '';
                status.className = 'text-xs text-center';
              }
              if (camposEl) camposEl.classList.add('hidden');
              exitoEl.classList.remove('hidden');
              // Ocultar los campos puede achicar mucho la altura de la página (ej. el
              // formulario general de Academy, la última sección de esa página): el
              // navegador puede recortar el scroll de golpe y dejar el banner tapado por
              // la barra de filtros sticky de arriba. Se vuelve a centrar explícitamente.
              if (typeof exitoEl.scrollIntoView === 'function') {
                exitoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
              autoOcultarId = setTimeout(function () {
                exitoEl.classList.add('hidden');
                if (camposEl) camposEl.classList.remove('hidden');
              }, 5000);
            } else if (status) {
              status.textContent = '¡Gracias! Hemos recibido tu solicitud, te contactaremos pronto.';
              status.className = 'text-xs text-center text-lefinor-dorado font-semibold';
            }
            // El mismo formulario[data-google-form] sirve tanto al general de Academy como al
            // de inscripción por curso (dentro de #inscripcion-modal) -- se distinguen por si
            // el form vive dentro del modal, no por el texto de data-curso.
            // Guarda de gtag: si GA4 está bloqueado (bloqueador de anuncios, protección
            // antirastreo) o simplemente no cargó, gtag es undefined y la llamada lanzaría
            // dentro del .then() -- lo atraparía el .catch() de abajo y le diríamos a la
            // persona que su solicitud falló cuando en realidad sí se envió.
            if (typeof gtag === 'function') {
              if (form.closest('#inscripcion-modal')) {
                gtag('event', 'generate_lead', { form_id: 'academy_curso', curso: form.dataset.curso });
              } else {
                gtag('event', 'generate_lead', { form_id: 'academy_general' });
              }
            }
            // Evento genérico que UI externa (ej. el modal de inscripción) puede escuchar
            // sin que este handler necesite saber nada sobre modales.
            form.dispatchEvent(new CustomEvent('lefinor:formulario-exito', { bubbles: true }));
          })
          .catch(function () {
            if (status) {
              status.textContent = 'No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos por WhatsApp.';
              status.className = 'text-xs text-center text-red-600 font-semibold';
            }
          })
          .finally(function () {
            if (submitBtn) submitBtn.disabled = false;
          });
      });
    });
  }

  // Formularios de Inicio y Contacto: conectados al Worker de Cloudflare en /api/contacto
  // (que reenvía el mensaje por correo con Resend) — completamente separado de Academy y
  // su Google Apps Script. Muestra un banner de éxito notorio, ocultando los campos del
  // formulario durante unos segundos antes de volver a mostrarlos ya vacíos.
  function initWorkerForms() {
    var forms = document.querySelectorAll('[data-worker-form]');
    forms.forEach(function (form) {
      var camposEl = form.querySelector('[data-form-campos]');
      var exitoEl = form.querySelector('[data-form-exito]');
      var autoOcultarId;

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var status = form.querySelector('[data-form-status]');
        var submitBtn = form.querySelector('button[type="submit"]');
        var formData = new FormData(form);
        var datos = {
          nombre: (formData.get('nombre') || '').toString().trim(),
          correo: (formData.get('correo') || '').toString().trim(),
          telefono: (formData.get('telefono') || '').toString().trim(),
          mensaje: (formData.get('mensaje') || '').toString().trim(),
          origen: form.dataset.origen || 'Formulario de contacto',
          // Honeypot anti-spam: un visitante real nunca completa este campo (está oculto).
          pagina_web: (formData.get('pagina_web') || '').toString(),
        };

        if (submitBtn) submitBtn.disabled = true;
        if (status) {
          status.textContent = 'Enviando...';
          status.className = 'text-xs text-center text-lefinor-gris';
        }

        fetch('/api/contacto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datos),
        })
          .then(function (response) {
            return response.json().then(function (cuerpo) {
              if (!response.ok || !cuerpo.ok) throw new Error(cuerpo.error || 'envio_fallido');
            });
          })
          .then(function () {
            form.reset();
            clearTimeout(autoOcultarId);
            if (status) {
              status.textContent = '';
              status.className = 'text-xs text-center';
            }
            if (exitoEl) {
              if (camposEl) camposEl.classList.add('hidden');
              exitoEl.classList.remove('hidden');
              autoOcultarId = setTimeout(function () {
                exitoEl.classList.add('hidden');
                if (camposEl) camposEl.classList.remove('hidden');
              }, 5000);
            }
            // El mismo formulario[data-worker-form] sirve tanto a Inicio como a Contacto --
            // se distinguen por data-origen, ya usado para el asunto del correo.
            // Misma guarda que en initGoogleForms: sin ella, un GA4 bloqueado convierte un
            // envío exitoso en un mensaje de error para la persona.
            if (typeof gtag === 'function') {
              if (form.dataset.origen === 'Formulario de Inicio') {
                gtag('event', 'generate_lead', { form_id: 'inicio' });
              } else {
                gtag('event', 'generate_lead', { form_id: 'contacto' });
              }
            }
          })
          .catch(function () {
            if (status) {
              status.textContent = 'No pudimos enviar tu mensaje. Escríbenos por WhatsApp mientras lo solucionamos.';
              status.className = 'text-xs text-center text-red-600 font-semibold';
            }
          })
          .finally(function () {
            if (submitBtn) submitBtn.disabled = false;
          });
      });
    });
  }

  // Modal "Solicitar inscripción" de cada curso disponible: overlay oscuro + ventana
  // centrada (mismo patrón que el lightbox de galería de propiedades), en vez de una
  // sección que empuja el resto del contenido de la página.
  function initInscripcionModal() {
    var modal = document.getElementById('inscripcion-modal');
    var boton = document.querySelector('[data-inscripcion-abrir]');
    if (!modal || !boton) return;

    var form = modal.querySelector('form[data-google-form]');
    var status = modal.querySelector('[data-form-status]');
    var camposEl = modal.querySelector('[data-form-campos]');
    var exitoEl = modal.querySelector('[data-form-exito]');
    var autoCierreId;

    function open() {
      clearTimeout(autoCierreId);
      if (status) {
        status.textContent = '';
        status.className = 'text-xs text-center';
      }
      // Por si se reabre el modal antes de que initGoogleForms restaure el formulario por su
      // cuenta (su temporizador es más largo que el cierre automático de este modal, 2.5s).
      if (exitoEl) exitoEl.classList.add('hidden');
      if (camposEl) camposEl.classList.remove('hidden');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      document.body.classList.add('overflow-hidden');
    }

    function close() {
      clearTimeout(autoCierreId);
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
    }

    boton.addEventListener('click', open);
    modal.querySelectorAll('[data-inscripcion-cerrar]').forEach(function (el) {
      el.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.classList.contains('hidden')) close();
    });

    // Tras un envío exitoso, el mensaje de gracias queda visible unos segundos dentro
    // del propio modal antes de cerrarlo solo — el usuario también puede cerrarlo antes
    // con la X, el fondo o Escape.
    if (form) {
      form.addEventListener('lefinor:formulario-exito', function () {
        autoCierreId = setTimeout(close, 2500);
      });
    }
  }

  // Modal "¿A cuál sede quieres ir?" del botón "Cómo llegar" de la tarjeta digital: mismo
  // patrón de overlay + ventana centrada que el modal de inscripción de Academy, pero sin
  // formulario — solo la lista de sedes con su propio botón "Abrir en Google Maps".
  function initSedesModal() {
    var modal = document.getElementById('sedes-modal');
    var boton = document.querySelector('[data-sedes-abrir]');
    if (!modal || !boton) return;

    function open() {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      document.body.classList.add('overflow-hidden');
    }

    function close() {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.body.classList.remove('overflow-hidden');
    }

    boton.addEventListener('click', open);
    modal.querySelectorAll('[data-sedes-cerrar]').forEach(function (el) {
      el.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.classList.contains('hidden')) close();
    });
  }

  function formatTipo(tipo) {
    if (tipo === 'venta') return 'En Venta';
    if (tipo === 'alquiler') return 'En Alquiler';
    return tipo || '';
  }

  function buildPropiedadCard(template, propiedad) {
    var node = template.content.firstElementChild.cloneNode(true);
    node.href = '/propiedades/' + propiedad.slug + '.html';
    var portadaEl = node.querySelector('.propiedad-card-portada');
    if (propiedad.portada) {
      portadaEl.style.backgroundImage = "url('" + propiedad.portada + "')";
    } else {
      portadaEl.style.backgroundImage = 'repeating-linear-gradient(135deg, var(--azul-2) 0, var(--azul-2) 2px, var(--azul) 2px, var(--azul) 40px)';
    }
    node.querySelector('.propiedad-card-tipo').textContent = formatTipo(propiedad.tipo_operacion) + ' · ' + propiedad.ciudad;
    node.querySelector('.propiedad-card-titulo').textContent = propiedad.titulo;
    node.querySelector('.propiedad-card-precio').textContent = 'Precio a consultar';
    node.querySelector('.propiedad-card-datos').textContent = (propiedad.quickspecs || []).join(' · ');
    return node;
  }

  function initPropiedades() {
    var container = document.getElementById('propiedades-grupos');
    var template = document.getElementById('propiedad-card-template');
    var url = window.__LEFINOR_PROPIEDADES_URL;
    if (!container || !template || !url) return;

    var filtroWrap = document.getElementById('propiedades-filtro-tipo');
    var buscador = document.getElementById('propiedades-buscador');
    var vacio = document.getElementById('propiedades-resultado-vacio');
    var tipoActivo = 'todas';

    function actualizarBotonesFiltro() {
      var botones = filtroWrap.querySelectorAll('.filtro-btn');
      botones.forEach(function (btn) {
        var activo = btn.dataset.tipo === tipoActivo;
        btn.classList.toggle('bg-lefinor-azul', activo);
        btn.classList.toggle('text-white', activo);
        btn.classList.toggle('text-lefinor-azul', !activo);
      });
    }

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (propiedades) {
        function render() {
          var texto = (buscador.value || '').toLowerCase().trim();
          var filtradas = propiedades.filter(function (p) {
            var coincideTipo = tipoActivo === 'todas' || p.tipo_operacion === tipoActivo;
            var coincideTexto =
              !texto || p.titulo.toLowerCase().indexOf(texto) !== -1 || p.ciudad.toLowerCase().indexOf(texto) !== -1;
            return coincideTipo && coincideTexto;
          });

          container.innerHTML = '';
          if (filtradas.length === 0) {
            vacio.classList.remove('hidden');
            return;
          }
          vacio.classList.add('hidden');

          var porCiudad = {};
          filtradas.forEach(function (p) {
            porCiudad[p.ciudad] = porCiudad[p.ciudad] || [];
            porCiudad[p.ciudad].push(p);
          });

          Object.keys(porCiudad)
            .sort()
            .forEach(function (ciudad) {
              var section = document.createElement('div');
              section.className = 'mb-12';
              var heading = document.createElement('h2');
              heading.className = 'text-xl font-bold text-lefinor-azul mb-6';
              heading.textContent = ciudad;
              var grid = document.createElement('div');
              grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';
              porCiudad[ciudad].forEach(function (p) {
                grid.appendChild(buildPropiedadCard(template, p));
              });
              section.appendChild(heading);
              section.appendChild(grid);
              container.appendChild(section);
            });
        }

        if (filtroWrap) {
          filtroWrap.querySelectorAll('.filtro-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
              tipoActivo = btn.dataset.tipo;
              actualizarBotonesFiltro();
              render();
            });
          });
          actualizarBotonesFiltro();
        }
        if (buscador) buscador.addEventListener('input', render);

        render();
      })
      .catch(function () {
        container.innerHTML =
          '<p class="text-center text-lefinor-gris py-16">No se pudo cargar el listado de propiedades.</p>';
      });
  }

  function buildPublicacionCard(template, publicacion) {
    var node = template.content.firstElementChild.cloneNode(true);
    node.href = '/publicaciones/' + publicacion.slug + '.html';
    node.querySelector('.publicacion-card-portada').style.backgroundImage = "url('" + publicacion.portada + "')";
    node.querySelector('.publicacion-card-categoria').textContent = publicacion.categoriaLabel || '';
    node.querySelector('.publicacion-card-titulo').textContent = publicacion.titulo;
    node.querySelector('.publicacion-card-resumen').textContent = publicacion.extracto || '';
    node.querySelector('.publicacion-card-fecha').textContent = publicacion.fecha || '';
    return node;
  }

  function initPublicaciones() {
    var grid = document.getElementById('publicaciones-grid');
    var template = document.getElementById('publicacion-card-template');
    var url = window.__LEFINOR_PUBLICACIONES_URL;
    if (!grid || !template || !url) return;

    var filtroWrap = document.getElementById('publicaciones-filtro-categoria');
    var buscador = document.getElementById('publicaciones-buscador');
    var vacio = document.getElementById('publicaciones-resultado-vacio');
    var categoriaActiva = 'todas';
    // Deep-link desde el botón "Sus publicaciones" de la tarjeta de autor: /publicaciones.html?autor=slug
    var autorActivo = new URLSearchParams(window.location.search).get('autor');

    function actualizarBotonesFiltro() {
      if (!filtroWrap) return;
      var botones = filtroWrap.querySelectorAll('.filtro-btn');
      botones.forEach(function (btn) {
        var activo = btn.dataset.categoria === categoriaActiva;
        btn.classList.toggle('bg-lefinor-azul', activo);
        btn.classList.toggle('text-white', activo);
        btn.classList.toggle('text-lefinor-azul', !activo);
      });
    }

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (publicaciones) {
        function render() {
          var texto = (buscador.value || '').toLowerCase().trim();
          var filtradas = publicaciones.filter(function (p) {
            var coincideCategoria = categoriaActiva === 'todas' || p.categoria === categoriaActiva;
            var coincideAutor = !autorActivo || p.autor_id === autorActivo;
            var coincideTexto =
              !texto ||
              p.titulo.toLowerCase().indexOf(texto) !== -1 ||
              (p.categoriaLabel && p.categoriaLabel.toLowerCase().indexOf(texto) !== -1);
            return coincideCategoria && coincideAutor && coincideTexto;
          });

          grid.innerHTML = '';
          if (filtradas.length === 0) {
            vacio.classList.remove('hidden');
            return;
          }
          vacio.classList.add('hidden');
          filtradas.forEach(function (p) {
            grid.appendChild(buildPublicacionCard(template, p));
          });
        }

        if (filtroWrap) {
          filtroWrap.querySelectorAll('.filtro-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
              categoriaActiva = btn.dataset.categoria;
              actualizarBotonesFiltro();
              render();
            });
          });
          actualizarBotonesFiltro();
        }
        if (buscador) buscador.addEventListener('input', render);
        render();
      })
      .catch(function () {
        grid.innerHTML = '<p class="text-center text-lefinor-gris py-16 col-span-full">No se pudo cargar el listado de publicaciones.</p>';
      });
  }

  var ACADEMY_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-12 h-12 text-lefinor-dorado" fill="currentColor">' +
    '<path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3zm0 10.5L4.4 9 12 4.9 19.6 9 12 13.5zM5 13.18v3.64L12 21l7-4.18v-3.64l-7 3.82-7-3.82z"/></svg>';

  function estadoBadgeClasses(estado) {
    return estado === 'disponible' ? 'bg-lefinor-dorado text-lefinor-azul' : 'bg-lefinor-gris text-white';
  }

  function buildAcademyCard(template, curso) {
    var node = template.content.firstElementChild.cloneNode(true);
    node.href = '/academy/' + curso.id + '.html';
    var portadaEl = node.querySelector('.academy-card-portada');
    if (curso.imagen_portada) {
      portadaEl.style.backgroundImage = "url('" + curso.imagen_portada + "')";
    } else {
      portadaEl.classList.add('bg-lefinor-azul', 'flex', 'items-center', 'justify-center');
      portadaEl.innerHTML = ACADEMY_ICON_SVG;
    }
    var badgeEl = node.querySelector('.academy-card-badge');
    badgeEl.textContent = curso.estadoLabel;
    badgeEl.className = 'absolute top-3 right-3 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded academy-card-badge ' + estadoBadgeClasses(curso.estado);
    node.querySelector('.academy-card-titulo').textContent = curso.titulo;
    node.querySelector('.academy-card-lugar').textContent = curso.lugar || '';
    node.querySelector('.academy-card-fecha').textContent = curso.fecha || '';
    return node;
  }

  function initAcademy() {
    var grid = document.getElementById('academy-grid');
    var template = document.getElementById('academy-card-template');
    var url = window.__LEFINOR_ACADEMY_URL;
    if (!grid || !template || !url) return;

    var filtroWrap = document.getElementById('academy-filtro-estado');
    var buscador = document.getElementById('academy-buscador');
    var vacio = document.getElementById('academy-resultado-vacio');
    var estadoActivo = 'todos';

    function actualizarBotonesFiltro() {
      if (!filtroWrap) return;
      var botones = filtroWrap.querySelectorAll('.filtro-btn');
      botones.forEach(function (btn) {
        var activo = btn.dataset.estado === estadoActivo;
        btn.classList.toggle('bg-lefinor-azul', activo);
        btn.classList.toggle('text-white', activo);
        btn.classList.toggle('text-lefinor-azul', !activo);
      });
    }

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (cursos) {
        function render() {
          var texto = (buscador.value || '').toLowerCase().trim();
          var filtrados = cursos.filter(function (c) {
            var coincideEstado = estadoActivo === 'todos' || c.estado === estadoActivo;
            var coincideTexto = !texto || c.titulo.toLowerCase().indexOf(texto) !== -1;
            return coincideEstado && coincideTexto;
          });

          grid.innerHTML = '';
          if (filtrados.length === 0) {
            vacio.classList.remove('hidden');
            return;
          }
          vacio.classList.add('hidden');
          filtrados.forEach(function (c) {
            grid.appendChild(buildAcademyCard(template, c));
          });
        }

        if (filtroWrap) {
          filtroWrap.querySelectorAll('.filtro-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
              estadoActivo = btn.dataset.estado;
              actualizarBotonesFiltro();
              render();
            });
          });
          actualizarBotonesFiltro();
        }
        if (buscador) buscador.addEventListener('input', render);
        render();
      })
      .catch(function () {
        grid.innerHTML = '<p class="text-center text-lefinor-gris py-16 col-span-full">No se pudo cargar el listado de Academy.</p>';
      });
  }
})();
