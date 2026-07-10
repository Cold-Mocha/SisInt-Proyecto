// =============================================================================
// scroll.js — Navegacion estatica por secciones.
// =============================================================================
(function (root) {
  function iniciarScroll() {
    document.documentElement.classList.add('modo-paginas');

    const capitulos = Array.from(document.querySelectorAll('main > section[id]'));
    const enlacesMenu = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
    const enlacesInternos = Array.from(document.querySelectorAll('a[href^="#"]'));
    const barra = document.querySelector('.progreso');
    const btnPrev = document.querySelector('[data-nav-dir="prev"]');
    const btnNext = document.querySelector('[data-nav-dir="next"]');
    const porId = new Map(enlacesMenu.map((a) => [a.getAttribute('href').slice(1), a]));

    if (!capitulos.length) return;

    let indice = capitulos.findIndex((c) => `#${c.id}` === window.location.hash);
    if (indice < 0) indice = 0;

    function revelar(c) {
      c.querySelectorAll('.reveal').forEach((n) => n.classList.add('visible'));
    }

    function pintarEstado() {
      enlacesMenu.forEach((a) => a.classList.remove('activo'));
      const actual = capitulos[indice];
      const enlace = porId.get(actual.id);
      if (enlace) enlace.classList.add('activo');
      if (btnPrev) btnPrev.disabled = indice === 0;
      if (btnNext) btnNext.disabled = indice === capitulos.length - 1;
      if (barra) barra.style.transform = `scaleX(${(indice + 1) / capitulos.length})`;
    }

    function irA(nuevoIndice, opts) {
      const opciones = opts || {};
      const siguiente = Math.max(0, Math.min(capitulos.length - 1, nuevoIndice));
      const actual = capitulos[indice];
      const destino = capitulos[siguiente];

      if (actual && actual !== destino) actual.classList.remove('is-active');
      indice = siguiente;
      destino.classList.add('is-active');
      destino.scrollTop = 0;
      revelar(destino);
      pintarEstado();

      if (!opciones.silencioso) {
        const hash = `#${destino.id}`;
        if (window.location.hash !== hash) window.history.pushState(null, '', hash);
      }
      if (typeof root.CRL._onCapitulo === 'function') root.CRL._onCapitulo(destino.id);
    }

    function irAId(id, opts) {
      const idx = capitulos.findIndex((c) => c.id === id);
      if (idx >= 0) irA(idx, opts);
    }

    enlacesInternos.forEach((a) => a.addEventListener('click', (ev) => {
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      if (document.getElementById(id)) {
        ev.preventDefault();
        irAId(id);
      }
    }));

    if (btnPrev) btnPrev.addEventListener('click', () => irA(indice - 1));
    if (btnNext) btnNext.addEventListener('click', () => irA(indice + 1));

    document.addEventListener('keydown', (ev) => {
      const el = document.activeElement;
      const escribe = el && (el.matches('input, textarea, select, button') || el.isContentEditable);
      if (escribe) return;

      if (ev.key === 'ArrowDown' || ev.key === 'PageDown' || ev.key === ' ') {
        ev.preventDefault();
        irA(indice + 1);
      } else if (ev.key === 'ArrowUp' || ev.key === 'PageUp') {
        ev.preventDefault();
        irA(indice - 1);
      } else if (ev.key === 'Home') {
        ev.preventDefault();
        irA(0);
      } else if (ev.key === 'End') {
        ev.preventDefault();
        irA(capitulos.length - 1);
      }
    });

    window.addEventListener('popstate', () => {
      const id = window.location.hash.slice(1);
      irAId(id || capitulos[0].id, { silencioso: true });
    });

    irA(indice, { silencioso: true });
  }

  root.CRL = root.CRL || {};
  root.CRL.iniciarScroll = iniciarScroll;
})(this);
