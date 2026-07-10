// =============================================================================
// rl.js  —  Nucleo de Aprendizaje por Refuerzo (sin interfaz, sin colores)
// =============================================================================
// El modelo no sabe que existe una interfaz. Corre igual en el navegador (donde
// entrena en milisegundos al abrir la pagina) y en Node (scripts/verify.cjs,
// para comprobar en la terminal que la curva de recompensa sube). Cero
// dependencias. Formato UMD: en el navegador se expone como `window.CRL`, en
// Node se puede `require('./js/rl.js')`.
// -----------------------------------------------------------------------------
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api; // Node
  root.CRL = Object.assign(root.CRL || {}, api);                             // navegador
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ===========================================================================
  // 1. GENERADOR  —  las cuatro poblaciones de sobres y los 15 remitentes
  // ===========================================================================
  // El sobre ES el estado. Cinco variables observables, codificadas en un objeto
  // que el usuario aprende a leer. Las poblaciones emiten caracteristicas de
  // forma ESTOCASTICA: un correo legitimo casi siempre trae pocos enlaces, pero
  // a veces trae varios. Ese solapamiento es lo que impide que una sola
  // caracteristica clasifique perfecto — y lo que le da sentido a la recompensa
  // asimetrica: cuando hay duda, conviene ser conservador.

  const BINS = {
    remitente:  ['conocido', 'desconocido'],   // 2 — sello relleno vs. hueco
    reputacion: ['buena', 'neutra', 'mala'],   // 3 — color del sello
    enlaces:    ['cero', 'uno', 'varios'],     // 3 — marcas de anzuelo
    urgencia:   ['baja', 'alta'],              // 2 — cinta roja
    hora:       ['laboral', 'madrugada'],      // 2 — matasellos (sol / luna)
  };
  // 2 * 3 * 3 * 2 * 2 = 72 estados. Elegido para ser legible, no optimo.
  const N_ESTADOS = 2 * 3 * 3 * 2 * 2;
  const ACCIONES = ['aceptar', 'descartar'];
  const LEGITIMO = 'legitimo', SPAM = 'spam';

  // --- RNG reproducible (mulberry32) ---------------------------------------
  function makeRng(seed) {
    let a = (seed >>> 0) || 0x9e3779b9;
    return function rng() {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(rng, dist) {
    let r = rng() * dist.reduce((s, d) => s + d[1], 0);
    for (const [v, w] of dist) { r -= w; if (r <= 0) return v; }
    return dist[dist.length - 1][0];
  }
  const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

  // Las cuatro poblaciones. Cada una fija su etiqueta verdadera.
  const POBLACIONES = {
    // Legitimo cotidiano — 45 %. Conocido, pocos enlaces, sin urgencia, laboral.
    cotidiano: {
      proporcion: 0.45, etiqueta: LEGITIMO,
      enlaces:  [['cero', 0.55], ['uno', 0.32], ['varios', 0.13]],
      urgencia: [['baja', 0.85], ['alta', 0.15]],
      hora:     [['laboral', 0.90], ['madrugada', 0.10]],
    },
    // Legitimo nuevo — 15 %. DESCONOCIDO pero real (un cliente, un profesor).
    // Castiga la regla "descartar si el remitente es desconocido".
    nuevo: {
      proporcion: 0.15, etiqueta: LEGITIMO,
      enlaces:  [['cero', 0.50], ['uno', 0.38], ['varios', 0.12]],
      urgencia: [['baja', 0.80], ['alta', 0.20]],
      hora:     [['laboral', 0.85], ['madrugada', 0.15]],
    },
    // Spam burdo — 30 %. Desconocido, muchos enlaces, urgente, de madrugada.
    spam: {
      proporcion: 0.30, etiqueta: SPAM,
      enlaces:  [['varios', 0.70], ['uno', 0.24], ['cero', 0.06]],
      urgencia: [['alta', 0.80], ['baja', 0.20]],
      hora:     [['madrugada', 0.62], ['laboral', 0.38]],
    },
    // Suplantacion — 10 %. Llega desde una direccion CONOCIDA y de BUENA
    // reputacion (un remitente comprometido). Castiga "confiar en el conocido".
    suplantacion: {
      proporcion: 0.10, etiqueta: SPAM,
      enlaces:  [['varios', 0.66], ['uno', 0.29], ['cero', 0.05]],
      urgencia: [['alta', 0.75], ['baja', 0.25]],
      hora:     [['laboral', 0.58], ['madrugada', 0.42]],
    },
  };

  // 15 remitentes fijos por episodio. 3 son COMPROMETIDOS: envian legitimo
  // hasta `flipAt` y luego suplantacion. Ese giro impide memorizar "confio en
  // el remitente_07": el mundo cambia bajo los pies del agente.
  function construirRemitentes(rng) {
    const senders = []; let id = 0;
    const add = (type, extra) => senders.push(Object.assign({ id: id++, type }, extra));
    for (let i = 0; i < 6; i++) add('regular');
    for (let i = 0; i < 2; i++) add('newcomer');
    for (let i = 0; i < 4; i++) add('spammer');
    for (let i = 0; i < 3; i++) add('compromised', { flipAt: randInt(rng, 12, 34) });
    return senders;
  }
  const elegir = (rng, l) => l[Math.floor(rng() * l.length)];

  // Muestrea el contenido intrinseco de un sobre para el paso `step`.
  function muestrearSobre(rng, senders, step) {
    const porTipo = (t) => senders.filter((s) => s.type === t);
    const compFlipeados = senders.filter((s) => s.type === 'compromised' && step >= s.flipAt);

    let pobName = pick(rng, Object.entries(POBLACIONES).map((e) => [e[0], e[1].proporcion]));
    let sender;
    if (pobName === 'cotidiano') {
      const sanos = porTipo('compromised').filter((s) => step < s.flipAt);
      sender = elegir(rng, porTipo('regular').concat(sanos));
    } else if (pobName === 'nuevo') {
      sender = elegir(rng, porTipo('newcomer'));
    } else if (pobName === 'spam') {
      sender = elegir(rng, porTipo('spammer'));
    } else { // suplantacion
      if (compFlipeados.length) { sender = elegir(rng, compFlipeados); }
      else { pobName = 'spam'; sender = elegir(rng, porTipo('spammer')); }
    }
    const pob = POBLACIONES[pobName];
    return {
      senderId: sender.id, poblacion: pobName, etiqueta: pob.etiqueta,
      enlaces: pick(rng, pob.enlaces), urgencia: pick(rng, pob.urgencia), hora: pick(rng, pob.hora),
    };
  }

  // ===========================================================================
  // 2. ENTORNO  —  el proceso de decision (MDP) de la sala de correo
  // ===========================================================================
  const SOBRES_POR_EPISODIO = 50;

  // Matriz de recompensa = matriz de confusion. Cuatro casillas, nada mas.
  const RECOMPENSA = {
    aceptar:   { [LEGITIMO]: 5,   [SPAM]: -2 }, // +5 acierto / -2 molestia
    descartar: { [LEGITIMO]: -20, [SPAM]: 3 },  // -20 carta rota (irreversible) / +3 acierto
  };

  // Reputacion: score entero por remitente. Sube lento (2 aciertos por nivel),
  // baja rapido (1 spam por nivel). buena>=2, mala<=-1, neutra en medio.
  const REP_MIN = -3, REP_MAX = 3;
  const REP_INICIAL = { regular: 2, compromised: 2, newcomer: 1, spammer: 0 };
  function scoreABin(s) { return s >= 2 ? 'buena' : (s <= -1 ? 'mala' : 'neutra'); }

  class Entorno {
    constructor(seed) { this.rng = makeRng(seed == null ? 12345 : seed); this.reset(); }

    reset() {
      this.senders = construirRemitentes(this.rng);
      this.repScore = new Map();
      this.seen = new Set();
      for (const s of this.senders) this.repScore.set(s.id, REP_INICIAL[s.type]);
      this.paso = 0;
      this.current = this._observar();
      return this.current;
    }

    // Sobre observable completo: contenido intrinseco + reputacion (memoria del
    // entorno) + conocido/desconocido (visto antes esta jornada).
    _observar() {
      const raw = muestrearSobre(this.rng, this.senders, this.paso);
      const score = this.repScore.get(raw.senderId);
      return {
        remitente: this.seen.has(raw.senderId) ? 'conocido' : 'desconocido',
        reputacion: scoreABin(score),
        enlaces: raw.enlaces, urgencia: raw.urgencia, hora: raw.hora,
        senderId: raw.senderId, etiqueta: raw.etiqueta, poblacion: raw.poblacion, repScore: score,
      };
    }

    estado() {
      const s = this.current;
      return { remitente: s.remitente, reputacion: s.reputacion, enlaces: s.enlaces, urgencia: s.urgencia, hora: s.hora };
    }

    step(action) {
      const sobre = this.current;
      const reward = RECOMPENSA[action][sobre.etiqueta];
      // Revelar la verdad -> actualizar reputacion del remitente.
      let ns = this.repScore.get(sobre.senderId) + (sobre.etiqueta === LEGITIMO ? 1 : -2);
      ns = Math.max(REP_MIN, Math.min(REP_MAX, ns));
      this.repScore.set(sobre.senderId, ns);
      this.seen.add(sobre.senderId);

      this.paso += 1;
      const done = this.paso >= SOBRES_POR_EPISODIO;
      if (!done) this.current = this._observar();
      return {
        estado: { remitente: sobre.remitente, reputacion: sobre.reputacion, enlaces: sobre.enlaces, urgencia: sobre.urgencia, hora: sobre.hora },
        accion: action, reward, etiqueta: sobre.etiqueta, poblacion: sobre.poblacion,
        done, siguiente: done ? null : this.estado(),
      };
    }
  }

  // Codificacion estado <-> indice entero (para la Q-table de 72 x 2).
  const ORDEN = ['remitente', 'reputacion', 'enlaces', 'urgencia', 'hora'];
  function codificar(e) {
    let idx = 0;
    for (const dim of ORDEN) idx = idx * BINS[dim].length + BINS[dim].indexOf(e[dim]);
    return idx;
  }
  function decodificar(idx) {
    const e = {};
    for (let k = ORDEN.length - 1; k >= 0; k--) {
      const v = BINS[ORDEN[k]]; e[ORDEN[k]] = v[idx % v.length]; idx = Math.floor(idx / v.length);
    }
    return e;
  }

  // ===========================================================================
  // 3. AGENTE  —  Q-learning tabular, off-policy, epsilon-greedy
  // ===========================================================================
  //   Q(s,a) <- Q(s,a) + alfa [ r + gamma * max_a' Q(s',a') - Q(s,a) ]
  class AgenteQ {
    constructor(opts) {
      opts = opts || {};
      this.alfa = opts.alfa != null ? opts.alfa : 0.1;
      this.gamma = opts.gamma != null ? opts.gamma : 0.9;
      this.epsilon = opts.epsilon != null ? opts.epsilon : 1.0;
      this.epsilonMin = opts.epsilonMin != null ? opts.epsilonMin : 0.05;
      this.epsilonDecay = opts.epsilonDecay != null ? opts.epsilonDecay : null;
      this.rng = makeRng(opts.seed == null ? 777 : opts.seed);
      this.Q = opts.Q || Array.from({ length: N_ESTADOS }, () => [0, 0]);
      this.ultimoFueExploracion = false;
    }
    elegir(estado, opt) {
      const greedy = opt && opt.greedy;
      const s = codificar(estado);
      if (!greedy && this.rng() < this.epsilon) {
        this.ultimoFueExploracion = true;
        return ACCIONES[Math.floor(this.rng() * ACCIONES.length)];
      }
      this.ultimoFueExploracion = false;
      return ACCIONES[this._mejor(s)];
    }
    _mejor(s) { const q = this.Q[s]; return q[1] > q[0] ? 1 : 0; }
    aprender(estado, accion, reward, siguiente, done) {
      const s = codificar(estado), a = ACCIONES.indexOf(accion);
      const objetivo = done ? reward : reward + this.gamma * Math.max(this.Q[codificar(siguiente)][0], this.Q[codificar(siguiente)][1]);
      this.Q[s][a] += this.alfa * (objetivo - this.Q[s][a]);
    }
    decaerEpsilon() {
      if (this.epsilonDecay != null) this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
    }
    politica() { return this.Q.map((q) => (q[1] > q[0] ? 'descartar' : 'aceptar')); }
  }

  // ===========================================================================
  // 4. BASELINES  —  las estrategias de comparacion del capitulo 5
  // ===========================================================================
  const BASELINES = {
    aceptarTodo:   { nombre: 'Aceptar todo',     fn: () => 'aceptar' },
    descartarTodo: { nombre: 'Descartar todo',   fn: () => 'descartar' },
    // Lo que un ingeniero razonable escribe en veinte minutos.
    reglaFija:     { nombre: 'Regla: descartar si desconocido', fn: (e) => e.remitente === 'desconocido' ? 'descartar' : 'aceptar' },
    // Mas sofisticada: aprende del pasado. Pero REACCIONA en vez de anticipar,
    // y no ve venir al remitente comprometido (su reputacion aun es buena).
    reglaReputacion: { nombre: 'Regla: descartar si mala reputacion', fn: (e) => e.reputacion === 'mala' ? 'descartar' : 'aceptar' },
  };

  // ===========================================================================
  // 5. ENTRENAR / EVALUAR  —  usados por el navegador y por la verificacion
  // ===========================================================================
  // Entrena `episodios` episodios y devuelve el agente, el log por episodio y
  // snapshots periodicos de la Q-table (para el slider del capitulo 4).
  function entrenar(opts) {
    opts = opts || {};
    const episodios = opts.episodios || 5000;
    const snapshotCada = opts.snapshotCada || Math.max(1, Math.floor(episodios / 60));
    const epsilonFijo = opts.epsilonFijo; // para el modo "romperlo" (ε=0 desde el inicio)
    const decay = Math.pow(0.05 / 1.0, 1 / episodios);
    const env = new Entorno(opts.seedEntorno == null ? 12345 : opts.seedEntorno);
    const agente = new AgenteQ({
      seed: opts.seedAgente == null ? 777 : opts.seedAgente,
      epsilon: epsilonFijo != null ? epsilonFijo : 1.0,
      epsilonMin: epsilonFijo != null ? epsilonFijo : 0.05,
      epsilonDecay: epsilonFijo != null ? null : decay,
    });
    const log = [];       // { episodio, reward, epsilon }
    const snapshots = [];  // { episodio, Q (copia), epsilon, reward }

    for (let ep = 0; ep < episodios; ep++) {
      env.reset();
      let total = 0;
      for (let t = 0; t < SOBRES_POR_EPISODIO; t++) {
        const s = env.estado();
        const a = agente.elegir(s);
        const r = env.step(a);
        agente.aprender(s, a, r.reward, r.siguiente, r.done);
        total += r.reward;
      }
      log.push({ episodio: ep, reward: total, epsilon: agente.epsilon });
      if (ep % snapshotCada === 0 || ep === episodios - 1) {
        snapshots.push({ episodio: ep, epsilon: agente.epsilon, reward: total, Q: agente.Q.map((q) => [q[0], q[1]]) });
      }
      agente.decaerEpsilon();
    }
    return { agente, log, snapshots };
  }

  // Evalua una politica (funcion estado->accion) sobre `episodios` episodios
  // deterministas. Como el flujo de sobres no depende de la accion, todas las
  // estrategias ven exactamente los mismos sobres -> comparacion justa y exacta.
  function evaluar(elegirAccion, opts) {
    opts = opts || {};
    const episodios = opts.episodios || 400;
    const env = new Entorno(opts.seedEntorno == null ? 20260710 : opts.seedEntorno);
    const m = {
      recompensa: 0, n: 0, cartasPerdidas: 0, spamAceptado: 0,
      legitAceptado: 0, spamDescartado: 0, legitTotal: 0, spamTotal: 0,
      suplantacionTotal: 0, suplantacionAtrapada: 0,
    };
    for (let ep = 0; ep < episodios; ep++) {
      env.reset();
      for (let t = 0; t < SOBRES_POR_EPISODIO; t++) {
        const cur = env.current; // acceso al sobre actual (poblacion/etiqueta)
        const a = elegirAccion(env.estado());
        const r = env.step(a);
        m.recompensa += r.reward; m.n++;
        if (r.etiqueta === LEGITIMO) m.legitTotal++; else m.spamTotal++;
        if (a === 'descartar' && r.etiqueta === LEGITIMO) m.cartasPerdidas++;
        if (a === 'aceptar' && r.etiqueta === SPAM) m.spamAceptado++;
        if (a === 'aceptar' && r.etiqueta === LEGITIMO) m.legitAceptado++;
        if (a === 'descartar' && r.etiqueta === SPAM) m.spamDescartado++;
        if (cur.poblacion === 'suplantacion') {
          m.suplantacionTotal++;
          if (a === 'descartar') m.suplantacionAtrapada++;
        }
      }
    }
    m.episodios = episodios;
    m.recompensaMedia = m.recompensa / episodios;
    m.aciertos = (m.legitAceptado + m.spamDescartado) / m.n;
    return m;
  }

  return {
    BINS, N_ESTADOS, ACCIONES, LEGITIMO, SPAM, POBLACIONES, RECOMPENSA, SOBRES_POR_EPISODIO,
    makeRng, construirRemitentes, muestrearSobre, Entorno, AgenteQ, BASELINES,
    codificar, decodificar, entrenar, evaluar,
  };
});
