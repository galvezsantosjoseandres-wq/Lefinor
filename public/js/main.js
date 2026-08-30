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

  function initCookieBanner() {
    var banner = document.getElementById('cookie-banner');
    var acceptBtn = document.getElementById('cookie-accept');
    if (!banner || !acceptBtn) return;
    var KEY = 'lefinor_cookie_consent';
    try {
      if (!localStorage.getItem(KEY)) {
        banner.classList.remove('hidden');
        banner.classList.add('flex');
      }
    } catch (e) {
      banner.classList.remove('hidden');
      banner.classList.add('flex');
    }
    acceptBtn.addEventListener('click', function () {
      try {
        localStorage.setItem(KEY, 'accepted');
      } catch (e) {
        /* almacenamiento no disponible: se ignora */
      }
      banner.classList.add('hidden');
      banner.classList.remove('flex');
    });
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
    var galeriaGrid = document.getElementById('propiedad-galeria');
    var current = 0;
    var STRIPE_BG = 'repeating-linear-gradient(135deg, var(--azul-2) 0, var(--azul-2) 2px, var(--azul) 2px, var(--azul) 40px)';

    function renderSlide(index) {
      var item = items[index];
      stage.innerHTML = '';
      if (!item) return;
      if (item.tipo === 'foto' && item.src) {
        var img = document.createElement('img');
        img.src = item.src;
        img.alt = '';
        img.className = 'max-h-full max-w-full object-contain rounded';
        stage.appendChild(img);
      } else if (item.tipo === 'video' && item.src) {
        var video = document.createElement('video');
        video.src = item.src;
        video.controls = true;
        video.autoplay = true;
        video.className = 'max-h-full max-w-full rounded';
        stage.appendChild(video);
      } else {
        // Sin archivo real todavía (placeholder): ocupa igualmente la mayor parte del
        // escenario, no un ícono pequeño, para que siga leyéndose como una vista de un
        // solo elemento ampliado.
        var ph = document.createElement('div');
        ph.className = 'w-full h-full rounded flex flex-col items-center justify-center gap-3';
        ph.style.backgroundImage = STRIPE_BG;
        if (item.tipo === 'video') {
          ph.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-20 h-20 text-white/80" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
            '<span class="text-white/70 text-sm font-medium">Video no disponible todavía</span>';
        } else {
          ph.innerHTML = '<span class="text-white/70 text-sm font-medium">Foto no disponible todavía</span>';
        }
        stage.appendChild(ph);
      }
      if (counter) counter.textContent = index + 1 + ' / ' + items.length;
    }

    function goTo(index) {
      current = (index + items.length) % items.length;
      renderSlide(current);
    }

    function open(index) {
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
