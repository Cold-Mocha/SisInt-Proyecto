// =============================================================================
// simulacion.js — Capitulo 3. Corre CRL.Entorno + CRL.AgenteQ EN EL NAVEGADOR,
// en vivo, con controles de reproduccion. Es el mismo bucle que CRL.entrenar()
// (rl.js) pero instrumentado paso a paso para poder pintarlo en pantalla.
// =============================================================================
(function (root) {
  const CRL = root.CRL;
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  const TOTAL_EPISODIOS = 5000;      // igual al entrenamiento real (Anexo A)
  const MEDIA_VENTANA = 20;          // episodios para la media movil
  const INTERVALO_BASE_MS = 160;     // ms por sobre a velocidad x1
  const EJEMPLO = 41;                // misma carta usada en Piezas 2 y 3

  let entorno, agente, log;
  let episodioActual, pasoActual, rewardEpisodioActual, terminado;
  let playing = false, speed = 1, rafId = null, ultimoTs = 0;
  let filaFocoActual = -1;

  // Genera las 72 filas de la tabla Q una sola vez; despues solo se actualiza
  // el texto de cada celda (mucho mas barato que reconstruir el DOM).
  function construirTablaQ() {
    const body = $('#sim-tabla-q-body');
    let html = '';
    for (let i = 0; i < CRL.N_ESTADOS; i++) {
      html += `<tr id="sim-fila-${i}"${i === EJEMPLO ? ' class="fila-ejemplo"' : ''}>` +
        `<th>s = ${i}</th><td id="sim-q-${i}-0" class="mono">0.00</td><td id="sim-q-${i}-1" class="mono">0.00</td></tr>`;
    }
    body.innerHTML = html;
  }

  function crearSimulacion() {
    entorno = new CRL.Entorno(12345);
    const decay = Math.pow(0.05 / 1.0, 1 / TOTAL_EPISODIOS);
    agente = new CRL.AgenteQ({ seed: 777, epsilon: 1.0, epsilonMin: 0.05, epsilonDecay: decay });
    entorno.reset();
    log = [];
    episodioActual = 0;
    pasoActual = 0;
    rewardEpisodioActual = 0;
    terminado = false;
  }

  // Un solo sobre: elegir, actuar, aprender. Devuelve lo necesario para pintar.
  function avanzarUnPaso() {
    if (terminado) return null;
    const estado = entorno.estado();
    const idxEstado = CRL.codificar(estado);
    const accion = agente.elegir(estado);
    const fueExploracion = agente.ultimoFueExploracion;
    const r = entorno.step(accion);
    agente.aprender(estado, accion, r.reward, r.siguiente, r.done);
    rewardEpisodioActual += r.reward;
    pasoActual += 1;

    const info = { idxEstado, accion, reward: r.reward, etiqueta: r.etiqueta, fueExploracion };

    if (r.done) {
      log.push({ episodio: episodioActual, reward: rewardEpisodioActual, epsilon: agente.epsilon });
      agente.decaerEpsilon();
      episodioActual += 1;
      pasoActual = 0;
      rewardEpisodioActual = 0;
      if (episodioActual >= TOTAL_EPISODIOS) terminado = true;
      else entorno.reset();
    }
    return info;
  }

  function avanzarN(n) {
    let ultimo = null;
    for (let i = 0; i < n; i++) {
      const info = avanzarUnPaso();
      if (!info) break;
      ultimo = info;
    }
    return ultimo;
  }

  function mediaMovil() {
    if (!log.length) return null;
    const ventana = log.slice(-MEDIA_VENTANA);
    return ventana.reduce((s, l) => s + l.reward, 0) / ventana.length;
  }

  function dibujarTablaQ(idxActual) {
    for (let i = 0; i < CRL.N_ESTADOS; i++) {
      $(`#sim-q-${i}-0`).textContent = agente.Q[i][0].toFixed(2);
      $(`#sim-q-${i}-1`).textContent = agente.Q[i][1].toFixed(2);
    }
    if (filaFocoActual >= 0) $(`#sim-fila-${filaFocoActual}`).classList.remove('fila-foco');
    if (idxActual != null) {
      const fila = $(`#sim-fila-${idxActual}`);
      fila.classList.add('fila-foco');
      fila.scrollIntoView({ block: 'nearest' });
    }
    filaFocoActual = idxActual == null ? -1 : idxActual;
  }

  function actualizarGauge() {
    const rango = 1.0 - agente.epsilonMin;
    const frac = rango > 0 ? Math.max(0, Math.min(1, (agente.epsilon - agente.epsilonMin) / rango)) : 0;
    const fill = $('#sim-epsilon-barra');
    fill.style.transform = `scaleX(${frac.toFixed(3)})`;
    fill.classList.toggle('sim__gauge-fill--baja', frac < 0.25);
  }

  function dibujarGrafico() {
    const svg = $('#sim-grafico');
    if (!log.length) { svg.innerHTML = ''; return; }
    const w = 600, h = 160, pad = 10;
    const rewards = log.map((l) => l.reward);
    let min = Math.min.apply(null, rewards), max = Math.max.apply(null, rewards);
    if (min > 0) min = 0;
    if (max < 0) max = 0;
    if (min === max) { min -= 1; max += 1; }
    const n = log.length;
    const x = (i) => pad + (n === 1 ? 0 : (i / (n - 1)) * (w - pad * 2));
    const y = (v) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    let d = '';
    for (let i = 0; i < n; i++) d += (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ',' + y(log[i].reward).toFixed(1) + ' ';
    const yCero = y(0).toFixed(1);
    svg.innerHTML = `<line x1="${pad}" y1="${yCero}" x2="${w - pad}" y2="${yCero}" stroke="var(--marco)" stroke-width="1" />` +
      `<path d="${d.trim()}" fill="none" stroke="var(--lacre)" stroke-width="1.5" />`;
  }

  function actualizarProgreso() {
    const frac = Math.min(1, episodioActual / TOTAL_EPISODIOS);
    $('#sim-progreso-fill').style.width = (frac * 100).toFixed(2) + '%';
  }

  function renderizar(info) {
    if (info) {
      const cont = $('#sim-sobre');
      cont.innerHTML = '';
      cont.appendChild(CRL.crearSobre(CRL.decodificar(info.idxEstado), { size: 200 }));

      const etiquetaEl = $('#sim-etiqueta');
      etiquetaEl.textContent = info.etiqueta === CRL.LEGITIMO ? 'LEGÍTIMO' : 'ANÓMALO';
      etiquetaEl.className = 'etq ' + (info.etiqueta === CRL.LEGITIMO ? 'etq--legitimo' : 'etq--spam');

      const modoEl = $('#sim-modo');
      modoEl.textContent = info.fueExploracion ? 'Explorar' : 'Explotar';
      modoEl.className = 'sim__modo ' + (info.fueExploracion ? 'sim__modo--explorar' : 'sim__modo--explotar');

      $('#sim-accion-txt').textContent = '→ ' + info.accion;

      const rewardEl = $('#sim-reward');
      rewardEl.textContent = (info.reward > 0 ? '+' : '') + info.reward;
      rewardEl.className = 'sim__reward mono ' + (info.reward > 0 ? 'sim__reward--pos' : 'sim__reward--neg');

      dibujarTablaQ(info.idxEstado);
    } else if (entorno) {
      const cont = $('#sim-sobre');
      cont.innerHTML = '';
      cont.appendChild(CRL.crearSobre(entorno.estado(), { size: 200 }));
      $('#sim-etiqueta').textContent = '';
      $('#sim-etiqueta').className = 'etq';
      $('#sim-modo').textContent = '';
      $('#sim-modo').className = 'sim__modo';
      $('#sim-accion-txt').textContent = 'Presiona reproducir para empezar';
      $('#sim-reward').textContent = '';
      $('#sim-reward').className = 'sim__reward mono';
      dibujarTablaQ(null);
    }

    $('#sim-episodio').textContent = `${Math.min(episodioActual, TOTAL_EPISODIOS)} / ${TOTAL_EPISODIOS}`;
    $('#sim-paso').textContent = `${pasoActual} / ${CRL.SOBRES_POR_EPISODIO}`;
    $('#sim-epsilon').textContent = agente.epsilon.toFixed(3);
    $('#sim-reward-ep').textContent = rewardEpisodioActual;
    const media = mediaMovil();
    $('#sim-reward-media').textContent = media == null ? '—' : media.toFixed(1);

    actualizarGauge();
    dibujarGrafico();
    actualizarProgreso();
  }

  // --- Reproduccion --------------------------------------------------------
  function frame(ts) {
    if (!playing) return;
    if (speed <= 5) {
      if (!ultimoTs) ultimoTs = ts;
      if (ts - ultimoTs >= INTERVALO_BASE_MS / speed) {
        ultimoTs = ts;
        renderizar(avanzarN(1));
      }
    } else {
      renderizar(avanzarN(speed));
    }
    if (terminado) { pausa(); return; }
    rafId = requestAnimationFrame(frame);
  }

  function actualizarBotonPlay() {
    const btn = $('#sim-play');
    btn.classList.toggle('is-pausando', playing);
    btn.disabled = terminado;
    btn.textContent = terminado ? '✓ Entrenamiento completo' : (playing ? '⏸ Pausar' : '▶ Reproducir');
  }

  function play() {
    if (playing || terminado) return;
    playing = true;
    ultimoTs = 0;
    actualizarBotonPlay();
    rafId = requestAnimationFrame(frame);
  }

  function pausa() {
    playing = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    actualizarBotonPlay();
  }

  function saltarAlFinal() {
    pausa();
    let info = null;
    while (!terminado) {
      const paso = avanzarUnPaso();
      if (!paso) break;
      info = paso;
    }
    renderizar(info);
    actualizarBotonPlay();
  }

  function reset() {
    pausa();
    crearSimulacion();
    renderizar(null);
    actualizarBotonPlay();
  }

  function iniciarSimulacion() {
    if (!$('#sim-play')) return; // seccion no presente en esta pagina
    construirTablaQ();
    crearSimulacion();
    renderizar(null);

    $('#sim-play').addEventListener('click', () => { playing ? pausa() : play(); });
    $('#sim-reset').addEventListener('click', reset);
    $('#sim-final').addEventListener('click', saltarAlFinal);

    $$('#sim-velocidad button').forEach((b) => {
      b.addEventListener('click', () => {
        speed = Number(b.dataset.v);
        $$('#sim-velocidad button').forEach((x) => x.classList.toggle('activo', x === b));
        ultimoTs = 0;
      });
    });

    // Pausar automaticamente al salir de la seccion (es una pagina mas del
    // modo-paginas; si el usuario navega, el bucle no debe seguir corriendo).
    const previo = CRL._onCapitulo;
    CRL._onCapitulo = function (id) {
      if (typeof previo === 'function') previo(id);
      if (id !== 'cap3' && playing) pausa();
    };
  }

  root.CRL = root.CRL || {};
  root.CRL.iniciarSimulacion = iniciarSimulacion;
})(this);
