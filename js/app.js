// =============================================================================
// app.js — Orquestador. Pinta los sobres de ejemplo y conecta el scroll.
// =============================================================================
(function (root) {
  const CRL = root.CRL;
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  // =========================================================================
  // CAP 1 — Anatomia de un sobre
  // =========================================================================
  function armarCapitulo1() {
    const arquetipos = {
      cotidiano:   { estado: { remitente: 'conocido', reputacion: 'buena', enlaces: 'cero', urgencia: 'baja', hora: 'laboral' }, et: 'legitimo', txt: 'Legítimo cotidiano: el pan de cada día. Un remitente que ya conoces, sin enlaces, sin prisa, en horario de oficina. Sello ámbar y relleno.' },
      nuevo:       { estado: { remitente: 'desconocido', reputacion: 'neutra', enlaces: 'uno', urgencia: 'baja', hora: 'laboral' }, et: 'legitimo', txt: 'Legítimo nuevo: un cliente nuevo, un profesor. Nunca escribió antes (sello hueco), pero es real. La regla fácil "descartar lo desconocido" rompe esta carta.' },
      spam:        { estado: { remitente: 'desconocido', reputacion: 'neutra', enlaces: 'varios', urgencia: 'alta', hora: 'madrugada' }, et: 'spam', txt: 'Spam burdo: desconocido, tres anzuelos, cinta roja de urgencia, matasellos de madrugada. Grita lo que es. Es el fácil.' },
      suplantacion:{ estado: { remitente: 'conocido', reputacion: 'buena', enlaces: 'varios', urgencia: 'alta', hora: 'laboral' }, et: 'spam', txt: 'Suplantación: el peligroso. Llega desde una dirección conocida y de buena reputación (sello ámbar y relleno), pero trae tres anzuelos y urgencia. La única señal que lo delata son los enlaces.' },
    };
    const cont = $('#cap1-sobre');
    const desc = $('#cap1-desc');
    const parametros = $('#cap1-parametros');
    const btns = $$('#cap1-controles button');
    const detalleParametros = [
      ['Remitente', 'remitente', {
        conocido: 'sello relleno',
        desconocido: 'sello hueco',
      }],
      ['Reputación', 'reputacion', {
        buena: 'sello ámbar',
        neutra: 'sello gris',
        mala: 'sello negro',
      }],
      ['Enlaces', 'enlaces', {
        cero: 'sin anzuelos',
        uno: 'un anzuelo',
        varios: 'tres anzuelos',
      }],
      ['Urgencia', 'urgencia', {
        baja: 'sin cinta roja',
        alta: 'cinta roja diagonal',
      }],
      ['Hora', 'hora', {
        laboral: 'matasellos de sol',
        madrugada: 'matasellos de luna',
      }],
    ];

    function pintarParametros(estado) {
      parametros.innerHTML = `
        <h4>Valores de esta carta</h4>
        <dl>
          ${detalleParametros.map(([nombre, clave, simbolos]) => `
            <div>
              <dt>${nombre}</dt>
              <dd><span class="mono">${clave} = ${estado[clave]}</span></dd>
            </div>
          `).join('')}
        </dl>
      `;
    }

    function mostrar(clave) {
      const a = arquetipos[clave];
      cont.innerHTML = '';
      cont.appendChild(CRL.crearSobre(a.estado, { size: 300 }));
      desc.innerHTML = `<span class="etq etq--${a.et}">${a.et === 'legitimo' ? 'LEGÍTIMO' : 'ANÓMALO'}</span> ${a.txt}`;
      pintarParametros(a.estado);
      btns.forEach((b) => b.classList.toggle('activo', b.dataset.arq === clave));
    }
    btns.forEach((b) => b.addEventListener('click', () => mostrar(b.dataset.arq)));
    mostrar('cotidiano');
  }

  // =========================================================================
  // CAP AGENTE — Armando el agente (carta de ejemplo estatica, s = 41)
  // =========================================================================
  function armarCapAgente() {
    const estado = { remitente: 'desconocido', reputacion: 'neutra', enlaces: 'uno', urgencia: 'baja', hora: 'laboral' };
    const etiquetas = [['Remitente', 'remitente'], ['Reputación', 'reputacion'], ['Enlaces', 'enlaces'], ['Urgencia', 'urgencia'], ['Hora', 'hora']];

    function pintarCarta(contId, paramsId) {
      const cont = $(contId);
      if (!cont) return;
      cont.innerHTML = '';
      cont.appendChild(CRL.crearSobre(estado, { size: 300 }));
      const params = $(paramsId);
      if (!params) return;
      params.innerHTML = `
        <dl>
          ${etiquetas.map(([nombre, clave]) => `
            <div>
              <dt>${nombre}</dt>
              <dd><span class="mono">${estado[clave]}</span></dd>
            </div>
          `).join('')}
        </dl>
      `;
    }

    pintarCarta('#agente-sobre', '#agente-parametros');
    pintarCarta('#agente-sobre-p2');
  }

  // =========================================================================
  // PROLOGO — los sobres flotantes de la portada son cartas reales
  // =========================================================================
  function armarPrologo() {
    const estados = {
      cotidiano:    { remitente: 'conocido', reputacion: 'buena', enlaces: 'cero', urgencia: 'baja', hora: 'laboral' },
      nuevo:        { remitente: 'desconocido', reputacion: 'neutra', enlaces: 'uno', urgencia: 'baja', hora: 'laboral' },
      spam:         { remitente: 'desconocido', reputacion: 'neutra', enlaces: 'varios', urgencia: 'alta', hora: 'madrugada' },
      suplantacion: { remitente: 'conocido', reputacion: 'buena', enlaces: 'varios', urgencia: 'alta', hora: 'laboral' },
      malareput:    { remitente: 'conocido', reputacion: 'mala', enlaces: 'uno', urgencia: 'baja', hora: 'madrugada' },
    };
    $$('.correo-animacion .correo').forEach((nodo) => {
      const estado = estados[nodo.dataset.arq];
      if (!estado) return;
      nodo.appendChild(CRL.crearSobre(estado, { size: Number(nodo.dataset.size) || 86 }));
    });
  }

  // =========================================================================
  // Arranque
  // =========================================================================
  function iniciar() {
    armarPrologo();
    armarCapitulo1();
    armarCapAgente();
    CRL.iniciarSimulacion();
    CRL.iniciarScroll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})(this);
