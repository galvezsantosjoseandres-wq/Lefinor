(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    initCookieBanner();
    initHeroCarousel();
    initGallery();
    initWhatsappMensajes();
    initContactForms();
    initPropiedades();
    initPublicaciones();
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
    node.querySelector('.propiedad-card-portada').style.backgroundImage = "url('" + propiedad.portada + "')";
    node.querySelector('.propiedad-card-tipo').textContent = formatTipo(propiedad.tipo) + ' · ' + propiedad.ciudad;
    node.querySelector('.propiedad-card-titulo').textContent = propiedad.titulo;
    node.querySelector('.propiedad-card-precio').textContent = propiedad.precio;
    var datosParts = [];
    if (propiedad.habitaciones) datosParts.push(propiedad.habitaciones + ' hab.');
    if (propiedad.banos) datosParts.push(propiedad.banos + ' baños');
    if (propiedad.metros) datosParts.push(propiedad.metros + ' m²');
    node.querySelector('.propiedad-card-datos').textContent = datosParts.join(' · ');
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
            var coincideTipo = tipoActivo === 'todas' || p.tipo === tipoActivo;
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
    node.querySelector('.publicacion-card-categoria').textContent = publicacion.categoria || '';
    node.querySelector('.publicacion-card-titulo').textContent = publicacion.titulo;
    node.querySelector('.publicacion-card-resumen').textContent = publicacion.resumen || '';
    node.querySelector('.publicacion-card-fecha').textContent = publicacion.fecha || '';
    return node;
  }

  function initPublicaciones() {
    var grid = document.getElementById('publicaciones-grid');
    var template = document.getElementById('publicacion-card-template');
    var url = window.__LEFINOR_PUBLICACIONES_URL;
    if (!grid || !template || !url) return;

    var buscador = document.getElementById('publicaciones-buscador');
    var vacio = document.getElementById('publicaciones-resultado-vacio');

    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (publicaciones) {
        function render() {
          var texto = (buscador.value || '').toLowerCase().trim();
          var filtradas = publicaciones.filter(function (p) {
            return (
              !texto ||
              p.titulo.toLowerCase().indexOf(texto) !== -1 ||
              (p.categoria && p.categoria.toLowerCase().indexOf(texto) !== -1)
            );
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

        if (buscador) buscador.addEventListener('input', render);
        render();
      })
      .catch(function () {
        grid.innerHTML = '<p class="text-center text-lefinor-gris py-16 col-span-full">No se pudo cargar el listado de publicaciones.</p>';
      });
  }
})();
