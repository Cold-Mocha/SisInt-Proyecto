// verify.cjs — Comprobacion en terminal de las dos compuertas del proyecto.
// No es parte de la app (la app entrena en el navegador). Sirve para verificar,
// sin abrir el navegador, que el nucleo RL funciona. Uso: node scripts/verify.cjs
'use strict';
const CRL = require('../js/rl.js');

function barra(v, min, max, ancho = 40) {
  const t = Math.max(0, Math.min(1, (v - min) / (max - min)));
  return '#'.repeat(Math.round(t * ancho)).padEnd(ancho, '.');
}

console.log('\n=== COMPUERTA 1 — ¿sube la curva de recompensa? ===\n');
const EP = 5000;
const { agente, log } = CRL.entrenar({ episodios: EP });
// Promedios por tramos para ver la tendencia.
const tramos = 10, paso = Math.floor(EP / tramos);
let subeMonotono = true, prev = -Infinity;
for (let i = 0; i < tramos; i++) {
  const slice = log.slice(i * paso, (i + 1) * paso);
  const media = slice.reduce((s, r) => s + r.reward, 0) / slice.length;
  const eps = slice[slice.length - 1].epsilon;
  console.log(
    `ep ${String(i * paso).padStart(5)}–${String((i + 1) * paso).padStart(5)}  ` +
    `R=${media.toFixed(1).padStart(7)}  ε=${eps.toFixed(3)}  |${barra(media, -80, 100)}|`,
  );
  if (i > 0 && media < prev - 5) subeMonotono = false;
  prev = media;
}
const rInicio = log.slice(0, paso).reduce((s, r) => s + r.reward, 0) / paso;
const rFinal = log.slice(-paso).reduce((s, r) => s + r.reward, 0) / paso;
console.log(`\ninicio: R=${rInicio.toFixed(1)}   final: R=${rFinal.toFixed(1)}   (Δ=${(rFinal - rInicio).toFixed(1)})`);
const gate1 = rFinal > rInicio + 20 && subeMonotono;
console.log(gate1 ? '✓ COMPUERTA 1 OK — el agente aprende.' : '✗ COMPUERTA 1 FALLA.');

console.log('\n=== COMPUERTA 2 — ¿la politica aprendida le gana a la regla de reputacion? ===\n');
const seedEval = 20260710, epsEval = 500;
const politicaAprendida = (e) => agente.elegir(e, { greedy: true });
const estrategias = {
  'Aceptar todo':          CRL.BASELINES.aceptarTodo.fn,
  'Descartar todo':        CRL.BASELINES.descartarTodo.fn,
  'Regla desconocido':     CRL.BASELINES.reglaFija.fn,
  'Regla reputacion':      CRL.BASELINES.reglaReputacion.fn,
  'Politica APRENDIDA':    politicaAprendida,
};
const res = {};
console.log('estrategia'.padEnd(22), 'R/ep'.padStart(8), 'cartas⊥'.padStart(9), 'spam✓'.padStart(7), 'suplant.atrapada'.padStart(18));
for (const [nombre, fn] of Object.entries(estrategias)) {
  const m = CRL.evaluar(fn, { episodios: epsEval, seedEntorno: seedEval });
  res[nombre] = m;
  const supl = m.suplantacionTotal ? (100 * m.suplantacionAtrapada / m.suplantacionTotal).toFixed(0) + '%' : '—';
  console.log(
    nombre.padEnd(22),
    m.recompensaMedia.toFixed(1).padStart(8),
    String(m.cartasPerdidas).padStart(9),
    String(m.spamDescartado).padStart(7),
    supl.padStart(18),
  );
}
const rApr = res['Politica APRENDIDA'].recompensaMedia;
const rRep = res['Regla reputacion'].recompensaMedia;
const suplApr = res['Politica APRENDIDA'].suplantacionAtrapada / res['Politica APRENDIDA'].suplantacionTotal;
const suplRep = res['Regla reputacion'].suplantacionAtrapada / res['Regla reputacion'].suplantacionTotal;
console.log(`\naprendida R=${rApr.toFixed(1)}  vs  reputacion R=${rRep.toFixed(1)}   (Δ=${(rApr - rRep).toFixed(1)})`);
console.log(`suplantacion atrapada — aprendida ${(100 * suplApr).toFixed(0)}%  vs  reputacion ${(100 * suplRep).toFixed(0)}%`);
const gate2 = rApr > rRep && suplApr > suplRep + 0.15;
console.log(gate2 ? '✓ COMPUERTA 2 OK — la aprendida anticipa; la regla reacciona.' : '✗ COMPUERTA 2 FALLA — revisar el generador.');

console.log(`\n${gate1 && gate2 ? '✓✓ AMBAS COMPUERTAS OK — luz verde para construir la interfaz.' : '✗ Hay que arreglar el nucleo antes de seguir.'}\n`);
process.exit(gate1 && gate2 ? 0 : 1);
