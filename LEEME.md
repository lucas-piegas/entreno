# Entreno — seguimiento del plan de 8 semanas

App web instalable (PWA) para seguir el plan «Plan de 8 semanas – Llegar a la pretemporada 2027».
No tiene cuentas ni servidor: lo que anotás vive solo en el iPhone.

## Qué hace

- **Sesión:** muestra la sesión del día según la semana del plan (arranca el lunes 23/11/2026):
  calentamiento por pasos, ejercicios con la dosis de esa semana, el peso de la tabla de cargas,
  series para marcar, temporizador de descanso y «Terminé la sesión».
- **Lunes:** control del aductor (0-10). **Días explosivos:** botón «sesión suave» si el apretón pasa de 3/10.
- **Semanas 1, 4 y 8:** campos para cargar los tests.
- **Ejercicios:** ficha de cada ejercicio (cómo se hace, qué cuidar, dónde aparece en el plan).
- **Progreso:** sesiones hechas, tests, control del aductor y pesos hechos por semana.
- **Plan:** bloques, semana tipo, cargas, niveles del aductor y reglas para ajustar.

## Cómo actualizar el plan

Todo el plan está en **`app/plan.js`**; las descripciones de ejercicios, en `app/ejercicios.js`.
1. Cambiá esos archivos (dosis por semana, cargas, días, notas).
2. Subí `VERSION` en `app/sw.js` (por ejemplo `entreno-v2`).
3. `git push`. GitHub Pages publica solo en menos de un minuto.
4. En el iPhone: abrí la app con conexión, cerrala del todo y volvé a abrirla.

Lo anotado se guarda por semana y día (`semana-día`), y dentro de la sesión por posición del ejercicio.
Si se reordenan ejercicios de un día ya entrenado, las marcas de ese día pueden quedar en otro ejercicio.

Origen del plan: doc «Plan de 8 semanas – Llegar a la pretemporada 2027», revisión 42 (18/11/2026).

## Probar en la PC

```
python -m http.server 8766 --directory app
```

## Copia de seguridad

Plan → Exportar genera un `.json` con todo lo anotado. Importar lo restaura.
