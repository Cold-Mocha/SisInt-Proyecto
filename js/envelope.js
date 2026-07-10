// =============================================================================
// envelope.js — Dibuja un sobre <svg> a partir de un estado. EL componente.
// =============================================================================
// El usuario nunca ve un vector; ve un objeto. Cinco variables observables,
// codificadas en el sobre:
//   remitente   -> sello relleno (conocido) o hueco (desconocido)
//   reputacion  -> color del sello: ambar (buena) / gris (neutra) / negro (mala)
//   enlaces     -> marcas de anzuelo en la esquina: 0, 1 o 3
//   urgencia    -> cinta roja cruzando el sobre (presente/ausente)
//   hora        -> matasellos: sol (laboral) o luna (madrugada)
// Se usa en el cap. 1 (didactico) y en la carta de ejemplo de "Armando el
// agente". Si este componente esta bien hecho, media app esta hecha.
(function (root) {
  const NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, kids) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (kids) for (const c of kids) n.appendChild(c);
    return n;
  }

  const COLOR_SELLO = { buena: 'var(--lacre)', neutra: 'var(--penumbra)', mala: '#0B0E17' };

  // Resumen textual del estado, leible por lector de pantalla (§3.6).
  function describir(e) {
    const enl = { cero: 'sin enlaces', uno: 'un enlace', varios: 'varios enlaces' }[e.enlaces];
    return `Sobre. Remitente ${e.remitente}, reputacion ${e.reputacion}, ${enl}, ` +
      `urgencia ${e.urgencia}, ${e.hora === 'laboral' ? 'horario laboral' : 'madrugada'}.`;
  }

  // Un anzuelo (representa un enlace = carnada).
  function anzuelo(x, y) {
    return el('g', { stroke: 'var(--penumbra)', 'stroke-width': '1.4', fill: 'none', 'stroke-linecap': 'round' }, [
      el('path', { d: `M${x} ${y} v5 a2.2 2.2 0 0 1-4.4 0` }),
      el('path', { d: `M${x} ${y} l2 1.6` }),
    ]);
  }

  // Crea el sobre. opts:
  //   size   ancho en px (alto proporcional)
  //   tint   color de fondo del cuerpo (archivador). null = --mesa
  //   torn   dibuja el sobre rasgado en rojo (papelera)
  //   dim    atenua (sobres ya apilados)
  function crearSobre(estado, opts) {
    opts = opts || {};
    const w = opts.size || 120, h = Math.round(w * 0.7);
    const svg = el('svg', {
      viewBox: '0 0 120 84', width: w, height: h,
      class: 'sobre' + (opts.torn ? ' sobre--rasgado' : ''),
      role: 'img', 'aria-label': describir(estado),
    });
    if (opts.dim) svg.style.opacity = '0.72';

    // --- Sobre rasgado (papelera): dos mitades desplazadas, en rojo ---
    if (opts.torn) {
      const mk = (d, dx, dy, rot) => el('path', {
        d, fill: 'var(--mesa)', stroke: 'var(--rasgado)', 'stroke-width': '2',
        transform: `translate(${dx} ${dy}) rotate(${rot} 60 50)`,
      });
      svg.appendChild(mk('M6 18 H60 L60 78 H6 Z', -3, 2, -6));
      svg.appendChild(mk('M60 18 H114 L114 78 H60 Z', 3, 4, 5));
      // diagonal del desgarro (no depende del color: es forma)
      svg.appendChild(el('path', { d: 'M60 18 L60 78', stroke: 'var(--rasgado)', 'stroke-width': '1.5', 'stroke-dasharray': '3 3' }));
      return svg;
    }

    const cuerpoFill = opts.tint || 'var(--mesa)';
    // Cuerpo
    svg.appendChild(el('rect', { x: 6, y: 18, width: 108, height: 60, fill: cuerpoFill, stroke: 'var(--marco)', 'stroke-width': '1.5' }));
    // Solapa (la V del sobre cerrado)
    svg.appendChild(el('path', { d: 'M6 18 L60 52 L114 18', fill: 'none', stroke: 'var(--marco)', 'stroke-width': '1.5', 'stroke-linejoin': 'round' }));

    // Matasellos (hora): sol o luna arriba a la izquierda
    if (estado.hora === 'madrugada') {
      svg.appendChild(el('path', { d: 'M22 27 a5 5 0 1 0 5 6 a4 4 0 1 1-5-6 Z', fill: 'none', stroke: 'var(--penumbra)', 'stroke-width': '1.2' }));
    } else {
      const sol = el('g', { stroke: 'var(--penumbra)', 'stroke-width': '1.1', fill: 'none' }, [el('circle', { cx: 24, cy: 30, r: 3.4 })]);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        sol.appendChild(el('line', { x1: 24 + Math.cos(a) * 5, y1: 30 + Math.sin(a) * 5, x2: 24 + Math.cos(a) * 6.6, y2: 30 + Math.sin(a) * 6.6 }));
      }
      svg.appendChild(sol);
    }

    // Sello de lacre (remitente + reputacion): centro-abajo de la solapa
    const cx = 60, cy = 50, r = 8;
    const color = COLOR_SELLO[estado.reputacion];
    if (estado.remitente === 'conocido') {
      svg.appendChild(el('circle', { cx, cy, r, fill: color, stroke: 'var(--noche)', 'stroke-width': '1' }));
    } else {
      // hueco: primera vez que escribe
      svg.appendChild(el('circle', { cx, cy, r, fill: 'none', stroke: color, 'stroke-width': '2.2' }));
    }

    // Cinta roja (urgencia alta): banda diagonal
    if (estado.urgencia === 'alta') {
      svg.appendChild(el('path', { d: 'M6 62 L40 78 M74 18 L114 38', stroke: 'var(--rasgado)', 'stroke-width': '4', 'stroke-linecap': 'round', opacity: '0.9' }));
      svg.appendChild(el('path', { d: 'M6 50 L114 78', stroke: 'var(--rasgado)', 'stroke-width': '4', 'stroke-linecap': 'round', opacity: '0.72' }));
    }

    // Anzuelos (enlaces): esquina inferior derecha
    const n = { cero: 0, uno: 1, varios: 3 }[estado.enlaces];
    for (let i = 0; i < n; i++) svg.appendChild(anzuelo(94 + i * 7, 63));

    return svg;
  }

  root.CRL = root.CRL || {};
  root.CRL.crearSobre = crearSobre;
  root.CRL.describirSobre = describir;
})(this);
