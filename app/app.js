'use strict';
/* Entreno: sigue el plan de plan.js. Todo lo que anotás vive en el teléfono (localStorage). */

const P = window.PLAN;
const EJ = window.EJERCICIOS;
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DIAS_SESION = [1, 2, 3, 4, 6];
const NOMBRE_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/* ---------- almacenamiento ---------- */
const guardado = {
  leer(c, d) { try { const v = localStorage.getItem('en.' + c); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  escribir(c, v) { try { localStorage.setItem('en.' + c, JSON.stringify(v)); } catch (e) { avisar('No se pudo guardar'); } },
};
let registro = guardado.leer('registro', {}); // "sem-dia" → { series: {clave: [bool]}, pesos: {clave: kg}, cal: [bool], suave, hecho, fecha }
let control = guardado.leer('control', {});   // semana → { apreton, tos, manana }
let tests = guardado.leer('tests', {});       // semana → { sprint10, ... }
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

let temporizadorAviso;
function avisar(t) { const a = $('#aviso'); a.textContent = t; a.hidden = false; clearTimeout(temporizadorAviso); temporizadorAviso = setTimeout(() => { a.hidden = true; }, 2000); }

/* ---------- fechas y semana ---------- */
const inicio = new Date(P.inicio + 'T00:00:00');
function semanaDeFecha(d) {
  const dias = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - inicio) / 864e5);
  return Math.floor(dias / 7) + 1;
}
const hoy = new Date();
const semanaHoy = semanaDeFecha(hoy);
let semana = Math.min(8, Math.max(1, semanaHoy));
let dia = hoy.getDay();
if (semanaHoy < 1) dia = 1; // antes de arrancar: muestra el primer lunes
const esHoy = (s, d) => s === semanaHoy && d === hoy.getDay();
const clave = (s, d) => `${s}-${d}`;
const reg = (s, d) => (registro[clave(s, d)] = registro[clave(s, d)] || { series: {}, pesos: {}, cal: [] });
const guardarRegistro = () => guardado.escribir('registro', registro);

/* ---------- interpretar el plan ---------- */
function prescripcion(ej, s) { return ej.pres[s - 1]; }
function cargaTexto(ej, s) { return ej.carga ? P.cargas[ej.carga][s - 1] : null; }
function ejercicioDe(ej, s) { return ej.ejPorSemana ? ej.ejPorSemana[s - 1] : ej.id; }
function nSeries(ej, s) {
  const c = cargaTexto(ej, s);
  const m1 = c && c.match(/\((\d+)\s*x/);
  if (m1) return +m1[1];
  const p = prescripcion(ej, s);
  const m = p.match(/^(\d+)\s*(?:x|series)/i) || p.match(/(\d+)\s*x/);
  return m ? +m[1] : 1;
}
const noVa = (ej, s) => /^No$/.test(prescripcion(ej, s));
const semanaInfo = (s) => P.semanas[s - 1];

/* ---------- barra de semana y días ---------- */
function pintarBarra() {
  const w = semanaInfo(semana);
  $('#semTexto').innerHTML = `Semana ${semana} de 8<small>${w.desde} al ${w.hasta} · ${esc(w.bloque)}</small>`;
  $('#dias').innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const ses = P.sesiones[d];
    const r = registro[clave(semana, d)];
    const cls = ['dia', ses ? '' : 'descanso', d === dia ? 'activo' : '', r && r.hecho ? 'hecho' : '', esHoy(semana, d) ? 'hoy' : ''].join(' ');
    return `<button class="${cls}" data-dia="${d}">${NOMBRE_DIA[d]}<small>${esHoy(semana, d) ? 'hoy' : ses ? ses.tipo : 'desc.'}</small></button>`;
  }).join('');
}
$('#dias').addEventListener('click', (e) => { const b = e.target.closest('[data-dia]'); if (b) { dia = +b.dataset.dia; pintarTodo(); window.scrollTo(0, 0); } });
$('#semAnterior').onclick = () => { if (semana > 1) { semana--; pintarTodo(); } };
$('#semSiguiente').onclick = () => { if (semana < 8) { semana++; pintarTodo(); } };
$('#semTexto').onclick = () => { semana = Math.min(8, Math.max(1, semanaHoy)); dia = semanaHoy < 1 ? 1 : hoy.getDay(); pintarTodo(); };

/* ---------- vista Sesión ---------- */
function pintarSesion() {
  const caja = $('#vistaHoy');
  const ses = P.sesiones[dia];
  const w = semanaInfo(semana);
  let h = '';
  if (semanaHoy < 1 && semana === 1) h += `<div class="banner info">El plan arranca el lunes ${w.desde}. Ya podés mirar las sesiones.</div>`;
  if (w.nota) h += `<div class="banner info">${esc(w.nota)}</div>`;
  if (!ses) {
    // El domingo cierra la semana (va al final de la fila): la próxima sesión es el lunes de la semana siguiente.
    const prox = dia === 0 ? 1 : DIAS_SESION.find((d) => d > dia) ?? 1;
    const otraSemana = dia === 0 && semana < 8;
    const hay = dia !== 0 || semana < 8;
    caja.innerHTML = h + `<div class="tarjeta"><h2>Descanso</h2><p class="nota">Día sin entrenamiento. Dormí bien y comé proteína.</p>
      ${hay ? `<button class="boton secundario" data-ir="${prox}" data-ir-semana="${otraSemana ? semana + 1 : semana}">Ver la próxima sesión (${P.sesiones[prox].dia})</button>` : '<p>Terminaste el plan. ¡A la pretemporada!</p>'}</div>`;
    return;
  }
  const r = registro[clave(semana, dia)] || { series: {}, pesos: {}, cal: [] };
  h += `<div class="tarjeta cabeza-sesion"><span class="tipo">${esc(ses.tipo)}</span><span class="nota">${esc(ses.donde)} · ${esc(ses.dur)}</span>
    <h2 style="margin-top:6px">${esc(ses.dia)}: ${esc(ses.titulo)}</h2></div>`;

  // Tests de la semana
  const testsHoy = w.tests ? P.tests.filter((t) => t.dia === dia) : [];
  if (testsHoy.length) {
    const tv = tests[semana] || {};
    h += `<div class="tarjeta"><h2>Tests de la semana ${semana}</h2><p class="nota">Reemplazan parte de la sesión de hoy (no suman tiempo).</p>` +
      testsHoy.map((t) => `<label class="campo" style="margin-top:8px"><b style="color:var(--texto)">${esc(t.nombre)}</b> (${esc(t.unidad)}) — ${esc(t.como)}
        <input inputmode="decimal" data-test="${t.id}" value="${esc(tv[t.id] ?? '')}" placeholder="${esc(t.unidad)}"></label>`).join('') + '</div>';
  }

  // Control del aductor (lunes)
  if (ses.controlAductor) {
    const c = control[semana] || {};
    h += `<div class="tarjeta"><h2>Control del aductor</h2><p class="nota">${esc(P.aductor.control)}</p>
      <div class="campos">
        <label>Apretón fuerte<input inputmode="numeric" data-control="apreton" value="${esc(c.apreton ?? '')}" placeholder="0-10"></label>
        <label>Al toser<input inputmode="numeric" data-control="tos" value="${esc(c.tos ?? '')}" placeholder="0-10"></label>
        <label>Pasos de la mañana<input inputmode="numeric" data-control="manana" value="${esc(c.manana ?? '')}" placeholder="0-10"></label>
      </div></div>`;
  }

  // Sesión suave
  if (ses.calentamiento === 'explosivo') {
    h += r.suave
      ? `<div class="banner alerta"><b>Sesión suave:</b> el apretón pasó de 3/10. Aceleraciones al 70% y nada de saltos intensivos. <button class="link" data-suave="0">Deshacer</button></div>`
      : `<p class="nota">¿El apretón del calentamiento pasó de 3/10? <button class="link" data-suave="1">Marcar sesión suave</button></p>`;
  }

  // Calentamiento
  const cal = P.calentamientos[ses.calentamiento];
  const lugar = ses.lugar || 'cancha';
  const hechos = r.cal || [];
  h += `<details class="tarjeta cal" ${hechos.filter(Boolean).length === cal.pasos.length ? '' : 'open'}><summary>${esc(cal.titulo)} (${cal.min}') ${hechos.filter(Boolean).length}/${cal.pasos.length}</summary>` +
    (cal.intro ? `<p class="nota" style="padding:0 14px 8px">${esc(cal.intro)}</p>` : '') +
    cal.pasos.map((p, i) => {
      const texto = p[lugar] || p.cancha || p.que;
      const ejs = (Array.isArray(p.ej) ? p.ej : p.ej ? [p.ej] : []).map((id) => `<button class="link" data-ej="${id}">${esc(EJ[id].nombre)}</button>`).join(' · ');
      return `<div class="paso"><button class="check ${hechos[i] ? 'on' : ''}" data-cal="${i}" aria-label="Hecho">${hechos[i] ? '✓' : ''}</button>
        <div><b>${esc(p.paso)} · ${esc(p.min)}</b><p>${esc(texto)}</p>${ejs ? `<p class="nota">${ejs}</p>` : ''}</div></div>`;
    }).join('') +
    (cal.pautas ? `<div style="padding:4px 14px 12px"><ul class="pautas">${cal.pautas.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '') + '</details>';

  // Partes y ejercicios
  ses.partes.forEach((parte, pi) => {
    h += `<div class="tarjeta parte"><h2>${esc(parte.nombre)}</h2>`;
    parte.ejercicios.forEach((ej, ei) => {
      const k = `${pi}.${ei}`;
      const id = ejercicioDe(ej, semana);
      const pres = prescripcion(ej, semana);
      if (noVa(ej, semana)) {
        h += `<div class="ej no"><div class="ej-cabeza"><span class="letra">${esc(ej.etiqueta || '')}</span><button data-ej="${id}">${esc(EJ[id].nombre)}</button></div><p class="pres">No va esta semana.</p></div>`;
        return;
      }
      const carga = cargaTexto(ej, semana);
      const n = nSeries(ej, semana);
      const hechas = (r.series && r.series[k]) || [];
      const peso = r.pesos && r.pesos[k];
      const esTest = w.tests && ej.test && P.tests.some((t) => t.dia === dia && (t.id === ej.test || t.id.startsWith(ej.test)));
      h += `<div class="ej"><div class="ej-cabeza"><span class="letra">${esc(ej.etiqueta || '')}</span><button data-ej="${id}">${esc(EJ[id].nombre)}</button></div>
        <p class="pres">${esc(pres)}${esTest ? (ej.test === 'fuerza' ? ' <b>(hoy también el test de fuerza: 25 por lado)</b>' : ' <b>(esta semana lo reemplaza el test)</b>') : ''}</p>
        ${carga ? `<p class="carga">${esc(carga.replace(/^([\d,]+)/, '$1 kg por lado'))}</p>` : ''}
        <div class="series">${Array.from({ length: n }, (_, i) => `<button class="serie ${hechas[i] ? 'on' : ''}" data-serie="${k}" data-i="${i}" data-descanso="${ej.descanso || ''}">${hechas[i] ? '✓' : i + 1}</button>`).join('')}
          ${ej.descanso ? `<button class="descanso-btn" data-tempo="${ej.descanso}">⏱ ${formatoTiempo(ej.descanso)}</button>` : ''}
          ${carga ? `<input class="peso" inputmode="decimal" placeholder="kg hechos" data-peso="${k}" value="${esc(peso ?? '')}">` : ''}
        </div></div>`;
    });
    h += '</div>';
  });
  if (ses.notas) h += `<div class="tarjeta"><ul class="pautas">${ses.notas.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  h += r.hecho
    ? `<div class="banner ok">Sesión hecha el ${esc(r.fecha || '')}. <button class="link" data-hecho="0">Desmarcar</button></div>`
    : `<button class="boton ok" data-hecho="1">Terminé la sesión</button>`;
  caja.innerHTML = h;
}

$('#vistaHoy').addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.ir) { dia = +t.dataset.ir; semana = +t.dataset.irSemana || semana; pintarTodo(); window.scrollTo(0, 0); return; }
  if (t.dataset.ej) { abrirEjercicio(t.dataset.ej); return; }
  if (t.dataset.tempo) { arrancarTemporizador(+t.dataset.tempo); return; }
  const r = reg(semana, dia);
  if (t.dataset.cal != null) { r.cal[+t.dataset.cal] = !r.cal[+t.dataset.cal]; }
  else if (t.dataset.serie) {
    const k = t.dataset.serie, i = +t.dataset.i;
    r.series[k] = r.series[k] || [];
    r.series[k][i] = !r.series[k][i];
    // Al completar una serie arranca solo el descanso del ejercicio.
    if (r.series[k][i] && t.dataset.descanso) arrancarTemporizador(+t.dataset.descanso);
  } else if (t.dataset.suave) { r.suave = t.dataset.suave === '1'; }
  else if (t.dataset.hecho) {
    r.hecho = t.dataset.hecho === '1';
    r.fecha = r.hecho ? new Date().toLocaleDateString('es-UY', { day: 'numeric', month: 'numeric' }) : '';
    if (r.hecho) avisar('¡Sesión registrada!');
  } else return;
  guardarRegistro();
  const y = window.scrollY; pintarTodo(); window.scrollTo(0, y);
});
$('#vistaHoy').addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.peso) { reg(semana, dia).pesos[t.dataset.peso] = t.value; guardarRegistro(); }
  if (t.dataset.control) { control[semana] = control[semana] || {}; control[semana][t.dataset.control] = t.value; guardado.escribir('control', control); }
  if (t.dataset.test) { tests[semana] = tests[semana] || {}; tests[semana][t.dataset.test] = t.value; guardado.escribir('tests', tests); avisar('Test guardado'); }
});

/* ---------- temporizador de descanso ---------- */
let finTempo = 0, intervalo = null;
function formatoTiempo(s) { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function arrancarTemporizador(seg) {
  finTempo = Date.now() + seg * 1000;
  $('#temporizador').hidden = false; $('#temporizador').classList.remove('fin');
  clearInterval(intervalo); intervalo = setInterval(tic, 250); tic();
}
function tic() {
  const resto = (finTempo - Date.now()) / 1000;
  $('#tempoTexto').textContent = formatoTiempo(resto);
  if (resto <= 0) {
    clearInterval(intervalo); $('#temporizador').classList.add('fin'); $('#tempoTexto').textContent = '¡Dale!';
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }
}
$('#tempoMas').onclick = () => { finTempo = Math.max(finTempo, Date.now()) + 15000; $('#temporizador').classList.remove('fin'); clearInterval(intervalo); intervalo = setInterval(tic, 250); tic(); };
$('#tempoParar').onclick = () => { clearInterval(intervalo); $('#temporizador').hidden = true; };

/* ---------- ficha de ejercicio ---------- */
function abrirEjercicio(id) {
  const e = EJ[id];
  if (!e) return;
  const usos = [];
  Object.entries(P.sesiones).forEach(([d, s]) => s.partes.forEach((p) => p.ejercicios.forEach((ej) => {
    if (ej.id === id || (ej.ejPorSemana || []).includes(id)) usos.push(`${s.dia}: ${ej.ejPorSemana ? ej.pres[ej.ejPorSemana.indexOf(id)] : ej.pres[semana - 1]}`);
  })));
  $('#ejDetalle').innerHTML = `<div class="tarjeta"><p class="nota">${esc(e.grupo)}</p><h2>${esc(e.nombre)}</h2><p>${esc(e.como)}</p>
    ${e.claves.length ? `<h3>Qué cuidar</h3><ul class="pautas">${e.claves.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
    ${usos.length ? `<h3>En el plan</h3><ul class="pautas">${usos.map((u) => `<li>${esc(u)}</li>`).join('')}</ul>` : ''}
    ${e.video ? `<p style="margin-top:14px"><a href="https://www.youtube.com/results?search_query=${encodeURIComponent(e.video)}" target="_blank" rel="noopener">Ver videos de referencia (YouTube)</a></p>` : ''}</div>`;
  $('#hojaEjercicio').hidden = false; document.body.style.overflow = 'hidden';
}
$$('[data-cerrar]').forEach((b) => b.addEventListener('click', () => { $('#hojaEjercicio').hidden = true; document.body.style.overflow = ''; }));

/* ---------- vista Ejercicios ---------- */
function pintarEjercicios() {
  const grupos = {};
  Object.entries(EJ).forEach(([id, e]) => { if (id !== 'aductor') (grupos[e.grupo] = grupos[e.grupo] || []).push([id, e]); });
  $('#vistaEjercicios').innerHTML = Object.entries(grupos).map(([g, lista]) => `<div class="tarjeta grupo-ej"><h2>${esc(g)}</h2>` +
    lista.map(([id, e]) => `<button class="item" data-ej="${id}"><span>${esc(e.nombre)}</span><span class="nota">›</span></button>`).join('') + '</div>').join('');
}
$('#vistaEjercicios').addEventListener('click', (e) => { const b = e.target.closest('[data-ej]'); if (b) abrirEjercicio(b.dataset.ej); });

/* ---------- vista Progreso ---------- */
function pintarProgreso() {
  const hechas = Object.values(registro).filter((r) => r.hecho).length;
  let h = `<div class="tarjeta"><h2>Sesiones hechas: ${hechas} de 40</h2>
    <div class="grilla"><span></span>${DIAS_SESION.map((d) => `<b>${NOMBRE_DIA[d]}</b>`).join('')}` +
    P.semanas.map((w) => `<span>Sem ${w.n}</span>` + DIAS_SESION.map((d) => {
      const r = registro[clave(w.n, d)];
      return `<button class="c ${r && r.hecho ? 'ok' : ''} ${esHoy(w.n, d) ? 'actual' : ''}" data-ir-sem="${w.n}" data-ir-dia="${d}" style="border:0">${r && r.hecho ? '✓' : ''}</button>`;
    }).join('')).join('') + '</div></div>';

  h += `<div class="tarjeta"><h2>Tests</h2><div class="scroll"><table class="tabla"><tr><th>Test</th><th class="num">Sem 1</th><th class="num">Sem 4</th><th class="num">Sem 8</th></tr>` +
    P.tests.map((t) => `<tr><td>${esc(t.nombre)} (${esc(t.unidad)})</td>${[1, 4, 8].map((s) => `<td class="num">${esc((tests[s] || {})[t.id] || '–')}</td>`).join('')}</tr>`).join('') +
    '</table></div><p class="nota">Se cargan en la sesión del día del test (semanas 1, 4 y 8).</p></div>';

  h += `<div class="tarjeta"><h2>Control del aductor (0-10)</h2><div class="scroll"><table class="tabla"><tr><th>Semana</th><th class="num">Apretón</th><th class="num">Tos</th><th class="num">Mañana</th></tr>` +
    P.semanas.map((w) => { const c = control[w.n] || {}; return `<tr><td>${w.n}</td><td class="num">${esc(c.apreton || '–')}</td><td class="num">${esc(c.tos || '–')}</td><td class="num">${esc(c.manana || '–')}</td></tr>`; }).join('') +
    `</table></div><p class="nota">Nivel 1 → 2 cuando apretar fuerte no pasa de 2/10 dos semanas seguidas.</p></div>`;

  // Pesos hechos por ejercicio con carga
  const filas = [];
  Object.entries(P.sesiones).forEach(([d, s]) => s.partes.forEach((p, pi) => p.ejercicios.forEach((ej, ei) => {
    if (!ej.carga) return;
    filas.push(`<tr><td>${esc(EJ[ej.id].nombre)}</td>${P.semanas.map((w) => {
      const r = registro[clave(w.n, +d)];
      const v = r && r.pesos && r.pesos[`${pi}.${ei}`];
      return `<td class="num ${w.n === semana ? 'actual' : ''}">${esc(v || '·')}</td>`;
    }).join('')}</tr>`);
  })));
  h += `<div class="tarjeta"><h2>Pesos hechos (kg por lado)</h2><div class="scroll"><table class="tabla"><tr><th>Ejercicio</th>${P.semanas.map((w) => `<th class="num">${w.n}</th>`).join('')}</tr>${filas.join('')}</table></div></div>`;
  $('#vistaProgreso').innerHTML = h;
}
$('#vistaProgreso').addEventListener('click', (e) => {
  const b = e.target.closest('[data-ir-sem]');
  if (!b) return;
  semana = +b.dataset.irSem; dia = +b.dataset.irDia;
  irVista('vistaHoy');
});

/* ---------- vista Plan ---------- */
function pintarPlan() {
  let h = `<div class="tarjeta"><h2>${esc(P.titulo)}</h2><p class="nota">Versión del plan: ${esc(P.version)}</p>
    <div class="scroll"><table class="tabla"><tr><th>Sem</th><th>Fechas</th><th>Bloque</th></tr>` +
    P.semanas.map((w) => `<tr class="${w.n === semana ? 'actual' : ''}"><td>${w.n}</td><td>${w.desde} – ${w.hasta}</td><td>${esc(w.bloque)}<br><span class="nota">${esc(P.objetivosBloque[w.bloque])}</span></td></tr>`).join('') +
    '</table></div></div>';
  h += `<div class="tarjeta"><h2>Semana tipo</h2><table class="tabla">` +
    [1, 2, 3, 4, 5, 6, 0].map((d) => { const s = P.sesiones[d]; return `<tr><td>${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][d]}</td><td>${s ? `${esc(s.tipo)} · ${esc(s.titulo)} · ${esc(s.dur)}` : 'Descanso'}</td></tr>`; }).join('') +
    '</table><p class="nota">Lo intenso para las piernas va lunes y jueves, con 72 horas entre los dos.</p></div>';
  h += `<div class="tarjeta"><h2>Cargas (kg por lado, sin la barra)</h2><div class="scroll"><table class="tabla"><tr><th>Ejercicio</th>${P.semanas.map((w) => `<th class="num">${w.n}</th>`).join('')}</tr>` +
    Object.entries(P.cargas).map(([id, v]) => `<tr><td>${esc(EJ[id].nombre)}</td>${v.map((x, i) => `<td class="num ${i + 1 === semana ? 'actual' : ''}">${esc(x)}</td>`).join('')}</tr>`).join('') +
    `</table></div><ul class="pautas">${P.reglasCargas.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  h += `<div class="tarjeta"><h2>Aductor y zona pubiana: niveles</h2><p class="nota">${esc(P.aductor.intro)}</p><table class="tabla"><tr><th>Nivel</th><th>Ejercicio y dosis</th><th>Pasás cuando</th></tr>` +
    P.aductor.niveles.map((n) => `<tr><td class="num">${n.n}</td><td>${esc(n.ej)}<br><span class="nota">${esc(n.dosis)}</span></td><td>${esc(n.pasar)}</td></tr>`).join('') +
    `</table><p class="nota">${esc(P.aductor.esperado)}</p></div>`;
  h += `<div class="tarjeta"><h2>Reglas para ajustar</h2><ul class="pautas">${P.reglas.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  h += `<div class="tarjeta"><h2>Copia de seguridad</h2><p class="nota">Lo que anotás vive solo en este teléfono.</p>
    <div class="fila"><button class="boton secundario" id="exportar">Exportar</button><label class="boton secundario" style="margin-top:4px">Importar<input type="file" id="importar" accept="application/json" hidden></label></div></div>`;
  $('#vistaPlan').innerHTML = h;
  $('#exportar').onclick = exportar;
  $('#importar').onchange = importar;
}
async function exportar() {
  const datos = JSON.stringify({ app: 'entreno', version: 1, registro, control, tests });
  const archivo = new File([datos], `entreno-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) { try { await navigator.share({ files: [archivo] }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(archivo); a.download = archivo.name; a.click();
}
async function importar(ev) {
  const f = ev.target.files[0]; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (d.app !== 'entreno') throw new Error('no es una copia de esta app');
    if (!confirm('Esto reemplaza lo anotado por la copia. ¿Seguir?')) return;
    registro = d.registro || {}; control = d.control || {}; tests = d.tests || {};
    guardado.escribir('registro', registro); guardado.escribir('control', control); guardado.escribir('tests', tests);
    pintarTodo(); avisar('Copia importada');
  } catch (e) { avisar('No se pudo importar: ' + e.message); }
}

/* ---------- navegación ---------- */
let vista = 'vistaHoy';
function irVista(v) {
  vista = v;
  $$('.pestanas button').forEach((x) => x.classList.toggle('activa', x.dataset.vista === v));
  $$('.vista').forEach((x) => x.classList.toggle('activa', x.id === v));
  const conSemana = v === 'vistaHoy';
  $('.barra').style.display = conSemana ? '' : 'none';
  $('#dias').style.display = conSemana ? '' : 'none';
  pintarTodo(); window.scrollTo(0, 0);
}
$$('.pestanas button').forEach((b) => b.addEventListener('click', () => irVista(b.dataset.vista)));
function pintarTodo() {
  pintarBarra();
  if (vista === 'vistaHoy') pintarSesion();
  if (vista === 'vistaEjercicios') pintarEjercicios();
  if (vista === 'vistaProgreso') pintarProgreso();
  if (vista === 'vistaPlan') pintarPlan();
}
pintarTodo();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
